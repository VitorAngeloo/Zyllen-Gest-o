# Frontend do Zyllen Gestão

Aplicação Next.js 16 / React 19 do workspace `@zyllen/web`, publicada no Vercel. Rotas principais: `/dashboard`, `/portal-cliente` e `/portal-terceirizado`.

- [Instalação, execução e verificação de tipos/build](desenvolvimento.md).
- [Arquitetura, autenticação e cliente HTTP](arquitetura.md).
- [Variáveis de ambiente e CSP](variaveis-de-ambiente.md).
- [Configuração Vercel e implantação](implantacao.md).
- [Índice da documentação](README.md).
- [Projetos e Agenda](projetos-e-agenda.md): entrada única com Visão geral, Projetos, Agenda, Viagens e Equipe; um serviço por projeto, cadastro sem data, responsáveis e calendário completo; [indicadores de projetos](projetos-e-agenda.md#dashboard-geral-de-projetos) na visão geral, com período compartilhado com instalações/viagens.
- [Viagens e operações](viagens-e-operacoes.md): cadastro único pela Agenda/gestão, popup no calendário, vínculos de serviços, datas reais e painel de instalações/desinstalações/viagens.
- [Histórico de instalações](estruturas-e-ciclos.md): identidade de sala/totem, seleção/cadastro inline por serviço e histórico dentro do detalhe do projeto ou da aba Projetos, com datas reais e duração instalada.
- [Plano de identidade visual e UX](plano-identidade-visual.md): redesign de todo o frontend, com piloto funcional no dashboard/navegação, base compartilhada transversal e aprofundamentos já aplicados a Atendimento/OS e ao núcleo de Estoque e Patrimônio.

Telas, formulários e utilitários de negócio estão em `src/features/`. `src/app/` contém entradas de rotas e layouts; `src/components/` reúne UI comum, identidade e layouts; `src/lib/` contém transporte HTTP, providers e utilitários gerais. Consultar os guias de [OS](ordens-de-servico.md) e [etiquetas](etiquetas-e-impressao.md) para as regras específicas.

## Sistema visual compartilhado

As páginas principais usam `components/ui/page-header.tsx` para apresentar contexto, título, descrição e ação primária. O cabeçalho cria uma entrada previsível para cada tarefa e evita que cada módulo invente uma composição diferente. A sidebar organiza os destinos por rotina; os portais mantêm uma navegação própria, com o mesmo vocabulário visual.

Os componentes de `components/ui/` definem a base transversal de botões, campos, cartões, badges, abas e diálogos. Verde identifica ação principal, seleção ou marca; cores de sucesso, atenção e erro ficam reservadas aos respectivos estados. Abas usam texto e indicador inferior, superfícies são discretas e caixas são usadas quando delimitam uma interação ou um conteúdo independente.

A identidade visual segue uma linguagem operacional editorial: grafites com leve temperatura verde, linhas finas, cantos contidos e uma pequena geometria angular derivada do logo nos cabeçalhos. O conteúdo determina a composição. Listas densas usam linhas contínuas e metadados alinhados; cartões ficam reservados para resumos independentes, formulários ou detalhes que precisam de limite próprio. Contagens usam numerais tabulares e o verde da marca funciona como sinal de posição, foco e ação.

A autenticação usa a família `Obviously` nos títulos de expressão, a assinatura completa Zyllen Systems, a mensagem “Experiências que transformam.” e uma fotografia oficial de automação fornecida para o projeto. Linhas angulares e o verde elétrico conectam essa entrada à identidade institucional. A fotografia fica concentrada nessa superfície de apresentação; dentro das rotinas de trabalho, os mesmos elementos aparecem de forma mais contida para preservar leitura, densidade e velocidade de uso.

`components/ui/workspace.tsx` reúne a barra de contexto, grupos de filtro, cabeçalho de lista, linhas de registro e estado vazio. Esses elementos devem tornar visíveis o escopo atual, a quantidade de resultados, o responsável, a situação e o próximo passo. A primeira aplicação profunda está nas rotinas pessoais e filas operacionais de chamados e ordens de serviço. A segunda cobre a navegação contextual do estoque, indicadores, custódia por local e cliente, patrimônio, equipamentos e histórico de saídas. A passagem complementar alcança saldos, movimentações, relatórios, cadastros, etiquetas e compras, preservando os fluxos transacionais e suas confirmações. A terceira organiza Projetos e Agenda pelas intenções de planejar e executar, apresenta indicadores e totais em faixas contínuas e aproxima filtros e ações do conteúdo afetado. Agenda, viagens, equipe e carros seguem a mesma hierarquia, com listas cronológicas, contagens, estados vazios e formulários adaptados ao celular. A quarta aplicação alcança Gestão e Conta: clientes, solicitações de acesso, parceiros e colaboradores usam listas administrativas contínuas; perfis e permissões explicitam o alcance de cada alteração; perfil pessoal e detalhe do colaborador reúnem identidade, vínculo e atividade sem repetir mosaicos de cartões. A quinta aplicação cobre autenticação, cadastro e portais externos: a entrada diferencia colaborador, cliente e parceiro antes das credenciais; o cadastro explica o percurso específico de cada público; os portais organizam o atendimento atual, o próximo passo e os históricos em listas contínuas, com navegação própria adaptada ao celular.

No cadastro público, o fluxo de cliente continua criando uma solicitação pendente para análise e preserva eventual sessão já aberta; a confirmação explica a espera e o retorno. O cadastro de parceiro continua concluindo a conta e direcionando para seu login. Nos portais, autenticação, redirecionamento por tipo de usuário, atualização periódica do chamado, anexos, mensagens, formulários, assinaturas e demais ações existentes permanecem inalterados. A validação visual dessa família usa respostas sintéticas e gera capturas em `tmp/architecture-validation/external-portals-browser-qa/`, sem acessar o banco compartilhado.

A adoção dessa base não altera rotas, chamadas da API, permissões, filtros, dados apresentados ou confirmações existentes. Ao revisar uma família de telas, preserve primeiro o comportamento e aplique a hierarquia compartilhada; mudanças funcionais devem permanecer em uma entrega separada. O roteiro e os critérios completos estão no [plano de identidade visual e UX](plano-identidade-visual.md).

## Chamados no dashboard inicial

O dashboard interno compõe `features/tickets/components/ticket-dashboard-board.tsx`. Os cartões de chamados abertos e em atendimento mantêm título, resumo do pedido, solicitante, setor/empresa, prioridade e técnico. Clicar no cartão abre os detalhes em um popup, com descrição completa, contatos disponíveis, datas, SLA, tempos, mensagens, anexos e eventual registro de conclusão/avaliação. Fechar pelo botão ou por Escape mantém a pessoa no dashboard.

- **Aberto há:** tempo desde `createdAt`; não reinicia quando o chamado é assumido ou transferido.
- **Tempo de atendimento:** conta desde `firstResponseAt`; quando encerrado, usa o tempo registrado e a data de encerramento.
- **Atenção:** chamados `OPEN` ou `IN_PROGRESS` sem encerramento, com uma hora ou mais desde a abertura, recebem destaque vermelho pulsante no cartão e no aviso do popup. O dashboard mostra a quantidade e permite abrir o mais antigo. Para preferência de movimento reduzido, o vermelho permanece fixo.
- Os contadores atualizam a cada segundo e as consultas a cada 15 segundos. As listas carregam todas as páginas e exibem os mais antigos primeiro. Falhas de consulta mostram aviso e opção de tentar novamente.
- A visualização exige `tickets.view`. Administrador/Gestor veem todos os chamados em atendimento; os demais continuam vendo os atribuídos a si. Assumir, finalizar e mover preservam os fluxos de PIN e a autorização da API; mover também exige `tickets.triage` na interface.

Tipos, chamadas HTTP, consultas/relógio e cálculo dos tempos ficam em `features/tickets/{types,api,hooks,utils}/`. O efeito visual usa CSS local aos componentes. A tela do dashboard mantém as confirmações e mutações existentes.

### Visão compacta de atendimentos

Acima dos cartões, `ticket-dashboard-insights.tsx` apresenta aberturas e encerramentos no período, pendências sem técnico, atendimentos atuais, espera média dos pendentes e chamados que exigem atenção. Mostra também os aguardando resposta, os resolvidos ainda não encerrados e as aberturas por setor do solicitante. Setor ausente aparece como **Sem setor**; a origem cliente aparece em um grupo distinto, mesmo que exista um setor interno chamado Clientes.

- **Origem:** todas, internos (`INTERNAL`) ou clientes (`CLIENT`). O filtro vale para indicadores, listas e alertas. A página inicial começa com todas as origens para preservar a apresentação dos chamados existentes.
- **Período:** hoje, últimos 7/30 dias ou datas personalizadas, com limite de 366 dias. As datas incluem o dia final escolhido e são enviadas como instantes UTC; início inclusivo e fim exclusivo. O filtro de período afeta aberturas, encerramentos e distribuição por setor; pendências e atendimentos incluem chamados antigos ainda ativos.
- **Pendentes:** `OPEN` sem técnico atribuído e sem encerramento. A espera média considera a idade desde a abertura desses chamados; sem pendentes, aparece **—**, pois não há espera para calcular. `WAITING_CLIENT` e `RESOLVED` têm contagens separadas.
- **Encerrados:** estado `CLOSED` com `closedAt` no período. `updatedAt`, prazo de SLA ou resolução sem encerramento não substituem essa data.
- **Escopo:** Administrador/Gestor têm visão geral; os demais veem abertos para todos e outros estados atribuídos a si, com regra aplicada na API. O endpoint exige usuário interno com `tickets.view`.
- Indicadores atualizam a cada 30 segundos e após as mutações de chamados. Falhas nos indicadores têm recuperação própria e não impedem usar os cartões. O aviso de atenção oferece até três chamados mais antigos, abrindo o mesmo popup.

`GET /tickets/statistics?source=ALL&start=<ISO>&end=<ISO>` retorna `{ success, data }`, com os contratos em `packages/shared/src/tickets/`. `TicketStatisticsService` usa agregações SQL parametrizadas, retry e transação de leitura consistente; não carrega descrições, anexos, mensagens ou contatos para contar indicadores. `GET /tickets` também aceita `source`, mantendo a paginação existente. Esta entrega não altera o schema nem exige migração.

Para verificar os cartões, popup, limite de uma hora, paginação, escopo do técnico, ações de PIN, recuperação de erros e apresentação no celular:

```powershell
pnpm validate:isolated
pnpm test:tickets:statistics
pnpm test:dashboard
```

O teste usa Chrome via Playwright, um build Next isolado e respostas de API sintéticas interceptadas no navegador; não inicia a API nem acessa banco real. Usa o runtime de navegador da suíte de [segurança](seguranca.md), configurável por `AUDIT_RUNTIME_ROOT` e `AUDIT_CHROME_PATH`. Resultados e capturas ficam em `tmp/architecture-validation/ticket-dashboard-qa/`. Essa verificação cobre o comportamento da interface; a autorização da API continua sendo validada pela suíte descartável correspondente.

`test:tickets:statistics` valida a API NestJS e o Prisma reais contra PostgreSQL PGlite em memória. Exige as dependências descartáveis em `tmp/security-test-deps`, instaladas conforme [segurança](seguranca.md). Gera o DDL local a partir do schema com `migrate diff --from-empty`, cria somente o banco em memória e usa o Prisma Client isolado. Verifica limites de período, pendências antigas, origens, setores, escopo por usuário, autenticação, permissões, consultas inválidas, fuso e dados vazios. Resultados ficam em `tmp/architecture-validation/ticket-statistics-qa/results.json`; não conecta ao Supabase nem modifica o banco compartilhado.

## Dashboard e painel de acompanhamento

A dashboard autenticada mantém os cartões de chamados, alertas, filtros, detalhes e ações de PIN. No refinamento R2 de 18/09/2026, atendimentos e visão operacional aparecem lado a lado em telas amplas; no celular, atendimentos vêm primeiro. Por decisão do usuário, a seção Acesso Rápido e sua personalização foram removidas; a navegação continua pela sidebar e pelos links dos resumos operacionais. O Monitor de Atenção — Clientes aparece após esses resumos. Os indicadores de chamados usam a largura do próprio componente para escolher a quantidade de colunas, evitando cartões estreitos no layout dividido.

Contas internas com papel **Internos** recebem uma dashboard própria, somente para consulta. Ela mostra chamados internos `OPEN` e `IN_PROGRESS` abertos pela própria conta (`internalUserId`), o resumo e os destaques dos projetos atuais e a situação e as próximas reservas dos carros. Seus cartões não possuem links, popups ou ações de negócio. A sidebar desse papel contém apenas **Dashboard**, **Meus Chamados TI** e **Acompanhamento**; o perfil continua acessível pelo controle da conta. Acesso direto a outra rota interna da dashboard volta para `/dashboard`.

Os dados dessa visão vêm de `GET /internal-dashboard`, protegido por JWT e validado pelo nome exato do papel `Internos`. O endpoint entrega somente os campos necessários para exibição e não concede `tickets.view`, `schedule.view` ou qualquer permissão de manutenção. Assim, as páginas existentes de **Meus Chamados TI** e **Acompanhamento** permanecem disponíveis sem abrir os módulos de gestão.

No piloto de identidade de 19/09/2026, a sidebar foi dividida em Início, Minha rotina, Atendimento, Operação, Estoque e patrimônio e Gestão. Cada grupo mantém a filtragem pelas permissões anteriores e desaparece quando não possui destinos visíveis. O item atual usa indicador lateral e contraste discreto; no modo recolhido, separadores preservam a divisão e cada ícone mantém seu nome acessível. A área de conteúdo tem largura máxima para conservar o ritmo de leitura em telas amplas.

O cabeçalho do dashboard ganhou contexto e separação da área operacional. Indicadores de atendimento e dos resumos usam linhas de referência em vez de uma sucessão de caixas internas, mantendo cores de alerta somente quando o dado exige atenção. O verde da marca orienta estado ativo, links em foco e ações. A fonte do produto não foi alterada neste ciclo.

`features/dashboard/components/dashboard-operational-overview.tsx` apresenta simultaneamente os resumos de estoque, projetos, viagens e [agenda dos carros](carros-e-reservas.md), conforme as permissões da conta. Cada seção tem carregamento, recuperação de falha e acesso à gestão. Falha inicial não inventa zeros; atualização malsucedida preserva dados anteriores com aviso. Estoque mantém total geral, disponibilidade somente nos depósitos classificados, manutenção, pendências de localização e configuração de reposição. Projetos mostram situação atual e prioridades; viagens mostram agendadas/em andamento, pendências de vínculo e próximas viagens interestaduais, sem tratar esse recorte como todas as viagens futuras.

O resumo da agenda lista os cinco próximos compromissos `SCHEDULED`, com início a partir do instante atual, ordenados pelo endpoint existente. Apresenta datas, cliente/projeto e responsáveis internos/terceiros. Clique abre o popup canônico de projeto/viagem; compromissos gerais abrem detalhes de leitura sem sair da dashboard. **Abrir agenda** leva ao calendário na área de projetos. Projetos prioritários e viagens destacadas abrem seus diálogos canônicos, preservando a autorização de edição. Resumos usam as agregações existentes, sem recalcular métricas no frontend, e atualizam a cada 30 segundos. Não há rotação autenticada.

O Monitor de Atenção — Clientes lê todas as páginas dos chamados em cache próprio por conta, agrupando por ID do cliente quando disponível. Considera abertura nos últimos sete dias corridos; falha tem aviso e retentativa, em vez de afirmar ausência de chamados. Mantém a autorização já exigida pelo endpoint interno.

**Espelho por link**, no cabeçalho, abre `PanelMirrorSettings` de `features/panels`: escolher visões, gerar/substituir, copiar e revogar o link. `/painel` e `/dashboard/painel` são compatibilidade e encaminham para `/dashboard`. O [painel de acompanhamento](painel-de-acompanhamento.md) permanece em `/painel/espelho/<token>`, sem login, sidebar ou ações de escrita, com rotação de um minuto e player discreto.

R2 está implementada localmente; API/migration de carros publicadas após autorização em 18/09/2026, com cadastro e reservas disponíveis no localhost. Frontend ainda não publicado no Vercel. A R3 reúne projetos/agenda/viagens em uma entrada, conforme [plano operacional](plano-evolucao-operacional-e-paineis.md); os links dos resumos abrem a aba correspondente. Verificações: `pnpm test:panels:browser`, após build isolado. Capturas/resultados em `tmp/architecture-validation/personal-panels-browser-qa/`; testes usam respostas sintéticas de loopback.

Carros distingue consulta vazia de área indisponível: uma resposta 404 nas consultas do módulo gera aviso de situação, sem indicadores falsos nem erro genérico de lista vazia. A tela libera cadastro somente após carregar as opções e mantém retentativa; outras falhas continuam sinalizadas. Regras no [guia de carros](carros-e-reservas.md#lista-vazia-e-área-indisponível).
