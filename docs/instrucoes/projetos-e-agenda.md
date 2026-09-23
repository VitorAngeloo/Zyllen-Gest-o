# Projetos e Agenda

**Atualização de 21/09/2026:** o cadastro de um projeto novo cria somente uma instalação. O endereço é obrigatório. Quando se seleciona um projeto já cadastrado, o nome existente é preservado e os dados de endereço podem ser completados; o campo de nome aparece apenas para um projeto novo ou na edição. Responsáveis internos são apresentados por setor, e os setores gravados são derivados deles. É possível vincular um acompanhamento existente do mesmo cliente/projeto; marcar **Destaque para acompanhamento** define urgência máxima.

Ao escolher um cliente para **Novo projeto**, o formulário sugere endereço, cidade e UF já cadastrados nele. Os campos permanecem editáveis para registrar o local real do projeto, que é salvo no próprio cadastro criado. Se for selecionado um projeto existente, prevalece o endereço desse projeto; ao voltar para **Criar novo projeto**, os dados sugeridos do cliente reaparecem.

O campo **Cliente** de Novo projeto permite digitar parte do nome para filtrar as empresas disponíveis antes de selecioná-las. Em **Novo Acompanhamento**, a busca consulta clientes pelo nome e a seleção de projeto usa a listagem vinculada ao cliente, inclusive para perfis com permissão de criar acompanhamentos sem acesso às configurações.

O formulário de **Novo projeto** pode ser cancelado pelo botão de fechar no canto superior direito, pelo botão **Cancelar** ou pela tecla Escape. O botão de fechar fica indisponível durante o salvamento.

**Terá viagem?** cria a viagem junto com o projeto, na mesma transação. O destino usa cidade/UF, endereço e período do projeto; a origem é informada separadamente. Somente colaboradores ativos de nível Técnico, Gestor ou Administrador podem participar; a conta de exibição **Dashboard** fica fora da seleção. Agenda mantém **Novo projeto** e **Novo agendamento**; a aba Viagens consolida os deslocamentos criados pelos projetos, sem cadastro avulso. Registros antigos continuam consultáveis. A migração aditiva [20260921130000_project_followup_link](../../apps/api/prisma/migrations/20260921130000_project_followup_link/migration.sql) já foi aplicada à base compartilhada.

Marcadores existentes são escolhidos no formulário do projeto. A criação de novos marcadores fica recolhida em **Projetos → Configurações de projetos**, fora do cadastro cotidiano. Os marcadores de teste sem vínculos foram removidos da base compartilhada em 21/09/2026 após backup. Os campos de texto do cadastro desativam sugestões de preenchimento automático do navegador.

Em **Vincular acompanhamento**, cada opção apresenta o código e o nome do projeto já associado, ou indica **Sem projeto vinculado**. A lista continua limitada ao cliente escolhido e ao projeto selecionado, quando houver; acompanhamentos de outro projeto não podem ser vinculados por engano.

O formulário de **Novo projeto** não apresenta mais **Sala ou totem atendido**. Projetos antigos que já possuem estrutura vinculada preservam o vínculo e permitem consultar seu histórico no detalhe. A aba Projetos mantém **Histórico de instalações** para consulta dos locais atendidos. As regras dos vínculos existentes estão em [estruturas e ciclos](estruturas-e-ciclos.md). Cada projeto mantém um único serviço.

**Estado em 18/09/2026:** API e migrações operacionais publicadas na R1; navegação unificada da R3 disponível no localhost, sem publicação do frontend no Vercel. A gestão segue a definição confirmada pelo usuário: **cada projeto possui exatamente um serviço operacional**, de instalação ou desinstalação.

## Área unificada

O menu **Projetos e Agenda** abre `/dashboard/projetos`, inicialmente em **Visão geral**. A tela reúne cinco abas, respeitando `schedule.view` e a sessão interna:

- **Visão geral:** indicadores de projetos e de instalações/desinstalações/viagens, com período compartilhado, atualização manual ou a cada 30 segundos. A hierarquia separa a situação atual dos resultados do período; viagens agendadas futuras permanecem visíveis no resumo atual mesmo quando estão fora do intervalo histórico. Falha de uma consulta preserva a outra seção. O filtro de serviço, dentro dos indicadores de projetos, vale somente para essa seção.
- **Projetos:** cadastro e lista de instalações/desinstalações, incluindo pendentes sem data, filtros, paginação, responsáveis e status.
- **Agenda:** calendário completo de projetos agendados, viagens e compromissos avulsos, com visualização em lista. Busca e filtros de tipo/status usam o mesmo escopo nas duas visualizações; todas as páginas de agendamentos são consultadas.
- **Viagens:** consolidação de deslocamentos criados por projetos, com filtros, responsáveis, detalhes e ações de realização. Não há entrada separada de viagens na sidebar.
- **Equipe:** consulta dos instaladores. Alterar cor/participação exige `schedule.manage_installers`; `schedule.view` permite somente consultar. Falha da consulta oferece nova tentativa e não aparece como equipe vazia.

