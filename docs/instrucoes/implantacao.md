# Implantação: Vercel e API Windows

## Topologia e preparação

Frontend: Vercel, `skylineti.com`. API: Node.js nesta máquina Windows, porta 3001, Cloudflare para `api.skylineti.com`. Banco: Supabase PostgreSQL compartilhado com produção. A API não tem deploy efetivo pelo runner Docker; sua publicação é manual.

Antes de publicar, concluir revisão, build/tipos e validação dos fluxos afetados. Se houver schema, seguir [banco de dados](banco-de-dados.md), revisar pendências e ter backup restaurável. As [variáveis de ambiente](variaveis-de-ambiente.md) precisam ser compatíveis com o startup. Não incluir segredos, logs ou backups no commit.

Publicação operacional de 18/09/2026: API/shared atualizados e seis migrations aditivas aplicadas após autorização e restauração verificada do backup. API atende 3001 em produção, sem watch; logs desta inicialização estão no diretório privado `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\operational-20260918-1135`, arquivos `api-operational-run.log` e `api-operational-error.log`. A configuração e as chaves foram preservadas. O localhost usa override de API em loopback; esta entrega não fez push nem deploy Vercel. Resultados, limites e conferências restantes no guia de [painel de acompanhamento](painel-de-acompanhamento.md#publicação-autorizada-e-verificação--18092026).

Atualização posterior, autorizada em 18/09/2026: aplicada a única migration pendente de carros e API/shared/Prisma atualizados. Nessa publicação, PID **21840**, porta 3001, produção sem watch; 15 migrations aplicadas e nenhuma pendência/falha. Configuração/chaves preservadas. Logs dessa inicialização no backup privado `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\dashboard-20260918-1221`, arquivos `api-vehicles-run.log` e `api-vehicles-error.log`. Nove verificações locais/públicas e cinco leitores de dados em `READ ONLY` passaram. Cadastro disponível no localhost; frontend não publicado no Vercel. Procedimento e evidências no [guia de carros](carros-e-reservas.md#publicação-autorizada--18092026).

Atualização do filtro de responsável em 18/09/2026: publicados somente os artefatos revisados do serviço/contrato de carros e reiniciado o processo identificado. **Processo atual PID 24784**, porta 3001, produção sem watch; schema, Prisma, configuração/chaves e 15 migrations preservados. Logs atuais `api-unified-run.log`/`api-unified-error.log` no subdiretório privado `unified-reservations-20260918194053` do backup de dashboard acima. Oito consultas reais em READ ONLY e health/proteção JWT local/pública passaram. Formulário e filtro disponíveis no localhost; frontend Vercel não publicado. Detalhes no [guia de carros](carros-e-reservas.md#atualização-do-filtro-de-responsável--18092026).

Atualização do estoque automático de clientes em 19/09/2026: publicada a API que cria um local `CLIENT` vazio junto com cada nova empresa, tanto no cadastro interno quanto na aprovação que cria uma empresa. **Processo atual PID 2988**, porta 3001, produção sem watch. Não houve alteração de schema, migration, Prisma Client ou frontend. O artefato anterior e os logs desta inicialização estão no backup privado `client-stock-20260919-112434`. Health local/público, proteção JWT da consulta de empresas e presença da regra no artefato compilado foram conferidos sem criar dados de teste na base compartilhada.

Para correções de segurança, consultar [remediação](seguranca.md) e os limites do [registro de 15/09/2026](historico-publicacao-seguranca.md). Aquela rotação JWT e migration já foram documentadas como concluídas; não repeti-las automaticamente em outra atualização. Preservar sempre a chave de CPF.

## Frontend: configuração

Projeto Vercel `web`: **Root Directory `apps/web`**, com inclusão de fontes fora da raiz habilitada. `apps/web/vercel.json` instala o workspace e compila `@zyllen/shared` antes de Next.js. A raiz também contém configuração, mas não deve substituir a Root Directory corrigida no projeto web.

Push no `master` é o fluxo documentado para entrega web. O workflow `.github/workflows/deploy.yml` também define job Vercel que depende de `VERCEL_TOKEN`, `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID`; sua presença no código não comprova que os secrets estejam configurados. Verificar o deployment real no projeto `web`.

Deploy manual pela CLI autenticada, na raiz:

```powershell
vercel --prod
```

Antes de push/deploy, executar verificação de tipos e build conforme [desenvolvimento](desenvolvimento.md). `next build` sozinho não substitui `tsc --noEmit`.

### Atualização coordenada com a API

Quando o frontend novo depende da API nova, controlar a publicação para não promover o web antes da API. Não contar com um push que publica automaticamente o domínio durante a preparação.

```powershell
# Preparar o deployment sem trocar o domínio
vercel deploy --prod --skip-domain --yes
```

Esperar o estado Ready, atualizar/verificar a API e promover a URL preparada:

```powershell
vercel promote <URL-do-deployment> --yes
```

Avisar sobre recarga de páginas/novo login quando a versão exigir. Reinício da API pode causar breve indisponibilidade; esse fluxo não promete zero downtime.

## Backend: ordem de atualização

Executar os comandos de uma publicação planejada, verificando o sucesso de cada etapa. Exemplos partem da raiz do repositório.

1. Confirmar artefatos/backup e o código que será publicado. Identificar o processo **da API**, seu comando e o PID que escuta 3001.
2. Encerrar somente o processo identificado da API; se houver supervisor watch indevido, encerrar também esse supervisor após identificá-lo.
3. Atualizar código e dependências, compilar shared, gerar Prisma Client com API parada e compilar API.
4. Aplicar apenas o conjunto revisado de migrations pendentes.
5. Iniciar `node dist/main.js` com `NODE_ENV=production` e verificar health local/público antes de promover frontend dependente.

Identificação, somente leitura:

```powershell
Get-NetTCPConnection -LocalPort 3001 -State Listen |
  Select-Object LocalAddress, LocalPort, OwningProcess

Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Select-Object ProcessId, CommandLine
```

Parar o PID confirmado, sem encerrar todos os processos Node:

```powershell
Stop-Process -Id <PID-confirmado-da-API> -Force
```

Atualizar e compilar, na raiz:

```powershell
git pull --ff-only
pnpm install --frozen-lockfile
pnpm --filter @zyllen/shared build
Set-Location apps/api
pnpm prisma generate
pnpm build
pnpm prisma migrate status
# Somente com todas as pendências revisadas:
pnpm prisma migrate deploy
```

Interromper a sequência se qualquer etapa falhar; PowerShell 5.1 não para automaticamente após todo erro de programa externo. Não iniciar uma compilação incompleta nem aplicar SQL inesperado.

Iniciar na pasta `apps/api`:

```powershell
$env:NODE_ENV = 'production'
Start-Process -FilePath 'node' `
  -ArgumentList 'dist/main.js' `
  -WorkingDirectory (Get-Location).Path `
  -RedirectStandardOutput 'api-run.log' `
  -RedirectStandardError 'api-err.log' `
  -WindowStyle Hidden
```

Os nomes acima são os logs desta inicialização. A publicação de segurança de 15/09/2026 usou `api-security-out.log`/`api-security-err.log`; consultar os arquivos correspondentes ao processo em execução. Logs `apps/api/api-*.log` são artefatos de runtime e não devem ser versionados.

### Verificação após iniciar

```powershell
Get-NetTCPConnection -LocalPort 3001 -State Listen
Invoke-RestMethod -Uri 'http://localhost:3001/health' -Method GET
Invoke-RestMethod -Uri 'https://api.skylineti.com/health' -Method GET
```

Esperar porta escutando e health com status ok; confirmar domínio web/deployment, CORS e o fluxo alterado. Smoke tests sem autenticação não equivalem a homologação de todos os fluxos. Não enviar cadastros/OS fictícios ao banco real para verificar uma publicação.

## Solução de problemas

| Sintoma | Verificação / ação |
|---|---|
| `EPERM` no Prisma engine | Confirmar API parada antes de `prisma generate`; gerar client antes do build que exige tipos novos. |
| `EADDRINUSE` em 3001 | Identificar PID/comando e eventual `nest --watch`; nesta máquina usar apenas a API de produção. |
| Fix não aparece na API | Confirmar build explícito e artefato publicado; watch pode não reemitir o dist esperado. |
| Login falha/API indisponível | Verificar listener, health local, log de startup, configuração e túnel. Não abrir segunda API se a porta já estiver ocupada. |
| Startup rejeita JWT/storage | Revisar requisitos do [ambiente](variaveis-de-ambiente.md); não restaurar default público ou bucket público para subir. |
| Build web/Vercel falha | Rodar tsc e build local/isolado; confirmar shared e Root Directory do projeto `web`. |
| Falha no projeto Vercel legado de API | A API roda no Windows; conferir o projeto web correto. O registro antigo identifica projetos `zyllen-gest-o-api-*` indevidos. |

Para acompanhar o log da inicialização do exemplo:

```powershell
# Na pasta apps/api
Get-Content api-run.log -Wait
```

Não usar `iniciar-servidor.bat` nem `pnpm dev` nesta máquina de produção. Não usar reset/seed como reparo automático. Retorno de versão precisa preservar dados aditivos, sequências e proteção de anexos; revisar qualquer reintrodução de comportamento vulnerável.
