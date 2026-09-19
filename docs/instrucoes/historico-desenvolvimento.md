# Histórico de desenvolvimento

> Registros históricos consolidados de `MD1.md` e `STATUS.md`. As datas e contagens são fotografias de fevereiro de 2026, não indicadores atuais. Nenhuma credencial de teste é reproduzida.

## 11/02/2026 — fundação

Commit registrado: `404e346`, `feat: Complete Backend & Frontend Foundation (Passos 1-13)`. O registro informou 13 etapas de backend e 9 telas concluídas, com NestJS/Prisma/SQLite e Next.js/React/Tailwind. O roteiro das etapas está na [especificação inicial](historico-especificacao-inicial.md); inventários repetidos de endpoints e arquivos foram consolidados lá.

### Verificação registrada em 11/02/2026

| Check | Resultado |
|---|---|
| API `tsc --noEmit` | ✅ 0 erros (49 arquivos) |
| Web `next build` | ✅ Compiled successfully (22 arquivos, 9 rotas) |
| `GET /health` | ✅ 200 `{"status":"ok"}` |
| `GET /` (frontend) | ✅ 200, 21KB, título "Zyllen Gestão" |
| `POST /auth/login` | ✅ 200, token + user retornados |

## 17/02/2026 — versão 0.4.0

### Resumo da versão

| Camada | Progresso | Observação |
|--------|:---------:|------------|
| Backend (API) | ~97% | 17 módulos, ~100 endpoints, guards, serviços e validação Zod |
| Frontend (Web) | ~80% | 24 páginas, sistema de OS com 6 formulários, preenchimento progressivo |
| Shared (Pacote) | ~90% | 36 schemas Zod, tipos compartilhados, integrados no backend |
| Infraestrutura | ~90% | Docker, PM2, env configurados |
| Testes | 0% | Nenhum teste unitário ou e2e |

---

### Changelog da versão 0.4.0

#### Novas Funcionalidades

- **6 formulários de OS reescritos** — Cada tipo de formulário (Instalação Sala, Instalação Tela, Desinstalação, Manutenção Tela/Sala, Suporte Remoto, Terceirizado) com campos específicos organizados em seções conforme especificação
- **Preenchimento progressivo de OS** — OS pode ser salva como rascunho e preenchida conforme o serviço avança (`PUT /maintenance/:id/form-data`)
- **Página Minhas OS** — Nova aba na sidebar (`/dashboard/minhas-os`) com 3 abas: OS próprias, OS de colaboradores (admin), OS de terceirizados (admin)
- **Página Terceirizados** — Banco de dados de terceirizados cadastrados (`/dashboard/terceirizados`) com grid de cards
- **CPF no cadastro** — Terceirizados (obrigatório, unique) e clientes (opcional) agora informam CPF no registro
- **Pesquisa de empresa no cadastro de cliente** — Dropdown debounced que busca empresas por nome/CNPJ, permite vincular a empresa existente ou criar nova inline
- **Endpoint de contractors** — `GET /clients/contractors` lista todos os terceirizados para admin
- **Endpoint de company search** — `GET /clients/companies/search` busca pública por nome/CNPJ

#### Alterações no Banco de Dados

- `ContractorUser`: Adicionado `cpf String? @unique`
- `MaintenanceOS`: Adicionados `osNumber`, `formType`, `formData`, `clientName`, `clientCity`, `clientState`, `location`, `scheduledDate`, `startedAt`, `endedAt`, `completedAt`; `assetId` agora é opcional

#### Novos Schemas Zod

- `updateOsFormDataSchema` — Validação para preenchimento progressivo de OS
- `registerClientSchema` — Atualizado com `cpf?`, `companyId?`, `companyName` agora opcional
- `registerContractorSchema` — Atualizado com `cpf` obrigatório (min 11)
- `createMaintenanceSchema` — Expandido com formType, clientData, location, timestamps, formData

#### Novos Endpoints

| Endpoint | Descrição |
|----------|-----------|
| `GET /maintenance/my-orders` | OS do usuário logado |
| `PUT /maintenance/:id/form-data` | Salvar progresso do formulário (colaborador) |
| `PUT /contractor/maintenance/:id/form-data` | Salvar progresso do formulário (terceirizado) |
| `GET /clients/contractors` | Listar terceirizados cadastrados (admin) |
| `GET /clients/companies/search` | Pesquisar empresas por nome/CNPJ (público) |

#### Novas Páginas

| Rota | Descrição |
|------|-----------|
| `/dashboard/minhas-os` | Minhas OS + abas admin (Colaboradores/Terceirizados) |
| `/dashboard/terceirizados` | Banco de dados de terceirizados |

#### Sidebar Atualizada (14 itens)

Dashboard → **Minhas OS** → Estoque → Patrimônio → Compras → Chamados → Manutenção → Etiquetas → **Terceirizados** → Clientes → Colaboradores → Permissões → Cadastros → Acesso

## Pendências registradas em fevereiro

As prioridades abaixo não foram reabertas por esta consolidação. PostgreSQL/Supabase, anexos privados e outras melhorias posteriores tornam parte delas obsoleta; confirmar cada item no código e nos registros posteriores antes de incluí-lo no backlog.

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

## Registros posteriores

- [Plano de evolução de estoque de 24/04/2026](plano-evolucao-estoque.md).
- [Decisões e contexto de impressão Zebra](etiquetas-e-impressao.md).
- [Publicação de segurança de 15/09/2026 e melhoria do cadastro](historico-publicacao-seguranca.md).

Setup, execução e stack atuais estão nos [guias de desenvolvimento](desenvolvimento.md) e [arquitetura](arquitetura.md).