Os controles de mês/período anterior e seguinte do calendário usam setas de texto com área clicável de 40 × 40 pixels; assim permanecem legíveis sem depender da fonte de ícones embutida do FullCalendar, bloqueada pela política de fontes da aplicação.

O endereço guarda a seleção: `/dashboard/projetos?aba=visao-geral`, `aba=projetos`, `aba=agenda&visao=calendario`, `aba=agenda&visao=lista`, `aba=viagens` ou `aba=equipe`. Recarregamento e navegação anterior/próxima do navegador mantêm a seção indicada. As abas permitem navegação com setas, Home/End e identificação acessível da seleção. No celular, a barra de abas pode ser rolada horizontalmente sem alargar a página. Somente a seção aberta consulta seus dados.

Links anteriores são normalizados para `/dashboard/projetos`: `/dashboard/agenda` abre Agenda em lista; `/dashboard/viagens` abre Viagens; `/dashboard/projetos/painel` e `/dashboard/operacoes` abrem Visão geral; `/dashboard/projetos/estruturas` abre Projetos com `historico=1`. Todos mantêm as cinco abas e a navegação normal do sistema. Os resumos da dashboard apontam diretamente para a aba correspondente.

Clicar em projeto agendado na Agenda consulta seu serviço pelo ID e abre o mesmo `ProjectServiceFormDialog` usado pela lista, com observações, marcador, responsáveis e demais campos. Aguardar a leitura atual antes de preencher o formulário, inclusive quando há detalhe em cache de uma abertura anterior. Permissão de atualização habilita edição; leitura não oferece gravação ou arraste. Viagens abrem seu próprio popup, e compromissos avulsos mantêm o formulário de agendamento. Carregamento/falha do detalhe permanece em popup, com fechamento e nova tentativa. Alterações na Equipe invalidam as consultas de instaladores, opções de projetos/viagens e agenda, para refletir cores e participação atualizadas.

União local em 18/09/2026, somente no frontend. Reutiliza registros e endpoints já publicados; não adiciona schema, migração ou associação automática de legados. A consulta real em transação `READ ONLY` confirmou 31 clientes nas opções, 57 responsáveis disponíveis e listas operacionais de projetos/viagens vazias. Ausência de registros apresenta mensagem normal; falhas reais oferecem nova tentativa. Opções indisponíveis desabilitam a abertura de um novo projeto.

## Cadastro e identidade

`/dashboard/projetos` permite criar um projeto para um cliente ou selecionar explicitamente um cadastro de projeto existente. O vínculo com `Company`/`Project` é preservado. `ProjectService.projectId` tem unicidade no banco, impedindo dois serviços para o mesmo projeto. Projetos antigos permanecem fora desta gestão até serem selecionados; agendamentos históricos não são associados automaticamente.

O cliente continua obrigatório, como no cadastro existente de `Project`. Após criação, o vínculo com cliente/projeto não é trocado pela tela operacional. Nome, endereço, cidade e UF usam o cadastro de projeto como fonte; os leitores da agenda exibem o nome/endereço atuais. Operações novas não vinculam automaticamente OS, chamados ou patrimônios.

Campos da gestão: serviço, marcador de modelo cadastrável, urgência normal/alta/urgente, cor, responsáveis internos e terceirizados, setores envolvidos, endereço, link HTTPS do Google Maps, observações, indicação de viagem e destaque para acompanhamento. Marcadores são reutilizáveis, com nome normalizado para evitar duplicação por maiúsculas/minúsculas; aparecem acima do título. São independentes das etiquetas Zebra.

## Datas e calendário

O cadastro pode ficar **pendente de agendamento**, sem datas ou responsáveis. Para agendar, informar início e término válidos e pelo menos um responsável interno ou terceirizado ativo. Execução somente por terceirizado é aceita.

Cada serviço vincula no máximo um `Schedule`. Seu intervalo é a única fonte da previsão: a tabela de Projetos e a Agenda usam os mesmos instantes. A alteração no formulário ou ao arrastar/redimensionar o evento atualiza esse intervalo. A Agenda reutiliza `ScheduleCalendar` e consulta todas as páginas do filtro; o calendário separado da página de projetos foi removido. Pendentes sem data continuam na tabela de Projetos.

