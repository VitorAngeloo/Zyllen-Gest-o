# Autenticação e autorização

## Três tipos de usuário

| Tipo | Model Prisma | Endpoint de login | Contexto |
|---|---|---|---|
| `internal` | `InternalUser` | `POST /auth/login` | colaborador Skyline — tem `role` e PIN |
| `external` | `ExternalUser` | `POST /clients/login` | cliente, vinculado a `Company`/`Project` |
| `contractor` | `ContractorUser` | `POST /register/contractor/login` | terceirizado/parceiro |

O tipo vai no JWT (`payload.type`) e determina o ramo do `JwtStrategy.validate()`.

## Fluxo do JWT

1. Login devolve `accessToken` (1d) + `refreshToken` (7d) + `user`. O refresh também é setado como cookie **httpOnly**.
2. `JwtStrategy` extrai o token do header `Authorization: Bearer`. JWT na query string não é aceito. Imagens e vídeos usam a sessão de mídia httpOnly restrita a `/media`.
3. Em **toda requisição**, a strategy revalida o usuário no banco e checa `isActive`. Token válido de usuário desativado é rejeitado.
4. O objeto anexado em `req.user` já vem com `{ id, email, name, type }` e, para internos, `{ role: { id, name }, roleId }`.

## Permissões (RBAC)

Formato: **`screen.action`**. Modelagem: `Role` ← `RolePermission` → `ScreenPermission { screen, action }`.

```ts
@Controller('maintenance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MaintenanceController {
    @Get()
    @RequirePermission('maintenance.view')          // única
    async findAll() { /* ... */ }

    @Post(':id/attachments')
    @RequirePermission(['maintenance.open', 'maintenance.execute'])   // OR — basta uma
    async upload() { /* ... */ }
}
```

Regras do `PermissionsGuard`:

- Sem decorator `@RequirePermission` → só exige JWT válido.
- Usuário **não-interno** em rota com permissão → `403` sempre.
- **`Administrador` bypassa todas as checagens** (hardcoded por nome de role).
- Array = OR, não AND.
- `@Public()` (`auth/public.decorator.ts`) dispensa o guard JWT em rotas declaradas públicas. Anexos privados são autorizados pelo módulo `media`; compartilhamento externo exige link explícito, temporário e revogável.

## Papéis previstos no seed

`Administrador` · `Gestor` · `Técnico` · `Internos`

> **`Internos` intencionalmente não tem permissão de manutenção.** Não "conserte" isso — é regra de negócio deliberada.

O papel `Internos` também não recebe permissões gerais de chamados, agenda ou projetos para montar sua dashboard. A leitura limitada usa `GET /internal-dashboard`, que exige JWT interno e confere o nome exato do papel. O endpoint mostra somente os chamados abertos pela própria conta e resumos de projetos e carros, sem expor ações ou liberar as respectivas telas de gestão.

## Telas de permissão previstas no seed

`dashboard` · `inventory` (view, bipar_entrada, bipar_saida, historico, exit) · `assets` (view, create, lookup) · `catalog` · `locations` · `suppliers` (view, create, update, delete) · `purchases` (view, create, approve, receive) · `tickets` (view, triage, assign, close) · `maintenance` (view, open, execute, close) · `approvals` (view, approve, reject) · `access` (view, manage, manage_roles, manage_permissions) · `labels` (view, print) · `followups` (view, create, edit, delete) · `audit` (view) · `settings` (view, manage)

## PIN de 4 dígitos

Usuários internos têm `pin4Hash` (bcrypt, `@unique`). É revalidado em ações sensíveis via `POST /auth/validate-pin` (rate-limited). No primeiro login a API devolve `needsPin: true` e o frontend força o cadastro.

## Restrições adicionais

Somente Administrador/Gestor aprovam solicitações e criam diretamente contas de clientes. A aprovação valida empresa/projeto em transação e grava auditoria. Cadastro público não cria conta de acesso nem vincula OS por nome.

Compartilhamento externo é autorizado para esses dois papéis: um arquivo por link, 24 horas e revogação; somente o hash do token é persistido. A autorização de leitura de mídia verifica o objeto, o usuário ativo e seu vínculo, não apenas a validade de uma sessão.

## Referências

- [Cliente HTTP e contexto de autenticação](arquitetura.md).
- [Cadastro e aprovação de clientes](cadastro-clientes.md).
- [Remediação e evidências de segurança](seguranca.md).
