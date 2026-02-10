# Zyllen Gestão

> Sistema web completo de gestão operacional interna (Skyline) + portal externo para clientes.

---

## Visão Geral

O **Zyllen Gestão** é um sistema web dividido em duas frentes:

| Frente | Descrição |
|---|---|
| **Skyline (Interno)** | Estoque, patrimônio, compras, manutenção, chamados internos, aprovações e auditoria |
| **Portal (Externo)** | Abertura e acompanhamento de chamados por clientes |

---

## Stack Tecnológica

### Backend
- **Runtime:** Node.js + TypeScript
- **Framework:** NestJS
- **ORM:** Prisma
- **Banco de Dados:** SQLite (modo WAL) — preparado para troca futura
- **Validação:** Zod
- **Segurança:** RBAC + PIN 4 dígitos por ação + AuditLog obrigatório

### Frontend
- **Framework:** Next.js (App Router) + TypeScript
- **Estilização:** TailwindCSS + shadcn/ui
- **Data Fetching:** TanStack Query
- **Formulários:** React Hook Form + Zod

### Design Tokens
| Token | Cor | Uso |
|---|---|---|
| Destaque | `#ABFF10` | Botões primários, badges, elementos de destaque |
| Fundo | `#2C2C2C` | Background principal |
| Branco | `#FFFFFF` | Texto sobre fundo escuro |
| Texto sobre destaque | `#2C2C2C` | Texto sobre elementos verdes |

---

## Estrutura do Repositório (Monorepo)

```
zyllen-gestao/
├── apps/
│   ├── api/                  # Backend NestJS
│   │   ├── src/modules/      # Módulos de negócio
│   │   └── prisma/           # Schema, migrations e seed
│   └── web/                  # Frontend Next.js
│       └── src/app/          # Rotas e páginas
├── packages/
│   └── shared/               # Types + Zod schemas compartilhados
├── scripts/                  # Utilitários (backup SQLite, etc.)
├── docker-compose.yml
└── .env.example
```

---

## Módulos Principais

| Módulo | Funcionalidade |
|---|---|
| **Auth / Access** | Login, roles, permissões por tela/ação, PIN |
| **Catálogo** | SKUs (6 dígitos auto), categorias |
| **Patrimônio** | Assets (`SKY-XXXXX` auto), bipagem, ficha completa |
| **Estoque** | Movimentações, saldos por local, tipos configuráveis |
| **Aprovações** | Fluxo de aprovação para ações sensíveis |
| **Compras** | Pedido → Recebimento parcial/divergência → Entrada no estoque |
| **Chamados** | Abertura (externo), triagem, atribuição, SLA básico |
| **Manutenção** | OS vinculada a patrimônio, controle de status |
| **Etiquetas** | Geração de PDF com patrimônio, SKU, barcode |
| **Auditoria** | Log imutável de todas as ações relevantes |

---

## Regras de Negócio Críticas

- **PIN 4 dígitos:** Obrigatório e único por usuário interno. Revalidado a cada ação sensível. Armazenado em hash (bcrypt/argon2).
- **SKU:** 6 dígitos numéricos, gerado automaticamente com retry em caso de colisão.
- **Patrimônio:** Prefixo `SKY-` + 5 dígitos, gerado automaticamente com retry.
- **Movimentações:** Sempre geram histórico imutável. Reversão exige aprovação de Admin.
- **Estoque por local:** Um SKU pode existir em múltiplos locais com quantidades diferentes.
- **Tipos de saída configuráveis:** Cada tipo define se exige aprovação, se é baixa definitiva, se muda status do patrimônio, etc.

---

## Usuários

| Tipo | Descrição |
|---|---|
| **Interno (Skyline)** | Opera estoque, patrimônio, compras, manutenção, triagem. Possui PIN. |
| **Externo (Cliente)** | Vinculado a uma empresa. Abre e acompanha chamados. Login por email/senha. |

---

## Portas Padrão

| Serviço | Porta |
|---|---|
| API (NestJS) | `3001` |
| Web (Next.js) | `3000` |

---

## Scripts Úteis

```bash
# Instalar dependências
pnpm install

# Rodar migrations
pnpm --filter api prisma migrate dev

# Rodar seed
pnpm --filter api prisma db seed

# Iniciar API
pnpm --filter api dev

# Iniciar Web
pnpm --filter web dev

# Docker Compose (tudo junto)
docker-compose up
```

---

## Licença

Projeto proprietário — Zyllen Gestão. Todos os direitos reservados.