Uma vez agendado, o intervalo é mantido nas edições; cancelar é uma ação de status, que preserva o evento e o histórico. Não há remoção física de serviços nesta entrega. Agendamentos avulsos e recorrências da Agenda continuam disponíveis; novos agendamentos de um projeto já operacional são feitos pela gestão desse projeto, sem criar um segundo serviço ou série para ele.

Conflitos de responsáveis internos e terceirizados são verificados na nova gestão. Conflito retorna aviso e exige confirmação explícita para prosseguir. Movimentos pelo calendário que conflitem são rejeitados e revertidos visualmente; ajustar ou confirmar pelo formulário. Nos eventos vinculados a projeto, a cor escolhida preenche o cartão do calendário e também sua borda; o texto branco recebe contorno e sombra pretos para continuar legível sobre cores claras. Compromissos avulsos continuam usando a cor do instalador, e a urgência textual permanece disponível.

Datas do formulário usam o fuso do navegador e são enviadas em ISO com offset. Gravações SQL da agenda convertem explicitamente para UTC, inclusive quando a sessão PostgreSQL usa outro fuso.

## Estado e eventos realizados

| Situação | Fonte |
|---|---|
| Pendente de agendamento | Serviço sem `Schedule` e sem cancelamento |
| Agendado / preparação | `Schedule.status = SCHEDULED` |
| Em andamento | `Schedule.status = IN_PROGRESS` |
| Finalizado | `Schedule.status = DONE` |
| Cancelado | `Schedule.status = CANCELLED` ou cancelamento explícito antes do agendamento |

O estado do projeto é o do seu único serviço. Ativos reúne pendentes, agendados e em andamento. Não há agregação de várias execuções.

Alterações de status registram início, conclusão e cancelamento realizados. A previsão ou `updatedAt` não confirma execução. Repetir o status não inventa nem reinicia a data real. Registros antigos sem essas datas continuam sem elas. Reabrir uma conclusão/cancelamento limpa a data vigente correspondente e preserva a anterior na auditoria. Cancelamento antes de agendar não cria evento; reabertura volta a pendente. Serviço sem agendamento precisa ser agendado antes de iniciar/concluir.

Projetos podem ser finalizados/cancelados mesmo quando um responsável histórico foi desativado; alterar seu planejamento exige substituir/remover responsáveis inativos. A indicação **Requer viagem** identifica uma necessidade. O cadastro estruturado e a confirmação de realização estão preparados localmente em [viagens e operações](viagens-e-operacoes.md). Quando vinculado, o formulário mostra a viagem e impede retirar a necessidade antes de desfazer esse vínculo pela gestão de viagens. Retirar a reserva mantém a necessidade marcada. Os conflitos incluem viagens; o intervalo do próprio deslocamento vinculado é uma sobreposição esperada, sem duplicar agendamentos.

## Dashboard geral de projetos

Acessar **Visão geral** em Projetos e Agenda. Os indicadores de projetos são uma seção de consulta, com os mesmos requisitos de `schedule.view`, sem criação, edição, arraste ou alteração de status. O layout usa leitura progressiva: **Situação atual** concentra ativos, andamento, pendências e agendamentos; **Resultados do período** reúne conclusões e cancelamentos; os cartões de acompanhamento aparecem abaixo em grade compacta, usando a cor do projeto como apoio visual. Para operar, selecionar a aba **Projetos**; a troca não concede permissões de escrita. O endereço anterior `/dashboard/projetos/painel` leva à visão geral. O espelho sem login permanece em rota própria, conforme [painel de acompanhamento](painel-de-acompanhamento.md).

| Indicador | Regra |
|---|---|
| Projetos ativos | Pendentes + agendados + em andamento, agora |
| Em andamento | Estado `IN_PROGRESS`, agora |
| Pendentes de agendamento | Sem agendamento e sem cancelamento, incluindo cadastros antigos sem data prevista |
| Agendados / preparação | Estado `SCHEDULED`, agora |
| Finalizados no período | Estado atual `DONE`, com `completedAt` real no intervalo |
| Cancelados no período | Estado atual `CANCELLED`, com `Schedule.cancelledAt` real ou cancelamento do serviço antes de agendar no intervalo |

São projetos operacionais únicos, independentemente do número de responsáveis. Cadastros legados sem `ProjectService`, eventos avulsos e recorrências não entram na contagem. O resumo usa todos os registros do filtro, sem ficar limitado à página da tabela. O total de projetos, os finalizados atualmente e os cancelados atualmente complementam os seis indicadores; `ativos + finalizados atuais + cancelados atuais + não classificados = total`.

