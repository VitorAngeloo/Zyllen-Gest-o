# Carros e reservas

**Estado atual — 18/09/2026:** cadastro, reservas e resumo da dashboard implementados durante R2, em área separada escolhida pelo usuário. Migration aplicada e API/shared/Prisma atualizados após autorização; o localhost já usa a API com carros disponíveis. Frontend ainda não publicado no Vercel. Não houve cadastro de carros ou reservas fictícias na base real.

## Acesso e funcionamento

**Carros**, na sidebar, abre `/dashboard/carros` no layout autenticado. Cadastro e agenda ficam nessa área própria. Reservas não exigem projeto/viagem nem são criadas automaticamente pelos seus compromissos. A dashboard apresenta disponibilidade pela agenda, carros em uso e até três próximas reservas, com acesso à área.

O cadastro tem nome, placa brasileira opcional e situação ativa/inativa. Placas são normalizadas sem espaço/hífen, em maiúsculas, e são únicas. Um carro pode ser inativado depois de cancelar ou transferir suas reservas atuais/futuras. Cadastro e histórico permanecem preservados.

### Reserva na agenda

**Reserva** reúne todo o formulário na própria faixa de **Agenda dos carros**: carro, finalidade, responsável, data de início/horário de retirada, data de término/horário de devolução e observações opcionais. **Reservar agora** envia diretamente, sem popup. O botão separado **Reservar carro** foi removido. A conta interna atual aparece como responsável inicial quando ativa; é possível escolher outra pessoa ativa. Um único carro ativo aparece selecionado; datas começam no dia atual e horários/finalidade devem ser informados.

**Responsável** permite abrir o campo e digitar para encontrar pessoas por parte do nome, sem distinção de letras maiúsculas/minúsculas ou acentos. A escolha identifica a pessoa pelo ID, preservando contas distintas com nomes iguais. Texto digitado apenas pesquisa; selecionar uma opção confirma a pessoa. Setas e Enter selecionam sem enviar o formulário; Escape ou Tab fecham a busca. Ausência de resultados mantém a seleção anterior. Pessoas inativas não recebem novas reservas.

