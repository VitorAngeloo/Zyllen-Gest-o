# Registro de publicação de segurança — 15/09/2026

> Registro datado, consolidado de `publicacao.md` e da seção de validação/publicação de `confirmacao-cadastro.md`. PIDs, versões e resultados descrevem aquele deploy; não comprovam o estado atual. Para uma nova atualização, consultar o [guia de implantação](implantacao.md).

## Publicação concluída às 16h53 (America/Sao_Paulo)

**API e frontend atualizados em produção.** Após nova autorização do operador, o comando documentado de inicialização foi aceito. API em `node dist/main.js`, PID 6336, porta 3001, sem watch, com `NODE_ENV=production`. O frontend preparado foi promovido para `skylineti.com` e a resolução do domínio foi confirmada pelo Vercel.

Houve interrupção da API entre aproximadamente 16h33 e 16h51: a primeira tentativa de inicialização foi recusada pela ferramenta. O serviço foi retomado após a nova autorização; nenhum mecanismo alternativo contornou a recusa anterior.

- Código funcional publicado: commit `5986f7f`; documentação e scripts de publicação em commits posteriores. Branch de trabalho `fix/security-audit`, com sincronização final por fast-forward para `master`.
- Vercel: autenticação renovada. Projeto `web` (`prj_MfreVTDTAChW7umk24noFBRSpmek`) corrigido para Root Directory `apps/web`, mantendo arquivos fora da raiz habilitados. Build remoto e TypeScript passaram.
- Frontend publicado: `https://web-28fz4sllw-skysuportevitor-7785s-projects.vercel.app`, deployment `dpl_4p1wnjWcV47o2x9gzurgib8qYozZ`. Preparado com `--prod --skip-domain` e **promovido para skylineti.com** após validar a API.
- Banco: pré-checagem somente leitura confirmou schema sem drift, checksums das migrations aplicadas intactos, apenas a migration desta versão pendente e nenhuma migration falha. A senha histórica do seed não correspondia à senha de nenhum administrador ativo. Essa verificação não incluiu PIN histórico.
- Backup: schema `public` da aplicação exportado com `pg_dump`; restauração completa de **45 tabelas** verificada em PostgreSQL isolado, protegido por senha e restrito a loopback. Servidor de restauração encerrado. Também copiados uploads locais, configuração anterior, artefatos da API/shared e bundle Git. Não é backup de todos os serviços gerenciados do Supabase.
- Backup protegido por ACL, fora do repositório: `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\security-20260915-1627`. Contém dados pessoais e segredos; não enviar ao GitHub/Vercel.
- API: supervisor `nest --watch` PID 13344 e processo da API PID 9228 encerrados. Dependências instaladas com lockfile congelado; shared compilado, Prisma Client gerado e API compilada sem erros.
- JWT: substituído por 64 bytes aleatórios (512 bits); chave de CPF e demais configurações preservadas. Validação de startup passou. Sessões antigas precisarão de novo login.
- Migration `20260915180000_security_client_approval_media_shares`: **aplicada com sucesso**. Apenas duas tabelas novas e índices, com RLS. Nenhum reset, seed ou remoção de dados.

## Verificações finais

- `verify-production.cjs`: **17 verificações passaram**, cobrindo migration/RLS das duas novas tabelas, health local e público, CORS com credenciais, negação de aprovação/anexos sem autenticação e desativação de rotas públicas antigas. Evidência: `production-verification.json`.
- `verify-web-production.cjs`: **6 verificações passaram** no Chrome contra o domínio público: login renderizado, API acessível pelo navegador com credenciais, ausência de overflow horizontal no celular, cadastro renderizado, aprovação sem login redirecionada e ausência de exceções JavaScript. Evidência: `web-production-verification.json`.
- Capturas da tela pública de login em `tmp/security-tests/production-qa/`; a versão mobile foi inspecionada visualmente. Não contêm dados de clientes.
- A suíte anterior de **33 cenários** e builds isolados continuam sendo as evidências de regressão dos fluxos autenticados. Os smoke tests de produção são somente leitura, sem enviar cadastro, criar usuários/OS/links ou usar sessões de clientes reais; não equivalem a homologação operacional completa.

## Orientação à equipe

Entrar novamente após a troca JWT e recarregar as páginas abertas. Novos clientes dependem de aprovação por Administrador/Gestor; compartilhamento externo requer novo link explícito de 24 horas. Conferir no uso real os dispositivos/Safari, mídia em PDFs, vídeo/range e impressão física Zebra. PIN histórico e legitimidade dos cadastros antigos não foram revalidados nesta publicação.

Não reaplicar seed/reset. `migrate deploy` já terminou; não tentar reverter removendo as tabelas novas. Não restaurar a chave fraca nem as rotas públicas como retorno automático.

## Ferramentas de apoio

`deploy-preflight.cjs` faz as verificações prévias somente leitura. `backup-deployment.cjs` gera o backup e testa a restauração local; requer diretório previamente protegido por ACL e os binários portáteis em `tools/pgsql`. `rotate-jwt-deployment.cjs` exige API parada e backup verificado antes de substituir exclusivamente a chave JWT.

Os binários portáteis vieram da [distribuição EDB indicada pelo PostgreSQL](https://www.postgresql.org/download/windows/), sem instalação global. O ajuste do Vercel segue sua [configuração de monorepos](https://vercel.com/docs/monorepos/monorepo-faq). Logs atuais da API: `apps/api/api-security-out.log` e `apps/api/api-security-err.log`, não versionados.


## Melhoria posterior — confirmação do cadastro

O fluxo final está em [cadastro e aprovação de clientes](cadastro-clientes.md). A mudança foi motivada por envio de cadastro com uma sessão de administrador aberta.

## Verificação

Compilação isolada da API/shared, `tsc --noEmit` do web e Next/Turbopack passaram. Suíte expandida de 33 para **37 cenários**, todos aprovados em banco descartável, incluindo envios reais à API de teste com/sem sessão de admin, empresas existente/nova, recarga, login de cliente pendente negado e cadastro/login de parceiro. O cenário de erro da interface simula uma resposta 409; os demais cenários novos usam a API real de teste.

Evidências: [build-results.json](../security-audit/build-results.json), [regression-results.json](../security-audit/regression-results.json), [test-security-browser.cjs](../security-audit/test-security-browser.cjs). Capturas locais em `tmp/security-tests/browser-qa/solicitacao-*.png`; layout mobile inspecionado.

## Publicação

Alteração somente de frontend. Não requer migration, troca de chaves, novo login ou reinício da API. O registro previa entrega pelo push do `master` para o projeto Vercel `web`; confirmar a rota `/cadastro/solicitacao-enviada` e a saúde da API após o deploy, sem enviar cadastros fictícios ao banco real.

Esta seção registra a validação e a previsão de entrega, não uma verificação nova da publicação dessa melhoria. Os resultados da rodada principal de 33 cenários e da posterior de 37 têm escopos distintos.
