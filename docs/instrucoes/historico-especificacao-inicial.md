# Especificação inicial e plano de desenvolvimento

> Histórico de fevereiro de 2026, consolidado de `PROJETO.md` e `DESENVOLVIMENTO.md`. Não é guia de operação nem inventário atual. As referências a SQLite, PM2, papéis, contagens e contratos descrevem aquela fase; o código atual prevalece. Setup, ambiente, migrations e deploy foram centralizados nos guias atuais.

## Como consultar

- [Arquitetura atual](arquitetura.md).
- [Desenvolvimento e convenções atuais](desenvolvimento.md).
- [Migrations no banco compartilhado](banco-de-dados.md).
- [Histórico de entregas](historico-desenvolvimento.md).

## Visão Geral

O **Zyllen Gestão** é uma plataforma web completa para gestão operacional, abrangendo:

- **Estoque** — Entradas, saídas, transferências, saldos por localização, aprovações e reversões
- **Patrimônio** — Cadastro de equipamentos com códigos únicos, rastreamento de status e timeline
- **Chamados (Tickets)** — Sistema de suporte com fluxo interno e portal do cliente
- **Manutenção (OS)** — Ordens de serviço com 6 tipos de formulário, portal do terceirizado
- **Compras** — Pedidos de compra com workflow de aprovação e recebimento com divergências
- **Etiquetas** — Geração e impressão de etiquetas com código de barras para patrimônios
- **Controle de Acesso** — RBAC completo com papéis, permissões por tela e gestão de colaboradores

O sistema suporta **3 tipos de usuário**:

| Tipo | Descrição | Portal |
|------|-----------|--------|
| **Interno** | Colaboradores da empresa (técnicos, gestores, admin) | `/dashboard` |
| **Externo** | Clientes que abrem chamados de suporte | `/portal-cliente` |
| **Terceirizado** | Prestadores de serviço que executam manutenções | `/portal-terceirizado` |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                     Monorepo (pnpm)                     │
├──────────────┬──────────────┬───────────────────────────┤
│  apps/web    │  apps/api    │  packages/shared          │
│  Next.js 16  │  NestJS 10   │  Types + Zod Schemas      │
│  React 19    │  Prisma 6    │                           │
│  TailwindCSS │  SQLite      │                           │
│  :3000       │  :3001       │                           │
└──────┬───────┴──────┬───────┴───────────────────────────┘
       │              │
       │  REST API    │
       └──────────────┘
```

- **Frontend (web)** — SPA com Next.js 16, standalone output, comunicação via REST com a API
- **Backend (api)** — API REST com NestJS, autenticação JWT, banco SQLite via Prisma ORM
- **Shared** — Pacote com tipos TypeScript e schemas Zod compartilhados entre API e frontend

---

## Stack Tecnológica

### Backend (`apps/api`)

| Tecnologia | Versão | Função |
|-----------|--------|--------|
| NestJS | 10.4 | Framework HTTP |
| Prisma | 6.3 | ORM + Migrations |
| SQLite | — | Banco de dados |
| Passport + JWT | 11.0 | Autenticação |
| Throttler | 6.5 | Rate limiting |
| bcrypt | 5.1 | Hash de senhas e PINs |
| Zod | 3.23 | Validação de schemas |
| class-validator | 0.14 | Validação de DTOs |
| PDFKit | 0.17 | Geração de PDFs |
| bwip-js | 4.8 | Geração de códigos de barras |

### Frontend (`apps/web`)

| Tecnologia | Versão | Função |
|-----------|--------|--------|
| Next.js | 16.1 | Framework React |
| React | 19.2 | UI Library |
| Tailwind CSS | 4 | Estilização |
| Radix UI | 1.4 | Componentes acessíveis |
| TanStack React Query | 5.90 | Cache e data fetching |
| React Hook Form | 7.71 | Formulários |
| Lucide React | 0.563 | Ícones |
| Sonner | 2.0 | Notificações toast |

### Compartilhado (`packages/shared`)

| Tecnologia | Função |
|-----------|--------|
| TypeScript | Tipos e enums compartilhados |
| Zod | 40+ schemas de validação |

### Infraestrutura

| Ferramenta | Função |
|-----------|--------|
| pnpm | Gerenciador de pacotes + workspaces |
| Docker Compose | Containerização (API + Web) |
| PM2 | Process manager (produção) |

---

## Estrutura do Monorepo

```
zyllen-gestao/
├── package.json                 # Scripts root do monorepo
├── pnpm-workspace.yaml          # Configuração do workspace
├── tsconfig.base.json           # TypeScript base compartilhado
├── docker-compose.yml           # Deploy com containers
├── ecosystem.config.js          # Configuração PM2
│
├── apps/
│   ├── api/                     # Backend NestJS
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # Schema do banco (20 models)
│   │   │   ├── seed.ts          # Dados iniciais
│   │   │   └── migrations/      # 5 migrations
│   │   └── src/
│   │       ├── main.ts          # Bootstrap da aplicação
│   │       ├── app.module.ts    # Módulo raiz (13 módulos)
│   │       ├── app.controller.ts# Health check
│   │       ├── prisma/          # PrismaService global
│   │       ├── pipes/           # ZodValidationPipe, PaginationPipe
│   │       └── modules/
│   │           ├── auth/        # Login, JWT, CRUD de usuarios internos
│   │           ├── access/      # Roles, permissões, guards
│   │           ├── catalog/     # Categorias e SKUs
│   │           ├── locations/   # Locais de estoque
│   │           ├── suppliers/   # Fornecedores
│   │           ├── assets/      # Patrimônios / equipamentos
│   │           ├── inventory/   # Movimentações, aprovações, reversões
│   │           ├── clients/     # Empresas, usuarios externos, terceirizados
│   │           ├── tickets/     # Chamados internos + portal cliente
│   │           ├── maintenance/ # Ordens de serviço + portal terceirizado
│   │           ├── purchases/   # Pedidos de compra e recebimentos
│   │           ├── labels/      # Etiquetas e templates
│   │           ├── registration/# Auto-cadastro (cliente/terceirizado)
│   │           └── product-exits/# Saídas de produto
│   │
│   └── web/                     # Frontend Next.js
│       └── src/
│           ├── app/
│           │   ├── page.tsx              # Login unificado
│           │   ├── cadastro/             # Auto-cadastro
│           │   ├── dashboard/            # Portal interno (20 páginas)
│           │   ├── portal-cliente/       # Portal do cliente (2 páginas)
│           │   └── portal-terceirizado/  # Portal do terceirizado (2 páginas)
│           ├── components/
│           │   ├── ui/           # 13 componentes base (Radix + Tailwind)
│           │   ├── brand/        # Logo e elementos visuais
│           │   ├── os-forms/     # Wizard de formulários de OS
│           │   ├── dashboard-layout.tsx
│           │   └── portal-layout.tsx
│           └── lib/
│               ├── api-client.ts   # HTTP client com auto-refresh
│               ├── auth-context.tsx # Contexto de autenticação React
│               ├── os-pdf.ts       # Geração de PDF de OS
│               ├── brand-voice.ts  # Textos e mensagens padronizadas
│               ├── theme-tokens.ts # Design tokens
│               └── utils.ts        # Utilitários (cn, formatDate, etc.)
│
└── packages/
    └── shared/                  # Tipos e schemas compartilhados
        └── src/
            ├── index.ts         # Re-exporta tudo
            ├── types/index.ts   # Enums e interfaces
            └── zod/index.ts     # 40+ schemas Zod
