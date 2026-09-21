# Carros e reservas

**Estado atual — 21/09/2026:** o fluxo reserva → retirada → devolução está publicado no domínio. A migration aditiva `20260921110000_vehicle_checkout_return`, a API e o frontend foram publicados nessa ordem. As notas de 18/09 abaixo documentam o comportamento anterior e sua publicação.

## Refinamento publicado — fotos, movimentações e painel

Esta melhoria foi publicada em **21/09/2026**. Nos formulários, **Tirar foto** aciona a entrada de arquivo com preferência pela câmera traseira no celular; **Escolher imagem** mantém a alternativa de galeria/arquivo. O navegador e o aparelho controlam a interface da câmera. A foto selecionada aparece como prévia e pode ser removida antes do envio; o formato e o limite de 20 MB continuam validados. Imagens HEIC são convertidas para JPG no navegador quando ele puder decodificá-las; falhas de conversão são explicadas antes do envio. As fotos já registradas abrem em diálogo na própria tela, com foco e Escape, usando a sessão de mídia privada existente.

`GET /vehicles/operations` recebe a identidade autenticada e mostra somente reservas/percursos dos quais a pessoa é responsável ou condutora. Retiradas pendentes aparecem acima dos carros em uso e das devoluções recentes. Esse recorte pertence à API, além da interface. A agenda geral de reservas continua com suas permissões próprias.

O painel de Administrador/Gestor passa a aceitar `month=AAAA-MM`, `page` e `limit`. O mês é o da **retirada real**, em horário de São Paulo. Mostra retiradas, quilômetros dos percursos já devolvidos, atrasos e ocupação atual; gráficos por carro e setor; tabela paginada com condutor, operador que registrou retirada/devolução, destino, finalidade, hodômetros, combustível, avarias, prazo e fotos. Usos ainda abertos contam como retiradas, mas não geram quilômetros. O setor vem do cadastro **atual** do condutor; mudança posterior de setor altera a classificação histórica até que se adote um setor congelado por uso. O endpoint e a rota seguem protegidos por `ManagerGuard`, além da permissão interna.

Validação sem escrita de teste no banco compartilhado: build isolado de shared/API/web, tipos web, arquitetura, 22 cenários de API em PGlite descartável e 2 cenários em navegador com respostas sintéticas. A conferência da câmera em aparelho real e o teste operacional com conta real ainda dependem de uso da equipe.

**Prévia local com API isolada:** a instância candidata na porta 3002 precisa iniciar com `MEDIA_UPLOAD_ROOT` apontando para a raiz privada de `apps/api/uploads` da API principal. Ambas leem o mesmo banco; sem essa configuração, o painel encontra os registros, mas procura as fotos em `tmp/architecture-validation/api-build/apps/api/uploads` e exibe erro no popup. Em 21/09, a prévia foi reiniciada com a raiz correta; as duas fotos locais do uso existente foram encontradas nessa raiz, e a API principal na porta 3001 permaneceu em execução. Não colocar essa pasta no repositório nem expor `/uploads` diretamente.

**Publicação do refinamento — 21/09/2026:** commit `ba58579`, deployment Vercel `dpl_2U7RUKD3fcSRWPQUQip2HGR9EWfS` promovido para `skylineti.com` e `www.skylineti.com`. API de produção reiniciada como `node dist/main.js`, PID **30612**, porta 3001. Foram atualizados somente os artefatos compilados do módulo de veículos e do contrato compartilhado; o backup anterior está fora do repositório em `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\vehicle-dashboard-deploy-ba58579`. As 16 migrations já estavam aplicadas; nenhuma migration, seed ou alteração de dados foi necessária. Saúde local/pública respondeu `200`, e rotas de painel/operações sem autenticação responderam `401`. As páginas de Carros e Painel responderam `200` no domínio; o teste autenticado de visualização das fotos permanece para uso normal da equipe.

## Fluxo de uso e acesso

