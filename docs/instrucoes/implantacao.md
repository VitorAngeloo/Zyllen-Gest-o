# Implantação: Vercel e API Windows

## Topologia e preparação

Frontend: Vercel, `skylineti.com`. API: Node.js nesta máquina Windows, porta 3001, Cloudflare para `api.skylineti.com`. Banco: Supabase PostgreSQL compartilhado com produção. A API não tem deploy efetivo pelo runner Docker; sua publicação é manual.

Antes de publicar, concluir revisão, build/tipos e validação dos fluxos afetados. Se houver schema, seguir [banco de dados](banco-de-dados.md), revisar pendências e ter backup restaurável. As [variáveis de ambiente](variaveis-de-ambiente.md) precisam ser compatíveis com o startup. Não incluir segredos, logs ou backups no commit.

Entrega consolidada de 20/10/2026: reúne no Git as páginas privada/pública de vídeo das OS, links temporários no PDF para Administrador/Gestor, os dois logotipos e a impressão da prévia, a devolução individual pela bipagem rápida e os iniciadores de recuperação de produção. A comparação com a Vercel confirmou que a publicação manual de 13/10 às 13h07 continha as melhorias de mídia; a publicação das 16h14 e a versão automática de 14/10, commit `f1d0115`, não as continham. Arquivos que só existiam localmente devem acompanhar o commit da entrega para que publicações automáticas preservem essas funcionalidades. Arquitetura, tipos, build isolado completo, 24 cenários de interface, sete regressões de limites de mídia, oito cenários de startup e os testes de compartilhamento/reprodução privada e pública passaram com dados sintéticos. O relógio da regressão trimestral e a captura do vídeo sintético foram estabilizados para repetir esses testes em outras datas.

O backend continua nos artefatos de `f8d4341`, com limite efetivo de vídeo de **80 MB**. A revisão automática bloqueou a parada/reinicialização proposta para publicar o shared de 150 MB (`blocked by policy`); a operação não foi executada. O web usa `NEXT_PUBLIC_OS_VIDEO_MAX_MB=80` na Vercel, mantendo texto, validação e lotes compatíveis com essa API. A ampliação do backend permanece pendente e exige o procedimento coordenado abaixo; depois, atualizar ou remover esse teto e recompilar o web. Os artefatos/configuração anteriores, schema e manifesto de 710 arquivos estão no backup privado `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\domain-sync-20261020-140838`. Não houve alteração de schema, geração do Prisma de produção, migration ou escrita de teste no banco compartilhado nesta entrega.

Recuperação de disponibilidade em 20/10/2026: o Windows reiniciou após desligamento inesperado às 05h33. O iniciador correto executou às 05h34, mas a API encerrou com `P1001` após cinco tentativas de conexão ao banco; não havia repetição posterior. A API foi iniciada com os mesmos artefatos publicados, em produção, PID **8072**, e health local/público voltou a responder `200`. CORS respondeu `204` para o domínio web e `/maintenance` permaneceu protegido (`401`). Foi registrada a tarefa `Zyllen API Production Recovery`, no usuário atual e sem elevação, para verificar a cada minuto e na entrada no Windows; a execução real preservou a API ativa e terminou com resultado `0`. O iniciador passou a respeitar a pausa local de manutenção descrita abaixo. Oito cenários isolados de startup e a verificação de arquitetura passaram. Backup do iniciador/atalho anteriores, logs da falha, definição da tarefa e checksums em `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\startup-recovery-20261020-081253`. Configuração, API compilada, shared e banco foram preservados; não houve build, geração de Prisma, migration ou escrita de teste na base real. A recuperação continua dependendo da sessão desse usuário; não foi instalado um serviço nem reiniciado o Windows para teste.

Recuperação de disponibilidade em 19/10/2026: após o reinício do Windows, a API estava parada, `/health` público retornava `502` e `apps/api/dist` estava incompleto, sem `main.js`. O atalho da pasta Inicializar apontava para o launcher de desenvolvimento; a compilação desse modo falhava porque o shared compilado não continha o tipo `averageFirstResponseSeconds`. A execução foi recuperada com os artefatos da última publicação, `f8d4341`: backup `dashboard-20261014-122814/api-dist` mais os oito arquivos de `prepared-api`, com checksums conferidos. Configuração, shared de runtime, Prisma Client e banco foram preservados. Cópia do dist incompleto, atalho anterior e logs em `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\login-recovery-20261019-081509`. Health local/público respondeu `200`, login com conta inexistente respondeu `401` e CORS para `https://skylineti.com` passou. O login com credenciais reais permanece para uso normal da equipe. O atalho foi atualizado para o iniciador de produção descrito abaixo.