**Editar** em uma reserva atual/futura preenche esse mesmo formulário com os dados salvos, incluindo observações e horários locais, e mostra **Salvar**/**Cancelar edição**. Salvar usa PUT no registro existente; cancelar edição não grava. Não há diálogo alternativo de reserva.

Datas são escolhidas em calendário e exibidas em **DD/MM/AAAA**. Horários são escolhidos em colunas de horas/minutos com rolagem e exibidos em **HH:MM**. Os quatro campos são somente de leitura; o preenchimento ocorre pelos seletores. A validação de calendário, formato e término posterior ao início permanece. Falha de opções/área indisponível ou ausência de carro/pessoa ativa bloqueiam o envio. Contas sem `schedule.create` não veem criação; edição depende de `schedule.update`. Falha/conflito preserva todos os campos. Repetir o mesmo payload conserva a identidade da solicitação; alterar qualquer campo enviado gera outra identidade na criação. Sucesso limpa finalidade/observações/horários, atualiza consultas e mostra a reserva na lista pelo carro, responsável e período. Uma reserva maior que o limite da consulta mostra seu dia inicial, sem encurtar o intervalo gravado.

**Filtrar reservas** fica em área separada, inicialmente recolhida: **De**, **Até**, **Carro do filtro** e **Responsável do filtro**. Ambos os campos de pessoa permitem digitar a busca. **Todos os responsáveis** remove somente o filtro de pessoa. A busca histórica oferece pessoas ativas e responsáveis inativos com reservas; esses últimos não entram no formulário de criação. As datas dos filtros usam o mesmo calendário e exibição DD/MM/AAAA, com dias locais inclusivos e limite de 366 dias para consulta.

O filtro de responsável é opcional em GET /vehicles/reservations (`responsibleId`, UUID). Ele combina com carro/período e é aplicado antes da paginação e do total. Trocar filtros retorna à primeira página; digitar o rascunho da reserva não altera os filtros. Um período inválido interrompe apenas a consulta da lista, sem impedir uma reserva válida.

Código: `VehicleReservationForm` concentra criação/edição/idempotência; `VehicleReservationDates` apresenta datas/horas e `VehicleReservationFilters` apresenta a consulta. `SearchableSelect` reutiliza busca com opções por ID/rótulo, preservando opções de texto dos consumidores anteriores. `VehiclesScreen` compõe os fluxos. Não há novos endpoints, mudança de schema do banco ou migration; transações/auditoria/regras de disponibilidade permanecem iguais.

**Validação do formulário unificado — 18/09/2026:** 21/21 cenários da API em PGlite descartável e 51/51 de navegador com respostas sintéticas aprovados. Conferidos formulário completo sem popup, busca sem acentos, seleção por teclado, nomes iguais com IDs distintos, filtro combinado antes de paginação/total, retorno à primeira página, responsável histórico inativo somente na consulta, edição no mesmo formulário, cancelamento sem escrita e regressões de datas/conflitos/retentativa/permissões/dashboard/espelho. Tipos locais, build isolado e arquitetura passaram (394 fontes, 1.275 dependências); computador/celular e localhost revisados. Resultados/capturas em `tmp/architecture-validation/personal-panels-browser-qa/` e `vehicle-unified-localhost-qa/`. Nenhuma reserva de teste foi enviada ao Supabase.

### Lista vazia e área indisponível

Consulta bem-sucedida sem registros mostra **Nenhum carro cadastrado.** e permite cadastrar o primeiro carro. Ausência de reservas mostra **Nenhuma reserva neste período.** Esses estados não geram aviso de erro.

Enquanto os endpoints de carros não estiverem publicados, suas consultas retornam 404. A tela e o resumo da dashboard mostram **A área de carros ainda não está disponível para uso.**, com aviso de situação e retentativa. Não interpretam esse retorno como lista vazia nem inventam indicadores zerados. Cadastro/reserva ficam desabilitados até a consulta de opções ter sucesso; reservas são consultadas após essa confirmação. Edição/cancelamento dependem também das opções disponíveis. Outras falhas de consulta continuam identificáveis, sem esconder problemas de conexão/permissão.

Conferência anterior à autorização em 18/09/2026, após o retorno do usuário: a API ativa continuava respondendo 404 para carros; a única migration pendente era `20260918100000_vehicle_reservations`. Backup/candidato e 14 checksums aplicados foram reconferidos somente em leitura. O ajuste da interface não aplicou a migration nem reiniciou a API; essa ativação ocorreu depois, na publicação autorizada registrada abaixo.

Validação deste ajuste: **38/38 cenários de navegador**, incluindo área indisponível, bloqueio de escrita, consulta vazia e recuperação; tipos, build isolado, arquitetura e links aprovados. API/shared/Prisma/configuração em produção permaneceram preservados. Respostas e cadastros dos testes são sintéticos, sem escrita no banco real.

Reserva exige carro ativo, finalidade, responsável interno ativo e instantes de início/término; observações são opcionais. A agenda filtra datas locais inclusivas, carro e responsável, com páginas de vinte reservas. Consulta por sobreposição inclui reservas iniciadas antes do período e ainda em andamento nele. O período máximo de consulta é 366 dias.

**Calendário e relógio de rolagem — refinamento de 18/09/2026:** **Data de início** e **Data de término** abrem calendário com mês/ano em português, navegação de meses e escolha pelo dia. Data selecionada e dia atual têm destaques distintos; **Hoje** seleciona a data atual. Setas movem o foco entre dias, PageUp/PageDown entre meses, Home/End até o primeiro/último dia e Enter confirma. O calendário considera a quantidade real de dias do mês e os anos bissextos. Os filtros **De**/**Até** reutilizam esse calendário.

**Horário de retirada** e **Horário de devolução** abrem o relógio com colunas roláveis de **Horas** (00–23) e **Minutos** (00–59), valor central destacado e prévia digital. Rolar, escolher uma opção ou usar o teclado atualiza somente o rascunho do seletor. **Confirmar horário** aplica HH:MM; **Cancelar**, Escape ou clique fora preservam o valor anterior. Reabrir recompõe o horário salvo, com as opções centradas. **Limpar horário** permite refazer a escolha. Setas, PageUp/PageDown e Home/End operam as colunas; Enter no relógio não envia a reserva.

