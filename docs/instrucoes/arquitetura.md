# Arquitetura do Zyllen Gestão

Toda alteração nesta estrutura deve seguir a [regra obrigatória de organização da arquitetura](organizacao-da-arquitetura.md), incluindo a localização dos arquivos, os limites das dependências e as verificações antes de concluir.

## Componentes e execução

Monorepo pnpm com dois aplicativos e um pacote compartilhado. O banco é PostgreSQL no Supabase, único e compartilhado entre desenvolvimento e produção.

| Componente | Stack | Execução | Porta/URL |
|---|---|---|---|
| `apps/api` | NestJS 10, Prisma 6, TypeScript | Processo Node.js no Windows Server, túnel Cloudflare | 3001 / `api.skylineti.com` |
| `apps/web` | Next.js 16, React 19, Tailwind CSS, TanStack Query | Vercel | 3000 local / `skylineti.com` |
| `packages/shared` | Tipos, enums e schemas Zod | Consumido pela API e pelo frontend | — |
| Banco | PostgreSQL | Supabase | Compartilhado com produção |

Versões exatas e scripts estão nos `package.json`; não usar as contagens da especificação inicial como inventário atual. Dockerfiles, Compose, PM2 e workflow self-hosted existem no repositório, mas não descrevem o deploy manual efetivo da API nesta máquina.

O web resolve a interface pública `@zyllen/shared` pelo código-fonte do pacote, acompanhando seus contratos em desenvolvimento sem substituir o `dist` consumido pela API em execução. O build isolado adapta essa resolução para seu próprio pacote compilado; veja [desenvolvimento](desenvolvimento.md).

## Estrutura atual

```text
apps/
├── api/
│   ├── src/modules/       # Negócio e controllers por audiência
│   ├── src/common/        # Pipes, filtros e interceptors HTTP
│   ├── src/infrastructure/ # Banco, criptografia e armazenamento
│   ├── src/config/        # Validação da configuração
│   ├── prisma/            # Schema, migrations e scripts de manutenção
│   └── scripts/           # Manutenções específicas
└── web/
    ├── src/app/           # Entradas de rotas e composição de layouts
    ├── src/features/      # Telas, componentes, hooks, API e utilitários por negócio
    ├── src/components/    # UI, identidade, layouts e mídia comuns
    ├── src/lib/           # HTTP, providers, marca e utilitários gerais
    └── public/            # Recursos estáticos públicos
packages/shared/src/       # Contratos separados por negócio, exports públicos comuns
scripts/quality/           # Verificação da arquitetura e builds isolados
docs/instrucoes/           # Guias, regras, planos e registros do projeto
docs/security-audit/       # Artefatos e scripts da auditoria
```

## API: bootstrap e contratos

Em `apps/api/src/main.ts`, o bootstrap aplica:

1. `trust proxy`, para o IP real atrás do Cloudflare.
2. `cookieParser`, para cookies httpOnly.
3. Versionamento opt-in pelo header `X-API-Version`.
4. `GlobalExceptionFilter`, que normaliza erros.
5. `ResponseInterceptor`, que adiciona `success` e integra a sessão/URLs de mídia.
6. `ValidationPipe` com `whitelist`, `forbidNonWhitelisted` e `transform`.
7. CORS com credenciais e origens CSV de `CORS_ORIGIN`.

O interceptor preserva as chaves retornadas pelo controller. Um retorno `{ data }` chega como:

```json
{ "success": true, "data": {} }
```

Listagens podem retornar `{ success, data, total, page, limit }`; há consumidores legados que lidam com aninhamento extra. Verificar o shape do endpoint e a transformação do `apiClient` antes de adicionar acesso a `data`. Evitar espalhar novas normalizações pela interface.

Erros seguem `{ error: { message } }`. O cliente tenta `errorData.error.message`, `errorData.message` e `statusText`. Controllers limitam paginação, usualmente até 100 itens. Serviços críticos usam os [retries do Prisma](banco-de-dados.md).

## API: módulos

`access`, `assets`, `auth`, `catalog`, `clients`, `followups`, `inventory`, `labels`, `locations`, `maintenance`, `media`, `panels`, `project-services`, `purchases`, `registration`, `schedule`, `structures`, `suppliers`, `tickets`, `trips` e `vehicles`.

`vehicles` mantém [carros e reservas](carros-e-reservas.md) em uma área própria. `features/vehicles` reúne tela/formulários/API de `/dashboard/carros`; `features/dashboard` compõe seu resumo com as demais agregações. Contratos em `shared/src/vehicles`; tabelas novas com RLS e FKs restritivas. Reservas e auditoria são atômicas, com bloqueios e retentativa idempotente, sem depender do calendário de projetos.