Atualização da dashboard em 14/10/2026: o commit `f8d4341` recuperou a identificação de patrimônio/produto/SKU nas aprovações pendentes e passou a calcular a espera entre abertura e primeiro atendimento iniciado no período. Datas personalizadas são editadas sem interromper os indicadores e confirmadas por **Aplicar período**, com regressões para julho a outubro de 2026 e intervalos entre anos. Os dois serviços afetados da API foram compilados em ambiente isolado e publicados com seus artefatos anteriores preservados; a API atende a porta 3001 como `node --enable-source-maps dist/main.js`, PID **27156**, em produção sem watch. Configuração, chave de CPF, schema, Prisma Client e runtime compartilhado permaneceram intactos; as 22 migrations estão aplicadas, sem pendência nem execução de SQL de migração. Backup dos artefatos/configuração e logs em `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\dashboard-20261014-122814`, com checksums conferidos. O deployment Vercel `dpl_Chi6vbfokgNK9x1iMj4aMNYbGUdy` ficou `Ready` e foi promovido para o domínio de produção. Health local/público respondeu `200`, rotas protegidas responderam `401` sem sessão e consultas em `READ ONLY` confirmaram os novos contratos. Os arquivos públicos de `skylineti.com/dashboard` confirmaram as três correções. Tipos, arquitetura, build isolado e 92 cenários de API/navegador passaram. Não houve seed nem criação ou alteração de registros de teste na base compartilhada.