O filtro de serviço vale para resumo, histórico, informações pendentes e cartões. Hoje, últimos 7/30 dias ou datas personalizadas controlam apenas os finalizados/cancelados do período; a situação atual inclui projetos anteriores. Os dias usam o fuso do navegador, convertidos a UTC, com início inclusivo e fim exclusivo. Períodos inválidos ou acima de 366 dias não geram consulta. A virada do dia atualiza os limites dos períodos relativos.

Uma reabertura remove a conclusão/cancelamento vigente dos indicadores. O evento anterior permanece na auditoria, mas não é contado como outra realização do projeto. Ao concluir/cancelar novamente, a nova data vigente determina o período. Registros finalizados/cancelados sem data real aparecem em aviso de histórico incompleto; não recebem `endDate` previsto nem `updatedAt` como substituto. Seus estados continuam nos totais atuais. Status inesperados são sinalizados como não classificados, sem virar projetos ativos automaticamente.

**Projetos para acompanhar** mostra até cinco ativos do filtro, ordenados por urgência, destaque, cadastro mais antigo e ID como desempate. Marcador aparece acima do título; cliente, serviço, estado, urgência e início previsto/ausência de data permanecem visíveis. É uma seleção de acompanhamento; não representa toda a lista de projetos. O contrato não expõe observações, contatos, credenciais ou anexos.

Dados atualizam a cada 30 segundos, com opção de atualização manual e horário da última consulta bem-sucedida. Falha inicial mostra erro, sem inventar zeros. Falha de atualização mantém o último dado do mesmo filtro com aviso de desatualização e tentativa novamente. Ao trocar serviço/período, dados anteriores não são apresentados como se pertencessem ao novo filtro.

`ProjectStatisticsService` concentra as contagens e a seleção limitada de cartões, em consultas parametrizadas com retry e uma transação de leitura `RepeatableRead`. Nenhuma alteração de schema adicional é necessária para esta etapa; depende da migração da gestão já preparada abaixo.

## Autorização e transações

Gestão interna, protegida por JWT e RBAC. Reutiliza as permissões existentes da agenda:

- `schedule.view`: listas, opções, detalhes, calendário e indicadores do dashboard.
- `schedule.create`: criar projeto/serviço e cadastrar marcador.
- `schedule.update`: editar, agendar projeto já criado e alterar status.

Cliente e terceirizado não recebem acesso a essas rotas internas. Ser executor terceirizado não autoriza editar a gestão. A interface permite consultar o formulário completo em modo de leitura e não oferece escrita/arraste sem permissão; a API valida independentemente.

Criação/edição reúne projeto, serviço, responsáveis, agenda e auditoria em uma transação. Agendamento, instaladores e recorrência da Agenda também são transacionais. Locks do serviço e do agendamento protegem alterações simultâneas do mesmo registro; unicidade reforça a cardinalidade. Erros deixam os dados anteriores preservados e o formulário disponível para correção.

## Código e API

- API: `apps/api/src/modules/project-services/`; consultas/alterações da agenda permanecem em `modules/schedule/`.
- Frontend: `apps/web/src/features/project-services/{api,hooks,components,screens,utils}/`; todas as entradas de compatibilidade delegam a `projects-agenda-screen.tsx`. `ProjectsOverview` compõe os dois leitores existentes com período comum e limites de erro separados. `ProjectServicesPanel`, `TripsScreen` e `ScheduleWorkspace` mantêm suas responsabilidades por negócio. `ProjectServiceDialog` consulta o detalhe atual para o formulário canônico da lista/agenda/histórico. `StructureHistory` recebe callback opcional para abrir projeto na consulta de locais; dentro do detalhe apresenta somente histórico, sem popup aninhado ou dependência circular.
- Contratos: `packages/shared/src/project-services/`, exportados por `@zyllen/shared`.
- Rotas: `GET /project-services`, `GET /project-services/options`, `GET /project-services/statistics`, `GET /project-services/:id`, `POST /project-services`, `PUT /project-services/:id`, `PUT /project-services/:id/status` e `POST /project-services/markers`.

Listagens têm pesquisa, tipo, status e paginação até 100; urgência vem primeiro. Respostas seguem `{ success, data }` ou `{ success, data, total, page, limit }`.

