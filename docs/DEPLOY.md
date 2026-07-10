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
#    ATENÇÃO: use SEMPRE db push, NUNCA migrate dev
pnpm prisma db push --accept-data-loss

# 6. Atualize os tipos Prisma (após mudança de schema)
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

> **Nunca execute `prisma migrate dev`.**
> Toda mudança de schema usa `prisma db push --accept-data-loss`.
> Isso garante que nenhum dado existente seja perdido ou resetado.