```

---

## Banco de Dados (Prisma Schema)

O sistema utiliza **SQLite** com **20 models** organizados em 8 domínios:

### Identidade e Acesso

| Model | Descrição |
|-------|-----------|
| `InternalUser` | Colaboradores internos — email, senha (bcrypt), PIN 4 dígitos, role, setor |
| `ExternalUser` | Clientes externos — email, senha, empresa vinculada, cidade/estado |
| `ContractorUser` | Terceirizados — email, senha, CPF, cidade/estado |
| `Role` | Papéis do sistema (Admin, Técnico, Gestor, customizáveis) |
| `ScreenPermission` | Permissões por tela+ação (ex: `inventory.bipar_entrada`) |
| `RolePermission` | Relacionamento N:N entre Role e ScreenPermission |
| `Company` | Empresas/clientes — nome, CNPJ, endereço, telefone |

### Catálogo e Patrimônio

| Model | Descrição |
|-------|-----------|
| `Category` | Categorias de produtos (ex: Eletrônicos, Cabos) |
| `SkuItem` | SKU — código único auto-gerado, nome, marca, código de barras, categoria |
| `Asset` | Patrimônio individual — código único (SKY-XXXXX), SKU, status, localização |

### Estoque

| Model | Descrição |
|-------|-----------|
| `Location` | Locais de armazenamento (ex: Almoxarifado Central) |
| `StockBalance` | Saldo de estoque por SKU × Localização |
| `StockMovement` | Movimentação — tipo, SKU, de/para, quantidade, responsável, PIN |
| `MovementType` | Tipos de movimentação (Entrada, Saída, Transferência, Baixa) |
| `ProductExit` | Saídas de produto com motivo e responsável |

### Aprovações

| Model | Descrição |
|-------|-----------|
| `ApprovalRequest` | Solicitações de aprovação (saídas com baixa, reversões) |

### Chamados

| Model | Descrição |
|-------|-----------|
| `Ticket` | Chamados com título, prioridade, SLA, atribuição |
| `TicketMessage` | Mensagens do chat (autor interno ou externo) |
| `TicketAttachment` | Anexos de chamados |

### Manutenção

| Model | Descrição |
|-------|-----------|
| `MaintenanceOS` | Ordem de serviço com 6 tipos de formulário, dados do cliente, JSON de campos customizados |

### Compras

| Model | Descrição |
|-------|-----------|
| `Supplier` | Fornecedores — nome, CNPJ, contato |
| `PurchaseOrder` | Pedido de compra — fornecedor, status workflow, número sequencial |
| `PurchaseOrderItem` | Itens do pedido (SKU + quantidade) |
| `Receiving` | Recebimentos vinculados a um pedido |
| `ReceivingItem` | Itens recebidos com quantidade e nota de divergência |

### Etiquetas e Auditoria

| Model | Descrição |
|-------|-----------|
| `LabelTemplate` | Templates de layout de etiquetas |
| `LabelPrintJob` | Registro de impressões de etiquetas |
| `AuditLog` | Log de auditoria — ação, entidade, usuário, detalhes JSON |

### Diagrama de Relacionamentos

```
InternalUser ─┬─ Role ─── RolePermission ─── ScreenPermission
              ├─ StockMovement
              ├─ ApprovalRequest
              ├─ Ticket (assigned)
              ├─ MaintenanceOS (opened/closed)
              ├─ Receiving
              ├─ LabelPrintJob
              ├─ AuditLog
              └─ ProductExit

ExternalUser ──── Company ─── Ticket

ContractorUser ── MaintenanceOS

