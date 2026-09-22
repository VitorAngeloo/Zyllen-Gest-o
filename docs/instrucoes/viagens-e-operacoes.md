# Viagens e painel operacional

**Atualização de 21/09/2026:** uma viagem nova nasce da opção **Terá viagem?** no cadastro do projeto, com participantes de nível Técnico ou superior. O destino, endereço e período vêm do projeto; a origem é informada no mesmo formulário. A aba Viagens é uma visão de consulta, filtros e acompanhamento de status. Os botões **Nova viagem** da Agenda e da aba Viagens e as rotas de criação/edição direta de viagem foram removidos. Viagens legadas permanecem visíveis. Os parágrafos datados de 18/09 abaixo documentam a implementação anterior e não descrevem mais a entrada atual de novos dados.

**Estado em 18/09/2026:** API/migração publicadas na R1. Na R3, cadastro e indicadores estão dentro de [Projetos e Agenda](projetos-e-agenda.md), disponível no localhost. Frontend ainda não publicado no Vercel.

## Cadastro único e acesso

Cadastrar em **Projetos e Agenda → Viagens → Nova viagem** (`/dashboard/projetos?aba=viagens`) ou pela aba **Agenda → Nova viagem**. Não há entrada separada de viagens na sidebar, nem botões levando a outra página de indicadores. O link anterior `/dashboard/viagens` é normalizado para a aba Viagens. A lista permite buscar nome/destino, filtrar status e trajeto e acessar todos os registros por páginas. O calendário existente identifica o deslocamento como **Viagem** e abre o mesmo cadastro em popup, inclusive para quem só possui acesso de leitura. Carrega todas as páginas dos agendamentos, preservando eventos além dos primeiros 100; erro de carregamento é informado.

`Trip` possui um `Schedule` único, responsável pelo intervalo previsto, estado e datas reais. Não há segundo calendário nem cópia editável das datas. O tipo técnico do agendamento é `OTHER`; a identidade explícita de viagem distingue-o dos eventos avulsos. Viagem não acrescenta um terceiro tipo de serviço: cada projeto continua com uma instalação ou desinstalação.

Informar nome, cidade/UF de origem e destino, saída/retorno previstos, responsáveis internos e/ou terceirizados, serviços atendidos e observações. O retorno deve ocorrer após a saída prevista e precisa existir pelo menos um responsável ativo. Terceirizado pode viajar sem colaborador interno. O calendário preserva a identificação desses responsáveis na lista e nas visualizações por horário.

**Regra provisória adotada para preparar a entrega:** origem preenchida em cada viagem, sem inventar uma cidade/base fixa. Interestadual significa UF de origem diferente da UF de destino; o cadastro aceita as 27 UFs brasileiras. A pergunta sobre base fixa foi enviada ao usuário, ainda sem resposta. Se houver base fixa, seu preenchimento inicial poderá ser ajustado, preservando o retrato da origem dos registros existentes.

## Vínculos, conflitos e histórico

Vários serviços podem apontar para uma viagem, que será contada uma única vez. Cada serviço possui no máximo uma viagem vinculada. Selecioná-lo indica `requiresTravel = true`; a tela de projetos mostra o vínculo e impede desmarcar a necessidade enquanto estiver associado. Retirar o vínculo pela viagem mantém a necessidade marcada, pois ausência de reserva não elimina a necessidade de deslocamento.

Não transferir um serviço implicitamente para outra viagem. Retirá-lo explicitamente da anterior antes de vinculá-lo à nova; viagens encerradas precisam ser reabertas para alterar o planejamento. A auditoria preserva os serviços e o trajeto anteriores. Cancelar viagem preserva os serviços, sem cancelá-los automaticamente. O painel sinaliza serviços ativos que precisam viajar e estão sem vínculo ou ligados a viagem cancelada.

Cadastros, agendamento, responsáveis, vínculos e auditoria são gravados na mesma transação. Serviços selecionados e o registro em alteração são bloqueados durante a escrita para proteger sua associação; as validações da agenda leem os responsáveis novamente após obter o bloqueio. Confere responsáveis internos/terceiros nos eventos avulsos, serviços e viagens sobrepostos. A sobreposição entre uma viagem e seus próprios serviços é esperada; eventos sem esse vínculo continuam sujeitos à checagem.

Conflitos precisam da confirmação explícita no formulário. Alterar o planejamento limpa essa confirmação. Arraste/redimensionamento conflitante é revertido; abrir o cadastro permite conferir e confirmar o conflito. Não é um ensaio de concorrência/carga do pool real, nem uma reserva exclusiva de horários no banco.

Não há exclusão física de viagens pela interface. Não são recorrentes; o endpoint da agenda rejeita cancelamento de série para viagem ou serviço operacional. Agendamentos avulsos e recorrências anteriores continuam disponíveis. Não há associação automática de viagens mencionadas em observações históricas.

## Datas reais e realização

**Regra provisória adotada:** ações **Iniciar viagem** e **Finalizar viagem** registram, respectivamente, o momento real de saída e retorno. Cada ação pede confirmação explicando a data que será registrada. A pergunta sobre lançamento manual de datas reais foi enviada, ainda sem resposta; não foi implementado preenchimento retrospectivo.

| Estado | Alteração permitida |
|---|---|
| Planejada (`SCHEDULED`) | Iniciar ou cancelar |
| Em viagem (`IN_PROGRESS`) | Finalizar, cancelar ou reabrir como planejada |
| Realizada (`DONE`) / cancelada (`CANCELLED`) | Reabrir como planejada |

