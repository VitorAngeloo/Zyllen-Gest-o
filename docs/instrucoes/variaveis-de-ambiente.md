# Variáveis de ambiente

## Locais e proteção

API: `apps/api/.env`. Frontend local: arquivos de ambiente em `apps/web`; frontend publicado: configuração do projeto Vercel. `.env.example` na raiz serve de referência de nomes e pode conter premissas antigas; validar com o código.

Nunca commitar valores de segredos ou dados pessoais. O `.gitignore` exclui `.env*`; isso também exclui exemplos por padrão. Atualizar exemplos exige tratar conscientemente esse padrão, sem versionar valores reais.

Variáveis `NEXT_PUBLIC_*` são incorporadas ao frontend e não podem conter segredos. A alteração de valor no Vercel precisa de novo build para chegar ao navegador.

## API

| Variável | Uso / comportamento |
|---|---|
| `DATABASE_URL` | PostgreSQL/Supabase para queries. PrismaService limita pool a 5 e timeout a 30 quando a URL não define `connection_limit`. |
| `DIRECT_URL` | Datasource direto do Prisma, previsto para operações de schema/migrations. Não expor a URL. |
| `JWT_SECRET` | Segredo aleatório exclusivo, mínimo 64 caracteres; startup rejeita defaults conhecidos e diversidade insuficiente. |
| `CPF_ENCRYPTION_KEY` | 64 caracteres hex, 32 bytes, para CPF criptografado em AES-256-CBC. Preservar a chave dos dados existentes. |
| `API_PORT` | Porta da API; default 3001. |
| `CORS_ORIGIN` | Lista CSV de origens; default `http://localhost:3000`; CORS permite credenciais. |
| `NODE_ENV` | Usar `production` para iniciar o serviço de produção. |
| `SUPABASE_URL` | URL Supabase para armazenamento de mídia; configurar junto com service role. |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave somente do servidor; nunca `NEXT_PUBLIC_*`. |
| `SUPABASE_OS_MEDIA_BUCKET` | Bucket privado; default `os-media`. |
| `SUPABASE_OS_MEDIA_BUCKET_PUBLIC` | Deve permanecer `false`/ausente. Valor `true` é recusado. |
| `SUPABASE_OS_MEDIA_SIGNED_URL_EXPIRES` | Validade de URLs assinadas do storage; default 600 segundos, mínimo 60 no serviço. |
| `MEDIA_UPLOAD_ROOT` | Override da raiz local privada usado pelo MediaService, especialmente em testes. Verificar também os diretórios de upload de cada controller antes de alterar em produção. |
| `BOOTSTRAP_ADMIN_EMAIL` | Primeiro administrador, somente no provisionamento explícito via seed. |
| `BOOTSTRAP_ADMIN_PASSWORD` | Senha exclusiva, mínimo 16 caracteres, para primeiro administrador; não há senha/PIN padrão. |

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` precisam estar juntas ou ambas ausentes. Com storage habilitado, a API confirma que o bucket é privado e falha se não puder confirmar. Com ambas ausentes, usa disco privado, sem publicação de `/uploads`.

Access token expira em `1d` (`auth.module.ts`) e refresh em `7d` (`auth.service.ts`). Os nomes antigos `JWT_EXPIRES_IN` e `JWT_REFRESH_EXPIRES_IN` não são consumidos por essas implementações; configurá-los não altera a duração atual.

## Frontend

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL base da API; também usada para compor CSP. |
| `NEXT_PUBLIC_ZEBRA_PRINT_URL` | URL opcional do Browser Print. Configuração salva na tela tem prioridade; depois vem tentativa local. |

Mídia usa cookie httpOnly `SameSite=Lax` e depende da topologia de sites. Produção usa `skylineti.com` / `api.skylineti.com`; testes locais usam o mesmo host. Preview Vercel em outro site exige ambiente compatível ou estratégia própria; não tornar anexos públicos para contornar cookies.

## Variáveis de manutenção e testes

Backfill/reconciliação: `BACKFILL_DRY_RUN`, `BACKFILL_BATCH_SIZE`, `RECONCILE_OUTPUT_FILE`, `RECONCILE_INCLUDE_ZERO_DIFF`, descritas em [estoque](estoque-e-patrimonio.md).

Auditoria/regressão: `AUDIT_RUNTIME_ROOT` e `AUDIT_CHROME_PATH`, descritas no [índice da auditoria](auditoria-de-seguranca.md) e na [remediação](seguranca.md). Secrets do workflow Vercel: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`; configuração em [implantação](implantacao.md).

As flags históricas `FF_LEDGER_UNIFIED_WRITE`/`FF_LEDGER_UNIFIED_READ` não são consumidas pelo código atual; não usá-las para alterar fluxo ou rollback.

## CPF e rotação de chaves

Persistir CPF com `encryptCPF()` e ler com `decryptCPFSafe()` em `apps/api/src/infrastructure/security/cpf-crypto.ts`. Não persistir CPF em texto puro. Busca por CPF precisa seguir a comparação criptografada adotada pelo serviço, não comparar diretamente o texto puro com o campo armazenado.

Troca da chave JWT invalida sessões e precisa de publicação coordenada. **Não alterar a chave de CPF durante essa operação**: dados existentes dependem dela. Provisionamento de administrador não deve reexecutar seed como mecanismo de correção de contas reais.