SkuItem ─┬─ Category
         ├─ Asset ─── Location
         ├─ StockBalance ─── Location
         ├─ StockMovement ─── MovementType
         ├─ PurchaseOrderItem ─── PurchaseOrder ─── Supplier
         └─ ProductExit ─── Location
```

---

## API — Endpoints

**Total: 93 endpoints em 13 módulos**

### Health Check

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/health` | Verificação de saúde da API | Não |

### Auth (Autenticação)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `POST` | `/auth/login` | Login de usuário interno (rate-limited 5/min) | Não |
| `POST` | `/auth/refresh` | Renovar access token via refresh token | Não |
| `POST` | `/auth/users` | Criar usuário interno | `access.manage` |
| `GET` | `/auth/users` | Listar todos os usuários internos | `access.view` |
| `GET` | `/auth/users/:id` | Detalhe de um usuário interno | `access.view` |
| `PUT` | `/auth/users/:id` | Atualizar usuário interno | `access.manage` |
| `DELETE` | `/auth/users/:id` | Excluir usuário interno | `access.manage` |
| `POST` | `/auth/users/:id/reset-pin` | Resetar PIN de 4 dígitos | `access.manage` |
| `GET` | `/auth/me` | Dados do usuário autenticado | JWT |
| `GET` | `/auth/me/profile` | Perfil completo + permissões + atividades | JWT |
| `PUT` | `/auth/me/profile` | Alterar nome/senha/PIN (exige senha atual) | JWT |
| `GET` | `/auth/me/permissions` | Lista de permissões do usuário | JWT |
| `POST` | `/auth/validate-pin` | Validar PIN de 4 dígitos | JWT |

### Access (Controle de Acesso)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/access/roles` | Listar papéis | `access.view` |
| `GET` | `/access/roles/:id` | Detalhe de um papel | `access.view` |
| `POST` | `/access/roles` | Criar papel | `access.manage_roles` |
| `PUT` | `/access/roles/:id` | Atualizar papel | `access.manage_roles` |
| `DELETE` | `/access/roles/:id` | Excluir papel | `access.manage_roles` |
| `GET` | `/access/permissions` | Listar todas as permissões | `access.view` |
| `POST` | `/access/permissions` | Criar permissão de tela | `access.manage_permissions` |
| `DELETE` | `/access/permissions/:id` | Excluir permissão | `access.manage_permissions` |
| `POST` | `/access/roles/:id/permissions` | Atribuir permissões a um papel | `access.manage_permissions` |

### Catalog (Catálogo)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/catalog/categories` | Listar categorias (paginado) | `catalog.view` |
| `GET` | `/catalog/categories/:id` | Detalhe de categoria | `catalog.view` |
| `POST` | `/catalog/categories` | Criar categoria | `catalog.create` |
| `PUT` | `/catalog/categories/:id` | Atualizar categoria | `catalog.update` |
| `DELETE` | `/catalog/categories/:id` | Excluir categoria | `catalog.delete` |
| `GET` | `/catalog/skus` | Listar SKUs (filtros: categoria, busca, paginado) | `catalog.view` |
| `GET` | `/catalog/skus/:id` | Detalhe de SKU | `catalog.view` |
| `POST` | `/catalog/skus` | Criar SKU | `catalog.create` |
| `PUT` | `/catalog/skus/:id` | Atualizar SKU | `catalog.update` |
| `DELETE` | `/catalog/skus/:id` | Excluir SKU | `catalog.delete` |

### Locations (Locais)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/locations` | Listar locais (paginado) | `locations.view` |
| `GET` | `/locations/:id` | Detalhe de local | `locations.view` |
| `POST` | `/locations` | Criar local | `locations.create` |
| `PUT` | `/locations/:id` | Atualizar local | `locations.update` |
| `DELETE` | `/locations/:id` | Excluir local | `locations.delete` |

### Suppliers (Fornecedores)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/suppliers` | Listar fornecedores (paginado) | `suppliers.view` |
| `GET` | `/suppliers/:id` | Detalhe de fornecedor | `suppliers.view` |
| `POST` | `/suppliers` | Criar fornecedor | `suppliers.create` |
| `PUT` | `/suppliers/:id` | Atualizar fornecedor | `suppliers.update` |
| `DELETE` | `/suppliers/:id` | Excluir fornecedor | `suppliers.delete` |

### Assets (Patrimônio)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/assets` | Listar patrimônios (filtros: SKU, status, local, busca) | `assets.view` |
| `GET` | `/assets/summary` | Resumo de equipamentos agrupado por SKU | `assets.view` |
| `GET` | `/assets/lookup/:assetCode` | Consultar patrimônio por código | `assets.lookup` |
| `GET` | `/assets/:id` | Detalhe de patrimônio | `assets.view` |
| `GET` | `/assets/:id/timeline` | Timeline de movimentações/eventos | `assets.view` |
| `POST` | `/assets/bulk` | Cadastro em lote (cria SKU + N patrimônios) | `assets.create` |
| `POST` | `/assets` | Criar patrimônio individual | `assets.create` |
| `PUT` | `/assets/:id/status` | Alterar status do patrimônio | `assets.create` |
| `PUT` | `/assets/:id/location` | Alterar localização do patrimônio | `assets.create` |