Não finalizar antes de iniciar; a regra também vale quando o status é enviado pela API da agenda. Repetir um estado preserva suas datas. A previsão, o horário de atualização ou a passagem do tempo não confirmam realização. Origem/destino ficam preservados durante a viagem; para alterar o planejamento de uma viagem encerrada, reabrir antes.

Reabrir limpa as datas reais vigentes e exige nova saída para finalizar outra tentativa. As datas anteriores permanecem na auditoria. Uma viagem reaberta deixa de ser realização atual nos indicadores; ao concluir novamente, a nova data vigente determina o período. Registros finalizados sem data real são sinalizados, sem receber data prevista como substituto.

## Painel de leitura

Abrir **Projetos e Agenda → Visão geral**, seção **Instalações e viagens**. O endereço anterior `/dashboard/operacoes` leva à mesma visão geral, com as abas da área disponíveis para retornar à gestão. O período é compartilhado com os indicadores de projetos; falhas das duas consultas são tratadas independentemente. O painel é interno e usa a sessão normal; o espelho sem login mantém sua rota própria. `OperationsDashboardView` apenas apresenta o contrato de leitura, sem carregar formulários ou ações operacionais.

| Indicador | Fonte e regra |
|---|---|
| Instalações concluídas | `ProjectService` de instalação, atualmente `DONE`, com `Schedule.completedAt` real no período |
| Desinstalações concluídas | Mesma regra para serviço de desinstalação |
| Viagens previstas | `Trip` atualmente planejada/em andamento com saída prevista no período |
| Viagens realizadas | `Trip` atualmente `DONE`, com retorno real no período |

Exibe também planejadas/em viagem atualmente. Contagens usam todos os registros, sem depender da página da gestão ou multiplicar viagem por serviços/responsáveis. Início do período é inclusivo, término exclusivo; dias do navegador são convertidos a UTC, com intervalo máximo de 366 dias. Conversões SQL são explícitas mesmo quando a sessão PostgreSQL está em outro fuso.

As cinco seções são limitadas a cinco registros cada: próximas instalações futuras por início previsto; instalações relevantes ativas por urgência/cadastro; últimas instalações e desinstalações por conclusão real no período, da mais recente à mais antiga; próximas viagens interestaduais futuras por saída prevista. ID resolve empates. Pendentes sem data podem estar nos relevantes; status inesperados não são reclassificados automaticamente. Previsões e destaques independem do filtro histórico.

Atualização a cada 30 segundos, opção manual e horário da última consulta. Período inválido não consulta. Falha inicial apresenta erro, sem zeros presumidos; falha de atualização mantém os dados do mesmo período com aviso e tentativa novamente. Ao trocar período, dados anteriores não são apresentados como sendo do novo filtro. Consultas parametrizadas usam retry e uma transação de leitura consistente. O contrato do painel não seleciona notas, contatos, documentos, credenciais ou anexos.

## Permissões, migração e validação

`GET /trips`, `/trips/options`, `/trips/statistics` e `/trips/:id` exigem usuário interno e `schedule.view`. `POST /trips` exige `schedule.create`; `PUT /trips/:id` e `/trips/:id/status` exigem `schedule.update`. Administrador mantém o bypass existente. A entrega não concede permissões novas nem acesso à manutenção para `Internos`.

Migração aditiva [20260918040000_trips](../../apps/api/prisma/migrations/20260918040000_trips/migration.sql): duas tabelas privadas com RLS sem políticas públicas, coluna opcional `ProjectService.tripId`, índices e FKs. Gerada offline, não remove/preenche registros existentes. Depende de `20260918030000_project_operational_service`; a nova API da agenda consulta ambas as estruturas. Conferir drift e **todas** as pendências antes da publicação; seguir [banco de dados](banco-de-dados.md) e [implantação](implantacao.md) para client/API/web coordenados. Não aplicar migrações automaticamente na base compartilhada.

```powershell
pnpm check:architecture
pnpm validate:isolated
pnpm test:trips
pnpm test:trips:browser
```

Testes usam API/Prisma reais em PostgreSQL PGlite descartável e Next/Chrome com respostas sintéticas. Incluem as regressões anteriores de chamados/projetos/agenda. Artefatos ficam em `tmp/architecture-validation/trips-{api,browser}-qa/`; dependências em [segurança](seguranca.md). Builds não substituem `dist`, Prisma Client ou processo da API em produção. PGlite não representa ensaio de carga multiprocesso.

**Resultado da entrega inicial em 18/09/2026:** 54 cenários de API/migração e 33 de interface aprovados; arquitetura, tipos e builds isolados aprovados. Capturas de computador/celular revisadas; popup de leitura abre pelo cabeçalho, mantém campos legíveis e preserva foco/teclado. Naquela entrega, processo da API e 754 arquivos fora do escopo permaneceram preservados. A aplicação da migração ocorreu posteriormente na R1; a R3 usa esses endpoints sem alterar banco ou backend. Cadastro pela conta real não foi testado com gravação de registros fictícios.

## Estruturas e ciclos

O complemento aparece como **Histórico de instalações** dentro da aba Projetos e no detalhe do projeto: identidade da sala/totem por cliente/nome, vínculo explícito com instalação/desinstalação, tentativas canceladas e ciclos anteriores preservados, datas reais e duração instalada. A regra e a migração aplicada na R1 estão em [estruturas e ciclos](estruturas-e-ciclos.md). Não há vínculo presumido por endereço, nome de projeto ou patrimônio; os serviços e viagens existentes funcionam sem associação.