**Reservas** (`/dashboard/carros`) definem carro, responsável e janela planejada. Uma reserva futura não marca o carro como em uso. Quando chega o horário inicial, **Retiradas e devoluções** (`/dashboard/carros/movimentacoes`) permite registrar a retirada com condutor, cliente ou uso interno, destino, finalidade, quilometragem, foto do hodômetro, combustível e indicação de avarias. A retirada só é aceita dentro do período reservado e se nenhum outro uso daquele carro estiver aberto. Ela grava o horário real do servidor, o operador e auditoria; só então o carro passa a **Em uso**.

Na devolução são exigidos quilometragem (não inferior à de saída), foto do hodômetro e resposta sobre o destino inicial. O horário real do servidor libera o carro e registra `lateMinutes = max(0, arredondar para cima a diferença em minutos entre devolução e término da reserva)`. Se o prazo passar antes da devolução, o carro continua em uso e aparece como atrasado. Cancelamento e edição de reserva deixam de ser possíveis após uma retirada, mesmo quando a devolução já ocorreu; o histórico permanece. Fotos ficam em armazenamento privado e só são servidas mediante sessão de mídia e autorização interna para Carros.

Todos os colaboradores internos com `vehicles.view` e `vehicles.reserve` podem consultar, reservar, retirar e devolver. O perfil **Internos** recebe essas duas permissões de modo aditivo; sua dashboard inicial continua somente de leitura, e o acesso a Carros fica na sidebar. **Painel de carros** (`/dashboard/carros/painel`) e `GET /vehicles/dashboard` são exclusivos de Administrador e Gestor. O painel inicial mostra ativos, disponíveis, em uso e devoluções atrasadas; indicadores adicionais serão refinados depois. A API mantém `GET /vehicles/statistics` para os resumos da dashboard existente, agora com disponibilidade física baseada em retiradas/devoluções.

Rotas novas: `GET /vehicles/operations`, `POST /vehicles/reservations/:id/checkout`, `POST /vehicles/reservations/:id/return` e `GET /vehicles/dashboard`. Retirada e devolução recebem `multipart/form-data` com `odometerPhoto` obrigatório (JPG/PNG/WebP, até 20 MB); os formulários mantêm o preenchimento se houver erro. Tabela `VehicleUse` vincula uma retirada à reserva, impede dois usos simultâneos do mesmo carro e armazena os dados e os momentos reais. A migration também concede `vehicles.view/reserve` ao papel Internos existente, sem rodar o seed nem liberar manutenção ou gestão de agenda.

### Publicação e verificação — 21/09/2026

Commit `a9e429d`. Antes da aplicação, a única migration pendente foi comparada em leitura com o schema do banco. Backup privado do schema `public` e dos artefatos anteriores em `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\vehicle-flow-20260921-105356`, com ACL protegida. O dump foi aberto por `pg_restore` e restaurado integralmente em PostgreSQL isolado: 61 tabelas; a instância de teste foi encerrada. Nenhum dado sintético foi enviado ao banco de produção.

API de produção reiniciada como `node dist/main.js`, PID **15104**, porta 3001. As 16 migrations estão aplicadas e sem pendências. Saúde local e pública responderam `ok`; as rotas novas negam acesso sem autenticação (`401`). Leitura após a publicação confirmou tabela privada com RLS, índice que impede dois usos abertos do mesmo carro, permissões `vehicles.view/reserve` do papel Internos e zero usos inventados na implantação. O deployment Vercel `web-2kfv8tkev-skysuportevitor-7785s-projects.vercel.app` ficou `Ready` e foi promovido aos aliases `skylineti.com` e `www.skylineti.com`.

Verificações sem escrita na base compartilhada: **22/22** cenários integrados de veículos em PGlite descartável, **57/57** cenários da dashboard/painéis/agenda em Chrome com API sintética e **2/2** do novo fluxo no navegador, incluindo celular e acesso por papel. Build isolado de shared/API/web, tipos web e arquitetura aprovados. A confirmação operacional com uma reserva real pela equipe ainda depende de uso normal, não de cadastros de teste em produção.

## Histórico da implantação das reservas (18/09/2026)

### Acesso e funcionamento anteriores

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