### Inventory (Estoque)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `POST` | `/inventory/entry` | Registrar entrada (requer PIN) | `inventory.bipar_entrada` |
| `POST` | `/inventory/exit` | Registrar saída (requer PIN) | `inventory.bipar_saida` |
| `POST` | `/inventory/approvals/:id/approve` | Aprovar saída pendente | `approvals.approve` |
| `POST` | `/inventory/approvals/:id/reject` | Rejeitar saída pendente | `approvals.reject` |
| `POST` | `/inventory/movements/:id/reversal` | Solicitar reversão | `inventory.historico` |
| `POST` | `/inventory/reversals/:id/approve` | Aprovar reversão | `approvals.approve` |
| `GET` | `/inventory/approvals/pending` | Listar aprovações pendentes | `approvals.view` |
| `GET` | `/inventory/movements` | Histórico de movimentações (paginado) | `inventory.historico` |
| `GET` | `/inventory/balances` | Saldos de estoque (por local/SKU) | `inventory.view` |
| `GET` | `/inventory/movement-types` | Listar tipos de movimentação | `inventory.view` |
| `POST` | `/inventory/movement-types` | Criar tipo de movimentação | `settings.manage` |
| `PUT` | `/inventory/movement-types/:id` | Atualizar tipo de movimentação | `settings.manage` |
| `DELETE` | `/inventory/movement-types/:id` | Excluir tipo de movimentação | `settings.manage` |

### Product Exits (Saídas de Produto)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `POST` | `/product-exits` | Registrar saída de produto | `inventory.exit` |
| `GET` | `/product-exits` | Listar saídas (filtros: SKU, local, data, busca) | `inventory.view` |
| `GET` | `/product-exits/report` | Relatório agregado (dia/mês/ano) | `inventory.view` |
| `GET` | `/product-exits/summary` | Resumo de saídas (totais) | `inventory.view` |

### Tickets (Chamados — Interno)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/tickets` | Listar chamados (filtros: status, empresa, atribuição) | `tickets.view` |
| `GET` | `/tickets/:id` | Detalhe do chamado com mensagens | `tickets.view` |
| `POST` | `/tickets` | Criar chamado | `tickets.triage` |
| `PUT` | `/tickets/:id/assign` | Atribuir chamado a colaborador | `tickets.assign` |
| `PUT` | `/tickets/:id/status` | Alterar status do chamado | `tickets.triage` |
| `POST` | `/tickets/:id/messages` | Enviar mensagem interna | `tickets.view` |

### Client Tickets (Chamados — Portal Cliente)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/client/tickets` | Listar meus chamados | JWT (externo) |
| `GET` | `/client/tickets/:id` | Detalhe do chamado (verifica propriedade) | JWT (externo) |
| `POST` | `/client/tickets` | Criar chamado como cliente | JWT (externo) |
| `POST` | `/client/tickets/:id/messages` | Enviar mensagem no chamado | JWT (externo) |

### Maintenance (Manutenção — Interno)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/maintenance` | Listar OS (filtros: status, tipo, patrimônio) | `maintenance.view` |
| `GET` | `/maintenance/my-orders` | Minhas OS | `maintenance.view` |
| `GET` | `/maintenance/:id` | Detalhe da OS | `maintenance.view` |
| `POST` | `/maintenance` | Abrir OS | `maintenance.open` |
| `PUT` | `/maintenance/:id/status` | Alterar status da OS | `maintenance.execute` |
| `PUT` | `/maintenance/:id/form-data` | Atualizar dados do formulário | `maintenance.execute` |

### Contractor Maintenance (Manutenção — Portal Terceirizado)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/contractor/maintenance` | Listar minhas OS | JWT (terceirizado) |
| `GET` | `/contractor/maintenance/:id` | Detalhe da OS (verifica propriedade) | JWT (terceirizado) |
| `POST` | `/contractor/maintenance` | Abrir OS como terceirizado | JWT (terceirizado) |
| `PUT` | `/contractor/maintenance/:id/form-data` | Atualizar dados do formulário | JWT (terceirizado) |
| `PUT` | `/contractor/maintenance/:id/status` | Alterar status (não pode fechar) | JWT (terceirizado) |

### Purchases (Compras)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/purchases` | Listar pedidos de compra | `purchases.view` |
| `GET` | `/purchases/:id` | Detalhe do pedido | `purchases.view` |
| `POST` | `/purchases` | Criar pedido de compra | `purchases.create` |
| `PUT` | `/purchases/:id/status` | Alterar status do pedido | `purchases.approve` |
| `POST` | `/purchases/:id/receive` | Registrar recebimento de itens | `purchases.receive` |

### Labels (Etiquetas)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `POST` | `/labels/print` | Registrar impressão de etiqueta | `labels.print` |
| `GET` | `/labels/history` | Histórico de impressões | `labels.view` |
| `GET` | `/labels/data/:assetId` | Dados da etiqueta de um patrimônio | `labels.view` |
| `GET` | `/labels/templates` | Listar templates de etiqueta | `labels.view` |
| `POST` | `/labels/templates` | Criar template | `settings.manage` |
| `PUT` | `/labels/templates/:id` | Atualizar template | `settings.manage` |
| `DELETE` | `/labels/templates/:id` | Excluir template | `settings.manage` |

### Clients (Clientes e Terceirizados)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `POST` | `/clients/login` | Login de cliente externo | Não |
| `GET` | `/clients/companies/search` | Busca de empresa (público, rate-limited) | Não |
| `GET` | `/clients/contractors` | Listar terceirizados | `settings.view` |
| `PUT` | `/clients/contractors/:id` | Ativar/desativar terceirizado | `settings.manage` |
| `DELETE` | `/clients/contractors/:id` | Excluir terceirizado | `settings.manage` |
| `GET` | `/clients/companies` | Listar empresas | `settings.view` |
| `GET` | `/clients/companies/:id` | Detalhe da empresa | `settings.view` |
| `POST` | `/clients/companies` | Criar empresa | `settings.manage` |
| `PUT` | `/clients/companies/:id` | Atualizar empresa | `settings.manage` |
| `DELETE` | `/clients/companies/:id` | Excluir empresa | `settings.manage` |
| `GET` | `/clients/users` | Listar usuários externos | `settings.view` |
| `POST` | `/clients/users` | Criar usuário externo | `settings.manage` |