`GET /project-services/statistics` recebe `type=ALL|INSTALLATION|REMOVAL`, `start` e `end` em ISO com offset. Devolve `generatedAt`, filtro/período normalizados, `current`, `completedInPeriod`, `cancelledInPeriod`, `dataQuality` e `highlights`. A rota estática fica antes de `:id`. O componente `project-dashboard-view.tsx` apenas apresenta esse contrato, separado de autenticação, filtros, consultas e operações. Chamados e projetos reutilizam a conversão de dias em `lib/date-period.ts`, preservando os exports de compatibilidade dos chamados.

## Migração, validação e publicação

**R3 em 18/09/2026:** 82 cenários aprovados por `node scripts/quality/test-ticket-dashboard.cjs --panels --structures --projects-agenda --trips`, incluindo regressões de chamados, projetos/indicadores, viagens/operações, dashboard/espelho e carros. Conferidos cinco abas, destino inicial, período comum, falhas independentes, vazio normal, opções de clientes, links anteriores, menu único, teclado/celular, cadastro inline sem salvar projeto, histórico no popup de leitura e preservação do editor/calendário/equipe. Capturas e resultados em `tmp/architecture-validation/structures-browser-qa/`. Tipos, build isolado e arquitetura aprovados; hashes fora do escopo preservados, incluindo API/shared/Prisma reais, configuração, schema, migrations e auditoria. Navegador usa sessão/HTTP sintéticos; leitura real confirma as opções/listas publicadas, sem cadastros fictícios.

**União inicial de Projetos/Agenda/Equipe:** `pnpm test:projects:agenda:browser` aprovou 40 cenários de interface, incluindo 33 regressões anteriores de chamados, projetos, dashboards e viagens. Conferidos menu único, endereço anterior, abas/URL/teclado, editor completo e releitura de detalhe em cache, salvamento no mesmo serviço, calendário/lista com todas as páginas e filtros, equipe/atualização das opções, erros/nova tentativa e permissões. Capturas de computador/celular revisadas; artefatos em `tmp/architecture-validation/projects-agenda-browser-qa/`. Tipos, build isolado e arquitetura aprovados; 808 arquivos fora do escopo preservados, incluindo toda a API, schema, migrations, shared e auditoria. Testes usam sessão/HTTP sintéticos, sem banco real. Naquela entrega, a API operacional ainda dependia de publicação, realizada posteriormente na R1. A união do frontend não exige migração própria.

Migração [20260918030000_project_operational_service](../../apps/api/prisma/migrations/20260918030000_project_operational_service/migration.sql): quatro tabelas novas, índices/FKs, RLS sem políticas anon/authenticated e três timestamps opcionais em `Schedule`. Gerada por comparação offline dos schemas; não remove colunas, tabelas ou dados nem preenche registros antigos.

A migração acima já foi aplicada na publicação autorizada da R1; a conferência da R3 encontrou 15 migrations aplicadas, nenhuma pendência/falha. Para mudanças futuras, conferir drift e todas as migrations pendentes conforme [banco de dados](banco-de-dados.md). Aplicar somente a evolução revisada e atualizar API/web de forma coordenada conforme [implantação](implantacao.md). Gerar o Prisma Client da produção com a API parada; não usar reset, migrate dev ou seed. A R3 altera somente frontend/documentação/verificações e não requer nova migração.

```powershell
pnpm check:architecture
pnpm validate:isolated
pnpm test:projects
pnpm test:projects:browser
pnpm test:projects:statistics
pnpm test:projects:statistics:browser
pnpm test:projects:agenda:browser
```

Dependências do PGlite e runtime Chrome: [segurança](seguranca.md). API real e migração são verificadas em PostgreSQL em memória; a interface usa Next isolado com respostas sintéticas. Inclui cardinalidade, pendência sem data, executor terceirizado, intervalos/fuso, sincronização, conflitos, rollback, legado, permissões, teclado e celular, além das regressões dos chamados. Resultados ficam em `tmp/architecture-validation/project-services-{api,browser}-qa/`. PGlite serializa conexões; não representa ensaio de carga multiprocesso em produção.

Dashboard: `test:projects:statistics` passou em 36 cenários de API/migração, incluindo as 26 regressões anteriores; `test:projects:statistics:browser` passou em 21 cenários, incluindo as 14 regressões anteriores. Cobrem estados únicos, mais de uma página, vários responsáveis, conclusão/cancelamento reais, reabertura, fuso, limites, permissões, campos permitidos, filtros, falhas, atualização, virada do dia, teclado e celular. Artefatos ficam em `tmp/architecture-validation/project-statistics-{api,browser}-qa/`.

Gestão e indicadores estão reunidos no localhost, usando API/banco publicados. Refinamentos e conferência dos cadastros pela conta real seguem no [planejamento operacional](plano-evolucao-operacional-e-paineis.md).
