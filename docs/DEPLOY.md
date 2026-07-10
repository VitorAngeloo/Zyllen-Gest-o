# Guia de Deploy — skylineti.com

## Visão geral da arquitetura

| Componente | Onde roda | URL |
|---|---|---|
| **Frontend** (Next.js) | Vercel | skylineti.com |
| **Backend** (NestJS API) | Windows Server (este PC) | porta 3001 |
| **Banco de dados** | Supabase (PostgreSQL) | nuvem |

---

## Frontend — atualizar skylineti.com

O frontend é deployado no Vercel. Há duas formas:

### Forma 1 — Manual (atual, recomendada)

Abra o terminal na raiz do projeto e execute:

```powershell
# 1. Garanta que está na pasta raiz do projeto
cd "c:\Users\SERVIDOR ZYLLEN\Documents\GitHub\Zyllen-Gest-o"

# 2. Faça commit das alterações (se ainda não fez)
git add <arquivos>
git commit -m "descrição da mudança"
git push

# 3. Deploy para produção
vercel --prod
```

O comando `vercel --prod` faz o build e sobe direto para skylineti.com. O terminal mostra o progresso e confirma quando estiver no ar.

### Forma 2 — Automática via GitHub Actions (a configurar)

O arquivo `.github/workflows/deploy.yml` já está configurado para disparar o deploy automaticamente a cada `git push` para o branch `master`. Para isso funcionar, os seguintes secrets precisam estar configurados no repositório GitHub:

- `VERCEL_TOKEN` — token de acesso da conta Vercel
- `VERCEL_ORG_ID` — ID da organização no Vercel
- `VERCEL_PROJECT_ID` — ID do projeto no Vercel

Enquanto esses secrets não estiverem configurados, use a **Forma 1**.

---

## Backend — atualizar a API

A API roda como processo Node.js no Windows Server (este PC). O deploy é feito manualmente.

### Passo a passo

```powershell
# 1. Vá para a pasta da API
cd "c:\Users\SERVIDOR ZYLLEN\Documents\GitHub\Zyllen-Gest-o\apps\api"

# 2. Encerre o processo atual da API
#    Descubra o PID da API (porta 3001):
netstat -ano | findstr ":3001"
#    O último número da linha é o PID. Encerre ele:
Stop-Process -Id <PID> -Force

# 3. Atualize o código
cd "c:\Users\SERVIDOR ZYLLEN\Documents\GitHub\Zyllen-Gest-o"
git pull

# 4. Compile a API
cd apps\api
pnpm build

# 5. Aplique mudanças de banco de dados (se houver)
#    Aplica as migrations versionadas ainda pendentes. NÃO reseta,
#    NÃO aceita perda de dados. Se não houver pendência, é no-op.
pnpm prisma migrate deploy

# 6. Atualize os tipos Prisma (após mudança de schema)
#    A API precisa estar PARADA aqui, senão o generate falha com
#    "EPERM ... query_engine-windows.dll" (arquivo travado pelo processo).
pnpm prisma generate

# 7. Inicie a API novamente
Start-Process -FilePath "node" `
  -ArgumentList "dist\main.js" `
  -RedirectStandardOutput "api-run.log" `
  -RedirectStandardError "api-err.log" `
  -NoNewWindow

# 8. Confirme que está rodando
Start-Sleep -Seconds 3
netstat -ano | findstr ":3001"
```

Se a porta 3001 aparecer com status `LISTENING`, a API está no ar.

### Verificar se a API está respondendo

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET
```

Resposta esperada: `status ok`.

---

## Fluxo completo de uma atualização típica

```
1. Faça as alterações no código
2. Teste localmente (pnpm dev)
3. git add + git commit + git push
4. Se mudou código da API  → siga os passos de "Backend" acima
5. Se mudou código do Web  → execute: vercel --prod
6. Acesse skylineti.com e confirme
```

---

## Solução de problemas

### Ninguém consegue logar / API não responde

A API caiu. Execute:

```powershell
cd "c:\Users\SERVIDOR ZYLLEN\Documents\GitHub\Zyllen-Gest-o\apps\api"
Start-Process -FilePath "node" `
  -ArgumentList "dist\main.js" `
  -RedirectStandardOutput "api-run.log" `
  -RedirectStandardError "api-err.log" `
  -NoNewWindow
```

### API não sobe / erro `EADDRINUSE` na porta 3001

Quase sempre é um **stack de desenvolvimento (`pnpm dev`) rodando na máquina de
produção** — o `nest start --watch` disputa a mesma porta 3001 da API de produção
(`node dist/main.js`). Neste servidor deve rodar **apenas** a build de produção.

Encerre os processos de dev e mantenha só o `dist/main.js`:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'pnpm.cjs" dev|nest.js' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

Depois confirme que só um processo detém a porta:

```powershell
netstat -ano | findstr ":3001"
```

### Vercel deu erro no deploy

Execute o build local primeiro para ver o erro:

```powershell
cd "c:\Users\SERVIDOR ZYLLEN\Documents\GitHub\Zyllen-Gest-o"
pnpm --filter @zyllen/web build
```

Corrija o erro, depois rode `vercel --prod` novamente.

### Ver logs da API em tempo real

```powershell
cd "c:\Users\SERVIDOR ZYLLEN\Documents\GitHub\Zyllen-Gest-o\apps\api"
Get-Content api-run.log -Wait
# Ctrl+C para sair
```

---

## Importante — regras do banco de dados

O banco é um **único Supabase compartilhado** (dev e produção usam o mesmo).
Por isso, toda mudança de schema é **versionada como migration** e aplicada com
`prisma migrate deploy`, que só aplica migrations pendentes — nunca reseta a base
nem apaga dados.

### Fluxo de uma mudança de schema

> Não usamos `prisma migrate dev` neste projeto (exige shadow database e pode
> falhar/travar contra o Supabase compartilhado). Geramos o SQL com `migrate diff`
> e aplicamos com `migrate deploy`.

```powershell
cd "c:\Users\SERVIDOR ZYLLEN\Documents\GitHub\Zyllen-Gest-o\apps\api"

# 1. Edite prisma/schema.prisma com a mudança desejada.

# 2. Crie a pasta da migration (use um timestamp AAAAMMDDHHMMSS + nome curto):
mkdir prisma\migrations\20260709120000_descricao_curta

# 3. Gere o SQL comparando o banco atual com o schema novo (sem shadow DB):
pnpm prisma migrate diff `
  --from-url $env:DATABASE_URL `
  --to-schema-datamodel prisma\schema.prisma `
  --script > prisma\migrations\20260709120000_descricao_curta\migration.sql

# 4. Revise o migration.sql gerado.
#    Garanta que é aditivo (novas colunas/tabelas). Evite DROP de coluna com dados.

# 5. Aplique em produção (só aplica pendentes, não reseta, não perde dados):
pnpm prisma migrate deploy

# 6. Commite a pasta da migration junto com o código.
```

> **Regras:**
> - **Nunca** rode `prisma migrate reset` (apaga todos os dados).
> - **Nunca** rode `prisma db push --accept-data-loss` contra este banco — ele
>   sincroniza sem histórico e o flag aceita perda de dados. Use migrations.
> - **Evite** `prisma migrate dev` — exige shadow database.
> - Prefira mudanças **aditivas** (coluna nova opcional). Remoção/renome de coluna
>   com dados exige um plano manual (migração de dados antes do DROP).
