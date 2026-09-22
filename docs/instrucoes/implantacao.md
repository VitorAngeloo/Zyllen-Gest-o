# Implantação: Vercel e API Windows

## Topologia e preparação

Frontend: Vercel, `skylineti.com`. API: Node.js nesta máquina Windows, porta 3001, Cloudflare para `api.skylineti.com`. Banco: Supabase PostgreSQL compartilhado com produção. A API não tem deploy efetivo pelo runner Docker; sua publicação é manual.

Antes de publicar, concluir revisão, build/tipos e validação dos fluxos afetados. Se houver schema, seguir [banco de dados](banco-de-dados.md), revisar pendências e ter backup restaurável. As [variáveis de ambiente](variaveis-de-ambiente.md) precisam ser compatíveis com o startup. Não incluir segredos, logs ou backups no commit.

Correção da listagem de OS em 22/09/2026: os artefatos anteriores da API/shared foram preservados no backup privado `full-release-20260921-234617/maintenance-list-20260922-081705`. A API foi recompilada e atende na porta 3001 com PID **31416**; health local/público respondeu `200` e `GET /maintenance` permaneceu protegido (`401` sem login). O frontend `dpl_GtWW2Ghpfxp8d1ueEKKvEdDNaf78` foi promovido após a atualização da API. Tipos, build isolado, arquitetura e 13 cenários de navegador passaram; consulta de leitura confirmou 115 OS e a localização da `OS-202608-0886` pela nova busca e na primeira página. Não houve mudança de schema, migration pendente nem gravação de registros de teste no banco compartilhado.

Atualização integrada de projetos, viagens, estoque e calendário em 22/09/2026: backup privado `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\full-release-20260921-234617` restaurado com sucesso em PostgreSQL isolado (62 tabelas), com artefatos anteriores e logs da API preservados. As 19 migrations já estavam aplicadas no banco compartilhado; as duas migrations desta entrega foram conferidas por checksum, sem execução adicional de SQL. Shared, Prisma Client e API foram recompilados; a API de produção atende na porta 3001, PID **21540**, com health local e público `200` e rota de opções de projetos protegida (`401` sem login). O deployment Vercel `dpl_HchXnYDUXzhmeJXnZdGomnFfnMyV` ficou `Ready` e foi promovido para `skylineti.com` e `www.skylineti.com`. Build isolado, tipos, arquitetura, testes de projetos/viagens/estoque/estruturas e 59 cenários de interface passaram. A publicação e as verificações não criaram registros de teste na base compartilhada.

