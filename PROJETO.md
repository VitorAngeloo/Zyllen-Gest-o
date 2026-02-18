# Zyllen Gestão

> **Sistema de gestão de estoque, patrimônio, chamados e manutenção**
> Versão 0.1.0 — Fevereiro 2026

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura](#2-arquitetura)
3. [Stack Tecnológica](#3-stack-tecnológica)
4. [Estrutura do Monorepo](#4-estrutura-do-monorepo)
5. [Banco de Dados (Prisma Schema)](#5-banco-de-dados-prisma-schema)
6. [API — Endpoints](#6-api--endpoints)
7. [Frontend — Páginas](#7-frontend--páginas)
8. [Autenticação e Autorização](#8-autenticação-e-autorização)
9. [Papéis e Permissões](#9-papéis-e-permissões)
10. [Módulos de Negócio](#10-módulos-de-negócio)
11. [Pacote Compartilhado (@zyllen/shared)](#11-pacote-compartilhado-zyllenshared)
12. [Configuração e Instalação](#12-configuração-e-instalação)
13. [Deploy](#13-deploy)
14. [Variáveis de Ambiente](#14-variáveis-de-ambiente)
15. [Seed de Dados Iniciais](#15-seed-de-dados-iniciais)

---

## 1. Visão Geral

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

## 2. Arquitetura

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

## 3. Stack Tecnológica

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

## 4. Estrutura do Monorepo

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

## 5. Banco de Dados (Prisma Schema)

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

## 6. API — Endpoints

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

## 7. Frontend — Páginas

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

## 8. Autenticação e Autorização

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

## 9. Papéis e Permissões

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

## 10. Módulos de Negócio

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

## 11. Pacote Compartilhado (@zyllen/shared)

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

---

## 12. Configuração e Instalação

### Pré-requisitos

- Node.js ≥ 18.0.0
- pnpm ≥ 9.0.0

### Instalação

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/Zyllen-Gestao.git
cd Zyllen-Gestao

# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp apps/api/.env.example apps/api/.env
# Editar .env com suas configurações

# Gerar cliente Prisma
pnpm --filter @zyllen/api prisma:generate

# Rodar migrations
pnpm db:migrate

# Popular banco com dados iniciais
pnpm db:seed

# Buildar pacote compartilhado
pnpm --filter @zyllen/shared build
```

### Desenvolvimento

```bash
# API (porta 3001)
pnpm dev:api

# Frontend (porta 3000)
pnpm dev:web

# Ambos simultaneamente
pnpm dev
```

### Build de Produção

```bash
# Build de tudo
pnpm build

# API
cd apps/api && npm run start:prod

# Web (standalone)
cd apps/web/.next/standalone/apps/web && node server.js
```

---

## 13. Deploy

### Docker Compose

```bash
docker-compose up -d
```

Sobe 2 containers:
- **api** — NestJS na porta 3001
- **web** — Next.js na porta 3000

### PM2

```bash
pm2 start ecosystem.config.js
```

---

## 14. Variáveis de Ambiente

### API (`apps/api/.env`)

| Variável | Descrição | Default |
|----------|-----------|---------|
| `DATABASE_URL` | Caminho do banco SQLite | `file:./dev.db` |
| `JWT_SECRET` | Chave secreta para tokens JWT | — (obrigatório) |
| `API_PORT` | Porta da API | `3001` |
| `CORS_ORIGIN` | Origens permitidas (separadas por vírgula) | `http://localhost:3000` |

### Frontend (`apps/web/.env`)

| Variável | Descrição | Default |
|----------|-----------|---------|
| `NEXT_PUBLIC_API_URL` | URL da API | `http://localhost:3001` |

---

## 15. Seed de Dados Iniciais

O comando `pnpm db:seed` cria:

| Dado | Valor |
|------|-------|
| **Usuário admin** | `admin@zyllen.com` / senha: `admin123` / PIN: `0000` |
| **Papéis** | Admin (46 perms), Técnico (16 perms), Gestor (33 perms) |
| **Permissões** | 46 permissões de tela organizadas em 14 módulos |
| **Local padrão** | Almoxarifado Central |
| **Tipos de movimentação** | Entrada, Saída, Transferência, Baixa |
| **Categoria padrão** | Geral |

> ⚠️ **Importante**: Altere a senha do admin e o JWT_SECRET antes de ir para produção.

---

## Segurança

### Implementado

- Senhas e PINs com hash bcrypt (custo 10)
- Rate limiting em endpoints públicos (login, registro, busca)
- Validação Zod em todos os endpoints mutáveis
- CORS configurável
- PIN obrigatório para operações de estoque
- Verificação de propriedade em portais (cliente/terceirizado)
- Verificação de senha atual para alterar senha/PIN no perfil
- Throttling por endpoint (5-10 req/min em auth)

### Recomendações para Produção

- Migrar tokens de `localStorage` para cookies `httpOnly`
- Configurar HTTPS obrigatório
- Alterar `JWT_SECRET` para um valor seguro e longo
- Desabilitar o endpoint de auto-cadastro se não necessário
- Adicionar verificação de email no cadastro
- Configurar backup automático do banco SQLite
- Adicionar índices no banco para queries frequentes (status, createdAt)