Os campos mostram DD/MM/AAAA e HH:MM, são somente de leitura e têm ícones de calendário/relógio. Os seletores posicionam o conteúdo dentro da largura disponível; em pouca altura, o conteúdo permite rolagem. A seleção de data é aplicada ao clicar no dia; sair sem selecionar preserva a data anterior. Desabilitar o formulário fecha os seletores. Concluir uma escolha devolve o foco ao campo.

**Implementação:** `VehicleReservationDatePicker` e `VehicleReservationTimePicker` pertencem a `features/vehicles/components` e usam o Popover do Radix já instalado. `VehicleTimeWheel` separa a rolagem/seleção das colunas. `VehicleReservationDates` compõe os pares de retirada/devolução. A conversão e validação permanecem em `vehicle-reservation-period.ts`: horários locais do navegador viram os mesmos instantes UTC startDate/endDate; término deve ser posterior ao início, incluindo devolução no dia seguinte. Datas/horários continuam obrigatórios. API, contrato compartilhado, banco/migrations e processo em produção não são alterados neste refinamento.

**Validação dos seletores — 18/09/2026:** 54/54 cenários de navegador aprovados em `node scripts/quality/test-ticket-dashboard.cjs --panels`, com regressões de criação/edição/retentativa/conflitos/filtros/permissões/dashboard/espelho. Conferidos datas escolhidas por calendário, meses/anos bissextos, navegação pelo teclado entre meses/anos, rolagem real do relógio, rascunho até confirmar, cancelamento/Escape/clique fora, horário salvo recomposto, colunas centradas, obrigatoriedade/ordem dos períodos, conversão local/UTC e seletores dentro da tela no celular. Tipos locais, build isolado e arquitetura passaram (397 fontes, 1.283 dependências). Capturas de calendário/relógio no computador e celular em `tmp/architecture-validation/personal-panels-browser-qa/vehicles-{calendar,clock}-{desktop,mobile}.png`; resultados em `results.json` no mesmo diretório. A escolha também passou no frontend real do localhost, com API interceptada somente em GET, em `tmp/architecture-validation/vehicle-pickers-localhost-qa/`. Capturas revisadas e hashes preservaram API/shared/Prisma/configuração de produção, schema/migrations e auditoria. Nenhuma escrita de teste no Supabase, reinício da API ou deploy Vercel neste refinamento.

**Histórico da entrada brasileira:** antes da solicitação de calendário/relógio, as quatro entradas eram textos editáveis, com barras/dois-pontos ao sair do campo. A escolha visual acima substitui esse comportamento. Os utilitários de validação/normalização permanecem compatíveis com os valores existentes.

**Validação da entrada brasileira:** 42/42 cenários de navegador aprovados em `node scripts/quality/test-ticket-dashboard.cjs --panels`, incluindo doze de carros e regressões de chamados/dashboard/espelho. Conferidos digitação/backspace/formatação ao sair do campo, data/hora obrigatórias, datas inexistentes/ano bissexto, horas inválidas, término igual/anterior rejeitado sem requisição, devolução no dia seguinte, conversão local/UTC, edição sem nova reserva, conflitos, retentativa, cancelamento, RBAC, teclado e celular. Capturas de criação no celular/edição no computador revisadas; resultados em `tmp/architecture-validation/personal-panels-browser-qa/results.json`. Tipos locais, arquitetura (392 fontes, 1.265 dependências) e compilação isolada passaram. A digitação também passou no frontend real do localhost; hashes preservaram os artefatos/configuração de produção, schema/migrations e auditoria. Testes usaram somente respostas sintéticas interceptadas, sem escrita no Supabase ou publicação no Vercel.

Reservas concluídas ou canceladas ficam no histórico. Reservas atuais/futuras podem ser editadas ou transferidas para outro carro após revalidar disponibilidade. Cancelamento exige confirmação e preserva registro/data. Registros concluídos pela data final não podem ser alterados ou cancelados.

## Conflitos, disponibilidade e auditoria