Publicação operacional de 18/09/2026: API/shared atualizados e seis migrations aditivas aplicadas após autorização e restauração verificada do backup. API atende 3001 em produção, sem watch; logs desta inicialização estão no diretório privado `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\operational-20260918-1135`, arquivos `api-operational-run.log` e `api-operational-error.log`. A configuração e as chaves foram preservadas. O localhost usa override de API em loopback; esta entrega não fez push nem deploy Vercel. Resultados, limites e conferências restantes no guia de [painel de acompanhamento](painel-de-acompanhamento.md#publicação-autorizada-e-verificação--18092026).

Atualização posterior, autorizada em 18/09/2026: aplicada a única migration pendente de carros e API/shared/Prisma atualizados. Nessa publicação, PID **21840**, porta 3001, produção sem watch; 15 migrations aplicadas e nenhuma pendência/falha. Configuração/chaves preservadas. Logs dessa inicialização no backup privado `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\dashboard-20260918-1221`, arquivos `api-vehicles-run.log` e `api-vehicles-error.log`. Nove verificações locais/públicas e cinco leitores de dados em `READ ONLY` passaram. Cadastro disponível no localhost; frontend não publicado no Vercel. Procedimento e evidências no [guia de carros](carros-e-reservas.md#publicação-autorizada--18092026).

Atualização do filtro de responsável em 18/09/2026: publicados somente os artefatos revisados do serviço/contrato de carros e reiniciado o processo identificado. **Processo atual PID 24784**, porta 3001, produção sem watch; schema, Prisma, configuração/chaves e 15 migrations preservados. Logs atuais `api-unified-run.log`/`api-unified-error.log` no subdiretório privado `unified-reservations-20260918194053` do backup de dashboard acima. Oito consultas reais em READ ONLY e health/proteção JWT local/pública passaram. Formulário e filtro disponíveis no localhost; frontend Vercel não publicado. Detalhes no [guia de carros](carros-e-reservas.md#atualização-do-filtro-de-responsável--18092026).

Atualização do estoque automático de clientes em 19/09/2026: publicada a API que cria um local `CLIENT` vazio junto com cada nova empresa, tanto no cadastro interno quanto na aprovação que cria uma empresa. A versão foi consolidada no commit `4f5ef70` e republicada pelo procedimento completo deste guia. **Processo atual PID 22696**, porta 3001, produção sem watch; as 15 migrations permanecem aplicadas e sem pendência. O artefato anterior, os metadados e os logs desta inicialização estão no backup privado `full-deploy-20260919-223854`. Health local/público, proteção JWT da consulta de empresas e presença da regra no artefato compilado foram conferidos sem criar dados de teste na base compartilhada. O deployment Vercel `web-f26y2ap4g-skysuportevitor-7785s-projects.vercel.app` ficou `Ready` e recebeu os aliases `skylineti.com` e `www.skylineti.com`.

Atualização da dashboard limitada do papel `Internos` em 20/09/2026: shared e API foram recompilados, sem mudança de schema ou aplicação de migration. **Processo atual PID 26512**, porta 3001, produção sem watch. O artefato anterior, os metadados e os logs desta inicialização estão no backup privado `internal-dashboard-20260920-214128`. Health local e público responderam `200`; `GET /internal-dashboard` respondeu `401` sem JWT nos dois endereços, confirmando que a rota nova está publicada e protegida. Nenhum registro do banco foi criado ou alterado durante a publicação. O commit `22953d3` gerou o deployment de produção `web-5k8p8hgi2-skysuportevitor-7785s-projects.vercel.app`, que ficou `Ready` e recebeu os aliases `skylineti.com` e `www.skylineti.com`; o HTML e os chunks públicos do domínio confirmaram a presença da nova dashboard.

Atualização de acesso à Operação em 21/09/2026: o commit `09c47cc` separou `vehicles.view/reserve` de `schedule.*`. A API foi recompilada e reiniciada em produção, **PID 24104**, porta 3001, sem watch; health local e público responderam `200`. Não houve alteração de schema ou migration pendente. Em transações aditivas, `Gestor` recebeu `schedule.view/create/update/delete/manage_installers` e `vehicles.view`; `Técnico` recebeu `vehicles.view/reserve`; `Administrador` recebeu os registros das sete permissões novas para a tela de gestão, sem alterar seu bypass existente; `Internos` permaneceu sem permissões de Operação. O artefato anterior, as listas de permissões anteriores e os logs desta inicialização estão no backup privado `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\operation-access-20260921-093458`. O deployment `web-9d9695sp2-skysuportevitor-7785s-projects.vercel.app` ficou `Ready` e recebeu os aliases `skylineti.com` e `www.skylineti.com`. A sessão existente pode exigir recarga ou novo login para refletir as novas permissões.

Atualização do fluxo de carros em 21/09/2026: commit `a9e429d` publicado após backup restaurado em PostgreSQL isolado (61 tabelas). A migration aditiva `20260921110000_vehicle_checkout_return` foi a única pendente e foi aplicada; as 16 migrations estão em dia. A API foi recompilada com Prisma Client novo e atende em produção como `node dist/main.js`, **PID 15104**, porta 3001, sem watch. Saúde local/pública, proteção JWT das rotas e permissões pontuais de Carros para Internos foram verificadas. O deployment `web-2kfv8tkev-skysuportevitor-7785s-projects.vercel.app` ficou `Ready`, foi promovido e recebeu `skylineti.com` e `www.skylineti.com`. Backup, logs e verificação privada ficam em `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\vehicle-flow-20260921-105356`; procedimento e resultado funcional no [guia de carros](carros-e-reservas.md#publicação-e-verificação--21092026).

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