### Registration (Auto-Cadastro)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `POST` | `/register/client` | Auto-cadastro de cliente (rate-limited) | Não |
| `POST` | `/register/contractor` | Auto-cadastro de terceirizado (rate-limited) | Não |
| `POST` | `/register/contractor/login` | Login de terceirizado (rate-limited) | Não |

---

## Frontend — Páginas

**Total: 24 páginas**

### Páginas Públicas

| Rota | Descrição |
|------|-----------|
| `/` | **Login unificado** — 3 abas (Interno, Cliente, Terceirizado) com redirecionamento automático |
| `/cadastro` | **Auto-cadastro** — Formulário público para clientes e terceirizados criarem conta |

### Dashboard (Portal Interno — `/dashboard/*`)

| Rota | Descrição |
|------|-----------|
| `/dashboard` | **Painel principal** — Cards resumo (estoque, patrimônios, chamados, OS), aprovações pendentes |
| `/dashboard/estoque` | **Estoque** — Entrada/saída com bipagem, saldos por local, histórico de movimentações |
| `/dashboard/patrimonio` | **Consulta de patrimônio** — Busca por código, card de detalhes com timeline |
| `/dashboard/equipamentos` | **Equipamentos** — Resumo por SKU, categorias, locais, cadastro em lote |
| `/dashboard/cadastros` | **Cadastros** — CRUD de categorias, SKUs, locais, fornecedores e tipos de movimentação |
| `/dashboard/saidas` | **Saídas** — Registro de saídas, histórico com filtros, relatórios por período |
| `/dashboard/chamados` | **Chamados** — Lista, criação, triagem, atribuição, chat de mensagens |
| `/dashboard/manutencao` | **Manutenção** — Lista/criação/edição de OS com wizard de 6 tipos de formulário, impressão PDF |
| `/dashboard/minhas-os` | **Minhas OS** — Abas: minhas, de colaboradores, de terceirizados |
| `/dashboard/compras` | **Compras** — Criação de PO, workflow de status, recebimento com divergências |
| `/dashboard/etiquetas` | **Etiquetas** — Impressão de etiquetas com código de barras, histórico, templates |
| `/dashboard/clientes` | **Clientes** — CRUD de empresas e usuários externos |
| `/dashboard/colaboradores` | **Colaboradores** — Lista e criação de usuários internos |
| `/dashboard/colaboradores/[id]` | **Detalhe do colaborador** — Edição de perfil, papel, atividades, reset de PIN |
| `/dashboard/terceirizados` | **Terceirizados** — Lista, ativação/desativação, exclusão |
| `/dashboard/acesso` | **Controle de acesso** — CRUD de papéis, atribuição de usuários, permissões |
| `/dashboard/permissoes` | **Matriz de permissões** — Grid visual papéis × permissões com toggles |
| `/dashboard/perfil` | **Meu perfil** — Dados pessoais, alteração de senha/PIN, atividade recente |

### Portal do Cliente (`/portal-cliente/*`)

| Rota | Descrição |
|------|-----------|
| `/portal-cliente` | **Home** — Cards de ação rápida: abrir chamado, em andamento, resolvidos |
| `/portal-cliente/chamados` | **Chamados** — Criar, listar por status, enviar mensagens |

### Portal do Terceirizado (`/portal-terceirizado/*`)

| Rota | Descrição |
|------|-----------|
| `/portal-terceirizado` | **Home** — Cards de ação rápida: abrir OS, em andamento, concluídas |
| `/portal-terceirizado/manutencao` | **Manutenção** — Abrir OS com wizard, listar/editar, imprimir PDF |

---

## Autenticação e Autorização

### Fluxo de Autenticação

```
Usuário → Login (email + senha)
           ↓
API → Valida credenciais → Retorna { accessToken, refreshToken, user }
           ↓
Frontend → Armazena tokens em localStorage
           ↓
Requisições → Header: Authorization: Bearer <accessToken>
           ↓
Expirou? → Auto-refresh via POST /auth/refresh
           ↓
Refresh falhou? → Logout forçado
```

### Tokens JWT

| Token | Duração | Conteúdo |
|-------|---------|----------|
| **Access Token** | Curta (configurável) | `{ sub, email, type, name, roleId? }` |
| **Refresh Token** | Longa (configurável) | `{ sub, type }` |

### PIN de 4 Dígitos

Operações críticas exigem validação de PIN:
- Entrada de estoque
- Saída de estoque
- Aprovação de movimentações
- Aprovação de reversões

O PIN é gerado automaticamente na criação do usuário, armazenado como hash bcrypt, e pode ser resetado pelo administrador.

### Autorização (RBAC)

```
Request → JwtAuthGuard (valida token)
        → PermissionsGuard (verifica permissão no banco)
        → @RequirePermission('screen.action')
```

- Apenas usuários **internos** possuem permissões
- Usuários **externos** e **terceirizados** acessam apenas seus respectivos portais
- A verificação busca no banco: `User → Role → RolePermission → ScreenPermission`

---

## Papéis e Permissões

### Papéis Padrão

