# Guia de Desenvolvimento — Zyllen Gestão

> Documento técnico com instruções detalhadas para o desenvolvimento do sistema, passo a passo.

---

## Sumário

1. [Configuração do Ambiente](#1-configuração-do-ambiente)
2. [Estrutura do Monorepo](#2-estrutura-do-monorepo)
3. [Modelagem de Dados (Prisma)](#3-modelagem-de-dados-prisma)
4. [Regras de Geração de Códigos](#4-regras-de-geração-de-códigos)
5. [Segurança e Auditoria](#5-segurança-e-auditoria)
6. [Módulos do Backend (API)](#6-módulos-do-backend-api)
7. [Módulos do Frontend (Web)](#7-módulos-do-frontend-web)
8. [Etapas de Desenvolvimento (Ordem de Execução)](#8-etapas-de-desenvolvimento-ordem-de-execução)
9. [Testes Automatizados](#9-testes-automatizados)
10. [Convenções e Padrões](#10-convenções-e-padrões)

---

## 1. Configuração do Ambiente

### Pré-requisitos

- **Node.js** >= 18.x
- **pnpm** (gerenciador de pacotes do monorepo)
- **Docker** + **Docker Compose** (opcional, mas recomendado)
- **Git**

### Setup Inicial

```bash
# Clonar o repositório
git clone <url-do-repo>
cd zyllen-gestao

# Instalar dependências
pnpm install

# Copiar variáveis de ambiente
cp .env.example .env

# Rodar migrations do Prisma
pnpm --filter api prisma migrate dev

# Rodar seed (dados iniciais)
pnpm --filter api prisma db seed

# Iniciar em modo desenvolvimento
pnpm --filter api dev     # API na porta 3001
pnpm --filter web dev     # Web na porta 3000
```

### Com Docker Compose

```bash
docker-compose up --build
```

### Validação do Setup

| Validação | Como testar | Resultado esperado |
|---|---|---|
| API no ar | `GET http://localhost:3001/health` | `200 OK` — `{ "status": "ok" }` |
| Web no ar | Abrir `http://localhost:3000` | Página de login carrega |
| Banco criado | Verificar arquivo `.db` em `apps/api/prisma/` | Arquivo existe com tabelas |
| Seed executado | Verificar via Prisma Studio | Admin, roles, locais e movementTypes padrão existem |

---

## 2. Estrutura do Monorepo

```
zyllen-gestao/
├── apps/
│   ├── api/                          # Backend NestJS
│   │   ├── src/
│   │   │   └── modules/
│   │   │       ├── auth/             # Login, JWT, sessão
│   │   │       ├── access/           # Roles, permissões por tela, aprovações
│   │   │       ├── companies/        # Empresas (clientes externos)
│   │   │       ├── external-users/   # Usuários externos
│   │   │       ├── suppliers/        # Fornecedores
│   │   │       ├── catalog/          # SKUs, categorias
│   │   │       ├── locations/        # Locais físicos
│   │   │       ├── assets/           # Patrimônio (SKY-XXXXX)
│   │   │       ├── inventory/        # Movimentações, saldos, tipos
│   │   │       ├── tickets/          # Chamados
│   │   │       ├── maintenance/      # Manutenção (OS)
│   │   │       ├── purchases/        # Pedidos de compra, recebimento
│   │   │       ├── labels/           # Etiquetas (PDF)
│   │   │       └── audit/            # AuditLog
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       ├── migrations/
│   │       └── seed.ts
│   └── web/                          # Frontend Next.js
│       └── src/
│           ├── app/
│           │   ├── (auth)/           # Páginas de autenticação
│           │   ├── portal/           # Portal externo (chamados)
│           │   ├── dashboard/        # Dashboard interno
│           │   ├── inventory/        # Estoque
│           │   ├── assets/           # Patrimônio
│           │   ├── purchases/        # Compras
│           │   ├── tickets/          # Chamados (interno)
│           │   ├── maintenance/      # Manutenção
│           │   └── settings/         # Configurações
│           └── lib/
│               ├── theme-tokens.ts   # Tokens de design
│               └── api-client.ts     # Cliente HTTP para API
├── packages/
│   └── shared/                       # Types + Zod schemas compartilhados
│       └── src/
│           ├── zod/                  # Schemas de validação
│           └── types/                # Interfaces TypeScript
├── scripts/
│   └── backup-sqlite.sh             # Script de backup do banco
├── docker-compose.yml
└── .env.example
```

---

## 3. Modelagem de Dados (Prisma)

### Entidades e Relacionamentos

#### Identidade e Acesso

| Entidade | Campos Chave | Observações |
|---|---|---|
| `InternalUser` | id, name, email, passwordHash, **pin4Hash** (UNIQUE), roleId, isActive | PIN armazenado como hash |
| `ExternalUser` | id, name, email, passwordHash, companyId | Autenticação simples email/senha |
| `Role` | id, name, description | Ex: Admin, Técnico, Gestor |
| `ScreenPermission` | id, screen, action | Ex: `inventory.bipar_entrada` |
| `RolePermission` | roleId, screenPermissionId | Relaciona role com permissões |

#### Empresas e Clientes

| Entidade | Campos Chave | Observações |
|---|---|---|
| `Company` | id, name, cnpj?, address?, phone? | Empresa do cliente externo |

#### Catálogo e Patrimônio

| Entidade | Campos Chave | Observações |
|---|---|---|
| `Category` | id, name | Categoria do item |
| `SkuItem` | id, **skuCode** (6 dígitos, UNIQUE), name, brand?, barcode?, categoryId | SKU gerado automaticamente |
| `Asset` | id, **assetCode** (UNIQUE, `SKY-XXXXX`), skuId, status, currentLocationId? | Patrimônio controlado por bipagem |

#### Status do Patrimônio

```
ATIVO → EM_USO → EM_MANUTENCAO → BAIXADO
```

#### Estoque

| Entidade | Campos Chave | Observações |
|---|---|---|
| `Location` | id, name, description? | Local físico |
| `StockBalance` | id, skuId, locationId, quantity | UNIQUE(skuId, locationId) |
| `StockMovement` | id, typeId, skuId, assetId?, fromLocationId?, toLocationId?, qty, createdByInternalUserId, pinValidated, reason?, referenceType?, referenceId? | Histórico imutável |
| `MovementType` | id, name, requiresApproval, isFinalWriteOff, setsAssetStatus?, defaultToLocationId? | Tipos configuráveis |

#### Aprovações

| Entidade | Campos Chave | Observações |
|---|---|---|
| `ApprovalRequest` | id, requestType, status, requestedById, approvedById?, payloadJson, reason | Status: PENDING, APPROVED, REJECTED, EXECUTED |

#### Chamados

| Entidade | Campos Chave | Observações |
|---|---|---|
| `Ticket` | id, companyId, externalUserId, assignedToInternalUserId?, status, priority, slaDueAt? | Chamado do cliente |
| `TicketMessage` | id, ticketId, authorId, authorType, content | Comentários |
| `TicketAttachment` | id, ticketId, fileName, filePath, uploadedById | Anexos |

#### Manutenção

| Entidade | Campos Chave | Observações |
|---|---|---|
| `MaintenanceOS` | id, assetId, status, openedById, closedById?, notes | Status: OPEN, IN_PROGRESS, DONE |

#### Compras

| Entidade | Campos Chave | Observações |
|---|---|---|
| `Supplier` | id, name, cnpj?, contact? | Fornecedor |
| `PurchaseOrder` | id, supplierId, status, number | Pedido de compra |
| `PurchaseOrderItem` | id, purchaseOrderId, skuId, qtyOrdered | Itens do pedido |
| `Receiving` | id, purchaseOrderId, receivedAt, receivedById | Recebimento |
| `ReceivingItem` | id, receivingId, skuId, qtyReceived, divergenceNote? | Se seriado: cria patrimônios |

#### Etiquetas e Auditoria

| Entidade | Campos Chave | Observações |
|---|---|---|
| `LabelTemplate` | id, name, layout | Template de etiqueta |
| `LabelPrintJob` | id, assetId, printedById, printedAt | Registro de cada impressão |
| `AuditLog` | id, action, entityType, entityId, userId, details, createdAt | Log imutável de tudo |

---

## 4. Regras de Geração de Códigos

### SKU — 6 dígitos numéricos

```typescript
// Pseudocódigo
async function generateSku(): Promise<string> {
  while (true) {
    const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
    try {
      // Tenta inserir com UNIQUE constraint
      await prisma.skuItem.create({ data: { skuCode: code, ... } });
      return code;
    } catch (e) {
      if (isUniqueViolation(e)) continue; // Retry
      throw e;
    }
  }
}
```

**Regras:**
- Sempre 6 dígitos (aceitar zeros à esquerda: `034921`)
- UNIQUE constraint no banco
- Retry automático em caso de colisão

### Patrimônio — `SKY-XXXXX`

```typescript
async function generateAssetCode(): Promise<string> {
  while (true) {
    const num = String(Math.floor(Math.random() * 100_000)).padStart(5, '0');
    const code = `SKY-${num}`;
    try {
      await prisma.asset.create({ data: { assetCode: code, ... } });
      return code;
    } catch (e) {
      if (isUniqueViolation(e)) continue;
      throw e;
    }
  }
}
```

**Regras:**
- Formato: `SKY-` + 5 dígitos numéricos
- UNIQUE constraint no banco
- Retry automático

### PIN — 4 dígitos numéricos

```typescript
async function generatePin(): Promise<string> {
  while (true) {
    const pin = String(Math.floor(Math.random() * 10_000)).padStart(4, '0');
    const hash = await bcrypt.hash(pin, 10);
    try {
      await prisma.internalUser.create({ data: { pin4Hash: hash, ... } });
      return pin; // Retorna o PIN puro para mostrar ao usuário UMA VEZ
    } catch (e) {
      if (isUniqueViolation(e)) continue;
      throw e;
    }
  }
}
```

**Regras:**
- 4 dígitos numéricos, único no sistema
- **Armazenado como hash** (bcrypt ou argon2)
- Na validação: compara hash do PIN informado com o armazenado
- PIN é mostrado ao usuário apenas no momento da criação

---

## 5. Segurança e Auditoria

### Fluxo de Segurança por Endpoint

Todo endpoint de movimentação **deve** seguir:

```
1. Sessão autenticada (JWT válido)
2. Verificar permissão de tela/ação (RBAC)
3. Validar PIN (hash compare)
4. Executar ação
5. Gravar AuditLog
```

### RBAC — Controle de Acesso por Papel

- Cada `Role` possui um conjunto de `ScreenPermission`
- Formato da permissão: `modulo.acao` (ex: `inventory.bipar_entrada`, `approvals.approve`)
- **No frontend:** menus/rotas bloqueados conforme permissões do usuário
- **No backend:** guard/middleware valida permissão antes de executar o controller

### PIN — Validação por Ação

- Toda ação sensível (movimentação, aprovação, reversão) exige o PIN do usuário
- O PIN é enviado no body da requisição
- Backend compara o hash e registra `pinValidatedAt` no movimento

### Reversão de Movimentações

```
1. Usuário solicita reversão → cria ApprovalRequest (status: PENDING)
2. Admin visualiza na fila de aprovações
3. Admin aprova COM PIN → ApprovalRequest (status: APPROVED)
4. Sistema executa movimento inverso → ApprovalRequest (status: EXECUTED)
5. Movimento original recebe `revertedByMovementId`
6. AuditLog registra tudo
```

### AuditLog — O que registrar

| Evento | Obrigatório |
|---|---|
| Login/logout | ✅ |
| Criação de SKU | ✅ |
| Criação de patrimônio | ✅ |
| Movimentação de estoque | ✅ |
| Aprovação/rejeição | ✅ |
| Reversão | ✅ |
| Impressão de etiqueta | ✅ |
| Alteração de permissões/roles | ✅ |
| Abertura/encerramento de chamado | ✅ |

---

## 6. Módulos do Backend (API)

Cada módulo segue a estrutura padrão do NestJS:

```
modules/<nome>/
├── <nome>.module.ts
├── <nome>.controller.ts
├── <nome>.service.ts
├── dto/
│   ├── create-<nome>.dto.ts
│   └── update-<nome>.dto.ts
└── <nome>.guard.ts (se necessário)
```

### Módulos e Responsabilidades

| Módulo | Endpoints Principais |
|---|---|
| `auth` | POST /auth/login, POST /auth/login/external, POST /auth/refresh |
| `access` | CRUD roles, CRUD permissions, GET approvals, POST approve/reject |
| `companies` | CRUD companies (self-service para externos) |
| `external-users` | CRUD external users, vinculação com company |
| `suppliers` | CRUD suppliers |
| `catalog` | CRUD skuItems (SKU auto), CRUD categories |
| `locations` | CRUD locations |
| `assets` | CRUD assets (código auto), GET lookup por bipagem, GET ficha completa |
| `inventory` | POST entrada, POST saída, GET movimentações, GET saldos, CRUD movementTypes |
| `tickets` | CRUD tickets, POST mensagem, POST anexo, triagem, atribuição |
| `maintenance` | CRUD OS, abrir, executar, finalizar |
| `purchases` | CRUD pedidos, POST recebimento parcial, divergência |
| `labels` | POST gerar etiqueta PDF, GET histórico impressões |
| `audit` | GET logs (somente leitura, com filtros) |

### Endpoint de Health Check

```typescript
// apps/api/src/app.controller.ts
@Get('health')
health() {
  return { status: 'ok' };
}
```

---

## 7. Módulos do Frontend (Web)

### Telas Internas (Skyline)

| Área | Telas |
|---|---|
| **Dashboard** | Visão geral com indicadores |
| **Estoque** | Bipar entrada, bipar saída, movimentações/histórico, aprovações pendentes |
| **Patrimônio** | Consulta por bipagem, ficha do patrimônio (timeline completa) |
| **Compras** | Criar/aprovar pedido, recebimento (parcial + divergência) |
| **Chamados** | Triagem/fila, detalhe (mensagens, anexos, SLA) |
| **Manutenção** | Abrir OS, executar, finalizar |
| **Cadastros** | Locais, categorias, fornecedores, SKUs, tipos de movimentação |
| **Acesso** | Roles, permissões por tela/ação, gestão de aprovações |

### Telas Externas (Portal)

| Tela | Funcionalidade |
|---|---|
| Cadastro Empresa | Self-service para nova empresa |
| Cadastro Usuário | Criação de conta vinculada à empresa |
| Login | Autenticação por email/senha |
| Abrir Chamado | Formulário de abertura |
| Listar Chamados | Lista com filtros e status |
| Detalhe Chamado | Status, mensagens, anexos |

### Tokens de Design (obrigatório)

```typescript
// apps/web/src/lib/theme-tokens.ts
export const tokens = {
  colors: {
    highlight: '#ABFF10',
    background: '#2C2C2C',
    white: '#FFFFFF',
  },
  contrast: {
    textOnHighlight: '#2C2C2C',    // Texto sobre verde
    textOnBackground: '#FFFFFF',    // Texto sobre fundo escuro
  },
};
```

---

## 8. Etapas de Desenvolvimento (Ordem de Execução)

Seguir **rigorosamente** esta ordem. Cada passo depende do anterior.

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

---

## 9. Testes Automatizados

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

---

## 10. Convenções e Padrões

### Código

- **Linguagem:** TypeScript strict em todo o projeto
- **Validação de DTOs:** Zod (schemas compartilhados em `packages/shared`)
- **Nomeação:** camelCase para variáveis/funções, PascalCase para classes/interfaces
- **Imports:** paths absolutos com alias (`@api/`, `@web/`, `@shared/`)

### Git

- **Branch principal:** `main`
- **Feature branches:** `feature/<nome>`
- **Commits:** mensagens claras e descritivas em português ou inglês
- **PR obrigatório** para merge em main

### Banco de Dados

- **Migrations:** sempre via Prisma (`prisma migrate dev`)
- **Nunca** editar banco diretamente
- **Seed:** atualizar sempre que adicionar entidades obrigatórias
- **Backup:** script `scripts/backup-sqlite.sh` para cópia segura
- **SQLite WAL mode:** ativado para melhor performance de leitura

### API

- **Respostas:** JSON consistente (`{ data, error, message }`)
- **Códigos HTTP:** 200 (ok), 201 (criado), 400 (validação), 401 (não autenticado), 403 (sem permissão), 404 (não encontrado), 500 (erro interno)
- **Paginação:** offset/limit padrão em listagens

### Frontend

- **Componentes:** shadcn/ui como base, customizados com design tokens
- **Formulários:** React Hook Form + Zod (mesmos schemas do shared)
- **Data fetching:** TanStack Query (queries + mutations)
- **Rotas protegidas:** middleware Next.js + verificação de permissões

---

## Checklist Resumo de Progresso

| # | Etapa | Status |
|---|---|---|
| 1 | Setup + Health | ⬜ |
| 2 | Login + PIN | ⬜ |
| 3 | RBAC | ⬜ |
| 4 | Cadastros Base | ⬜ |
| 5 | Patrimônio + Bipagem | ⬜ |
| 6 | Movimentação com PIN | ⬜ |
| 7 | Saída Configurável | ⬜ |
| 8 | Reversão | ⬜ |
| 9 | Portal Cliente | ⬜ |
| 10 | Chamados + SLA | ⬜ |
| 11 | Manutenção | ⬜ |
| 12 | Compras Ciclo Completo | ⬜ |
| 13 | Etiquetas PDF | ⬜ |
