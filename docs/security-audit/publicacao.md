# Publicação da correção de segurança — 15/09/2026

## Estado às 16h35 (America/Sao_Paulo)

**Publicação incompleta: API parada, aguardando inicialização manual.** O mecanismo de execução recusou por política o comando `Start-Process` para iniciar o processo em segundo plano. Nenhum mecanismo alternativo foi usado para contornar a recusa. Foi solicitado ao operador que inicie a versão compilada.

- Código: commit `5986f7f`, branch `fix/security-audit`, enviado ao GitHub. `master` ainda não foi atualizado.
- Vercel: autenticação renovada. Projeto `web` (`prj_MfreVTDTAChW7umk24noFBRSpmek`) corrigido para Root Directory `apps/web`, mantendo arquivos fora da raiz habilitados. Build remoto e TypeScript passaram.
- Candidato pronto: `https://web-28fz4sllw-skysuportevitor-7785s-projects.vercel.app`, deployment `dpl_4p1wnjWcV47o2x9gzurgib8qYozZ`. Preparado com `--prod --skip-domain`; **não promovido para skylineti.com**.
- Banco: pré-checagem somente leitura confirmou schema sem drift, checksums das migrations aplicadas intactos, apenas a migration desta versão pendente e nenhuma migration falha. A senha histórica do seed não correspondia à senha de nenhum administrador ativo. Essa verificação não incluiu PIN histórico.
- Backup: schema `public` da aplicação exportado com `pg_dump`; restauração completa de **45 tabelas** verificada em PostgreSQL isolado, protegido por senha e restrito a loopback. Servidor de restauração encerrado. Também copiados uploads locais, configuração anterior, artefatos da API/shared e bundle Git. Não é backup de todos os serviços gerenciados do Supabase.
- Backup protegido por ACL, fora do repositório: `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\security-20260915-1627`. Contém dados pessoais e segredos; não enviar ao GitHub/Vercel.
- API: supervisor `nest --watch` PID 13344 e processo da API PID 9228 encerrados. Dependências instaladas com lockfile congelado; shared compilado, Prisma Client gerado e API compilada sem erros.
- JWT: substituído por 64 bytes aleatórios (512 bits); chave de CPF e demais configurações preservadas. Validação de startup passou. Sessões antigas precisarão de novo login.
- Migration `20260915180000_security_client_approval_media_shares`: **aplicada com sucesso**. Apenas duas tabelas novas e índices, com RLS. Nenhum reset, seed ou remoção de dados.

## Continuação

1. Iniciar a API conforme `docs/DEPLOY.md`, usando `NODE_ENV=production` e `node dist/main.js`, sem watch.
2. Executar `node docs/security-audit/verify-production.cjs` e confirmar porta 3001, health local/público, CORS e negação das leituras anônimas protegidas. O script não faz login nem grava dados de negócio.
3. Com a API validada: `vercel promote web-28fz4sllw-skysuportevitor-7785s-projects.vercel.app --yes`.
4. Conferir domínio público, tela de login e fluxos autenticados usados pela equipe. Registrar resultados e sincronizar `master` sem sobrescrever mudanças de terceiros.

Não reaplicar seed/reset. `migrate deploy` já terminou; não tentar reverter removendo as tabelas novas. Não restaurar a chave fraca nem as rotas públicas como retorno automático.

## Ferramentas de apoio

`deploy-preflight.cjs` faz as verificações prévias somente leitura. `backup-deployment.cjs` gera o backup e testa a restauração local; requer diretório previamente protegido por ACL e os binários portáteis em `tools/pgsql`. `rotate-jwt-deployment.cjs` exige API parada e backup verificado antes de substituir exclusivamente a chave JWT.

Os binários portáteis vieram da [distribuição EDB indicada pelo PostgreSQL](https://www.postgresql.org/download/windows/), sem instalação global. O ajuste do Vercel segue sua [configuração de monorepos](https://vercel.com/docs/monorepos/monorepo-faq).
