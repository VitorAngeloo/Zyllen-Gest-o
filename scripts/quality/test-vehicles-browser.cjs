/* Fleet UI behavior against synthetic loopback responses, never real credentials/data. */
const assert = require('node:assert/strict'), path = require('node:path');
module.exports = async ({ run, browser, base, shots, fixedNow }) => {
    const runtime = process.env.AUDIT_RUNTIME_ROOT || 'C:/Users/SERVIDOR ZYLLEN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
    const { expect } = require(path.join(runtime, 'node/node_modules/playwright/test'));
    const carId = '40000000-0000-4000-8000-000000000001', userId = '40000000-0000-4000-8000-000000000002';
    const people = [{id:userId,name:'Responsável QA'},{id:'40000000-0000-4000-8000-000000000006',name:'João Silva'},{id:'40000000-0000-4000-8000-000000000007',name:'Ána Souza'},{id:'40000000-0000-4000-8000-000000000008',name:'João Silva'}];
    const initialCar = { id: carId, name: 'Carro QA', plate: 'ABC1234', active: true };
    const inputDate = hours => new Date(fixedNow + hours * 3600000 - 3 * 3600000).toISOString().slice(0,16);
    const brDate = value => value.split('-').reverse().join('/');
    async function setup({ permissions = ['schedule.view','schedule.create','schedule.update','schedule.delete'], empty = false, mobile = false, fail = false, unavailable = false, historical = false, multiple = false } = {}) {
        const context = await browser.newContext({ viewport: mobile ? { width: 390,height:844 } : { width:1440,height:1100 },timezoneId:'America/Sao_Paulo' });
        await context.addInitScript(() => { localStorage.setItem('accessToken','synthetic-vehicles-qa'); localStorage.setItem('userType','internal'); });
        const state = { fail, unavailable, cars: empty ? [] : multiple ? [initialCar,{...initialCar,id:'40000000-0000-4000-8000-000000000005',name:'Outro carro QA',plate:'DEF5678'}] : [initialCar], reservations: [], conflict:false, reserveFailure:false }, requests = [], errors=[];
        if (historical) state.reservations = [
            {id:'40000000-0000-4000-8000-000000000003',title:'Reserva concluída QA',vehicle:initialCar,responsible:{id:userId,name:'Responsável QA'},startDate:new Date(fixedNow-7200000).toISOString(),endDate:new Date(fixedNow-3600000).toISOString(),notes:null,cancelledAt:null},
            {id:'40000000-0000-4000-8000-000000000004',title:'Reserva cancelada QA',vehicle:initialCar,responsible:{id:userId,name:'Responsável QA'},startDate:new Date(fixedNow+3600000).toISOString(),endDate:new Date(fixedNow+7200000).toISOString(),notes:null,cancelledAt:new Date(fixedNow).toISOString()}
        ];
        await context.route('**/*',async route => {
            const request=route.request(),url=new URL(request.url());
            if (!['127.0.0.1','localhost'].includes(url.hostname) && !['data:','blob:'].includes(url.protocol)) return route.abort();
            if (url.port !== '3999') return route.continue();
            const respond=(data,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':base,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS'},body:JSON.stringify(data)});
            if(request.method()==='OPTIONS')return respond({});
            const method=request.method(),body=request.postData()?request.postDataJSON():null;requests.push({path:url.pathname,method,body,params:Object.fromEntries(url.searchParams)});
            if(url.pathname==='/auth/me')return respond({data:{id:userId,type:'internal',name:'Usuário carros QA',role:{name:'Gestor'}}});
            if(url.pathname==='/auth/me/permissions')return respond({data:permissions});
            if(url.pathname.includes('pending-rating'))return respond({data:null});
            if(url.pathname.startsWith('/vehicles') && state.unavailable)return respond({error:{message:'Rota indisponível QA'}},404);
            if(url.pathname==='/vehicles/options')return state.fail ? respond({error:{message:'Falha de consulta QA'}},503) : respond({data:{vehicles:state.cars,responsibleUsers:people,reservationResponsibleUsers:[...people,{id:"40000000-0000-4000-8000-000000000009",name:"Responsável antigo QA"}]}});
            if(url.pathname==='/vehicles/reservations' && method==='GET'){
                const filtered=state.reservations.filter(item=>(!url.searchParams.get('vehicleId')||item.vehicle.id===url.searchParams.get('vehicleId'))&&(!url.searchParams.get('responsibleId')||item.responsible.id===url.searchParams.get('responsibleId'))&&Date.parse(item.startDate)<Date.parse(url.searchParams.get('end'))&&Date.parse(item.endDate)>Date.parse(url.searchParams.get('start')));
                const page=Number(url.searchParams.get('page')),limit=Number(url.searchParams.get('limit'));
                return respond({data:filtered.slice((page-1)*limit,page*limit),total:filtered.length,page,limit});
            }
            if(url.pathname==='/vehicles' && method==='POST'){
                if(state.fail)return respond({error:{message:'Falha ao salvar carro QA'}},503);
                const car={id:body.requestId,name:body.name,plate:body.plate,active:body.active};state.cars.push(car);return respond({data:car},201);
            }
            if(url.pathname==='/vehicles/reservations' && method==='POST'){
                if(state.reserveFailure)return respond({error:{message:'Falha ao salvar reserva QA'}},503);
                if(state.conflict)return respond({error:{message:'Este carro já está reservado nesse período.'}},409);
                const reservation={...body,id:body.requestId,vehicle:state.cars.find(car=>car.id===body.vehicleId),responsible:people.find(person=>person.id===body.responsibleId),cancelledAt:null};state.reservations.push(reservation);return respond({data:reservation},201);
            }
            if(/^\/vehicles\/reservations\/[^/]+$/.test(url.pathname) && method==='PUT'){
                const reservation=state.reservations.find(item=>item.id===url.pathname.split('/')[3]);
                Object.assign(reservation,body,{vehicle:state.cars.find(car=>car.id===body.vehicleId),responsible:people.find(person=>person.id===body.responsibleId)});return respond({data:reservation});
            }
            if(url.pathname.endsWith('/cancel')){const reservation=state.reservations.find(item=>item.id===url.pathname.split('/')[3]);reservation.cancelledAt=new Date(fixedNow).toISOString();return respond({data:reservation});}
            return respond({data:[]});
        });
        const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.clock.install({time:fixedNow});await page.goto(base+'/dashboard/carros');
        if (permissions.includes('schedule.view')) await expect(page.getByRole('heading',{name:'Carros',exact:true})).toBeVisible();
        else await expect(page.getByText('Você não tem permissão para consultar os carros.',{exact:true})).toBeVisible();
        return {context,page,state,requests,errors};
    }
    async function selectDate(scope,label,value){
        const page=typeof scope.page==='function'?scope.page():scope,field=scope.getByLabel(label,{exact:true}),[day,month,year]=value.split('/');
        await field.click();const calendar=page.getByRole('dialog',{name:label,exact:true});
        await calendar.getByRole('combobox',{name:'Ano',exact:true}).selectOption(year);await calendar.getByRole('combobox',{name:'Mês',exact:true}).selectOption(String(Number(month)-1));await calendar.getByRole('button',{name:value,exact:true}).click();await expect(calendar).toHaveCount(0);await expect(field).toHaveValue(value);
    }
    async function selectTime(scope,label,value){
        const page=typeof scope.page==='function'?scope.page():scope,field=scope.getByLabel(label,{exact:true});
        if(!value && !await field.inputValue())return;
        await field.click();const clock=page.getByRole('dialog',{name:label,exact:true});
        if(!value)await clock.getByRole('button',{name:'Limpar horário',exact:true}).click();
        else{const [hour,minute]=value.split(':');await clock.getByRole('listbox',{name:'Horas',exact:true}).getByRole('option',{name:hour,exact:true}).click();await clock.getByRole('listbox',{name:'Minutos',exact:true}).getByRole('option',{name:minute,exact:true}).click();await clock.getByRole('button',{name:'Confirmar horário',exact:true}).click();}
        await expect(clock).toHaveCount(0);await expect(field).toHaveValue(value);
    }
    async function fillBooking(page){
        const d=page.getByRole('form',{name:'Reserva',exact:true}),[startDate,startTime]=inputDate(24).split('T'),[endDate,endTime]=inputDate(26).split('T');
        await d.getByLabel('Carro',{exact:true}).selectOption(carId);await d.getByLabel('Finalidade da reserva').fill('Visita de equipe QA');await d.getByRole('combobox',{name:'Responsável',exact:true}).click();await d.getByRole('option',{name:'Responsável QA',exact:true}).click();
        await selectDate(d,'Data de início',brDate(startDate));await selectTime(d,'Horário de retirada',startTime);
        await selectDate(d,'Data de término',brDate(endDate));await selectTime(d,'Horário de devolução',endTime);return d;
    }
    await run('Vehicles UI: isolated fleet area has normal sidebar and empty states; create unlocks reserving without a project',async()=>{
        const s=await setup({empty:true});await expect(s.page.getByText('Nenhum carro cadastrado.',{exact:true})).toBeVisible();await expect(s.page.getByText('Não foi possível carregar os carros ou suas reservas.',{exact:true})).toHaveCount(0);await expect(s.page.getByRole('button',{name:'Reservar agora',exact:true})).toBeDisabled();
        await s.page.getByRole('button',{name:'Cadastrar carro',exact:true}).click();const d=s.page.getByRole('dialog');await d.getByLabel('Nome do carro').fill('Carro cadastrado QA');await d.getByLabel('Placa (opcional)').fill('ABC-1D23');await d.getByRole('button',{name:'Salvar',exact:true}).click();
        await expect(s.page.locator('[data-vehicle-id]')).toContainText('Carro cadastrado QA');await expect(s.page.getByRole('button',{name:'Reservar agora',exact:true})).toBeEnabled();assert.equal(s.requests.find(r=>r.method==='POST').body.plate,'ABC1D23');assert(!s.requests.some(r=>r.path.includes('project-services')||r.path.includes('/trips')));assert.deepEqual(s.errors,[]);await s.context.close();
    });
    await run('Vehicles UI: unavailable area blocks writes without claiming an empty fleet; retry restores normal empty state',async()=>{
        const s=await setup({unavailable:true,empty:true});
        await expect(s.page.getByRole('status')).toContainText('A área de carros ainda não está disponível para uso.');
        await expect(s.page.getByText('Não foi possível carregar os carros ou suas reservas.',{exact:true})).toHaveCount(0);
        await expect(s.page.getByText('Nenhum carro cadastrado.',{exact:true})).toHaveCount(0);
        for(const name of ['Cadastrar carro','Reservar agora'])await expect(s.page.getByRole('button',{name,exact:true})).toBeDisabled();
        assert(!s.requests.some(r=>r.path==='/vehicles/reservations'));
        assert(s.requests.every(r=>r.method==='GET'));
        s.state.unavailable=false;await s.page.getByRole('button',{name:'Tentar novamente',exact:true}).click();
        await expect(s.page.getByText('Nenhum carro cadastrado.',{exact:true})).toBeVisible();
        await expect(s.page.getByText('Nenhuma reserva neste período.',{exact:true})).toBeVisible();
        await expect(s.page.getByRole('button',{name:'Cadastrar carro',exact:true})).toBeEnabled();
        await expect(s.page.getByRole('status')).toHaveCount(0);assert.deepEqual(s.errors,[]);await s.context.close();
    });
    await run('Vehicles UI: query failure stays distinct from an empty fleet and prevents opening an unusable form',async()=>{
        const s=await setup({fail:true,empty:true});await expect.poll(()=>s.requests.filter(r=>r.path==='/vehicles/options').length).toBeGreaterThan(0);await s.page.clock.runFor(5000);await expect(s.page.getByRole('alert').filter({hasText:'Não foi possível carregar os carros ou suas reservas.'})).toBeVisible();
        await expect(s.page.getByText('Nenhum carro cadastrado.',{exact:true})).toHaveCount(0);
        await expect(s.page.getByRole('button',{name:'Cadastrar carro',exact:true})).toBeDisabled();
        assert(s.requests.every(r=>r.method==='GET'));s.state.fail=false;
        await s.page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await expect(s.page.getByText('Nenhum carro cadastrado.',{exact:true})).toBeVisible();
        await expect(s.page.getByRole('button',{name:'Cadastrar carro',exact:true})).toBeEnabled();await s.context.close();
    });
    await run('Vehicles UI: failed save preserves draft and request identity on retry, avoiding duplicate creation',async()=>{
        const s=await setup();await s.page.getByRole('button',{name:'Cadastrar carro',exact:true}).click();const d=s.page.getByRole('dialog');await d.getByLabel('Nome do carro').fill('Retentativa QA');s.state.fail=true;await d.getByRole('button',{name:'Salvar',exact:true}).click();await expect(d.getByRole('alert')).toContainText('Falha ao salvar carro QA');await expect(d.getByLabel('Nome do carro')).toHaveValue('Retentativa QA');s.state.fail=false;await d.getByRole('button',{name:'Salvar',exact:true}).click();await expect(d).toHaveCount(0);const writes=s.requests.filter(r=>r.method==='POST');assert.equal(writes.length,2);assert.equal(writes[0].body.requestId,writes[1].body.requestId);await s.context.close();
    });
    await run('Vehicles UI: conflict keeps all reservation fields, retry succeeds and cancellation keeps history',async()=>{
        const s=await setup();const d=await fillBooking(s.page);s.state.conflict=true;await d.getByRole('button',{name:'Reservar agora',exact:true}).click();await expect(d.getByRole('alert')).toContainText('já está reservado');await expect(d.getByLabel('Finalidade da reserva')).toHaveValue('Visita de equipe QA');s.state.conflict=false;await d.getByRole('button',{name:'Reservar agora',exact:true}).click();await expect(d.getByLabel('Finalidade da reserva')).toHaveValue('');await expect(s.page.locator('[data-vehicle-reservation]')).toContainText('Visita de equipe QA');s.page.once('dialog',dialog=>dialog.accept());await s.page.getByRole('button',{name:'Cancelar reserva',exact:true}).click();await expect(s.page.locator('[data-vehicle-reservation]')).toContainText('Cancelada');await expect(s.page.getByRole('button',{name:'Cancelar reserva',exact:true})).toHaveCount(0);const writes=s.requests.filter(r=>r.method==='POST');assert.equal(writes[0].body.requestId,writes[1].body.requestId);await s.context.close();
    });
    await run('Vehicles UI: historical reservations and read-only accounts expose no write controls',async()=>{
        const s=await setup({permissions:['schedule.view'],historical:true});await expect(s.page.locator('[data-vehicle-reservation]')).toHaveCount(2);for(const name of ['Cadastrar carro','Reservar carro','Reservar agora','Editar','Cancelar reserva'])await expect(s.page.getByRole('button',{name,exact:true})).toHaveCount(0);await expect(s.page.getByRole('form',{name:'Reserva',exact:true})).toHaveCount(0);assert(s.requests.every(r=>r.method==='GET'));await s.context.close();
    });
    await run('Vehicles UI: separate pickup and return times are required; invalid same-day periods are blocked and overnight local times are preserved',async()=>{
        const s=await setup();const d=await fillBooking(s.page),startDate=inputDate(24).split('T')[0],endDate=inputDate(48).split('T')[0];
        for(const label of ['Data de início','Data de término']) { await expect(d.getByLabel(label,{exact:true})).toHaveAttribute('type','text');await expect(d.getByLabel(label,{exact:true})).toHaveAttribute('placeholder','DD/MM/AAAA'); }
        for(const label of ['Horário de retirada','Horário de devolução']) { await expect(d.getByLabel(label,{exact:true})).toHaveAttribute('type','text');await expect(d.getByLabel(label,{exact:true})).toHaveAttribute('placeholder','HH:MM'); }
        const writes=()=>s.requests.filter(r=>r.method!=='GET');
        for(const label of ['Horário de retirada','Horário de devolução']){
            const field=d.getByLabel(label,{exact:true}),previous=await field.inputValue();await selectTime(d,label,'');await d.getByRole('button',{name:'Reservar agora',exact:true}).click();
            await expect(d.getByRole('alert')).toContainText('horários válidos');assert.equal(writes().length,0);await selectTime(d,label,previous);
        }
        await selectTime(d,'Horário de retirada','23:30');await selectDate(d,'Data de término',brDate(startDate));
        for(const time of ['23:30','23:00']){
            await selectTime(d,'Horário de devolução',time);await d.getByRole('button',{name:'Reservar agora',exact:true}).click();
            await expect(d.getByRole('alert')).toContainText('O término deve ser depois do início');assert.equal(writes().length,0);
        }
        await selectDate(d,'Data de término',brDate(endDate));await selectTime(d,'Horário de devolução','00:15');await d.getByRole('button',{name:'Reservar agora',exact:true}).click();await expect(d.getByLabel('Finalidade da reserva')).toHaveValue('');
        const body=writes()[0].body;assert.equal(body.startDate,new Date(`${startDate}T23:30:00.000-03:00`).toISOString());assert.equal(body.endDate,new Date(`${endDate}T00:15:00.000-03:00`).toISOString());
        assert.equal(Date.parse(body.endDate)-Date.parse(body.startDate),45*60000);assert(!('startTime' in body));assert(!('endTime' in body));assert.equal(writes().length,1);assert.deepEqual(s.errors,[]);await s.context.close();
    });
    await run('Vehicles UI: editing a reservation restores both local dates and times and saves time changes without creating another booking',async()=>{
        const s=await setup();let d=await fillBooking(s.page);await d.getByRole('button',{name:'Reservar agora',exact:true}).click();await expect(d.getByLabel('Finalidade da reserva')).toHaveValue('');
        const original=s.requests.find(r=>r.method==='POST').body;
        await s.page.locator('[data-vehicle-reservation]').getByRole('button',{name:'Editar',exact:true}).click();d=s.page.getByRole('form',{name:'Editar reserva',exact:true});
        const [startDate,startTime]=inputDate(24).split('T'),[endDate,endTime]=inputDate(26).split('T');
        for(const [label,value] of [['Data de início',brDate(startDate)],['Horário de retirada',startTime],['Data de término',brDate(endDate)],['Horário de devolução',endTime]])await expect(d.getByLabel(label,{exact:true})).toHaveValue(value);
        await s.page.screenshot({path:path.join(shots,'vehicles-reservation-desktop.png'),animations:'disabled'});
        const [newEndDate,newEndTime]=inputDate(27).split('T');await selectDate(d,'Data de término',brDate(newEndDate));await selectTime(d,'Horário de devolução',newEndTime);await d.getByRole('button',{name:'Salvar',exact:true}).click();await expect(d).toHaveCount(0);
        const edited=s.requests.find(r=>r.method==='PUT');assert.equal(edited.path,`/vehicles/reservations/${original.requestId}`);assert.equal(edited.body.startDate,original.startDate);assert.equal(edited.body.endDate,new Date(`${inputDate(27)}:00.000-03:00`).toISOString());
        assert.equal(s.requests.filter(r=>r.method==='POST').length,1);assert(!('startTime' in edited.body));assert(!('endTime' in edited.body));assert.deepEqual(s.errors,[]);await s.context.close();
    });
    await run('Vehicles UI: invalid period stops queries and denied direct access requests no fleet data',async()=>{
        const s=await setup();await expect(s.page.getByText('Nenhuma reserva neste período.',{exact:true})).toBeVisible();const before=s.requests.filter(r=>r.path==='/vehicles/reservations').length;await s.page.getByText('Filtrar reservas',{exact:true}).click();await selectDate(s.page,'Até','01/01/2000');await expect(s.page.getByRole('alert').filter({hasText:'período válido'})).toBeVisible();await s.page.clock.runFor(35000);assert.equal(s.requests.filter(r=>r.path==='/vehicles/reservations').length,before);await s.context.close();
        const denied=await setup({permissions:[]});await expect(denied.page.getByText('Você não tem permissão para consultar os carros.',{exact:true})).toBeVisible();assert(!denied.requests.some(r=>r.path.startsWith('/vehicles')));await denied.context.close();
    });
    await run('Vehicles pickers: mobile calendar and time selection replace typing and preserve the chosen local instants',async()=>{
        const s=await setup({mobile:true}),d=await fillBooking(s.page),date=inputDate(24).split('T')[0];
        for(const label of ['Data de início','Data de término','Horário de retirada','Horário de devolução'])await expect(d.getByLabel(label,{exact:true})).toHaveJSProperty('readOnly',true);
        await selectTime(d,'Horário de retirada','08:35');await selectTime(d,'Horário de devolução','09:15');
        await d.getByRole('button',{name:'Reservar agora',exact:true}).click();await expect(d.getByLabel('Finalidade da reserva')).toHaveValue('');const body=s.requests.find(r=>r.method==='POST').body;
        assert.equal(body.startDate,new Date(date+'T08:35:00-03:00').toISOString());assert.equal(body.endDate,new Date(date+'T09:15:00-03:00').toISOString());assert.deepEqual(s.errors,[]);await s.context.close();
    });
    await run('Vehicles pickers: the calendar respects February/leap days and the clock only offers valid 24-hour values',async()=>{
        const s=await setup(),d=await fillBooking(s.page);await d.getByLabel('Data de início',{exact:true}).click();let calendar=s.page.getByRole('dialog',{name:'Data de início',exact:true});await calendar.getByRole('combobox',{name:'Mês',exact:true}).selectOption('1');await calendar.getByRole('combobox',{name:'Ano',exact:true}).selectOption('2027');await expect(calendar.getByRole('button',{name:'28/02/2027',exact:true})).toBeVisible();await expect(calendar.getByRole('button',{name:'29/02/2027',exact:true})).toHaveCount(0);await calendar.getByRole('combobox',{name:'Ano',exact:true}).selectOption('2028');await calendar.getByRole('button',{name:'29/02/2028',exact:true}).click();await selectDate(d,'Data de término','29/02/2028');
        await d.getByLabel('Horário de retirada',{exact:true}).click();const clock=s.page.getByRole('dialog',{name:'Horário de retirada',exact:true});await expect(clock.getByRole('listbox',{name:'Horas',exact:true}).getByRole('option',{name:'24',exact:true})).toHaveCount(0);await expect(clock.getByRole('listbox',{name:'Minutos',exact:true}).getByRole('option',{name:'60',exact:true})).toHaveCount(0);await clock.getByRole('button',{name:'Cancelar',exact:true}).click();
        await selectTime(d,'Horário de retirada','09:30');await selectTime(d,'Horário de devolução','10:30');assert.equal(s.requests.filter(r=>r.method!=='GET').length,0);await d.getByRole('button',{name:'Reservar agora',exact:true}).click();await expect(d.getByLabel('Finalidade da reserva')).toHaveValue('');const body=s.requests.find(r=>r.method==='POST').body;assert.equal(body.startDate,'2028-02-29T12:30:00.000Z');assert.equal(body.endDate,'2028-02-29T13:30:00.000Z');assert.deepEqual(s.errors,[]);await s.context.close();
    });
    await run('Vehicles UI: mobile inline reservation fits width and searchable selection Escape restores focus',async()=>{
        const s=await setup({mobile:true}),d=await fillBooking(s.page);assert(await s.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const bounds=await d.boundingBox();assert(bounds.x>=0 && bounds.x+bounds.width<=390);await s.page.screenshot({path:path.join(shots,'vehicles-reservation-mobile.png'),fullPage:true,animations:'disabled'});
        await d.getByRole('combobox',{name:'Responsável',exact:true}).click();await d.getByRole('combobox',{name:'Responsável',exact:true}).fill('joao');await s.page.keyboard.press('Escape');await expect(d.getByRole('listbox')).toHaveCount(0);await expect(d.getByRole('combobox',{name:'Responsável',exact:true})).toBeFocused();await expect(s.page.getByRole('dialog')).toHaveCount(0);assert.deepEqual(s.errors,[]);await s.context.close();
    });
    async function fillQuick(page){
        const q=page.getByRole('form',{name:'Reserva',exact:true}),date=inputDate(48).split('T')[0];
        await q.getByLabel('Carro',{exact:true}).selectOption(carId);await q.getByLabel('Finalidade da reserva').fill('Reserva de carro');
        for(const label of ['Data de início','Data de término'])await selectDate(q,label,brDate(date));
        await selectTime(q,'Horário de retirada','09:00');await selectTime(q,'Horário de devolução','17:30');return {q,date};
    }
    await run('Vehicles calendar: keyboard crosses month/year, selecting updates the Brazilian date and Escape keeps the previous choice',async()=>{
        const s=await setup(),{q}=await fillQuick(s.page);await selectDate(q,'Data de início','31/12/2026');const field=q.getByLabel('Data de início',{exact:true});await field.focus();await field.press('ArrowDown');let calendar=s.page.getByRole('dialog',{name:'Data de início',exact:true});await expect(calendar.getByRole('button',{name:'31/12/2026',exact:true})).toBeFocused();await calendar.getByRole('button',{name:'31/12/2026',exact:true}).press('ArrowRight');await expect(calendar.getByRole('button',{name:'01/01/2027',exact:true})).toBeFocused();await calendar.getByRole('button',{name:'01/01/2027',exact:true}).press('Enter');await expect(field).toHaveValue('01/01/2027');await expect(field).toBeFocused();
        await field.click();calendar=s.page.getByRole('dialog',{name:'Data de início',exact:true});await calendar.getByRole('button',{name:'Mês anterior',exact:true}).click();await expect(calendar.getByRole('combobox',{name:'Mês',exact:true})).toHaveValue('11');await expect(calendar.getByRole('combobox',{name:'Ano',exact:true})).toHaveValue('2026');await calendar.getByRole('button',{name:'Próximo mês',exact:true}).click();await s.page.screenshot({path:path.join(shots,'vehicles-calendar-desktop.png'),animations:'disabled'});await s.page.keyboard.press('Escape');await expect(calendar).toHaveCount(0);await expect(field).toHaveValue('01/01/2027');await expect(field).toBeFocused();assert.equal(s.requests.filter(r=>r.method!=='GET').length,0);assert.deepEqual(s.errors,[]);await s.context.close();
    });
    await run('Vehicles clock: actual wheel scrolling changes only the draft, cancelling restores the value and keyboard selection confirms without submitting',async()=>{
        const s=await setup(),{q}=await fillQuick(s.page),field=q.getByLabel('Horário de retirada',{exact:true});await field.click();let clock=s.page.getByRole('dialog',{name:'Horário de retirada',exact:true}),minutes=clock.getByRole('listbox',{name:'Minutos',exact:true}),bounds=await minutes.boundingBox();await s.page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await s.page.mouse.wheel(0,120);await s.page.clock.runFor(500);await expect.poll(()=>clock.locator('output').innerText()).not.toBe('09:00');await expect(field).toHaveValue('09:00');await clock.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(field).toHaveValue('09:00');await expect(field).toBeFocused();
        await field.press('Enter');clock=s.page.getByRole('dialog',{name:'Horário de retirada',exact:true});let hours=clock.getByRole('listbox',{name:'Horas',exact:true});minutes=clock.getByRole('listbox',{name:'Minutos',exact:true});await expect(hours.getByRole('option',{selected:true})).toHaveText('09');await expect(minutes.getByRole('option',{selected:true})).toHaveText('00');await hours.focus();await hours.press('End');await hours.press('ArrowDown');await minutes.focus();await minutes.press('End');await minutes.press('ArrowDown');await expect(clock.locator('output')).toHaveText('23:59');await expect(field).toHaveValue('09:00');await s.page.screenshot({path:path.join(shots,'vehicles-clock-desktop.png'),animations:'disabled'});await s.page.keyboard.press('Escape');await expect(field).toHaveValue('09:00');
        await field.click();clock=s.page.getByRole('dialog',{name:'Horário de retirada',exact:true});hours=clock.getByRole('listbox',{name:'Horas',exact:true});minutes=clock.getByRole('listbox',{name:'Minutos',exact:true});await hours.focus();await hours.press('Home');await hours.press('ArrowDown');await minutes.focus();await minutes.press('Home');await minutes.press('ArrowDown');await minutes.press('Enter');await expect(clock).toBeVisible();assert.equal(s.requests.filter(r=>r.method!=='GET').length,0);await clock.getByRole('button',{name:'Confirmar horário',exact:true}).click();await expect(field).toHaveValue('01:01');await expect(field).toBeFocused();await expect(clock).toHaveCount(0);assert.deepEqual(s.errors,[]);await s.context.close();
    });
    await run('Vehicles pickers: mobile calendar and clock remain inside the viewport; outside dismissal preserves the saved value and scrolling is available',async()=>{
        const s=await setup({mobile:true}),{q}=await fillQuick(s.page);await q.getByLabel('Data de início',{exact:true}).click();let popup=s.page.getByRole('dialog',{name:'Data de início',exact:true});let bounds=await popup.boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=390);assert(bounds.y>=0&&bounds.y+bounds.height<=844);await s.page.screenshot({path:path.join(shots,'vehicles-calendar-mobile.png'),animations:'disabled'});await s.page.keyboard.press('Escape');await q.getByLabel('Horário de devolução',{exact:true}).click();popup=s.page.getByRole('dialog',{name:'Horário de devolução',exact:true});bounds=await popup.boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=390);assert(bounds.y>=0&&bounds.y+bounds.height<=844);for(const name of ['Horas','Minutos'])assert(await popup.getByRole('listbox',{name,exact:true}).evaluate(el=>el.scrollHeight>el.clientHeight));await s.page.screenshot({path:path.join(shots,'vehicles-clock-mobile.png'),animations:'disabled'});await s.page.getByRole('heading',{name:'Reserva',exact:true}).click();await expect(popup).toHaveCount(0);await expect(q.getByLabel('Horário de devolução',{exact:true})).toHaveValue('17:30');assert(await s.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(s.requests.filter(r=>r.method!=='GET').length,0);assert.deepEqual(s.errors,[]);await s.context.close();
    });
    await run('Vehicles reservation: all popup fields are inline, searching ignores accents and saving uses the selected responsible and notes',async()=>{
        const s=await setup(),{q}=await fillQuick(s.page);
        await expect(s.page.getByRole('button',{name:'Reservar carro',exact:true})).toHaveCount(0);await expect(s.page.getByText('Reserva rápida',{exact:true})).toHaveCount(0);
        await q.getByLabel('Finalidade da reserva').fill('Instalação no cliente QA');await q.getByLabel('Observações',{exact:true}).fill('Retirar equipamentos na sede.');
        await q.getByRole('combobox',{name:'Responsável',exact:true}).click();await q.getByRole('combobox',{name:'Responsável',exact:true}).fill('ANA');await expect(q.getByRole('listbox').getByRole('option')).toHaveCount(1);await expect(q.getByRole('listbox').getByRole('option')).toHaveText('Ána Souza');await q.getByRole('combobox',{name:'Responsável',exact:true}).press('Enter');assert.equal(s.requests.filter(r=>r.method==='POST').length,0);
        await expect(q.getByRole('combobox',{name:'Responsável',exact:true})).toContainText('Ána Souza');await q.getByRole('button',{name:'Reservar agora',exact:true}).click();await expect(s.page.locator('[data-vehicle-reservation]')).toContainText('Ána Souza');await expect(s.page.locator('[data-vehicle-reservation]')).toContainText('Retirar equipamentos na sede.');
        const body=s.requests.find(r=>r.method==='POST').body;assert.equal(body.responsibleId,people[2].id);assert.equal(body.title,'Instalação no cliente QA');assert.equal(body.notes,'Retirar equipamentos na sede.');await expect(s.page.getByRole('dialog')).toHaveCount(0);assert.deepEqual(s.errors,[]);await s.context.close();
    });
    await run('Vehicles reservation: matching names retain different IDs; no search match preserves selection and Tab closes search without changing the person',async()=>{
        const s=await setup(),{q}=await fillQuick(s.page);await q.getByRole('combobox',{name:'Responsável',exact:true}).click();await q.getByRole('combobox',{name:'Responsável',exact:true}).fill('joao');await expect(q.getByRole('option',{name:'João Silva',exact:true})).toHaveCount(2);await q.getByRole('option',{name:'João Silva',exact:true}).nth(1).click();
        await q.getByRole('combobox',{name:'Responsável',exact:true}).click();await q.getByRole('combobox',{name:'Responsável',exact:true}).fill('Pessoa inexistente QA');await expect(q.getByText('Nenhuma pessoa encontrada.',{exact:true})).toBeVisible();await q.getByRole('combobox',{name:'Responsável',exact:true}).press('Tab');await expect(q.getByRole('listbox')).toHaveCount(0);await expect(q.getByRole('combobox',{name:'Responsável',exact:true})).toContainText('João Silva');await q.getByRole('button',{name:'Reservar agora',exact:true}).click();await expect(s.page.locator('[data-vehicle-reservation]')).toContainText('João Silva');assert.equal(s.requests.find(r=>r.method==='POST').body.responsibleId,people[3].id);assert.deepEqual(s.errors,[]);await s.context.close();
    });
    await run('Vehicles responsible filter: server pagination and totals are combined with date and car; searching resets the page and does not alter the booking draft',async()=>{
        const s=await setup({multiple:true}),{q,date}=await fillQuick(s.page);
        const booking=(id,responsible,vehicle=initialCar)=>({id,title:'Reserva filtrável '+id,vehicle,responsible,startDate:new Date(`${date}T09:00:00-03:00`).toISOString(),endDate:new Date(`${date}T17:00:00-03:00`).toISOString(),notes:null,cancelledAt:null});
        s.state.reservations=[...Array.from({length:21},(_,i)=>booking('filtro-'+i,people[1])),booking('outro-responsavel',people[2]),booking('outro-carro',people[1],s.state.cars[1])];
        await s.page.getByText('Filtrar reservas',{exact:true}).click();await selectDate(s.page,'De',brDate(date));await selectDate(s.page,'Até',brDate(date));await s.page.getByLabel('Carro do filtro',{exact:true}).selectOption(carId);await expect(s.page.getByText('22 reservas no período',{exact:true})).toBeVisible();await s.page.getByRole('button',{name:'Próxima',exact:true}).click();await expect(s.page.locator('[data-vehicle-reservation]')).toHaveCount(2);
        const filter=s.page.getByRole('combobox',{name:'Responsável do filtro',exact:true});await filter.click();await s.page.getByRole('combobox',{name:'Responsável do filtro',exact:true}).fill('joao');await s.page.getByRole('option',{name:'João Silva',exact:true}).first().click();await expect(s.page.getByText('21 reservas no período',{exact:true})).toBeVisible();await expect(s.page.locator('[data-vehicle-reservation]')).toHaveCount(20);await expect(q.getByLabel('Finalidade da reserva')).toHaveValue('Reserva de carro');await expect(q.getByRole('combobox',{name:'Responsável',exact:true})).toContainText('Responsável QA');
        assert(s.requests.some(r=>r.method==='GET'&&r.params.responsibleId===people[1].id&&r.params.vehicleId===carId&&r.params.page==='1'));assert.equal(s.requests.filter(r=>r.method==='POST').length,0);
        await filter.click();await s.page.getByRole('combobox',{name:'Responsável do filtro',exact:true}).fill('todos');await s.page.getByRole('option',{name:'Todos os responsáveis',exact:true}).click();await expect(s.page.getByText('22 reservas no período',{exact:true})).toBeVisible();assert.deepEqual(s.errors,[]);await s.context.close();
    });
    await run('Vehicles responsible filter: read-only users can search inactive historical responsible people with a normal empty result',async()=>{
        const s=await setup({permissions:['schedule.view']});await s.page.getByText('Filtrar reservas',{exact:true}).click();await s.page.getByRole('combobox',{name:'Responsável do filtro',exact:true}).click();await s.page.getByRole('combobox',{name:'Responsável do filtro',exact:true}).fill('antigo');await s.page.getByRole('option',{name:'Responsável antigo QA',exact:true}).click();await expect.poll(()=>s.requests.some(r=>r.params.responsibleId==='40000000-0000-4000-8000-000000000009')).toBe(true);await expect(s.page.getByText('Nenhuma reserva neste período.',{exact:true})).toBeVisible();await expect(s.page.getByRole('form',{name:'Reserva',exact:true})).toHaveCount(0);assert(s.requests.every(r=>r.method==='GET'));assert.deepEqual(s.errors,[]);await s.context.close();
    });
    await run('Vehicles reservation: editing uses the same inline form and cancellation restores the create form without a request',async()=>{
        const s=await setup(),{q}=await fillQuick(s.page);await q.getByRole('button',{name:'Reservar agora',exact:true}).click();await expect(s.page.locator('[data-vehicle-reservation]')).toHaveCount(1);await s.page.locator('[data-vehicle-reservation]').getByRole('button',{name:'Editar',exact:true}).click();const editing=s.page.getByRole('form',{name:'Editar reserva',exact:true});await expect(editing.getByLabel('Finalidade da reserva')).toHaveValue('Reserva de carro');await editing.getByLabel('Finalidade da reserva').fill('Rascunho não salvo QA');await editing.getByRole('button',{name:'Cancelar edição',exact:true}).click();await expect(s.page.getByRole('form',{name:'Reserva',exact:true})).toBeVisible();assert.equal(s.requests.filter(r=>r.method==='PUT').length,0);assert.equal(s.requests.filter(r=>r.method==='POST').length,1);await expect(s.page.getByRole('dialog')).toHaveCount(0);assert.deepEqual(s.errors,[]);await s.context.close();
    });
    await run('Vehicles inline booking: the agenda row reserves directly for the current account; draft dates do not filter the list and saved booking becomes visible',async()=>{
        const s=await setup({multiple:true});await expect(s.page.getByText('Nenhuma reserva neste período.',{exact:true})).toBeVisible();const count=s.requests.filter(r=>r.path==='/vehicles/reservations').length,{q,date}=await fillQuick(s.page);
        await q.getByLabel('Carro',{exact:true}).selectOption('');await q.getByRole('button',{name:'Reservar agora',exact:true}).click();assert.equal(s.requests.filter(r=>r.method==='POST').length,0);
        await q.getByLabel('Carro',{exact:true}).selectOption(carId);assert.equal(s.requests.filter(r=>r.path==='/vehicles/reservations').length,count);await expect(s.page.getByRole('dialog')).toHaveCount(0);
        await expect(q.getByLabel('Finalidade da reserva')).toBeVisible();await expect(q.getByRole('combobox',{name:'Responsável',exact:true})).toBeVisible();await s.page.screenshot({path:path.join(shots,'vehicles-quick-desktop.png'),fullPage:true,animations:'disabled'});
        await q.getByRole('button',{name:'Reservar agora',exact:true}).click();await expect(s.page.locator('[data-vehicle-reservation]')).toContainText('Reserva de carro');const writes=s.requests.filter(r=>r.method==='POST');assert.equal(writes.length,1);
        assert.equal(writes[0].body.vehicleId,carId);assert.equal(writes[0].body.responsibleId,userId);assert.equal(writes[0].body.title,'Reserva de carro');assert.equal(writes[0].body.notes,null);
        assert.equal(writes[0].body.startDate,new Date(`${date}T09:00:00-03:00`).toISOString());assert.equal(writes[0].body.endDate,new Date(`${date}T17:30:00-03:00`).toISOString());
        await expect(q.getByLabel('Horário de retirada',{exact:true})).toHaveValue('');await expect(q.getByLabel('Horário de devolução',{exact:true})).toHaveValue('');
        await expect.poll(()=>s.requests.some(r=>r.method==='GET'&&r.params.vehicleId===carId&&r.params.start===new Date(`${date}T00:00:00-03:00`).toISOString())).toBe(true);
        assert.deepEqual(s.errors,[]);await s.context.close();
    });
    await run('Vehicles inline booking: bad date/time order sends no writes; a broken list filter does not block a valid overnight reservation',async()=>{
        const s=await setup(),{q,date}=await fillQuick(s.page),writes=()=>s.requests.filter(r=>r.method==='POST');
        await selectTime(q,'Horário de retirada','');await q.getByRole('button',{name:'Reservar agora',exact:true}).click();await expect(q.getByRole('alert')).toContainText('horários válidos');assert.equal(writes().length,0);await selectTime(q,'Horário de retirada','09:00');
        await selectDate(q,'Data de início',brDate(date));await selectTime(q,'Horário de devolução','08:00');await q.getByRole('button',{name:'Reservar agora',exact:true}).click();await expect(q.getByRole('alert')).toContainText('término deve ser depois');assert.equal(writes().length,0);
        await s.page.getByText('Filtrar reservas',{exact:true}).click();await selectDate(s.page,'Até','01/01/2000');await expect(s.page.getByRole('alert').filter({hasText:'período válido'})).toBeVisible();
        const next=inputDate(72).split('T')[0];await selectTime(q,'Horário de retirada','23:30');await selectDate(q,'Data de término',brDate(next));await selectTime(q,'Horário de devolução','00:15');
        await q.getByRole('button',{name:'Reservar agora',exact:true}).click();await expect(s.page.locator('[data-vehicle-reservation]')).toContainText('Reserva de carro');assert.equal(writes().length,1);assert.equal(Date.parse(writes()[0].body.endDate)-Date.parse(writes()[0].body.startDate),45*60000);await expect(s.page.getByRole('alert').filter({hasText:'período válido'})).toHaveCount(0);assert.deepEqual(s.errors,[]);await s.context.close();
    });
    await run('Vehicles inline booking: failed save preserves all fields and request ID on retry; editing a conflicted period uses a fresh identity',async()=>{
        const s=await setup(),{q}=await fillQuick(s.page);s.state.reserveFailure=true;await q.getByRole('button',{name:'Reservar agora',exact:true}).click();await expect(q.getByRole('alert')).toContainText('Falha ao salvar reserva QA');await expect(q.getByLabel('Horário de retirada',{exact:true})).toHaveValue('09:00');await expect(q.getByLabel('Horário de devolução',{exact:true})).toHaveValue('17:30');
        s.state.reserveFailure=false;await q.getByRole('button',{name:'Reservar agora',exact:true}).click();await expect(s.page.locator('[data-vehicle-reservation]')).toContainText('Reserva de carro');let writes=s.requests.filter(r=>r.method==='POST');assert.equal(writes.length,2);assert.deepEqual(writes[0].body,writes[1].body);assert.equal(s.state.reservations.length,1);await s.context.close();
        const other=await setup(),draft=await fillQuick(other.page);other.state.conflict=true;await draft.q.getByRole('button',{name:'Reservar agora',exact:true}).click();await expect(draft.q.getByRole('alert')).toContainText('já está reservado');await selectTime(draft.q,'Horário de devolução','18:00');other.state.conflict=false;await draft.q.getByRole('button',{name:'Reservar agora',exact:true}).click();await expect(other.page.locator('[data-vehicle-reservation]')).toContainText('Reserva de carro');writes=other.requests.filter(r=>r.method==='POST');assert.notEqual(writes[0].body.requestId,writes[1].body.requestId);assert.deepEqual(other.errors,[]);await other.context.close();
    });
    await run('Vehicles inline booking: unavailable choices disable the entire bar; mobile selection and saving work without a popup or overflow',async()=>{
        const failed=await setup({unavailable:true}),blocked=failed.page.getByRole('form',{name:'Reserva',exact:true});await expect(blocked.getByRole('button',{name:'Reservar agora',exact:true})).toBeDisabled();for(const label of ['Carro','Data de início','Horário de retirada','Data de término','Horário de devolução'])await expect(blocked.getByLabel(label,{exact:true})).toBeDisabled();assert(failed.requests.every(r=>r.method==='GET'));await failed.context.close();
        const s=await setup({mobile:true}),{q,date}=await fillQuick(s.page);await selectTime(q,'Horário de retirada','08:30');await selectTime(q,'Horário de devolução','17:30');
        assert(await s.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await q.screenshot({path:path.join(shots,'vehicles-quick-mobile.png'),animations:'disabled'});await expect(s.page.getByRole('dialog')).toHaveCount(0);await q.getByRole('button',{name:'Reservar agora',exact:true}).click();await expect(s.page.locator('[data-vehicle-reservation]')).toContainText('Reserva de carro');assert.equal(s.requests.filter(r=>r.method==='POST').length,1);assert.deepEqual(s.errors,[]);await s.context.close();
    });
};
