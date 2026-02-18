# Zyllen Gestão — Status do Projeto

> Atualizado em: 17/02/2026 — v0.4.0

---

## Resumo Geral

| Camada | Progresso | Observação |
|--------|:---------:|------------|
| Backend (API) | ~97% | 17 módulos, ~100 endpoints, guards, serviços e validação Zod |
| Frontend (Web) | ~80% | 24 páginas, sistema de OS com 6 formulários, preenchimento progressivo |
| Shared (Pacote) | ~90% | 36 schemas Zod, tipos compartilhados, integrados no backend |
| Infraestrutura | ~90% | Docker, PM2, env configurados |
| Testes | 0% | Nenhum teste unitário ou e2e |

---

## Changelog v0.4.0 (17/02/2026)

### Novas Funcionalidades

- **6 formulários de OS reescritos** — Cada tipo de formulário (Instalação Sala, Instalação Tela, Desinstalação, Manutenção Tela/Sala, Suporte Remoto, Terceirizado) com campos específicos organizados em seções conforme especificação
- **Preenchimento progressivo de OS** — OS pode ser salva como rascunho e preenchida conforme o serviço avança (`PUT /maintenance/:id/form-data`)
- **Página Minhas OS** — Nova aba na sidebar (`/dashboard/minhas-os`) com 3 abas: OS próprias, OS de colaboradores (admin), OS de terceirizados (admin)
- **Página Terceirizados** — Banco de dados de terceirizados cadastrados (`/dashboard/terceirizados`) com grid de cards
- **CPF no cadastro** — Terceirizados (obrigatório, unique) e clientes (opcional) agora informam CPF no registro
- **Pesquisa de empresa no cadastro de cliente** — Dropdown debounced que busca empresas por nome/CNPJ, permite vincular a empresa existente ou criar nova inline
- **Endpoint de contractors** — `GET /clients/contractors` lista todos os terceirizados para admin
- **Endpoint de company search** — `GET /clients/companies/search` busca pública por nome/CNPJ

### Alterações no Banco de Dados

- `ContractorUser`: Adicionado `cpf String? @unique`
- `MaintenanceOS`: Adicionados `osNumber`, `formType`, `formData`, `clientName`, `clientCity`, `clientState`, `location`, `scheduledDate`, `startedAt`, `endedAt`, `completedAt`; `assetId` agora é opcional

### Novos Schemas Zod

- `updateOsFormDataSchema` — Validação para preenchimento progressivo de OS
- `registerClientSchema` — Atualizado com `cpf?`, `companyId?`, `companyName` agora opcional
- `registerContractorSchema` — Atualizado com `cpf` obrigatório (min 11)
- `createMaintenanceSchema` — Expandido com formType, clientData, location, timestamps, formData

### Novos Endpoints

| Endpoint | Descrição |
|----------|-----------|
| `GET /maintenance/my-orders` | OS do usuário logado |
| `PUT /maintenance/:id/form-data` | Salvar progresso do formulário (colaborador) |
| `PUT /contractor/maintenance/:id/form-data` | Salvar progresso do formulário (terceirizado) |
| `GET /clients/contractors` | Listar terceirizados cadastrados (admin) |
| `GET /clients/companies/search` | Pesquisar empresas por nome/CNPJ (público) |

### Novas Páginas

| Rota | Descrição |
|------|-----------|
| `/dashboard/minhas-os` | Minhas OS + abas admin (Colaboradores/Terceirizados) |
| `/dashboard/terceirizados` | Banco de dados de terceirizados |

### Sidebar Atualizada (14 itens)

Dashboard → **Minhas OS** → Estoque → Patrimônio → Compras → Chamados → Manutenção → Etiquetas → **Terceirizados** → Clientes → Colaboradores → Permissões → Cadastros → Acesso

---

## 1. Backend (apps/api) — O Que Está Feito

### 1.1 Banco de Dados (Prisma)

**28 modelos** implementados no schema:

