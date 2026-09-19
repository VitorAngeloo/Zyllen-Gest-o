# Banco de dados e migrations

## Regra principal

Há um único Supabase PostgreSQL compartilhado entre desenvolvimento e produção, com dados reais de clientes. Migrations pendentes podem afetar esse ambiente. Testes de escrita exigem base descartável; `.env` de desenvolvimento não implica isolamento.

**Nunca executar neste banco:**

| Operação | Motivo |
|---|---|
| `prisma migrate reset` | Apaga os dados. |
| `prisma db push --accept-data-loss` | Aceita perda de dados e não segue o histórico de migrations. |
| `prisma migrate dev` | Depende de shadow database; não é o fluxo deste Supabase compartilhado. |
| `DROP TABLE` / `DROP COLUMN` com dados | Exige plano manual prévio de migração/preservação dos dados. |

Preferir alterações aditivas: tabelas novas, colunas opcionais/nullable e índices revisados. Não executar seed, backfill de escrita ou saneamento como consequência automática de setup/refatoração.

## Schema e geração de SQL

Schema: `apps/api/prisma/schema.prisma`. Migrations: `apps/api/prisma/migrations`. O datasource usa `DATABASE_URL` e `DIRECT_URL`; os valores são segredos.

Com a alteração de schema preparada, terminal na pasta `apps/api`, e `DATABASE_URL` já disponível como variável de ambiente:

```powershell
$migrationName = (Get-Date -Format 'yyyyMMddHHmmss') + '_descricao_curta'
$migrationDirectory = Join-Path 'prisma/migrations' $migrationName
New-Item -ItemType Directory -Path $migrationDirectory | Out-Null

$migrationSql = pnpm prisma migrate diff `
  --from-url $env:DATABASE_URL `
  --to-schema-datamodel prisma/schema.prisma `
  --script

if ($LASTEXITCODE -ne 0) {
  throw 'Não foi possível gerar a migration. Revisar o erro antes de continuar.'
}

$migrationFile = Join-Path $migrationDirectory 'migration.sql'
[System.IO.File]::WriteAllText(
  (Join-Path (Get-Location).Path $migrationFile),
  (($migrationSql -join "`n") + "`n"),
  (New-Object System.Text.UTF8Encoding($false))
)
```

Não imprimir a URL. O comando compara a base real com o schema local, sem shadow database. Revisar **todo** o SQL: schema local desatualizado ou drift pode gerar remoções inesperadas. Confirmar que a migration contém apenas a mudança pretendida e é aditiva. A gravação explícita em UTF-8 evita o redirecionamento UTF-16 padrão do PowerShell 5.1.

## Aplicação e Prisma Client

Depois de revisar SQL, backup e a lista completa de pendências, a aplicação usa:

```powershell
pnpm prisma migrate status
pnpm prisma migrate deploy
```

`migrate deploy` não reseta a base, mas aplica **todas** as migrations pendentes. Conferir que nenhuma migration alheia à atualização será aplicada. Incluir a pasta da migration no mesmo commit da mudança de schema.

Prisma Client é gerado com:

```powershell
pnpm prisma generate
```

No Windows, a API trava `query_engine-windows.dll`; gerar com API parada. O client atualizado precisa existir **antes de compilar** código que usa modelos/campos novos. A ordem completa de parada, geração, build, migration e reinício está no [guia de implantação](implantacao.md).

Não presumir que o redirecionamento de um comando carregará `.env` no ambiente do shell. O Prisma pode carregar seu `.env`, mas `$env:DATABASE_URL` precisa ser configurado para o argumento `--from-url` mostrado acima.

## Scripts antigos

`pnpm db:migrate` na raiz encaminha para `prisma:migrate` da API, que ainda executa `prisma migrate dev`. **Não usar esses aliases** contra o banco compartilhado. A reorganização documental não altera os scripts de package.json.

`prisma:seed` escreve papéis, permissões e dados base. Não reexecutar automaticamente em produção. O primeiro administrador exige provisionamento explícito pelas [variáveis de bootstrap](variaveis-de-ambiente.md), sem credenciais padrão.

## Resiliência do Prisma

`apps/api/src/infrastructure/database/prisma.service.ts` estende PrismaClient:

- Injeta `connection_limit=5&pool_timeout=30` quando a URL não informa limite; o pool default pode esgotar conexões Supabase.
- Tenta conexão inicial até 5 vezes, com backoff linear de 1 segundo por tentativa.
- Expõe `prisma.retry(fn)` sobre `withRetry`.

`prisma-retry.ts` retenta apenas `P1001`, `P1002`, `P1008`, `P1017`, `P2024` e `P2028`, por padrão até 3 tentativas e base 250 ms. Outros erros sobem imediatamente. Usar wrappers em queries críticas, especialmente autenticação; o JwtStrategy já protege as buscas por usuário.

## Dados e auditoria

CPF permanece criptografado conforme [ambiente e chaves](variaveis-de-ambiente.md). Movimentações e operações relevantes precisam de auditoria. Não apagar ledger, reiniciar/decrementar sequência de patrimônio nem remover dados como rollback automático.

Backfill/reconciliação estão em [estoque e patrimônio](estoque-e-patrimonio.md). A migration de segurança de 15/09/2026 e sua restauração verificada estão no [registro datado de publicação](historico-publicacao-seguranca.md).
