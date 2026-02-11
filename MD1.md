# Zyllen Gestão — Progresso do Desenvolvimento

> Documento de acompanhamento de progresso. Atualizado em: **11/02/2026 01:13**

---

## Resumo Geral

| Backend | Frontend | Total |
|:-:|:-:|:-:|
| **13/13** ✅ | **9/9 telas** ✅ | **100%** |

> 🎉 **Backend + Frontend concluídos! Projeto pronto para testes.**

---

## Etapas Backend (Concluídas)

### ✅ Passo 1 — Setup + Health
- Monorepo funcional (`apps/api`, `apps/web`, `packages/shared`)
- NestJS + Prisma + SQLite, Next.js + Tailwind + shadcn/ui
- `GET /health` → `{ status: "ok" }`

### ✅ Passo 2 — Login Interno + PIN
- Login JWT, refresh token, criação de usuário com PIN 4 dígitos hash bcrypt
- AuditLog LOGIN e USER_CREATED

### ✅ Passo 3 — RBAC (Permissões por Tela/Ação)
- Guard de permissão (403), seed: Admin 43, Gestor 37, Técnico 16 perms
- `GET /auth/me/permissions`

### ✅ Passo 4 — Cadastros Base
- CRUD Categorias, SKUs (código 6 dígitos auto), Locais, Fornecedores

### ✅ Passo 5 — Patrimônio + Bipagem
- Código `SKY-XXXXX` auto, lookup por bipagem, timeline unificada

### ✅ Passo 6 — Movimentação com PIN (Entrada)
- `POST /inventory/entry` exige PIN — PIN errado → 401, AuditLog

### ✅ Passo 7 — Saída com Tipos Configuráveis
- Saída direta ou com aprovação, CRUD MovementType

### ✅ Passo 8 — Reversão
- Solicitação + aprovação com PIN → movimento inverso + saldo corrigido

### ✅ Passo 9 — Portal do Cliente
- CRUD empresas/usuários externos, login externo com bcrypt

### ✅ Passo 10 — Chamados + SLA
- CRUD chamados, SLA auto (24h/48h/72h por prioridade), triagem, atribuição, mensagens

### ✅ Passo 11 — Manutenção
- OS vinculada a patrimônio, atualiza status (EM_MANUTENCAO → ATIVO ao fechar)

### ✅ Passo 12 — Compras (Ciclo Completo)
- PO com número auto (PO-YYYYMMDD-NNN), recebimento parcial → estoque, auto-completion

### ✅ Passo 13 — Etiquetas
- Registro de impressão, dados para PDF, CRUD templates, AuditLog

---

## Frontend — Telas Implementadas