Atualização do fluxo de carros em 29/09/2026: autorização prévia por Administrador/Gestor, operação simplificada de retirada/devolução, foto obrigatória do estado do carro e revisão por hodômetro a cada 5.000 km foram publicados. O backup privado `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\vehicle-approval-service-20260929-172041` foi validado por checksum e restaurado integralmente em PostgreSQL isolado, com 63 tabelas. A única pendência, `20260929160000_vehicle_approval_service_condition_photo`, foi aplicada com `prisma migrate deploy`; as 22 migrations ficaram em dia e a leitura posterior confirmou as estruturas novas sem alterar as oito reservas nem os quatro usos existentes. Shared, Prisma Client e API foram recompilados; a API atende a porta 3001 como `node --enable-source-maps dist/main.js`, PID **16668**, sem watch, com health local/público `200` e endpoints novos protegidos (`401`) sem sessão. O deployment Vercel `dpl_GxEPbpCGRjkqZTMs7gdu9s9GPK63` ficou `Ready`, foi promovido e as quatro páginas de Carros e seus componentes públicos foram confirmados em `skylineti.com`. Tipos, build isolado, arquitetura, 24 cenários integrados, 62 regressões dos painéis, quatro cenários específicos em navegador e a cadeia de 12 migrations operacionais passaram. Não houve seed nem criação de registros de teste na base compartilhada; detalhes no [guia de carros](carros-e-reservas.md#publicação-e-verificação--29092026).

Correção da sincronização de Clientes de atenção em 29/09/2026: o commit `8b45d4b` tornou a curadoria única para a equipe e passou a entregá-la a todos os links autorizados, inclusive os antigos. A leitura de transição escolhe a seleção legada mais recente; o próximo salvamento substitui a lista compartilhada em transação e mantém a conta autora na auditoria. A inspeção agregada confirmou uma seleção mais recente de um cliente e outra anterior de três, sem expor nomes, identificadores ou tokens. Não houve mudança de schema, migration ou gravação durante a publicação; as 21 migrations permaneceram em dia. O artefato, a configuração e os logs anteriores foram preservados no backup privado `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\attention-shared-20260929-151613`. Shared, Prisma Client e API foram recompilados; a API atende a porta 3001 como `node --enable-source-maps dist/main.js`, PID **5608**, sem watch, com health local/público `200` e `/maintenance` protegido (`401`) sem sessão. Tipos, arquitetura e 28 cenários integrados passaram, incluindo alteração por uma segunda conta e leitura idêntica em dois espelhos. A revisão de segurança excluiu credenciais, logs, backups e `output/` do commit.

Atualização do espelho em 29/09/2026: o commit `16b1512` corrigiu a paginação responsiva das instalações e viagens, acrescentou seleção local de rotação em 15 s, 30 s ou 1 min e passou a preservar vários links ativos do mesmo proprietário, com seleção de visões sincronizada entre eles. O backup privado `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\panel-multi-links-20260929-121847` foi restaurado integralmente em PostgreSQL isolado, com 63 tabelas, uploads e artefatos anteriores preservados. A única pendência, `20260929120000_panel_multiple_mirrors`, foi revisada e aplicada com `prisma migrate deploy`; as 21 migrations ficaram em dia, o índice único antigo foi removido sem excluir os dois links existentes e o novo índice de consulta foi confirmado. Shared, Prisma Client e API foram recompilados; a API atende a porta 3001 como `node --enable-source-maps dist/main.js`, PID **6768**, sem watch, com health local/público `200` e `/maintenance` protegido (`401`) sem sessão. O deployment Vercel `dpl_3f9cDQ1P7sXHaTxLBdKpFDqAyMKo` ficou `Ready`, foi promovido e seus arquivos públicos confirmaram os controles novos em `skylineti.com`. Tipos, build isolado, arquitetura, 28 cenários integrados, 61 cenários de navegador e a cadeia de migrations passaram. A revisão de segurança excluiu `.env`, logs, dumps, backups e `output/` do commit e do contexto da Vercel.

Atualização da integridade das OS, assinaturas e vídeos em 25/09/2026: o commit `ae2ece8` passou a preservar campos omitidos no salvamento, rejeitar edições concorrentes por `updatedAt`, auditar os nomes dos campos alterados, recolher a captura de assinatura até a ação explícita do usuário e aceitar vídeos de até 80 MB com prévia e reprodução na OS. Não houve mudança de schema nem migration pendente; as 20 migrations permaneceram em dia e nenhum registro de teste foi gravado no banco compartilhado. O artefato anterior, a configuração e os logs foram preservados no backup privado `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\maintenance-save-video-20260925-121153`. Shared, Prisma Client e API foram recompilados; a API atende a porta 3001 como `node --enable-source-maps dist/main.js`, PID **19368**, sem watch, com health local/público `200` e `/maintenance` protegido (`401`) sem sessão. O deployment automático `dpl_EfKQcMNaAiJ7ZLmzPEAxDyEjFbvU` ficou `Ready` e recebeu `skylineti.com` e `www.skylineti.com`. Tipos da API e web, arquitetura, build isolado, validações de assinatura e 14 cenários de navegador passaram.

Atualização integrada da dashboard e do espelho em 23/09/2026: o commit `b28ebef` publicou a separação entre chamados internos e de clientes, Clientes de atenção, Carros e a atualização das visões do link atual sem rotação do token. O backup privado `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\attention-clients-20260923-231320` foi validado por catálogo e restauração completa em PostgreSQL isolado, com 62 tabelas e 19 migrations aplicadas. A única pendência, `20260923120000_panel_attention_clients`, foi revisada e aplicada com `prisma migrate deploy`; as 20 migrations ficaram em dia. A tabela nova foi confirmada vazia, com chave primária composta, duas FKs restritivas e RLS. Antes da consolidação, os artefatos e a configuração da API foram preservados em `client-ticket-mirror-20260923-233912`. Shared, Prisma Client e API foram recompilados, e a API atende a porta 3001 em produção como `node dist/main.js`, PID **6708**, sem watch; health local/público respondeu `200` e a gestão do espelho permaneceu protegida (`401` sem sessão). O link operacional moderno recebeu `atendimentos-clientes` no mesmo endereço, com auditoria, e o link legado permaneceu intacto. O deployment Vercel `dpl_8mfZckWMaF9u5z6rjJsfd5i51buL` ficou `Ready` e recebeu `skylineti.com` e `www.skylineti.com`; seus arquivos públicos confirmaram a tela nova e os controles de atualização. Tipos, build isolado, arquitetura, 28 cenários integrados de API e 61 cenários de navegador passaram. Não houve seed, reset ou criação de registros de teste, e a revisão do commit excluiu segredos, configuração local, logs, backups e artefatos de PDF.

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
2. Ativar a pausa de recuperação automática conforme a seção abaixo e, somente depois, encerrar o processo identificado da API; se houver supervisor watch indevido, encerrar também esse supervisor após identificá-lo.
3. Atualizar código e dependências, compilar shared, gerar Prisma Client com API parada e compilar API.
4. Aplicar apenas o conjunto revisado de migrations pendentes.
5. Iniciar `node dist/main.js` com `NODE_ENV=production` e verificar health local/público antes de promover frontend dependente. Remover a pausa de recuperação somente após concluir a publicação.

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

### Inicialização após entrada no Windows

O atalho de inicialização desta máquina deve executar `powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "<repositorio>\apps\api\scripts\start-production.ps1"`, com a pasta do repositório como diretório de trabalho. O atalho antigo para `iniciar-servidor.bat` foi substituído em 19/10/2026. O script inicia somente `node --enable-source-maps dist/main.js`, com `NODE_ENV=production`; não instala dependências, gera Prisma Client ou compila. Preserva uma API já ativa na 3001, recusa outro processo nessa porta e usa mutex para evitar inicializações simultâneas.

Para iniciar manualmente, na raiz:

```powershell
powershell.exe -NoLogo -NoProfile -File .\apps\api\scripts\start-production.ps1
```

Novas execuções registram stdout/stderr em `%LOCALAPPDATA%\Zyllen\logs\api` e aguardam a confirmação de saúde local. Artefatos ausentes exigem recuperação da última publicação verificada, preservando a configuração, ou nova publicação pelo procedimento acima. Não compilar o dist de produção como parte do boot.

Na recuperação de 19/10/2026, a sintaxe e a execução com a API já ativa foram verificadas, preservando o PID 19036; arquitetura passou e health local/público permaneceu normal. A revisão automática bloqueou a parada/reinicialização proposta para testar uma partida completa (`blocked by policy`), portanto essa verificação não foi executada. Não foi realizado novo reinício do Windows.

### Recuperação automática e pausa para manutenção

Diagnóstico complementar de 20/10/2026: a nova inspeção encontrou a API local/pública e o web com HTTP `200`, ainda no mesmo boot de 05h33 e no mesmo PID **8072**. A tarefa recorrente continuava executando com resultado `0`. O serviço Windows `Cloudflared`, porém, estava em ciclo de falhas (`1067`, evento `7031`, reinício a cada 20 segundos, mais de 490 tentativas desde o boot). Seu `ImagePath` continha somente o executável, sem `tunnel run` nem caminho explícito da configuração, e a conta era `LocalSystem`; os eventos de Application confirmaram a execução sem argumentos. O túnel saudável era outro processo, iniciado por `Startup/run-tunnel.bat` na sessão do usuário, com `/ready` respondendo `200`. Portanto a recuperação atual continua condicionada ao login e o serviço de boot do túnel precisa ser corrigido em uma sessão elevada. Não encerrar o túnel saudável para investigar o serviço defeituoso. A sessão usada no diagnóstico não estava elevada; o serviço e o modo de execução da tarefa não foram alterados, e não foi realizado reboot de teste. Seguir a [configuração oficial de serviço Windows do Cloudflare](https://developers.cloudflare.com/tunnel/features/locally-managed-tunnels/as-a-service/windows/) para conferir os caminhos explícitos e validar uma réplica saudável antes de retirar o atalho. Para a API iniciar antes de login, escolher uma identidade de serviço com acesso mínimo aos artefatos/configuração e validar acesso ao banco/storage; não promover automaticamente o processo da API a `SYSTEM` nem armazenar senhas em scripts.

Registrar ou atualizar a tarefa no usuário que opera a API, na raiz do repositório:

```powershell
powershell.exe -NoLogo -NoProfile -File .\apps\api\scripts\register-production-recovery.ps1
```

A tarefa `Zyllen API Production Recovery` executa o mesmo iniciador na entrada desse usuário e a cada minuto, sem prazo final. Se a API encerrou por uma falha transitória, a próxima execução tenta iniciar os artefatos publicados. A tarefa usa sessão interativa e privilégios limitados: depende de o usuário estar conectado, não substitui um serviço de boot e não diagnostica travamentos de uma API que mantém a porta aberta. Não encerra processos existentes. A política `IgnoreNew`, o mutex do iniciador e a conferência da porta evitam partidas simultâneas. A tarefa não tem limite de duração que possa encerrar o processo filho da API.

Antes de parar a API para publicar, gerar Prisma ou fazer outra manutenção, criar `apps/api/.production-maintenance`. O arquivo é local e ignorado pelo Git. Adquiri-lo sob o mesmo mutex garante que uma partida anterior já terminou; se houver um iniciador ocupado, aguardar e repetir, sem prosseguir com a parada:

```powershell
$maintenanceMutex = New-Object System.Threading.Mutex -ArgumentList $false, 'Local\ZyllenApiProductionStartup'
$ownsMaintenanceMutex = $false
try {
    $ownsMaintenanceMutex = $maintenanceMutex.WaitOne(0)
    if (-not $ownsMaintenanceMutex) { throw 'Iniciador ocupado. Aguardar e repetir antes de parar a API.' }
    New-Item -ItemType File -Path .\apps\api\.production-maintenance -Force | Out-Null
} finally {
    if ($ownsMaintenanceMutex) { $maintenanceMutex.ReleaseMutex() }
    $maintenanceMutex.Dispose()
}
```

A pausa bloqueia o iniciador manual, o atalho de login e a tarefa recorrente; a API já ativa continua rodando. Durante a publicação, iniciar diretamente com `node dist/main.js` conforme o procedimento acima. Depois de confirmar health local/público e concluir as verificações:

```powershell
Remove-Item -LiteralPath .\apps\api\.production-maintenance
```

Se a publicação falhar, manter a pausa enquanto os artefatos estiverem incompletos. Uma pausa esquecida impede a recuperação automática. Para suspender a tarefa por mais tempo sem encerrar a API ativa, usar `Disable-ScheduledTask -TaskName 'Zyllen API Production Recovery'`; para reativar, `Enable-ScheduledTask` com o mesmo nome. Não usar `Stop-ScheduledTask` como pausa, pois pode afetar o processo filho.

Conferir a tarefa e reproduzir as regressões sem banco nem processos reais:

```powershell
Get-ScheduledTask -TaskName 'Zyllen API Production Recovery'
Get-ScheduledTaskInfo -TaskName 'Zyllen API Production Recovery'
powershell.exe -NoLogo -NoProfile -File .\scripts\quality\test-production-startup.ps1
```

## Solução de problemas

| Sintoma | Verificação / ação |
|---|---|
| `EPERM` no Prisma engine | Confirmar API parada antes de `prisma generate`; gerar client antes do build que exige tipos novos. |
| `EADDRINUSE` em 3001 | Identificar PID/comando e eventual `nest --watch`; nesta máquina usar apenas a API de produção. |
| Fix não aparece na API | Confirmar build explícito e artefato publicado; watch pode não reemitir o dist esperado. |
| Login falha/API indisponível | Verificar listener, health local, log de startup, configuração e túnel. Não abrir segunda API se a porta já estiver ocupada. |
| API não recupera após falha de partida | Verificar sessão do usuário, estado/último resultado da tarefa de recuperação e existência de `apps/api/.production-maintenance`. Remover a pausa somente quando os artefatos estiverem prontos. |
| Startup rejeita JWT/storage | Revisar requisitos do [ambiente](variaveis-de-ambiente.md); não restaurar default público ou bucket público para subir. |
| Build web/Vercel falha | Rodar tsc e build local/isolado; confirmar shared e Root Directory do projeto `web`. |
| Falha no projeto Vercel legado de API | A API roda no Windows; conferir o projeto web correto. O registro antigo identifica projetos `zyllen-gest-o-api-*` indevidos. |

Para acompanhar o log da inicialização do exemplo:

```powershell
# Na pasta apps/api
Get-Content api-run.log -Wait
```

Não usar `iniciar-servidor.bat` nem `pnpm dev` nesta máquina de produção. Não usar reset/seed como reparo automático. Retorno de versão precisa preservar dados aditivos, sequências e proteção de anexos; revisar qualquer reintrodução de comportamento vulnerável.