Na reserva, `features/vehicles/utils/vehicle-reservation-period.ts` separa formatação/validação das entradas brasileiras de data/hora da apresentação do formulário. Campos somente de leitura abrem calendário em português e relógio com colunas roláveis de horas/minutos. `VehicleReservationDatePicker` e `VehicleReservationTimePicker` usam o Popover do Radix instalado; `VehicleTimeWheel` separa rolagem/teclado. Datas/horas inexistentes são rejeitadas e o contrato continua recebendo instantes UTC, com o mesmo estado da reserva e edição. O calendário também é reutilizado nos filtros.

`VehicleReservationForm` concentra criação e edição na própria agenda, com finalidade, responsável pesquisável, datas/horas e observações; o diálogo e a antiga reserva rápida foram substituídos. `VehicleReservationDates` apresenta as quatro entradas. `VehicleReservationFilters` mantém carro, período e responsável em área recolhida, com estado independente do rascunho. `SearchableSelect` comum aceita texto legado ou opções com ID/rótulo, para pesquisa por nomes sem colisão de IDs. `VehiclesScreen` compõe os fluxos e mostra a reserva salva pelos seus filtros. A API aplica o `responsibleId` opcional antes de paginação/total e separa pessoas ativas para reservar de responsáveis históricos para consulta, sem alteração de schema.

O módulo `structures` mantém a identidade `OperationalStructure` e o histórico `StructureCycle`. Exporta `StructureCyclesService` para os módulos de projetos/agenda, concentrando validação e bloqueio transacional sem criar dependência circular. `features/structures` reúne cadastro de locais e consulta **Histórico de instalações** na aba Projetos e no detalhe dos vínculos existentes; o formulário de Novo projeto não seleciona sala/totem. `StructureHistory` recebe callback opcional para abrir projeto na consulta de locais; não importa seu formulário. Dentro do detalhe, exibe história sem outro popup. `/dashboard/projetos/estruturas` é compatibilidade para a área unificada. Os contratos públicos ficam em `shared/src/structures`. Ver [estruturas e ciclos](estruturas-e-ciclos.md).

O padrão local é `*.module.ts`, `*.controller.ts`, `*.service.ts`, com DTOs e serviços de apoio conforme a necessidade. Manutenção expõe `/maintenance`, `/client/maintenance` e `/contractor/maintenance`; tickets e followups também têm controllers próprios para clientes. Compartilhar regras de negócio preservando a autorização de cada audiência.