### Infraestrutura
| Componente | Arquivo | Descrição |
|---|---|---|
| Auth Context | `lib/auth-context.tsx` | JWT login, session restore, permissões RBAC, `useAuthedFetch` |
| Providers | `lib/providers.tsx` | React Query + Auth + Sonner Toaster (dark theme) |
| API Client | `lib/api-client.ts` | Fetch-based com type generics |
| Theme Tokens | `lib/theme-tokens.ts` | Cores Zyllen (dark #0A0A0A, highlight #ABFF10) |
| Root Layout | `app/layout.tsx` | Dark mode, Inter + JetBrains Mono fonts |
| Dashboard Layout | `components/dashboard-layout.tsx` | Sidebar colapsável, nav por permissões, branding |

### UI Components
| Componente | Variantes |
|---|---|
| Button | `default`, `highlight` (#ABFF10), `outline`, `ghost`, `destructive` |
| Input | Dark styled com focus ring verde |
| Card | CardHeader, CardTitle, CardContent |
| Badge | `success`, `warning`, `destructive`, `outline`, `secondary` |
| Label | Styled para formulários |

### Páginas (9 rotas)

| Tela | Rota | Funcionalidade |
|---|---|---|
| **Login** | `/` | Card glassmorphic, blurs animados, toggle senha, redirect se autenticado |
| **Dashboard** | `/dashboard` | 4 cards stats (estoque, patrimônios, chamados, OS), aprovações pendentes, atividade recente |
| **Estoque** | `/dashboard/estoque` | 4 tabs: Saldos, Entrada (c/ PIN), Saída (c/ tipo + PIN), Histórico |
| **Patrimônio** | `/dashboard/patrimonio` | Busca por bipagem, ficha do ativo, timeline vertical com eventos |
| **Cadastros** | `/dashboard/cadastros` | 5 tabs: Categorias, SKUs, Locais, Fornecedores, Tipos de Mov. — CRUD inline |
| **Chamados** | `/dashboard/chamados` | Lista/seleção, detalhe (SLA, atribuição), ações, mensageria |
| **Compras** | `/dashboard/compras` | POs com itens, recebimento parcial, histórico de recebimentos |
| **Manutenção** | `/dashboard/manutencao` | Abrir OS (patrimônio), tabela c/ ações (Iniciar → Fechar) |
| **Acesso** | `/dashboard/acesso` | Roles c/ contagem de perms, usuários c/ avatares, grid de permissões |

---

## Verificação (11/02/2026 01:13)

| Check | Resultado |
|---|---|
| API `tsc --noEmit` | ✅ 0 erros (49 arquivos) |
| Web `next build` | ✅ Compiled successfully (22 arquivos, 9 rotas) |
| `GET /health` | ✅ 200 `{"status":"ok"}` |
| `GET /` (frontend) | ✅ 200, 21KB, título "Zyllen Gestão" |
| `POST /auth/login` | ✅ 200, token + user retornados |

---

## Rotas da API (~80 endpoints)

### Auth & Access
| Método | Rota | Proteção |
|---|---|:-:|
| GET | `/health` | ❌ |
| POST | `/auth/login` | ❌ |
| POST | `/auth/refresh` | ❌ |
| POST/GET | `/auth/users` | JWT |
| GET | `/auth/me` | JWT |
| GET | `/auth/me/permissions` | JWT |
| POST | `/auth/validate-pin` | JWT |
| CRUD | `/access/roles[/:id]` | RBAC |
| CRUD | `/access/permissions[/:id]` | RBAC |
| POST | `/access/roles/:id/permissions` | RBAC |

### Cadastros Base
| Método | Rota | Proteção |
|---|---|:-:|
| CRUD | `/catalog/categories[/:id]` | RBAC |
| CRUD | `/catalog/skus[/:id]` | RBAC |
| CRUD | `/locations[/:id]` | RBAC |
| CRUD | `/suppliers[/:id]` | RBAC |

### Patrimônio
| Método | Rota | Proteção |
|---|---|:-:|
| GET/POST | `/assets` | RBAC |
| GET | `/assets/lookup/:code` | RBAC |
| GET | `/assets/:id` | RBAC |
| GET | `/assets/:id/timeline` | RBAC |
| PUT | `/assets/:id/status` | RBAC |
| PUT | `/assets/:id/location` | RBAC |

### Estoque & Movimentação
| Método | Rota | Proteção |
|---|---|:-:|
| POST | `/inventory/entry` | RBAC+PIN |
| POST | `/inventory/exit` | RBAC+PIN |
| GET | `/inventory/balances` | RBAC |
| GET | `/inventory/movements` | RBAC |
| GET | `/inventory/approvals/pending` | RBAC |
| POST | `/inventory/approvals/:id/approve` | RBAC+PIN |
| POST | `/inventory/approvals/:id/reject` | RBAC+PIN |
| POST | `/inventory/movements/:id/reversal` | RBAC |
| POST | `/inventory/reversals/:id/approve` | RBAC+PIN |
| CRUD | `/inventory/movement-types[/:id]` | RBAC |

### Clientes & Portal
| Método | Rota | Proteção |
|---|---|:-:|
| POST | `/clients/login` | ❌ |
| CRUD | `/clients/companies[/:id]` | RBAC |
| GET/POST | `/clients/users` | RBAC |

### Chamados
| Método | Rota | Proteção |
|---|---|:-:|
| GET/POST | `/tickets` | RBAC |
| GET | `/tickets/:id` | RBAC |
| PUT | `/tickets/:id/assign` | RBAC |
| PUT | `/tickets/:id/status` | RBAC |
| POST | `/tickets/:id/messages` | RBAC |

### Manutenção
| Método | Rota | Proteção |
|---|---|:-:|
| GET/POST | `/maintenance` | RBAC |
| GET | `/maintenance/:id` | RBAC |
| PUT | `/maintenance/:id/status` | RBAC |

### Compras
| Método | Rota | Proteção |
|---|---|:-:|
| GET/POST | `/purchases` | RBAC |
| GET | `/purchases/:id` | RBAC |
| PUT | `/purchases/:id/status` | RBAC |
| POST | `/purchases/:id/receive` | RBAC |

### Etiquetas
| Método | Rota | Proteção |
|---|---|:-:|
| POST | `/labels/print` | RBAC |
| GET | `/labels/history` | RBAC |
| GET | `/labels/data/:assetId` | RBAC |
| CRUD | `/labels/templates[/:id]` | RBAC |

---

## Arquivos do Projeto

### API (`apps/api/src/`) — 49 arquivos
```
main.ts, app.module.ts, app.controller.ts
prisma/prisma.service.ts, prisma/prisma.module.ts
modules/auth/       → controller, service, module, jwt.strategy, jwt-auth.guard, 4 DTOs
modules/access/     → controller, service, module, permissions.guard, permissions.decorator
modules/catalog/    → controller, service, module
modules/locations/  → controller, service, module
modules/suppliers/  → controller, service, module
modules/assets/     → controller, service, module
modules/inventory/  → controller, service, module
modules/clients/    → controller, service, module
modules/tickets/    → controller, service, module
modules/maintenance/→ controller, service, module
modules/purchases/  → controller, service, module
modules/labels/     → controller, service, module
```

### Web (`apps/web/src/`) — 22 arquivos
```
app/layout.tsx, app/page.tsx (Login), app/globals.css
app/dashboard/layout.tsx, app/dashboard/page.tsx
app/dashboard/estoque/page.tsx
app/dashboard/patrimonio/page.tsx
app/dashboard/cadastros/page.tsx
app/dashboard/chamados/page.tsx
app/dashboard/compras/page.tsx
app/dashboard/manutencao/page.tsx
app/dashboard/acesso/page.tsx
components/dashboard-layout.tsx
components/ui/button.tsx, input.tsx, label.tsx, card.tsx, badge.tsx
lib/api-client.ts, auth-context.tsx, providers.tsx, theme-tokens.ts, utils.ts
```

---

## Credenciais de Acesso (Dev)

| Usuário | Email | Senha | PIN | Role |
|---|---|---|---|---|
| Administrador | `admin@zyllen.com` | `admin123` | `0000` | Admin |
| Carlos Técnico | `carlos@zyllen.com` | `senha123` | `5980` | Técnico |
| João Cliente | `joao@techcorp.com` | `senha123` | — | Externo |

## Como Rodar

```bash
# Terminal 1 — API
pnpm --filter @zyllen/api dev    # http://localhost:3001

# Terminal 2 — Web
pnpm --filter @zyllen/web dev    # http://localhost:3000
```

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Backend | NestJS, Prisma, SQLite, JWT, Passport, bcrypt |
| Frontend | Next.js 16 (Turbopack), React 19, Tailwind CSS v4 |
| UI | shadcn/ui (manual), Lucide React, Sonner |
| Data | TanStack Query, Axios (api-client fetch-based) |
| Auth | JWT + PIN hash bcrypt, RBAC granular por tela/ação |
| Monorepo | pnpm workspaces |