O intervalo é **início inclusivo e término exclusivo**: terminar às 10h permite outra reserva às 10h. Sobreposição no mesmo carro é rejeitada; carros diferentes podem ser reservados simultaneamente. Canceladas não ocupam o recurso. Transações bloqueiam o carro, revalidam conflito e gravam reserva/auditoria atomicamente. Transferência bloqueia ambos os carros em ordem estável. Identificação persistente de solicitação evita duplicação ao repetir envio; reutilização com payload diferente é rejeitada.

**Disponíveis agora** conta carros ativos sem reserva não cancelada abrangendo o instante atual. **Em uso agora** conta carros distintos com essa reserva. É disponibilidade planejada: não comprova devolução física, limitação apresentada na dashboard. Próximas reservas têm início futuro, com limite de cinco na API e três no resumo.

Uma reserva futura não reduz **Disponíveis agora** até chegar seu início. Ao atingir o término exclusivo, deixa de ocupar o carro; outra reserva pode começar no mesmo instante. O resumo consulta a API a cada 30 segundos com a dashboard aberta e visível, recalculando a situação pelo relógio do servidor. Criar/editar/cancelar reserva invalida as consultas de carros na conta atual.

**Conferência da interface no localhost — 18/09/2026:** recarregado o frontend pela configuração inalterada do Next, recompilada a página de carros e aberto **Reservar carro** em uma sessão limpa do navegador. Os quatro campos de data/horário apareceram renderizados em `http://localhost:3000/dashboard/carros`. Respostas da API foram interceptadas com dados sintéticos, somente leitura, sem usar a sessão do usuário ou enviar reservas reais. Captura e resultado em `tmp/architecture-validation/vehicle-times-localhost-qa/`. O processo da API em produção e os hashes de código/configuração/schema/migrations permaneceram preservados.

Após a troca para campos de texto, a conferência no frontend real do localhost incluiu digitar os quatro valores pelo teclado e sair de cada campo. Resultado confirmado: `23/09/2026`, `08:30`, `23/09/2026`, `17:30`, com a mesma interceptação somente de leitura e sem enviar o formulário. Captura/resultado atualizados no diretório acima.

Consulta aceita `vehicles.view` ou `schedule.view`; criar reserva aceita `vehicles.reserve` ou `schedule.create`. Cadastro de veículo continua exigindo `schedule.create`, edição exige `schedule.update` e cancelamento de reserva exige `schedule.delete`. Assim, o Técnico consulta e reserva sem receber acesso a Projetos e Viagens nem alterar a frota; Gestor tem acesso à agenda e à gestão de carros. A API verifica permissões e audiência interna, inclusive em URL direta. O seed declara as permissões para futuras instalações, mas não deve ser executado no banco compartilhado. O espelho por link não compartilha carros nem acessa esses endpoints.

## Código, migration e verificação

`features/vehicles`: API, tela e formulários. `features/dashboard`: composição do resumo. `modules/vehicles`: controller, serviço e transações. Contratos em `packages/shared/src/vehicles`, via `@zyllen/shared`. Tabelas `Vehicle`/`VehicleReservation`, FKs restritivas, RLS privada e check de término posterior ao início.

Migration aditiva: `20260918100000_vehicle_reservations`. Gerada por diff de schemas locais e comparada ao banco real somente em leitura: apenas duas tabelas novas, índices e FKs. As 14 migrations existentes tiveram checksums conferidos; carros era a única pendência e foi aplicada após autorização. Há agora 15 migrations aplicadas e nenhuma pendente ou falha. Nenhuma migration anterior foi modificada. Publicação segue [implantação](implantacao.md): no Windows, regenerar Prisma com API parada e antes do build novo.

Backup privado de `public`/uploads/configuração/artefatos em `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\dashboard-20260918-1221`, protegido por ACL. A restauração das 59 tabelas passou. Outra cópia recebeu a migration, preservou contagens anteriores/RLS e passou seis verificações integradas com API candidata: indicadores, opções, espelho e cadastro/reserva/cancelamento sintéticos somente na cópia. Dump/logs/registros permanecem nesse diretório privado; servidores descartáveis encerrados.

```powershell
pnpm validate:isolated
pnpm check:architecture
pnpm test:vehicles
pnpm test:panels:migrations
pnpm test:panels:browser
```

