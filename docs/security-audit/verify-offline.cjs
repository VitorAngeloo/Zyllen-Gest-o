/* Executes real source methods against synthetic in-memory dependencies only.
 * Never loads .env, PrismaClient, a production controller module or any network.
 * These are audit reproductions of existing behavior, not regression assertions
 * for corrected behavior. Some checks should fail after the findings are fixed.
 */
const fs=require('fs'), path=require('path'), vm=require('vm'), assert=require('assert/strict');
const {createRequire}=require('module');
const root=path.resolve(__dirname,'../..');
const apiRequire=createRequire(path.join(root,'apps/api/package.json'));
const ts=apiRequire('typescript'), nest=apiRequire('@nestjs/common');
const results=[];
function load(file, overrides={}) {
 const full=path.join(root,file), localRequire=createRequire(full), module={exports:{}};
 const output=ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true,emitDecoratorMetadata:false,esModuleInterop:true}}).outputText;
 const req=name=>{
   if(overrides[name])return overrides[name];
   if(name.includes('prisma.service'))return {PrismaService:class{}};
   if(name.includes('auth.service'))return {AuthService:class{}};
   if(name.includes('access.service'))return {AccessService:class{}};
   if(name.includes('cpf-crypto'))return {encryptCPF:()=> '[synthetic-ciphertext]',decryptCPFSafe:()=>null};
   if(name.includes('permissions.decorator'))return {PERMISSION_KEY:'permission'};
   if(name.endsWith('.service'))return new Proxy({},{get:()=>class{}});
   if(name.endsWith('jwt-auth.guard'))return {JwtAuthGuard:class{}};
   if(name.endsWith('public.decorator'))return {Public:()=>()=>{},IS_PUBLIC_KEY:'isPublic'};
   return localRequire(name);
 };
 vm.runInThisContext(`(function(require,module,exports,__filename,__dirname){${output}\n})`,{filename:full})(req,module,module.exports,full,path.dirname(full));
 return module.exports;
}
const {MaintenanceService}=load('apps/api/src/modules/maintenance/maintenance.service.ts');
const {TicketsService}=load('apps/api/src/modules/tickets/tickets.service.ts');
const {RegistrationService}=load('apps/api/src/modules/registration/registration.service.ts');
const {ClientsService}=load('apps/api/src/modules/clients/clients.service.ts');
const {PermissionsGuard}=load('apps/api/src/modules/access/permissions.guard.ts');
const {ClientFollowupsController}=load('apps/api/src/modules/followups/client-followups.controller.ts');
const {ClientMaintenanceController}=load('apps/api/src/modules/maintenance/client-maintenance.controller.ts');
async function check(name,fn){await fn();results.push({name,result:'confirmed'});}
(async()=>{
 await check('Public registration adopts a caller-selected existing company and arbitrary project',async()=>{
   let created;
   const db={externalUser:{findUnique:async()=>null,create:async x=>(created=x.data,{id:'synthetic-client'})},company:{findUnique:async()=>({id:'victim-company',name:'Empresa Teste'})},maintenanceOS:{updateMany:async()=>({count:0}),findMany:async()=>[]}};
   await new RegistrationService(db,{}).registerClient({name:'Auditoria',email:'audit@example.invalid',password:'synthetic-only',companyId:'victim-company',projectId:'another-company-project'});
   assert.equal(created.companyId,'victim-company');assert.equal(created.projectId,'another-company-project');assert.equal(created.isActive,undefined);
 });
 await check('Public registration fuzzy match reassigns unrelated unlinked OS',async()=>{
   const writes=[];
   const db={externalUser:{findUnique:async()=>null,create:async()=>({id:'synthetic-client'})},company:{create:async()=>({id:'attacker-company',name:'SA'})},maintenanceOS:{updateMany:async x=>(writes.push(x),{count:1}),findMany:async()=>[{id:'victim-order',clientName:'SALA PRIVADA'}]}};
   await new RegistrationService(db,{}).registerClient({name:'Auditoria',email:'audit@example.invalid',password:'synthetic-only',companyName:'SA'});
   assert.deepEqual(writes[1],{where:{id:{in:['victim-order']}},data:{companyId:'attacker-company'}});
 });
 await check('Contractor-created OS mutates any existing asset identified in body',async()=>{
   let changed;
   const db={retry:fn=>fn(),asset:{findUnique:async()=>({id:'victim-asset',status:'ATIVO'}),update:async x=>(changed=x,{})},maintenanceOS:{findUnique:async()=>null,create:async()=>({id:'synthetic-order'})}};
   await new MaintenanceService(db).openOS({assetId:'victim-asset',openedByContractorId:'synthetic-contractor'});
   assert.deepEqual(changed,{where:{id:'victim-asset'},data:{status:'EM_MANUTENCAO'}});
 });
 await check('Locked signature block can be deleted',async()=>{
   let deleted=false;
   await new MaintenanceService({maintenanceOSFollowupBlock:{findFirst:async()=>({id:'signed-block',isLocked:true,type:'SIGNATURE'}),delete:async()=>{deleted=true;}}}).removeFollowupBlock('own-order','signed-block');
   assert.equal(deleted,true);
 });
 await check('Existing client witness signature can be overwritten',async()=>{
   let changed;
   const svc=new MaintenanceService({maintenanceOS:{update:async x=>(changed=x,{})}});
   svc.findById=async()=>({id:'own-order',companyId:'own-company',status:'OPEN',formType:'INSTALACAO_SALA',formData:{witnessSignature:'data:image/png;base64,ORIGINAL'}});
   await svc.clientSignWitness('own-order','own-company','data:image/png;base64,REPLACEMENT');
   assert.equal(changed.data.formData.witnessSignature,'data:image/png;base64,REPLACEMENT');
 });
 await check('Non-manager can take an already assigned ticket through assignWithPin',async()=>{
   let changed;
   const svc=new TicketsService({internalUser:{findUnique:async()=>({id:'attacker'})},ticket:{update:async x=>(changed=x,{})}},{validatePin:async()=>true});
   svc.findById=async()=>({id:'ticket',status:'IN_PROGRESS',assignedToInternalUserId:'other-technician'});
   await svc.assignWithPin('ticket','attacker','Técnico','synthetic-pin');
   assert.equal(changed.data.assignedToInternalUserId,'attacker');
 });
 await check('maintenance.execute alone passes the status route and service closes an OS',async()=>{
   const ctx={getHandler:()=>{},getClass:()=>{},switchToHttp:()=>({getRequest:()=>({user:{id:'technician',type:'internal',role:{name:'Técnico'}}})})};
   const guard=new PermissionsGuard({getAllAndOverride:()=> 'maintenance.execute'},{userHasPermission:async(u,s,a)=>s==='maintenance'&&a==='execute'});
   assert.equal(await guard.canActivate(ctx),true);
   let changed;
   const svc=new MaintenanceService({maintenanceOS:{update:async x=>(changed=x,{})},auditLog:{create:async()=>({})}});
   svc.findById=async()=>({id:'order',status:'OPEN',assetId:null});
   await svc.updateStatus('order','CLOSED','technician');
   assert.equal(changed.data.status,'CLOSED');
 });
 await check('External-user listing requests all scalar fields including passwordHash',async()=>{
   let query;
   const svc=new ClientsService({externalUser:{findMany:async x=>(query=x,[{id:'synthetic',passwordHash:'synthetic-hash'}]),count:async()=>1}},{});
   const result=await svc.findAllExternalUsers();
   assert.equal(query.select,undefined);assert.equal(query.omit,undefined);assert.equal(result.data[0].passwordHash,'synthetic-hash');
 });
 await check('Client followup list forces authenticated company and rejects foreign detail',async()=>{
   let params;
   const c=new ClientFollowupsController({findAll:async x=>(params=x,{data:[],total:0}),findById:async()=>({companyId:'foreign'})});
   const req={user:{id:'client',type:'external',companyId:'own'}};
   await c.listMyCompanyFollowups(req);assert.equal(params.companyId,'own');
   await assert.rejects(()=>c.findOne(req,'foreign-id'),nest.ForbiddenException);
 });
 await check('Client OS detail rejects foreign company; missing company cannot list',async()=>{
   const c=new ClientMaintenanceController({findById:async()=>({companyId:'foreign'})});
   await assert.rejects(()=>c.findOne({user:{type:'external',companyId:'own'}},'foreign-id'),nest.ForbiddenException);
   await assert.rejects(()=>c.listMyCompanyOrders({user:{type:'external'}}),nest.ForbiddenException);
 });
 await check('Signature-block ordinary update enforces isLocked',async()=>{
   const svc=new MaintenanceService({maintenanceOSFollowupBlock:{findFirst:async()=>({isLocked:true})}});
   await assert.rejects(()=>svc.updateFollowupBlock('order','block',{content:'altered'}),nest.ForbiddenException);
 });
 await check('RBAC rejects external and unauthorized internal users',async()=>{
   const guard=new PermissionsGuard({getAllAndOverride:()=> 'settings.manage'},{userHasPermission:async()=>false});
   const context=user=>({getHandler:()=>{},getClass:()=>{},switchToHttp:()=>({getRequest:()=>({user})})});
   await assert.rejects(()=>guard.canActivate(context({id:'external',type:'external'})),nest.ForbiddenException);
   await assert.rejects(()=>guard.canActivate(context({id:'internal',type:'internal',role:{name:'Internos'}})),nest.ForbiddenException);
 });
 await check('Upload filter accepts image/png claim while filename keeps .html extension',async()=>{
   const captured=[];
   load('apps/api/src/modules/tickets/client-tickets.controller.ts',{
     fs:{existsSync:()=>true,mkdirSync:()=>{throw Error('Filesystem mutation prohibited');}},
     multer:{diskStorage:opts=>opts},
     '@nestjs/platform-express':{FilesInterceptor:(field,count,opts)=>(captured.push(opts),class{})}
   });
   const opts=captured[0], file={originalname:'audit.html',mimetype:'image/png'};
   let accepted=false,name;
   opts.fileFilter({},file,(error,ok)=>{if(error)throw error;accepted=ok;});
   opts.storage.filename({},file,(error,value)=>{if(error)throw error;name=value;});
   assert.equal(accepted,true);assert.ok(name.endsWith('.html'));
 });
 const out={timestamp:new Date().toISOString(),productionRequests:0,databaseConnections:0,checks:results};
 fs.writeFileSync(path.join(__dirname,'offline-verification.json'),JSON.stringify(out,null,2)+'\n');
 console.log(JSON.stringify(out,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
