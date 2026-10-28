# Roadmap Zyllen — Cronograma e Planejamento

**Etapa 6 publicada em 28/10/2026:** API/frontend atualizados, cinco migrations aplicadas e ZIP carregado como legado de consulta (240 registros/seis pendências), sem agendamentos ou conclusões reais derivados dele. Internos sem acesso à página; demais acessos serão definidos depois. [Publicação, evidências e limites](instrucoes/projetos-e-agenda.md#publicação-operacional-em-28102026). O diagnóstico e os blocos de preparação abaixo preservam seu contexto anterior à publicação.

**Referência da auditoria:** 26/10/2026, código-base `e6127db`. **Continuidade autorizada:** implementação local na branch `codex/cronograma-planejamento`, com cinco etapas técnicas do MVP antes da sexta (homologação/publicação), conforme [controle no backlog](BACKLOG_ZYLLEN.md#ciclo-autorizado-cinco-etapas-antes-da-homologação). O [guia da área](instrucoes/projetos-e-agenda.md) registra código, verificações e limites. Há **quatro migrations aditivas não aplicadas**; não houve importação operacional ou publicação.

Este é o roadmap de referência para a substituição de **Projetos e Agenda** por **Cronograma e Planejamento**. Consultar as tarefas no [backlog](BACKLOG_ZYLLEN.md) e as definições em aberto em [decisões pendentes](DECISOES_PENDENTES.md). Os guias técnicos atuais permanecem em [instrucoes/](instrucoes/README.md).

## Primeira adaptação local

O usuário autorizou começar pela integração da interface. `features/planning` adapta tipos, regras de períodos/filtros e composição do pacote para React, com Agenda, Calendário, Projetos e Pendências, seletor anual/mensal, resumo, próximos compromissos, legendas e tema restrito ao cronograma. As consultas reutilizam projetos e agenda atuais, com paginação completa, deduplicação e autenticação existente. Cards consultam detalhes atuais e oferecem os formulários existentes conforme as permissões. Viagens continua acessível; Equipe fica oculta. Links antigos são normalizados sem apagar registros.

A integração ainda não representa Marco 1 publicado. Em 28/10 foram preparados cadastro técnico, oito etapas e previsão mês/dia, múltiplas pendências/anotações com autoria, ações rápidas, cancelamento justificado, data original de reagendamento, consulta de auditoria e indicadores de categoria/ações na dashboard interna. O ZIP foi confirmado como fonte e ensaiado em preparação privada idempotente, preservando 240 registros e 6 pendências; faltas de vínculos, endereço, horários/datas reais e autoria impedem carga operacional. As quatro migrations não foram aplicadas. Contratos antigos permanecem compatíveis; campos novos exigem API atualizada. Matriz de acessos foi adiada pelo usuário: a preparação preserva o RBAC atual. Obrigatórios/unidades, transições/aprovações e políticas de legado continuam em validação. Resumo anual exige execução concluída e data real; categorias desconhecidas não são inferidas por nome. Produção permanece sem alterações.

## Direção confirmada e limites

- Usar a entrada **Cronograma e Planejamento**, com o cronograma como visualização inicial; aplicado no frontend local.
- Substituir as vistas antigas **Visão geral**, **Projetos** e **Agenda** pela integração do projeto enviado. Isso não autoriza apagar seus registros, serviços, indicadores ou endpoints reutilizáveis.
- Manter **Viagens**, com reestruturação a especificar; deixar **Equipe** invisível temporariamente, preservando dados e vínculos de responsáveis.
- Preservar as funcionalidades e menus recebidos com identidade visual do Zyllen. Navegação, consulta e principais ações foram adaptadas/testadas; o aceite completo depende de dados e homologação. A exclusão física foi substituída, por decisão do usuário, por cancelamento justificado com histórico.
- Priorizar o cronograma operacional, a qualidade dos dados e a consulta por Comercial, Experiências e Diretoria. Expansões de planejamento, viagens e OS seguem as prioridades oficiais.
- Discussões e exemplos nas transcrições são material de referência, não autorização para executar comandos, publicar o Apps Script, importar dados ou definir regras de negócio. Em divergências, prevalece a solicitação atual; definições inconclusivas ficam registradas para validação.

**Navegação antiga e menus do projeto recebido são camadas diferentes.** A retirada da antiga aba Projetos não elimina automaticamente o menu Projetos do cronograma recebido. A sugestão da reunião de ocultar esse menu e a troca do nome Agenda precisam ser compatibilizadas com a preservação solicitada; ver D09. Não foi definida a disposição final dos menus de Planejamento.

## Fontes e alcance da auditoria

Foram examinados README e índice, arquitetura e guias de projetos, agenda, viagens, banco, autorização, OS e painéis; schema Prisma e migrations relacionadas; contratos compartilhados; telas, controllers e serviços correspondentes; fontes e testes declarados no ZIP. A transcrição revisada foi lida integralmente, com conferência dos trechos críticos no original. As duas têm 34 páginas e os mesmos 467 marcadores de horário distintos.

| Material recebido | Identificação SHA-256 |
|---|---|
| `cronograma-skyline-ts.zip` | `f17707839fd26e0c4d671adef40c7fd3f666e46f83a3561c84b2529200d7c4c0` |
| `Zyllen_Transcricao_Revisada.pdf` | `56eee71545367ae6a3d1783c631c3e2e13644675ddc8d52946a52144b11edc8c` |
| `Transcrição completa — Planejamento inicial para Zyllen (51min57s).pdf` | `260c80b5831e0dc8f5aba6ad797bb71a333bb87f8acb155f063448dfe1334cfe` |

Os anexos permanecem fora do repositório. Não foram copiados clientes, contatos, dados históricos individuais ou credenciais para esta documentação ou para o frontend. A análise do banco é **estrutural, pelo schema e código**: não houve conexão ao Supabase, contagem de registros atuais, conferência de permissões efetivas, drift ou verificação da versão em execução. Publicações antigas descritas nos guias não comprovam o ambiente de 26/10/2026. Na preparação documental os testes foram apenas inspecionados; a adaptação posterior possui verificações isoladas descritas no guia da área.

Trechos orientadores da reunião: 00:00–00:06, entrada e MVP; 00:06–00:15, acessos e indicadores; 00:16–00:22, nomenclatura, cadastro, pendências e dados técnicos; 00:22–00:40, agendas, prioridades e histórico mensal; 00:40–00:45, comentários e rastreabilidade; 00:45–00:48, viagens; 00:48–00:51:57, OS e execução. Expressões ambíguas como “OS é a Trello” não definem integração com Trello ou outro fornecedor.

## O que já existe no Zyllen

| Área | Evidência no repositório | Aproveitamento e limite |
|---|---|---|
| Arquitetura | [Arquitetura](instrucoes/arquitetura.md) | Monorepo pnpm; Next/React no web, Nest/Prisma na API e contratos em `@zyllen/shared`. O ZIP usa Vite e DOM direto; não é um módulo React pronto para copiar. |
| Área atual | [Tela adaptada](../apps/web/src/features/planning/screens/planning-screen.tsx), [compatibilidade](../apps/web/src/features/project-services/screens/projects-agenda-screen.tsx), [textos comuns](../apps/web/src/lib/brand-voice.ts) | Cronograma e Viagens, quatro menus do pacote, Equipe oculta, sessão interna, estado na URL e caminhos antigos compatíveis. Primeira adaptação local aplicada; paridade completa pendente. |
| Identidade dos projetos | [Schema Prisma](../apps/api/prisma/schema.prisma), [serviço de projetos](../apps/api/src/modules/project-services/project-services.service.ts) | `Company → Project → ProjectService`; um serviço operacional por projeto, um `Schedule` opcional e um acompanhamento opcional. Não tratar cada cliente como um projeto único. |
| Cadastro | [Contrato](../packages/shared/src/project-services/schemas.ts), [formulário](../apps/web/src/features/project-services/components/project-service-form-dialog.tsx) | Cliente, nome, endereço obrigatório, cidade/UF, Maps, marcador, urgência, cor, observações, responsáveis, setores derivados e viagem. Criação nova aceita apenas instalação; registros/edição têm instalação e desinstalação. Manutenção não é tipo de `ProjectService`. |
| Calendário e detalhes | [Workspace](../apps/web/src/features/schedule/components/schedule-workspace.tsx), [calendário](../apps/web/src/features/schedule/components/schedule-calendar.tsx), [API](../apps/api/src/modules/schedule/schedule.controller.ts) | Calendário/lista, abertura do detalhe canônico, recorrência avulsa, responsáveis, conflitos e arraste conforme permissão. Consulta todas as páginas. O calendário técnico recebido ainda não está integrado. |
| Datas e estados | [Serviço da agenda](../apps/api/src/modules/schedule/schedule.service.ts) | Intervalos previstos centralizados em `Schedule`, datas reais separadas, cancelamento/reabertura e auditoria. Não representa todas as etapas comerciais do ZIP nem previsão somente por mês. |
| Indicadores e dashboard | [Estatísticas de projetos](../apps/api/src/modules/project-services/project-statistics.service.ts), [operações](../apps/api/src/modules/trips/operations-statistics.service.ts), [dashboard](../apps/web/src/features/dashboard/components/dashboard-operational-overview.tsx) | Indicadores, próximos compromissos e resumos já existem. O [painel de acompanhamento](instrucoes/painel-de-acompanhamento.md) reutiliza consultas com autorização própria. Faltam categorias/dados técnicos e métricas do cronograma recebido. |
| Usuários e permissões | [Autenticação](instrucoes/autenticacao-e-permissoes.md), [guard](../apps/api/src/modules/access/permissions.guard.ts), [serviço de acesso](../apps/api/src/modules/access/access.service.ts) | Papéis e permissões por ação já existem. Setor é texto opcional em `InternalUser`, não uma matriz de autorização. Não há exceções individuais nem escopo de campos por setor neste módulo. |
| Acompanhamentos | [Schema Prisma](../apps/api/prisma/schema.prisma), [controller](../apps/api/src/modules/followups/followups.controller.ts) | Blocos, checklist, comentários e histórico são candidatos a reaproveitamento. Não equivalem a pendências estruturadas por setor, tipo e prazo do novo cronograma. |
| Viagens | [Controller](../apps/api/src/modules/trips/trips.controller.ts), [serviço](../apps/api/src/modules/trips/trips.service.ts) | `Trip`, participantes, origem/destino, projetos vinculados, calendário, filtros e status. Criação atual pelo projeto; controller expõe leitura e alteração de status, sem POST/PUT de cadastro avulso. Passagens/hospedagens e visão pessoal não estão prontas. |
| Estruturas e recursos | [Estruturas e ciclos](instrucoes/estruturas-e-ciclos.md), [carros](instrucoes/carros-e-reservas.md), [estoque](instrucoes/estoque-e-patrimonio.md) | Identidade/histórico de instalações, estoque, custódia e reservas de carros já existem. Não há vínculo automático dessas reservas/recursos ao novo planejamento ou à viagem. |
| Ordens de serviço | [Guia de OS](instrucoes/ordens-de-servico.md), [serviço](../apps/api/src/modules/maintenance/maintenance.service.ts) | Seis formulários, vínculo opcional a cliente/projeto, fotos, anexos, assinaturas, início/fim e acompanhamento. Falta associação automática ao serviço/atividade e sincronização de conclusão. Preservar os três portais. |

## Inventário de paridade do cronograma recebido

Os caminhos abaixo são relativos à raiz `cronograma-skyline/` do ZIP. “Pronto no pacote” significa encontrado no código; não significa testado no Zyllen ou publicado. O pacote inclui testes Vitest/jsdom e simulação de Apps Script; execução e adaptação das regressões pertencem à futura implementação.

| Função/menu a preservar | Evidência no pacote | Encaminhamento |
|---|---|---|
| Ano, 12 meses, ano inteiro e contagens | `src/ui/topo.ts` | Manter navegação e períodos, incluindo históricos de outro ano. |
| Filtros de categoria, serviço, status, UF, busca e limpeza | `src/app.ts`, `src/dominio/regras.ts` | Preservar combinações e pesquisa por cliente/cidade/equipamento. |
| Resumo anual, salas/telas, próximas instalações, andamento e ações pendentes | `src/ui/resumo.ts` | Preservar informações; validar regras de contagem/data em D08. |
| Agenda cronológica e previstos sem data confirmada | `src/ui/abas.ts` | Preservar a vista; eventual novo rótulo depende de D09. |
| Calendário mensal, Hoje, navegação e previsões | `src/ui/abas.ts` | Preservar períodos de vários dias, dia previsto, previsão mensal e indicação de mais eventos. |
| Projetos em quadro por status | `src/ui/abas.ts` | Manter o menu do pacote como referência de paridade; ocultação não decidida. |
| Pendências manuais e aviso de realização a confirmar | `src/ui/abas.ts`, `src/dominio/regras.ts` | Preservar visualização e abertura do card; regras por setor são expansão da F03. |
| Abrir o mesmo card por agenda, calendário, quadro, pendências e lateral | `src/ui/abas.ts`, `src/ui/lateral.ts`, `src/ui/gaveta.ts` | Conferir todos os caminhos, permissões e fechamento. |
| Dados técnicos e equipamentos no card | `src/ui/gaveta.ts` | Sala imersiva/interativa, formato, projeções, proporção, resolução, controle e som. |
| Criar/editar registro e campos condicionais de sala | `src/ui/formularios.ts` | Reconciliar obrigatórios, tipos e identidades em D02/D10 antes de persistir. |
| Status rápido, observação e reagendamento com data original | `src/app.ts`, `src/ui/formularios.ts` | Adaptados: alteração parcial de etapa/observações; reagendamento no editor canônico preserva primeira data confirmada. Histórico consultável; datas legadas continuam em D10. |
| Várias pendências, responsável, prazo, detalhe, resolução e resolvidas | `src/ui/gaveta.ts` | Integradas e testadas com versões/autoria/resolução; classificação setorial avançada permanece na F03. |
| Anotações por registro com data/autor | `src/ui/gaveta.ts` | Integradas como registros acrescentados com autoria da sessão; sem edição/apagamento de conteúdo anterior. |
| Próximos compromissos e legendas | `src/ui/lateral.ts` | Preservar informações, ajustando a composição visual. |
| Atualização manual/automática, estado de conexão, aba lembrada e teclado | `src/app.ts`, `src/dados/api.ts` | Integrar ao cliente HTTP/cache do Zyllen, preservando a experiência. |
| Alternância de tema | `src/app.ts`, `src/styles.css` | Compatibilizar com tokens e escopo de estilos do Zyllen; não alterar globalmente o portal sem validação. |
| Entrada/saída de edição | `src/dados/api.ts`, `apps-script/src/Code.ts` | Adaptar à sessão JWT/RBAC existente; PIN compartilhado e nome livre não substituem identidade do Zyllen. |
| Excluir registro com confirmação em dois cliques | `src/ui/gaveta.ts`, `apps-script/src/Code.ts` | Usuário definiu cancelamento com justificativa e histórico; nova ação integrada, sem exclusão física. |

As funções existentes de pendências/anotações no pacote não devem ser descartadas para caber no MVP. Sua preservação funcional entra no plano de paridade; novas regras de classificação por setor, prioridades e fluxos gerenciais permanecem nas fases posteriores. A forma de liberar escrita até a validação dessas regras depende da matriz mínima de acesso e de D09.

## Dados e incompatibilidades identificadas

Inspeção estática de `data/base-inicial.json`, sem importar: **240 registros**, **6 pendências abertas**, **0 anotações**; IDs preenchidos e únicos em cada coleção, sem pendências órfãs. Serviços: 148 instalações, 91 desinstalações e 1 manutenção. Categorias: 79 salas e 161 telas. Estados: 190 concluídos, 25 com data pré-definida, 13 sem previsão, 9 aguardando contrato, 2 aguardando kickoff e 1 pausado.

Há 216 datas de início (28 em 2025 e 188 em 2026), 24 registros sem início, nenhum fim preenchido e 5 previsões (4 por mês e 1 por dia). Os inícios e a única data original preenchida são ISO válidos; isso não comprova realização. Todos os concluídos têm início, mas o pacote não possui um campo separado de conclusão real. Não usar esse início automaticamente como `completedAt`.

Todos têm cliente e cidade/UF textuais; o esquema recebido não contém endereço completo nem IDs de `Company`/`Project`/usuário. Só 5 registros têm técnico, 102 têm equipamentos, 25 têm resolução e 26 têm proporção. Entre as 79 salas, 33 não informam tipo. Nenhum registro informa atualização/autor. A gaveta do pacote apresenta sala sem tipo como imersiva; esse fallback visual não é comprovação de classificação.

| Grupo de campos recebido | Destino existente/candidato | Lacuna ou definição necessária |
|---|---|---|
| ID e cliente | `ProjectService`, `Project`, `Company` | Preservar ID de origem em rastreio de importação; confirmar vínculos explicitamente, sem inferir por nome. |
| Serviço e status | `ProjectService.type`, `Schedule.status` e `ProjectService.planning.stage` preparado | Oito etapas preservadas em campo próprio, sem mapeamento com perda para os cinco estados de execução. Manutenção/upgrade e importação de serviços continuam em D10. |
| Início, fim, previsão e data original | `Schedule`, `planning.forecast` preparado e histórico | Previsão mensal/diária preserva precisão e não cria intervalo UTC. Datas confirmadas prevalecem na apresentação sem apagar previsão. Dia inteiro, ausência de fim, data original e motivos de reagendamento ainda exigem D07/D08/D10. |
| Cidade/UF e endereço | `Project.city/state/address` | Desmembrar local validado; decidir tratamento do endereço obrigatório ausente. D02/D10. |
| Técnico e responsável de pendência | Vínculos de internos/terceiros existentes | Texto livre não é usuário identificado; não criar contas nem atribuições automáticas. D04/D10. |
| Categoria e características técnicas | Contrato compartilhado e `ProjectService.specifications` preparados localmente em 28/10 | Cadastro/card preservam ausência e dados condicionais sem inferência. Migration aditiva não aplicada; obrigatórios/unidades de negócio continuam em D02. |
| Equipamentos | Lista descritiva em `specifications.equipment`; catálogo/patrimônio existentes como referências possíveis | Descrição técnica não é saldo, reserva nem vínculo automático a patrimônio. D11. |
| Pendências | Checklist/acompanhamento existente como candidato | Falta equivalência completa de tipo/setor/prazo/resolução e escopo. F03/D01. |
| Observação, anotações e alterações | `notes`, comentários e `AuditLog` | Separar texto atual de histórico; preservar origem sem inventar autoria. D07. |

O ZIP usa JSON inicial em modo local ou Planilhas/Apps Script com edição por PIN. O usuário confirmou o ZIP como fonte histórica; a integração usa sessão/API/banco do Zyllen. Não houve acesso a planilha online nem execução do HTML/Apps Script/XLSX. O [ensaio histórico](instrucoes/projetos-e-agenda.md#preparação-histórica-a-partir-do-zip) preserva fonte/IDs/hashes e gera exceções privadas, sem copiar dados individuais para documentação ou frontend. Políticas de corte, vínculo e carga operacional continuam em D10.

## Fases oficiais comparadas ao estado atual

Legenda: **Existente** = encontrado no Zyllen para o escopo indicado; **Parcial** = base reutilizável, mas falta atender à nova proposta; **Não integrado** = existe no pacote, fora do Zyllen; **A desenvolver** = não encontrado completo nas fontes analisadas; **Documentado** = análise desta entrega, sem execução operacional. Nenhuma fase inteira foi declarada entregue em produção.

### Fase 00 — Preparação e estrutura (P0)

| Referência oficial | Estado e continuidade | Backlog |
|---|---|---|
| Auditar o módulo atual de Projetos e Agenda | Documentado por código; runtime/dados efetivos não conferidos. | F00-01, F00-04 |
| Organizar a nova seção Cronograma e Planejamento | Primeira composição aplicada localmente, com nome, substituição das vistas e Equipe oculta. Detalhes restantes de paridade pendentes. | F00-02 |
| Identificar funcionalidades existentes reaproveitáveis | Documentado nas matrizes de inventário e paridade. | F00-01, F00-03 |
| Mapear banco, usuários, setores e permissões | Parcial: schema/RBAC mapeados; matriz mínima e usuários/setores efetivos pendentes. | F00-04 |
| Definir campos necessários para projetos | Parcial: comparação feita; obrigatórios e dados técnicos aguardam validação. | F00-05 |

### Fase 01 — Cronograma e calendário (P0)

| Referência oficial | Estado e continuidade | Backlog |
|---|---|---|
| Integrar o cronograma existente ao Zyllen | Parcial: frontend integrado; cadastro técnico e persistência preparados localmente. Ativação e paridade completa pendentes. | F01-01 |
| Disponibilizar calendário, agenda e cards | Existentes em ambos os projetos; falta paridade integrada de filtros, menus, previsões e estados. | F01-02 |
| Abrir cards por agenda e calendário | Integrado localmente com detalhe atual, acesso de leitura e edição canônica; conteúdo técnico novo testado em isolamento. | F01-03 |
| Exibir características técnicas das instalações | Contrato, cadastro, API/persistência e apresentação preparados/testados localmente; migration e publicação pendentes. | F01-04 |
| Consultar datas, disponibilidade e andamento | Parcial: oito etapas/previsões integradas localmente, distintas da execução; agenda/conflitos preservados. Ativação, significado de disponibilidade e regras adicionais pendentes. | F01-05 |

### Fase 02 — Dados, dashboard e publicação (P0)

| Referência oficial | Estado e continuidade | Backlog |
|---|---|---|
| Revisar e validar históricos | ZIP confirmado; preparação offline preserva 240 registros/6 pendências com ensaio idempotente e exceções. Vínculos, campos ausentes e execução histórica exigem revisão de negócio; sem carga operacional. | F02-01, F02-02 |
| Organizar formulário de projetos | Parcial: editor canônico ganhou categoria, equipamentos e sala; demais campos/estados e validação de negócio pendentes. | F02-03 |
| Criar indicadores e resumos visuais | Adaptado/testado localmente: categorias reconciliadas com execução/data real, ações manuais e avisos de qualidade, sem multiplicação por responsáveis. Aceite de negócio/publicação pendentes. | F02-04 |
| Integrar cronograma ao dashboard | Agregados na dashboard interna e link para o cronograma; fontes atuais reaproveitadas. Espelho mantém projeção anterior. Ainda não publicado. | F02-05 |
| Consulta por Comercial, Experiências e Diretoria | Parcial: infraestrutura de autorização existente; falta matriz mínima validada e acesso adequado. | F02-06 |
| Publicar primeira versão operacional | Publicado/verificado em 28/10 no recorte autorizado: RBAC atual, Internos bloqueado e ZIP somente como legado de consulta. | F02-07 |

**Marco 1 — MVP do cronograma em funcionamento:** navegação e paridade acordadas, cards técnicos acessíveis pela lista/calendário, dados validados, métricas reconciliadas, consulta autorizada por perfil e publicação/homologação verificadas. Pendências avançadas, agendas individuais, prioridade dinâmica e automação de OS não são pré-requisitos. Recursos de pendências já recebidos precisam ter destino explícito, conforme D09.

### Fase 03 — Pendências e projetos (P1)

| Referência oficial | Estado e continuidade | Backlog |
|---|---|---|
| Múltiplas pendências por projeto | Prontas no pacote; Zyllen tem checklists/acompanhamento, sem equivalência completa integrada. | F03-01 |
| Classificação por setor e tipo | Tipos no pacote; setor, taxonomia e autorização a desenvolver/validar. | F03-02 |
| Filtrar relevância para cada área | A desenvolver no novo domínio; filtro visual não substitui autorização. | F03-02 |
| Projetos como base central de registros | Base existente em ambos; integração deve manter identidade canônica e cadastro operacional. | F03-03 |
| Ferramenta simplificada de resolução/proporção | Não encontrada no pacote ou módulo auditado; referência mencionada não foi fornecida. Validar antes de integrar. | F03-04 |

### Fase 04 — Planejamento das equipes (P1)

| Referência oficial | Estado e continuidade | Backlog |
|---|---|---|
| Calendário geral e agendas individuais | Calendário e filtro por instalador existentes; visão pessoal autorizada e domínio de atividades incompletos. | F04-01 |
| Distribuir atividades a colaboradores | Há responsáveis de agendamentos; faltam tarefas, atribuição e cooperação do planejamento. | F04-02 |
| Atividades sem responsável | Projeto pode ficar pendente sem responsável; agenda avulsa exige responsável. Fila compartilhada a desenvolver. | F04-02 |
| Listas pendentes e concluídas | Existem estados/listas operacionais; falta lista mensal pessoal agrupada por dia. | F04-03 |
| Prioridade dinâmica por prazo e importância | A desenvolver; urgência fixa atual não implementa esse cálculo. | F04-04 |
| Acompanhamento individual e gerencial | Bases de consulta existem; falta escopo servidor, visão diária da equipe e filtro por pessoa. | F04-01, F04-03 |
| Histórico por mês | Datas/auditoria existem; falta ordenação por execução e regra de fechamento mensal validada. | F04-05 |

### Fase 05 — Permissões e rastreabilidade (P1)

| Referência oficial | Estado e continuidade | Backlog |
|---|---|---|
| Permissões por setor, função e usuário | RBAC por papel/ação existente; setor e exceções individuais a desenvolver após D01. | F05-01 |
| Diferenciar colaboradores, gestores, administradores e Diretoria | Papéis-base existem; Diretoria e composição com setores não estão formalizadas. | F05-01 |
| Restringir alterações conforme perfil | Existente por ação ampla; falta granularidade de campos, autoria e atividade. | F05-02 |
| Observações, comentários e justificativas | Observações e comentários em acompanhamentos existem; falta fluxo do planejamento e justificativa obrigatória validada. | F05-03 |
| Histórico de alterações, cancelamentos e reagendamentos | Auditoria e cancelamento já existem; não há histórico funcional completo de todas as datas/justificativas e descarte lógico do novo domínio. | F05-04 |
| Mecanismos de rastreabilidade | Parcial: `AuditLog`, histórico de acompanhamentos e datas reais; completar origem, autoria, consulta e correções. | F05-04 |

**Marco 2 — Planejamento interno operacional:** F03–F05 integradas e validadas, incluindo distribuição, visões pessoais/gerenciais, prioridade, histórico mensal e autorização/rastreabilidade. A matriz mínima de consulta do MVP é P0 em F02-06; a matriz completa da F05 não pode ser adiada para justificar um MVP com acesso amplo.

### Fase 06 — Gestão de viagens (P2)

| Referência oficial | Estado e continuidade | Backlog |
|---|---|---|
| Calendário geral de viagens | Existente na agenda atual; preservar ao reestruturar Viagens. | F06-01 |
| Visão individual por colaborador | A desenvolver com autorização no servidor. | F06-02 |
| Associar responsáveis e projetos | Existente em `Trip`/`Schedule`/`ProjectService`; reaproveitar vínculos. | F06-01 |
| Passagens, hospedagens, veículos e documentação | A desenvolver; reserva de carro e infraestrutura privada de mídia são reaproveitáveis, sem vínculo pronto a `Trip`. | F06-03 |
| Equipamentos, materiais e ferramentas | Catálogo/estoque/custódia existentes; falta lista de preparação e vínculo validado à viagem. | F06-04 |

A manutenção da vista Viagens e de seus acessos atuais acompanha a transição P0; a expansão logística permanece P2. Não retirar funções existentes enquanto se aguarda essa fase.

### Fase 07 — Ordens de serviço (P2)

| Referência oficial | Estado e continuidade | Backlog |
|---|---|---|
| Criar ou integrar OS | OS já existe; integrar, preservando os três portais e contratos. | F07-01 |
| Vincular OS automaticamente às atividades | Não existe vínculo direto com serviço/atividade; `projectId` opcional não resolve a automação. | F07-01 |
| Processos de instalação, manutenção e visita técnica | Formulários operacionais existentes; padronização por atividade e visita a validar. | F07-02 |
| Início, conclusão e duração | Timestamps em OS/agenda existem; faltam captura/validação integrada e semântica de duração da atividade. | F07-03 |
| Fotos, observações e evidências | Existentes na OS; reutilizar mídia privada e autoria. | F07-02 |
| Histórico de execução e acompanhamento | Existente na OS/acompanhamentos; falta consulta integrada por atividade. | F07-03 |
| Avaliar notificações de registro/conclusão | Pendente de validação de destinatários, canais e gatilhos. | F07-04 |

## Ordem recomendada de continuidade

1. Encerrar as cinco entregas técnicas e conferir o [controle do ciclo](BACKLOG_ZYLLEN.md#ciclo-autorizado-cinco-etapas-antes-da-homologação), mantendo as fases oficiais como referência permanente.
2. Retomar com o usuário a matriz de acessos, adiada expressamente, e revisar o relatório privado do ZIP: vínculos por ID, endereços, serviços legados, horários/duração, datas reais e autoria desconhecida. Não repetir a auditoria nem presumir preenchimentos.
3. Fechar aceite de métricas/contratos e paridade; revisar as quatro migrations, pendências de ambiente e plano de preservação antes de coordenar a etapa 6. Essa etapa não foi iniciada.
4. Homologar, executar a carga operacional validada e publicar coordenadamente quando autorizado. Só depois avançar no planejamento de equipes, logística e automação de OS das fases posteriores.

Não há estimativa de datas ou responsáveis pessoais confirmados. O [backlog](BACKLOG_ZYLLEN.md) registra dependências, critérios e estado; as [decisões](DECISOES_PENDENTES.md) distinguem sugestões de escolhas aprovadas. Procedimentos de banco, validação e deploy continuam nos guias técnicos existentes, sem criar outra regra operacional aqui.