`test:vehicles` usa NestJS/Prisma reais em PGlite descartável. Valida permissões, placa, retentativa, sobreposição, concorrência, alteração, cancelamento, períodos, inativação, ocupação e rollback de auditoria. Resultados: `tmp/architecture-validation/vehicles-api-qa/results.json`. Navegador verifica rascunhos/erros, ausência de escrita em consulta, datas, celular e foco. Nenhuma suíte escreve no Supabase.

Validação inicial da R2, antes da publicação: **20/20 API, 34/34 navegador, 3/3 cadeia de migrations e 6/6 cópia restaurada**. O ajuste posterior de indisponibilidade passou em 38 cenários de navegador. Builds isolados, tipos e arquitetura aprovados. Pré-publicação privada conferiu 196 hashes do candidato, 14 migrations aplicadas e uma pendência. Até essa etapa, API/shared/Prisma/configuração da produção permaneceram iguais ao backup. A ativação ocorreu na publicação abaixo; frontend não publicado no Vercel.

## Publicação autorizada — 18/09/2026

Após o usuário autorizar aplicar a migration, reconferidos candidato/backup/checksums e a única pendência. Criado outro dump privado de `public` antes da manutenção, com hash e leitura do arquivo verificados, preservando o backup anterior cuja restauração de 59 tabelas passou e a cópia validada em seis checks. Arquivo e metadados adicionais ficam no mesmo diretório protegido do backup.

Encerrado somente o processo validado da API, PID 17672. Shared compilado, Prisma Client regenerado com API parada e API compilada. Aplicada exclusivamente `20260918100000_vehicle_reservations` por `migrate deploy`. API voltou em 3001 com `NODE_ENV=production`, `node --enable-source-maps dist/main.js`, PID **21840**, sem watch. Configuração e chaves JWT/CPF preservadas; sem seed/reset ou cadastro fictício.

**Nove verificações de produção aprovadas:** equivalência das fontes/configuração; 15 migrations aplicadas com checksums corretos, nenhuma pendência/falha; duas tabelas novas com RLS, três FKs e check do intervalo; health e proteção JWT local/pública; rotas internas e privacidade do espelho preservadas; CORS e CSP do localhost corretos. Opções, reservas e indicadores de carros, além dos quatro leitores existentes da dashboard, passaram em transação `READ ONLY` real. Não foi criada sessão nem enviado cadastro de teste pela conta do operador; a conferência do envio pela conta real permanece distinta dessas verificações.

O cadastro e as reservas estão habilitados no localhost para contas com as permissões correspondentes. Recarregar a página ou usar a retentativa para descartar o aviso anterior. Esta publicação da API/banco não realizou push nem deploy Vercel.

Logs e evidências privados: `api-vehicles-run.log`, `api-vehicles-error.log`, `vehicle-migration-deploy-result.json`, `vehicle-production-verification.json` e `before-vehicles-current-backup.json`. Não copiá-los para artefatos públicos. PDF/evidências congeladas da auditoria preservados.

## Atualização do filtro de responsável — 18/09/2026

Para atender à reserva completa na agenda e ao novo filtro, atualizados exclusivamente os artefatos de `VehiclesService` e do contrato compartilhado de carros, com declarações/mapas correspondentes. Candidato compilado/verificado em diretório isolado e revisão confirmou que a API difere somente nas opções de pessoas e no filtro de consulta. Seis arquivos publicados com cópias anteriores privadas; encerrado somente o PID 21840. API atende 3001 com `NODE_ENV=production`, `node --enable-source-maps dist/main.js`, PID **24784**, sem watch.

O suporte ao `responsibleId` opcional está publicado e disponível no localhost. Oito consultas reais passaram em transação **READ ONLY**, incluindo paginação/total e carro; opções ativas/históricas, health local/público e proteção JWT conferidos. As 15 migrations continuam aplicadas, sem alteração/aplicação adicional. Schema do banco, Prisma gerado, configurações/chaves, demais artefatos da produção e auditoria preservados. Não houve seed, escrita fictícia, push ou deploy Vercel.

Logs/backups/resultados privados: `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\dashboard-20260918-1221\unified-reservations-20260918194053`, arquivos `api-unified-run.log`, `api-unified-error.log`, `publication-manifest.json`, `publication-result.json` e `verification-result.json`. Não copiar logs para documentos públicos.