Em `tickets`, `TicketStatisticsService` concentra as agregações da visão de atendimentos. O controller expõe a rota estática `GET /tickets/statistics` antes de `:id`, com validação compartilhada e `tickets.view`. O frontend compõe o componente de indicadores separado dos cartões e das ações operacionais; filtros e consultas ficam na própria funcionalidade. Regras dos indicadores, atualização e validação estão em [frontend](frontend.md#visão-compacta-de-atendimentos).

## Frontend: três portais

A gestão [projetos e agenda](projetos-e-agenda.md) acrescenta `ProjectService` com vínculo único ao cadastro `Project` e ao agendamento opcional. O módulo `project-services` coordena cadastro, responsáveis e auditoria com `ScheduleService` na mesma transação. O status agendado vem de `Schedule`; intervalos não são duplicados. `projects-agenda-screen.tsx`, em `features/project-services/screens`, reúne Visão geral, Projetos, Agenda, Viagens e Equipe, com estado da aba/visualização na URL. Reutiliza `ProjectServicesPanel`, `TripsScreen` e `ScheduleWorkspace`, pertencentes às respectivas features. Lista, calendário e histórico consultam o detalhe pelo ID e abrem o formulário canônico. Não há outro calendário restrito à página de projetos. As rotas anteriores de agenda/viagens/dashboards/estruturas delegam à mesma tela e normalizam o endereço para `/dashboard/projetos`; o menu contém uma única entrada Projetos e Agenda, sem Viagens separada.

Nesse módulo, `ProjectStatisticsService` atende `GET /project-services/statistics`, protegido por `schedule.view`, com agregação por projeto e seleção limitada de acompanhamento na mesma transação de leitura. `ProjectsOverview` compõe `ProjectDashboardView` e `OperationsDashboardView` com período comum, hooks existentes e limites de erro separados, na aba Visão geral. O filtro de serviço pertence à seção de projetos. As views de indicadores não importam formulários de gestão. As regras de datas e histórico estão no [guia de projetos](projetos-e-agenda.md#dashboard-geral-de-projetos). A conversão comum de dias locais para períodos UTC fica em `lib/date-period.ts`, reutilizada pelos projetos e chamados.

O módulo `trips` coordena o cadastro `Trip`, seu `Schedule` único e os vínculos de vários serviços na mesma transação; `ScheduleService` concentra a validação do estado/datas da viagem para ambos os acessos. `OperationsStatisticsService` agrega dados e seleciona as cinco seções limitadas em uma leitura consistente. `features/trips` separa gestão/popup, incorporados à aba Viagens, da apresentação `OperationsDashboardView`, na Visão geral. A Agenda reutiliza esse popup e o calendário existente, consultando todas as páginas; o shared expõe os contratos por negócio. Gravações invalidam consultas relacionadas de agenda/projetos/viagens/indicadores; mudança de status de projeto também invalida histórico de instalações. Ver [viagens e operações](viagens-e-operacoes.md). A conversão de instantes para formulários locais fica em `lib/date-time.ts`, reutilizada por projetos e viagens.

| Rota | Layout de interface | Audiência |
|---|---|---|
| `/dashboard/*` | `dashboard-layout.tsx` | Colaborador interno |
| `/portal-cliente/*` | `portal-layout.tsx` | Cliente externo |
| `/portal-terceirizado/*` | `portal-layout.tsx` | Terceirizado |

Os portais têm páginas de manutenção separadas. Mudanças comuns de OS devem ser verificadas nos três consumidores e seus controllers. Não unificar permissões apenas porque componentes visuais são compartilhados.

### Contexto de autenticação

`apps/web/src/features/auth/context/auth-context.tsx` expõe `user`, `token`, `permissions`, `userType`, `isLoading`, `needsPin`, `login`, `logout`, `hasPermission` e `clearNeedsPin`. `useAuthedFetch()` memoiza o header Authorization.

- Access/refresh token e tipo são persistidos em `localStorage`.
- No mount, `/auth/me` reidrata o usuário; falha limpa a sessão.
- `/auth/me/permissions` é carregado apenas para internos.
- Eventos `auth:logout` e `auth:token-refreshed` sincronizam o contexto.
- `hasPermission` retorna true para Administrador; a API mantém a autoridade sobre a operação.

Para checar admin, produzir booleano mesmo quando `user` é null:

```ts
const isAdmin = userType === 'internal' &&
  (user as any)?.role?.name === 'Administrador';
```

### Cliente HTTP

`api-client.ts` centraliza GET/POST/PUT/DELETE/upload. Em 401, tenta `/auth/refresh` com cookie httpOnly (`credentials: 'include'`) e refresh do localStorage como fallback; repete a requisição uma vez. Login é excluído do refresh automático. Sucesso emite `auth:token-refreshed`; falha emite `auth:logout`.

Falhas de rede são convertidas em `ApiError(0, 'Erro de conexão com o servidor...')`, evitando mensagens diferentes de Safari/Chrome/Firefox. Consumidores de mídia precisam enviar cookies conforme o mecanismo de sessão do módulo `media`, sem JWT na URL.

### Design e integrações

Tokens CSS `--zyllen-*`: fundo, borda, texto atenuado e destaque. Marca: `#ABFF10` sobre `#2C2C2C`. Textos comuns ficam em `lib/brand-voice.ts` (`TOASTS`, `EMPTY_STATES`, `PAGE_DESCRIPTIONS`).

`next.config.ts` define CSP para todas as rotas. `connect-src` é uma allowlist explícita com API, IBGE, Nominatim, tunnelmole e loopbacks Zebra 9100/9101. Todo novo host deve entrar na allowlist e ser validado no navegador.

## Organização aplicada ao código

As entradas `page.tsx` delegam às telas em `features/`. As URLs e os layouts dos três portais continuam nos mesmos lugares.

| Área | Responsabilidade |
|---|---|
| Web `app/` | Rotas e layouts que compõem telas curtas |
| Web `features/<negocio>/` | API, hooks, componentes, telas específicas dos portais e utilitários da funcionalidade |
| Web `components/` | UI genérica, layouts e identidade |
| Web `lib/` | Infraestrutura comum, como transporte HTTP e providers |
| API `modules/` | Módulos de negócio, separando serviços por responsabilidade quando necessário |
| API `common/`, `infrastructure/`, `config/` | Recursos transversais, Prisma/integrações e configuração |
| Shared por negócio | Tipos e schemas, com exports públicos compatíveis durante a migração |

Criar apenas as pastas necessárias em cada funcionalidade; não é obrigatório ter todas as subpastas. Telas dos portais usam nomes explícitos, como `internal-maintenance-screen.tsx`, `client-maintenance-screen.tsx` e `contractor-maintenance-screen.tsx`.

```text
features/schedule/
├── api/schedule-api.ts
├── components/            # ScheduleWorkspace, calendário, formulário e cartão do instalador
├── types/schedule.types.ts
├── utils/schedule-format.ts
└── schedule.constants.ts
```

Estoque mantém o estado e os fluxos em `hooks/use-inventory-controller.ts`, com seções visuais independentes em `components/`. Acompanhamento separa criação, detalhe, blocos e visualização de anexos. Chamadas de agenda, estoque, acompanhamento e OS são nomeadas nos respectivos arquivos `api/`; o transporte, refresh e erros continuam em `lib/api-client.ts`.

Na API, `InventoryService` preserva a interface pública das movimentações e delega leituras a `InventoryQueriesService` e cadastros de tipos/motivos a `InventorySettingsService`. As transações de movimentação e bloqueio de OS permanecem nos serviços de negócio. Validação de formulário e geração de número de OS ficam em `modules/maintenance/utils/`.

`InventoryCustodyService` coordena lotes identificados de envio/devolução/transferência, bloqueios, PIN e aprovação no mesmo módulo de estoque. `LocationsService` valida classificação/vínculos e seleção única do depósito existente. `features/inventory` mantém API, consulta e diálogos desse fluxo; o hook comum `lib/use-dialog-focus.ts` fornece somente comportamento de teclado. Regras no [guia de estoque](estoque-e-patrimonio.md).

`InventoryStatisticsService` concentra janela de 30 dias, agregações por quantidade e configuração de `StockMinimum` por SKU/local. A classificação da natureza fica em `inventory-movement-nature.ts`; não deriva consumo de motivo livre. `InventoryDashboardView` apresenta dados e pendências de identificação sem importar diálogos de gestão, para reutilização no painel de leitura. `CustodyScreen` mantém a visão de patrimônios/histórico/identificação na URL (`aba=patrimonios|historico|locais`), em Suspense, com retorno para estoque/indicadores. Painel e dashboard abrem identificação por link direto. Consultas da custódia e do painel incluem a conta no cache, propagam cancelamento e exigem audiência interna; opções indisponíveis bloqueiam abertura de cadastros. Ver [estoque e reposição](estoque-e-patrimonio.md#painel-de-estoque-e-reposição).

`features/dashboard` compõe chamados com suas ações e indicadores de estoque, projetos e operações, sem rotação. A configuração do [painel de acompanhamento](painel-de-acompanhamento.md) fica no cabeçalho dessa dashboard; `/painel` e `/dashboard/painel` encaminham para `/dashboard`. `features/panels` mantém leitor, visualizações compartilhadas, configuração de geração/revogação e o espelho. `/painel/espelho/[token]` é o ambiente isolado de leitura, sem sessão ou menu lateral. Rotação fixa de um minuto e pausa persistente ficam em hook próprio, independente das consultas; a abertura de detalhe suspende a troca. O módulo API `panels` reutiliza os serviços de estatísticas dos negócios e concentra autorização, geração/revogação e leitura do espelho. `PanelMirror` guarda hash do token e visões compartilhadas; os contratos ficam em `shared/src/panels`. Chamados recebem um leitor público opcional com chaves de cache próprias, preservando o leitor autenticado e as ações existentes na gestão. O provider reconhece o caminho do espelho e entrega contexto anônimo, sem reidratar ou apagar a sessão salva.

No shared, definições ficam em `auth/`, `access/`, `inventory/`, `maintenance/`, `schedule/` e demais negócios. Importar de `@zyllen/shared`; `types/` e `zod/` mantêm apenas exports de compatibilidade. Não duplicar schemas ou discriminadores nos aplicativos.

`pnpm check:architecture` verifica entradas de rotas, dependências locais, separação das camadas e ciclos de imports em execução. `pnpm validate:isolated` compila shared/API, verifica tipos do frontend e gera o build Next em `tmp/architecture-validation`, sem substituir os artefatos em produção. Ver [desenvolvimento](desenvolvimento.md) para os comandos.

Validação da reorganização em 17/09/2026: compilação de shared/API, tipos do web e build Next passaram; 44 cenários de regressão em PGlite/Chrome passaram; 343 comparações de trechos confirmaram a preservação dos schemas, métodos e fluxos extraídos. Os guias tiveram 141 links locais conferidos. Schema, migrations e exports da auditoria original, incluindo o PDF, foram preservados.

## Referências

- [Desenvolvimento e convenções](desenvolvimento.md).
- [Autenticação e RBAC](autenticacao-e-permissoes.md).
- [Implantação](implantacao.md).
- [Índice da documentação](README.md).