| Domínio | Modelos |
|---------|---------|
| Identidade e Acesso | `InternalUser`, `ExternalUser`, `ContractorUser`, `Role`, `ScreenPermission`, `RolePermission` |
| Empresas/Clientes | `Company` |
| Catálogo | `Category`, `SkuItem` |
| Patrimônio | `Asset` |
| Estoque | `Location`, `StockBalance`, `StockMovement`, `MovementType`, `ApprovalRequest` |
| Saídas de Produtos | `ProductExit` |
| Chamados | `Ticket`, `TicketMessage`, `TicketAttachment` |
| Manutenção | `MaintenanceOS` |
| Compras | `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, `Receiving`, `ReceivingItem` |
| Etiquetas | `LabelTemplate`, `LabelPrintJob` |
| Auditoria | `AuditLog` |

Banco: **SQLite** (`file:./dev.db`)

### 1.2 Módulos e Endpoints (~100 endpoints em 14 controllers)

#### Auth (`/auth`) — 12 endpoints
- ✅ `POST /auth/login` — Login com email/senha
- ✅ `POST /auth/refresh` — Refresh token
- ✅ `POST /auth/users` — Criar usuário (JWT + `access.manage`)
- ✅ `GET /auth/users` — Listar usuários internos
- ✅ `GET /auth/users/:id` — Detalhe colaborador
- ✅ `PUT /auth/users/:id` — Editar colaborador
- ✅ `POST /auth/users/:id/reset-pin` — Resetar PIN
- ✅ `GET /auth/me` — Dados do usuário logado
- ✅ `GET /auth/me/profile` — Perfil completo + atividade
- ✅ `PUT /auth/me/profile` — Editar próprio perfil
- ✅ `GET /auth/me/permissions` — Permissões do usuário logado
- ✅ `POST /auth/validate-pin` — Validar PIN

#### Access (`/access`) — 9 endpoints
- ✅ CRUD completo para **roles** (5 endpoints)
- ✅ Gestão de **permissões** (3 endpoints)
- ✅ Atribuição de permissões ao role

#### Assets (`/assets`) — 9 endpoints
- ✅ `GET /assets` — Listar ativos (paginado)
- ✅ `GET /assets/summary` — Resumo de equipamentos por SKU + distribuição por local
- ✅ `GET /assets/lookup/:assetCode` — Buscar ativo por código
- ✅ `GET /assets/:id` — Detalhe do ativo
- ✅ `GET /assets/:id/timeline` — Timeline completa
- ✅ `POST /assets/bulk` — Cadastro em lote
- ✅ `POST /assets` — Criar ativo individual
- ✅ `PUT /assets/:id/status` — Alterar status
- ✅ `PUT /assets/:id/location` — Alterar localização

#### Catalog (`/catalog`) — 10 endpoints
- ✅ CRUD completo para **categorias** (5) e **SKUs** (5)

#### Clients (`/clients`) — 11 endpoints
- ✅ `POST /clients/login` — Login externo
- ✅ CRUD completo para **empresas** (5 endpoints)
- ✅ `GET /clients/companies/search` — Pesquisa pública de empresas
- ✅ `GET /clients/users` + `POST /clients/users` — Usuários externos
- ✅ `GET /clients/contractors` — Listar terceirizados cadastrados

#### Inventory (`/inventory`) — 13 endpoints
- ✅ Entrada/saída de estoque com validação PIN
- ✅ Fluxo de aprovação/rejeição
- ✅ Reversão com aprovação
- ✅ Histórico e saldos
- ✅ CRUD tipos de movimentação

#### Product Exits (`/product-exits`) — 4 endpoints
- ✅ Registrar saída, listar, relatório, resumo

#### Labels (`/labels`) — 7 endpoints
- ✅ Impressão, histórico, dados, CRUD templates

#### Locations (`/locations`) — 5 endpoints
- ✅ CRUD completo

#### Maintenance (`/maintenance`) — 6 endpoints
- ✅ `GET /maintenance` — Listar OS (filtros, paginação)
- ✅ `GET /maintenance/my-orders` — **NOVO** — OS do usuário logado
- ✅ `GET /maintenance/:id` — Detalhe da OS
- ✅ `POST /maintenance` — Abrir OS (formType, clientData, location, formData)
- ✅ `PUT /maintenance/:id/status` — Atualizar status
- ✅ `PUT /maintenance/:id/form-data` — **NOVO** — Preenchimento progressivo

#### Contractor Maintenance (`/contractor/maintenance`) — 5 endpoints
- ✅ `GET` — Listar minhas OS
- ✅ `GET /:id` — Detalhe
- ✅ `POST` — Abrir OS (com location, startedAt/endedAt)
- ✅ `PUT /:id/status` — Atualizar status (não pode fechar)
- ✅ `PUT /:id/form-data` — **NOVO** — Preenchimento progressivo

#### Purchases (`/purchases`) — 5 endpoints
- ✅ CRUD + recebimento com divergência

#### Registration (`/register`) — 3 endpoints
- ✅ `POST /register/client` — Cadastro cliente (com CPF, companyId/companyName)
- ✅ `POST /register/contractor` — Cadastro terceirizado (com CPF obrigatório)
- ✅ `POST /register/contractor/login` — Login terceirizado

#### Suppliers (`/suppliers`) — 5 endpoints
- ✅ CRUD completo

#### Tickets (`/tickets` + `/client/tickets`) — 10 endpoints
- ✅ CRUD + chat + portal cliente

### 1.3 Seed (Dados Iniciais)
- ✅ 3 roles: Admin, Técnico, Gestor
- ✅ 46 permissões de tela com matriz de atribuição completa
- ✅ Usuário admin (admin@zyllen.com / admin123 / PIN 0000)
- ✅ 1 localização padrão, 1 categoria padrão
- ✅ 4 tipos de movimentação

---

## 2. Frontend (apps/web) — O Que Está Feito

### 2.1 Infraestrutura
- ✅ **AuthProvider** — Login, logout, refresh token, verificação de permissões
- ✅ **ApiClient** — Auto-refresh em 401, force logout, todos os métodos HTTP
- ✅ **Providers** — React Query + AuthProvider + Sonner toaster
- ✅ **Design Tokens** — Tema dark com CSS variables
- ✅ **Dashboard Layout** — Sidebar colapsável com 14 itens de navegação baseados em permissão

### 2.2 Componentes UI (13)
`badge`, `breadcrumb`, `button`, `card`, `dialog`, `input`, `label`, `select`, `separator`, `skeleton`, `table`, `tabs`, `textarea`

### 2.3 Componentes de Marca (9)
- 5 componentes de logo: `ZyllenWordmark`, `ZyllenIcon`, `ZyllenLogoFull`, `ZyllenTextLogo`, `ZyllenBrandHeader`
- 4 componentes geométricos: `DiagonalPattern`, `ZPattern`, `AngularLine`, `CornerAccent`

### 2.4 Componentes de OS (8)
- **6 formulários por tipo:** `InstalacaoSalaFormFields`, `InstalacaoTelaFormFields`, `DesinstalacaoFormFields`, `ManutencaoTelaSalaFormFields`, `SuporteRemotoFormFields`, `TerceirizadoFormFields`
- **1 wizard multi-step:** `OsFormWizard` (criar + editar + rascunho)
- **1 barrel export:** `index.ts`

### 2.5 Páginas (24)

| Página | Rota | Status | Funcionalidades |
|--------|------|:------:|-----------------|
| Login | `/` | ✅ Completa | Form email/senha, 3 tipos, split-screen brand |
| Cadastro | `/cadastro` | ✅ Completa | Registro cliente (CPF + pesquisa empresa) e terceirizado (CPF obrigatório) |
| Dashboard | `/dashboard` | ✅ Completa | Cards de estatísticas, aprovações, chamados recentes, manutenções recentes |
| **Minhas OS** | `/dashboard/minhas-os` | ✅ **NOVA** | 3 abas (Minhas OS, Colaboradores, Terceirizados), filtro por status, edição progressiva |
| Estoque | `/dashboard/estoque` | ✅ Completa | 4 abas: Saldos, Entrada, Saída, Histórico |
| Equipamentos | `/dashboard/equipamentos` | ✅ Completa | Cadastro em lote, categorias, locais |
| Saídas | `/dashboard/saidas` | ✅ Completa | Registrar, histórico, relatório (dia/mês/ano) |
| Patrimônio | `/dashboard/patrimonio` | ✅ Completa | Busca, detalhe, timeline |
| Compras | `/dashboard/compras` | ✅ Completa | Pedidos, recebimento, status |
| Chamados | `/dashboard/chamados` | ✅ Completa | Fila, chat, SLA, atribuição |
| Manutenção | `/dashboard/manutencao` | ✅ Completa | Abrir OS, lista, ações (Iniciar/Fechar) |
| Etiquetas | `/dashboard/etiquetas` | ✅ Completa | Imprimir, histórico, templates |
| **Terceirizados** | `/dashboard/terceirizados` | ✅ **NOVA** | Grid de cards com dados e contagem de OS |
| Clientes | `/dashboard/clientes` | ✅ Completa | Empresas CRUD + Usuários Externos |
| Cadastros | `/dashboard/cadastros` | ✅ Completa | Categorias, SKUs, Locais, Fornecedores, Tipos de Movimento |
| Acesso | `/dashboard/acesso` | ✅ Completa | Roles, permissões, RBAC |
| Colaboradores | `/dashboard/colaboradores` | ✅ Completa | Lista + detalhe editável |
| Permissões | `/dashboard/permissoes` | ✅ Completa | Gestão granular |
| Perfil | `/dashboard/perfil` | ✅ Completa | Dados pessoais, atividade |
| Portal Cliente | `/portal-cliente` | ✅ Completa | Home + chamados |
| Portal Terceirizado | `/portal-terceirizado` | ✅ Completa | Home + OS |

---

## 3. Shared Package (packages/shared)

### Tipos
- ✅ 7 enums: `AssetStatus`, `ApprovalStatus`, `TicketStatus`, `TicketPriority`, `MaintenanceStatus`, `PurchaseOrderStatus`, `AuthorType`
- ✅ 3 interfaces: `ApiResponse<T>`, `PaginatedResponse<T>`, `PaginationParams`

### Schemas Zod (36)
- **Autenticação:** loginSchema, loginExternalSchema, loginContractorSchema, pinSchema, refreshTokenSchema, createInternalUserSchema, updateInternalUserSchema, changePasswordSchema, resetPinSchema, createExternalUserSchema, registerClientSchema (+cpf, +companyId), registerContractorSchema (+cpf)
- **Empresas/Catálogo:** createCompanySchema, updateCompanySchema, createCategorySchema, createSkuItemSchema, createLocationSchema, createSupplierSchema
- **Patrimônio:** createAssetSchema, bulkEquipmentSchema
- **Estoque:** createStockEntrySchema, createStockExitSchema, createStockMovementSchema, createMovementTypeSchema, createProductExitSchema
- **Chamados/Manutenção:** createTicketSchema, createMaintenanceSchema (expandido), updateMaintenanceStatusSchema, **updateOsFormDataSchema** (novo)
- **Compras:** createPurchaseOrderSchema, receivePurchaseOrderSchema
- **Etiquetas:** printLabelSchema, createLabelTemplateSchema
- **Permissões:** createRoleSchema, updateRoleSchema, assignPermissionsSchema, createPermissionSchema, approvalActionSchema
- **Utilitários:** paginationSchema

---

## 4. Infraestrutura

| Item | Status |
|------|:------:|
| API Dockerfile | ✅ |
| Web Dockerfile | ✅ |
| docker-compose.yml | ✅ |
| .dockerignore | ✅ |
| ecosystem.config.js (PM2) | ✅ |
| .env.example | ✅ |
| next.config.ts (standalone + CORS) | ✅ |
| Segurança JWT (ConfigService) | ✅ |
| CORS via env var | ✅ |
| Acesso externo (192.168.1.93) | ✅ |

---

## 5. O Que Falta — Priorizado

### 🔴 Crítico (Bloqueia produção)

| # | Item | Descrição |
|---|------|-----------|
| 1 | **Nenhum teste** | Zero arquivos `.spec.ts`. Sem testes unitários, integração ou e2e |
| 2 | **SQLite em produção** | Docker Compose usa `file:./dev.db`. Não adequado para múltiplos usuários simultâneos |

### 🟡 Alta Prioridade

| # | Item | Descrição |
|---|------|-----------|
| 3 | **Upload de anexos nos chamados** | Modelo `TicketAttachment` existe mas não há endpoint de upload |
| 4 | **Visualização de auditoria** | Modelo `AuditLog` populado mas sem endpoint/página |
| 5 | **Sem fluxo de reset de senha** | Sem endpoint para trocar senha ou regenerar PIN pelo email |

### 🟠 Média Prioridade

| # | Item | Descrição |
|---|------|-----------|
| 6 | **Prioridade CRITICAL faltando** | API suporta `CRITICAL` nos tickets, dropdown mostra LOW/MEDIUM/HIGH |
| 7 | **Compras: PO com 1 item apenas** | Formulário cria PO com 1 SKU/qty. API suporta array |
| 8 | **Sem menu hamburger mobile** | Sidebar colapsa mas sem botão hamburger em telas pequenas |
| 9 | **Ticket sem `externalUserId`** | Endpoint exige, form não tem campo |

### 🟢 Baixa Prioridade

| # | Item | Descrição |
|---|------|-----------|
| 10 | **Sem tema claro** | App fixo em dark mode, sem toggle |
| 11 | **Sem rate limiting refinado** | Endpoints de login com throttling básico |
| 12 | **Sem documentação Swagger/OpenAPI** | NestJS suporta mas não configurado |
| 13 | **Permissão `settings.view` sobrecarregada** | Usada para empresas, tipos, templates, fornecedores, terceirizados |

---

## 6. Próximos Passos Recomendados

1. **Migrar para PostgreSQL** — Para ambiente de produção
2. **Página de Auditoria** — Endpoint `GET /audit-logs` + página no frontend
3. **Testes** — Começar com testes e2e dos fluxos críticos
4. **Upload de anexos** — Implementar endpoint de upload nos chamados
5. **Swagger/OpenAPI** — Documentação automática da API
6. **Botão criar OS no portal terceirizado** — Alinhar estilo com o de colaborador

---

## Estatísticas do Projeto

| Métrica | Valor |
|---------|-------|
| Total de arquivos fonte | ~95 |
| Modelos Prisma | 28 |
| Endpoints da API | ~100 |
| Módulos NestJS | 17 |
| Páginas do frontend | 24 |
| Componentes UI (shadcn) | 13 |
| Componentes de marca | 9 |
| Componentes OS (formulários) | 8 |
| Schemas Zod compartilhados | 36 |
| Fontes customizadas | 2 |
| Permissões RBAC | 46 |
| Compilação TypeScript | ✅ 0 erros |