| Papel | Descrição | Permissões |
|-------|-----------|------------|
| **Admin** | Acesso total ao sistema | Todas as 46 permissões |
| **Técnico** | Operações de campo | 16 permissões (estoque, patrimônio, manutenção, etiquetas) |
| **Gestor** | Gestão e aprovações | 33 permissões (tudo exceto controle de acesso) |

### Mapa de Permissões (46 total)

| Tela | Ações disponíveis |
|------|-------------------|
| `dashboard` | `view` |
| `inventory` | `view` · `bipar_entrada` · `bipar_saida` · `historico` · `exit` |
| `assets` | `view` · `create` · `lookup` |
| `catalog` | `view` · `create` · `update` · `delete` |
| `locations` | `view` · `create` · `update` · `delete` |
| `suppliers` | `view` · `create` · `update` · `delete` |
| `purchases` | `view` · `create` · `approve` · `receive` |
| `tickets` | `view` · `triage` · `assign` · `close` |
| `maintenance` | `view` · `open` · `execute` · `close` |
| `approvals` | `view` · `approve` · `reject` |
| `access` | `view` · `manage` · `manage_roles` · `manage_permissions` |
| `labels` | `view` · `print` |
| `audit` | `view` |
| `settings` | `view` · `manage` |

### Permissões por Papel

| Tela | Admin | Gestor | Técnico |
|------|:-----:|:------:|:-------:|
| `dashboard.view` | ✅ | ✅ | ✅ |
| `inventory.view` | ✅ | ✅ | ✅ |
| `inventory.bipar_entrada` | ✅ | ✅ | ✅ |
| `inventory.bipar_saida` | ✅ | ✅ | ✅ |
| `inventory.historico` | ✅ | ✅ | ✅ |
| `inventory.exit` | ✅ | ✅ | ✅ |
| `assets.view` | ✅ | ✅ | ✅ |
| `assets.create` | ✅ | ✅ | — |
| `assets.lookup` | ✅ | ✅ | ✅ |
| `catalog.view` | ✅ | ✅ | ✅ |
| `catalog.create` | ✅ | ✅ | — |
| `catalog.update` | ✅ | ✅ | — |
| `catalog.delete` | ✅ | ✅ | — |
| `locations.view` | ✅ | ✅ | ✅ |
| `locations.create` | ✅ | ✅ | — |
| `locations.update` | ✅ | ✅ | — |
| `locations.delete` | ✅ | ✅ | — |
| `suppliers.view` | ✅ | ✅ | — |
| `suppliers.create` | ✅ | ✅ | — |
| `suppliers.update` | ✅ | ✅ | — |
| `suppliers.delete` | ✅ | ✅ | — |
| `purchases.view` | ✅ | ✅ | — |
| `purchases.create` | ✅ | ✅ | — |
| `purchases.approve` | ✅ | ✅ | — |
| `purchases.receive` | ✅ | ✅ | — |
| `tickets.view` | ✅ | ✅ | ✅ |
| `tickets.triage` | ✅ | ✅ | — |
| `tickets.assign` | ✅ | ✅ | — |
| `tickets.close` | ✅ | ✅ | — |
| `maintenance.view` | ✅ | ✅ | ✅ |
| `maintenance.open` | ✅ | ✅ | ✅ |
| `maintenance.execute` | ✅ | ✅ | ✅ |
| `maintenance.close` | ✅ | ✅ | ✅ |
| `approvals.view` | ✅ | ✅ | — |
| `approvals.approve` | ✅ | ✅ | — |
| `approvals.reject` | ✅ | ✅ | — |
| `access.view` | ✅ | — | — |
| `access.manage` | ✅ | — | — |
| `access.manage_roles` | ✅ | — | — |
| `access.manage_permissions` | ✅ | — | — |
| `labels.view` | ✅ | ✅ | ✅ |
| `labels.print` | ✅ | ✅ | ✅ |
| `audit.view` | ✅ | ✅ | — |
| `settings.view` | ✅ | ✅ | — |
| `settings.manage` | ✅ | — | — |

---

## Módulos de Negócio

### 10.1 Estoque

Controle completo de movimentações de estoque com validação por PIN:

- **Entrada** — Registro de recebimento de materiais em um local
- **Saída** — Retirada de materiais de um local (pode requerer aprovação se tipo = Baixa)
- **Transferência** — Movimentação entre locais
- **Baixa** — Remoção definitiva do patrimônio (requer aprovação)
- **Reversão** — Solicitação de reversão de movimentação com aprovação
- **Saldos** — Cálculo automático de `StockBalance` por SKU × Localização

### 10.2 Patrimônio (Assets)

- Código único auto-gerado no formato `SKY-XXXXX`
- Status: `ATIVO` · `EM_USO` · `EM_MANUTENCAO` · `BAIXADO`
- Rastreamento de localização atual
- Timeline de eventos (movimentações, manutenções, mudanças de status)
- Cadastro em lote via formulário de equipamento

### 10.3 Chamados (Tickets)

Sistema de suporte bidirecional:

- **Fluxo interno**: Colaboradores criam/atribuem/resolvem chamados
- **Fluxo externo**: Clientes criam chamados e trocam mensagens pelo portal
- Status: `OPEN` → `IN_PROGRESS` → `WAITING_CLIENT` → `RESOLVED` → `CLOSED`
- Prioridade: `LOW` · `MEDIUM` · `HIGH` · `CRITICAL`
- Chat em tempo real entre interno e externo

### 10.4 Manutenção (Ordens de Serviço)

6 tipos de formulário com campos específicos:

| Tipo | Descrição |
|------|-----------|
| `TERCEIRIZADO` | Serviço terceirizado genérico |
| `INSTALACAO_SALA` | Instalação de sala interativa/imersiva |
| `INSTALACAO_TELA` | Instalação de tela interativa |
| `DESINSTALACAO` | Desinstalação de tela/sala |
| `SUPORTE_REMOTO` | Suporte remoto |
| `MANUTENCAO_TELA_SALA` | Manutenção de tela/sala |

Funcionalidades:
- Wizard de formulário com campos específicos por tipo
- Dados do cliente (nome, cidade, estado, contato)
- Geolocalização via API do IBGE e Nominatim
- Impressão de PDF da OS
- Status: `OPEN` → `IN_PROGRESS` → `CLOSED`
- Portal do terceirizado com acesso limitado (não pode fechar OS)

### 10.5 Compras

Workflow de pedido de compra:

```
DRAFT → APPROVED → ORDERED → PARTIALLY_RECEIVED → RECEIVED
                                                 → CANCELLED
```

- Número sequencial auto-gerado (PO-YYYYMMDD-XXXX)
- Itens com SKU e quantidade
- Recebimento parcial com notas de divergência
- Entrada automática no estoque ao receber

### 10.6 Etiquetas

- Geração de dados de etiqueta com código de barras (bwip-js)
- Templates de layout personalizáveis
- Registro de histórico de impressões
- Dados: código do patrimônio, SKU, nome, localização

---

## Pacote Compartilhado (@zyllen/shared)

### Tipos (Enums)

```typescript
AssetStatus       = ATIVO | EM_USO | EM_MANUTENCAO | BAIXADO
ApprovalStatus    = PENDING | APPROVED | REJECTED | EXECUTED
TicketStatus      = OPEN | IN_PROGRESS | WAITING_CLIENT | RESOLVED | CLOSED
TicketPriority    = LOW | MEDIUM | HIGH | CRITICAL
MaintenanceStatus = OPEN | IN_PROGRESS | CLOSED
PurchaseOrderStatus = DRAFT | APPROVED | ORDERED | PARTIALLY_RECEIVED | RECEIVED | CANCELLED
AuthorType        = INTERNAL | EXTERNAL
```

### Interfaces

```typescript
ApiResponse<T>        // { data?, error?, message? }
PaginatedResponse<T>  // { data[], total, offset, limit }
PaginationParams      // { offset?, limit? }
```

### Schemas Zod (40+)

Schemas de validação para todas as entidades do sistema, usados tanto na API (via `ZodValidationPipe`) quanto disponíveis para o frontend.

## Plano original de execução

As etapas abaixo eram propostas para a fundação do produto. Checkboxes, critérios e tecnologias são históricos; não significam pendência atual nem autorização para executar seed, migrations ou testes no Supabase compartilhado.

Sequência proposta na especificação inicial; dependências e entregas devem ser reavaliadas antes de qualquer execução.

### Passo 1 — Setup e Validação de Vida

**Objetivo:** Monorepo funcional, banco criado, seed executado.

- [ ] Criar estrutura do monorepo (apps/api, apps/web, packages/shared)
- [ ] Configurar NestJS com Prisma + SQLite
- [ ] Configurar Next.js com App Router + Tailwind + shadcn/ui
- [ ] Escrever schema.prisma com todas as entidades
- [ ] Criar migration inicial
- [ ] Criar seed.ts (admin, roles, permissões, 1 local, movementTypes padrão)
- [ ] Endpoint `GET /health` retorna `{ status: "ok" }`
- [ ] Docker Compose funcional

**Critério de aprovação:** API e Web sobem, banco cria, seed roda, health responde.

---

### Passo 2 — Login Interno + PIN

**Objetivo:** Autenticação e PIN único funcionando.

- [ ] Implementar login interno (email/senha → JWT)
- [ ] Criação de usuário interno com PIN (4 dígitos, hash, UNIQUE)
- [ ] Validação de unicidade do PIN (tentativa duplicada falha)
- [ ] Endpoint requer autenticação (guard JWT)

**Critério de aprovação:** Login funciona, PIN é obrigatório e único, duplicado falha.

---

### Passo 3 — Permissões por Tela/Ação (RBAC)

**Objetivo:** Técnico só acessa o que a role permite.

- [ ] CRUD de roles e permissões
- [ ] Guard de permissão no backend (403 para acesso indevido)
- [ ] UI respeita permissões (menus/rotas bloqueados)
- [ ] Teste: logar como Técnico e confirmar restrições

**Critério de aprovação:** API bloqueia com 403, UI esconde menus proibidos.

---

### Passo 4 — Cadastros Base

**Objetivo:** Dados mínimos para testar estoque.

- [ ] CRUD Categorias
- [ ] CRUD Locais
- [ ] CRUD SKUs (geração automática 6 dígitos + retry)
- [ ] CRUD Fornecedores
- [ ] Teste de unicidade do SKU

**Critério de aprovação:** CRUDs funcionam, SKU nunca repete.

---

### Passo 5 — Patrimônio + Bipagem

**Objetivo:** Patrimônio `SKY-XXXXX` + consulta por bipagem.

- [ ] Criar patrimônio vinculado a SKU (código auto + retry)
- [ ] Lookup por assetCode (campo de bipagem)
- [ ] Ficha do patrimônio com timeline (movimentos, chamados, manutenção)
- [ ] Teste de unicidade do assetCode

**Critério de aprovação:** Patrimônio gera no padrão, lookup funciona, nunca repete.

---

### Passo 6 — Movimentação com PIN (Entrada)

**Objetivo:** Movimentação só passa com PIN válido.

- [ ] Endpoint de movimentação de entrada
- [ ] Validação obrigatória de PIN (sem PIN = erro 400)
- [ ] PIN inválido = erro 401
- [ ] Atualiza StockBalance no local
- [ ] Grava AuditLog
- [ ] Testa fluxo completo: sem PIN → com PIN inválido → com PIN válido

**Critério de aprovação:** Sem PIN falha, PIN válido passa, estoque atualiza, audit grava.

---

### Passo 7 — Saída com Tipos Configuráveis

**Objetivo:** Tipos de movimentação controlam o comportamento da saída.

- [ ] CRUD MovementType (flags: requiresApproval, isFinalWriteOff, etc.)
- [ ] Saída com tipo que exige aprovação → cria ApprovalRequest PENDENTE
- [ ] Admin aprova com PIN → movimento é executado
- [ ] AuditLog registra aprovação + execução

**Critério de aprovação:** Tipo configura comportamento, aprovação funciona, audit completo.

---

### Passo 8 — Reversão

**Objetivo:** Reversão segura e auditável.

- [ ] Solicitar reversão → ApprovalRequest pendente
- [ ] Admin aprova com PIN → movimento inverso criado
- [ ] Movimento original marcado como revertido
- [ ] StockBalance corrigido
- [ ] AuditLog completo (solicitação + aprovação + execução)

**Critério de aprovação:** Reversão exige aprovação, saldo volta, auditoria completa.

---

### Passo 9 — Portal do Cliente

**Objetivo:** Fluxo externo completo sem tocar em estoque.

- [ ] Cadastro self-service de empresa
- [ ] Cadastro de usuário externo vinculado à empresa
- [ ] Login externo (email/senha)
- [ ] Abrir chamado → Ticket criado (status OPEN)
- [ ] Listar chamados + detalhe + comentários/anexos

**Critério de aprovação:** Empresa cria, login funciona, ticket cria e aparece.

---

### Passo 10 — Chamados Internos + SLA Básico

**Objetivo:** Triagem, atribuição e encerramento.

- [ ] Fila de triagem (interno)
- [ ] Atribuir chamado a técnico
- [ ] Mudança de status + comentários
- [ ] Encerramento
- [ ] Campos de SLA: createdAt, firstResponseAt, closedAt, slaDueAt

**Critério de aprovação:** Triagem e atribuição funcionam, SLA básico grava timestamps.

---

### Passo 11 — Manutenção

**Objetivo:** OS vinculada a patrimônio com controle de status.

- [ ] Abrir OS para patrimônio → status muda para `EM_MANUTENCAO`
- [ ] Finalizar OS → status volta para `ATIVO`
- [ ] Histórico aparece na ficha do patrimônio

**Critério de aprovação:** OS abre/fecha, status muda, histórico visível.

---

### Passo 12 — Compras (Ciclo Completo)

**Objetivo:** Pedido → Recebimento → Entrada no estoque.

- [ ] Criar pedido de compra com itens
- [ ] Recebimento parcial (Receiving + ReceivingItems)
- [ ] Divergência registrada quando receber menos que o pedido
- [ ] Movimentação de entrada criada automaticamente
- [ ] Item seriado: gerar patrimônios no recebimento

**Critério de aprovação:** Ciclo completo funciona, divergência registrada, patrimônios gerados.

---

### Passo 13 — Etiquetas (PDF)

**Objetivo:** Geração e reimpressão auditada.

- [ ] Gerar etiqueta em PDF (patrimônio, SKU, nome, barcode, datas)
- [ ] **Não** incluir nome do cliente na etiqueta
- [ ] Registrar LabelPrintJob + AuditLog a cada impressão/reimpressão

**Critério de aprovação:** PDF gera com conteúdo correto, reimpressão auditada.

## Testes Automatizados

### Testes Unitários (rápidos)

| Teste | O que valida |
|---|---|
| Geração de SKU | Sempre 6 dígitos, aceita zero à esquerda |
| Geração de patrimônio | Formato `SKY-XXXXX` |
| PIN hash + validação | Hash armazena, compare funciona |
| Regra RBAC | Permissão bloqueia/libera corretamente |

### Testes de Integração (SQLite em memória)

| Teste | O que valida |
|---|---|
| Movimento sem PIN | Retorna erro |
| Movimento com PIN | Atualiza saldo |
| Aprovação pendente | Bloqueia execução até admin aprovar |
| Reversão | Gera movimento inverso, corrige saldo |
| Portal + chamado | Cria ticket, interno enxerga |

## Consolidação das instruções antigas

Estrutura, entidades, autenticação, RBAC e módulos repetidos foram mantidos uma única vez nesta especificação. Pseudocódigos de geração de SKU/patrimônio/PIN foram substituídos pelas referências às implementações atuais: `catalog.service.ts`, `assets.service.ts`, `inventory.service.ts` e `auth.service.ts` em `apps/api/src/modules`.

Os eventos originalmente previstos para auditoria eram login/logout, criação de SKU/patrimônio, movimentação, aprovação/rejeição, reversão, impressão, alteração de papéis/permissões e abertura/encerramento de chamado. Esta lista é requisito histórico, não comprovação da cobertura atual.

As propostas antigas de integração SQLite em memória, PR obrigatório para `main`, aliases `@api`/`@shared`, backup SQLite e deploy Docker/PM2 não descrevem a operação atual. Consultar os guias vigentes antes de agir. As credenciais padrão antigas não são reproduzidas; bootstrap exige provisionamento explícito.
