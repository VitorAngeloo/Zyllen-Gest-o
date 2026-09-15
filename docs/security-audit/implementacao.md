# Correções de segurança — implementação e homologação

Data: 15/09/2026. Branch: `fix/security-audit`. Base auditada: `f3b2727190adbf96c9d35dc57b927e79f5c85275`.

Status da implementação: código e testes concluídos. A publicação foi autorizada posteriormente; consulte [o registro de publicação](publicacao.md) para o estado atual de Git, backup, migração, chave JWT e serviços. O restante deste documento descreve a entrega e o checklist preparados antes do deploy.

## Decisões aplicadas

- Somente Administrador e Gestor aprovam/rejeitam solicitações e criam diretamente contas de clientes. O servidor verifica o papel; não depende do botão.
- Cadastro público não cria usuário nem empresa e não vincula OS por nome. O administrador/gestor confirma a empresa/projeto na aprovação, em transação e com auditoria.
- Compartilhar anexo sem login é uma ação explícita desses dois papéis. Cada link expira em 24 horas e pode ser revogado. O banco guarda apenas o hash do token aleatório.
- Não há retificação de assinatura. Formulário com assinatura do responsável e blocos confirmados não podem ser alterados/apagados pelos caminhos protegidos, nem por administrador. Há serialização das mutações por OS no PostgreSQL.

## O que muda para quem usa

| Fluxo | Impacto |
|---|---|
| Contas de clientes atuais | Permanecem cadastradas; não houve desativação nem mudança em seus vínculos. Isso não certifica a legitimidade dos cadastros antigos. |
| Novos clientes | Após enviar o cadastro, aguardam Administrador/Gestor em **Aprovar clientes**. Confirmação de identidade/vínculo é uma tarefa humana. Não há e-mail automático de aprovação nesta entrega. |
| OS antigas sem vínculo | Não serão vinculadas por coincidência de nome. Revisão e vinculação histórica precisam de procedimento explícito autorizado; não foi feito backfill. |
| Fotos/vídeos dentro do sistema | Continuam sendo exibidos com sessão de mídia httpOnly, restrita a `/media`, sem JWT na URL. A API revalida usuário ativo e acesso ao objeto em cada leitura. |
| Links antigos `/uploads` ou `.../attachments/.../file` | Deixam de abrir. Para destinatário sem login, criar novo link em **Compartilhar**. Recarregar as páginas abertas após a atualização. |
| Compartilhar | Um arquivo, 24 horas, com revogação. O destinatário pode salvar/reenviar o arquivo. Revogar impede novas requisições, não apaga downloads nem interrompe bytes já entregues. |
| Chamados internos de TI | O solicitante mantém acesso aos próprios anexos mesmo sem `tickets.view`. Não ganha acesso aos chamados de outra pessoa. |
| Assinaturas | Confirmadas não podem ser substituídas/removidas; formulário assinado não pode ser editado. Acompanhamentos posteriores continuam separados. |
| Imutabilidade do documento | **Limite importante:** bloqueio aplicativo de campos/blocos não equivale a assinatura digital certificada, hash/snapshot permanente do PDF ou congelamento de toda mídia/metadado da OS. O upload em duas etapas foi preservado. Não se deve prometer imutabilidade criptográfica do PDF. |
| Transferência de chamado | “Assumir” só funciona sem responsável atual. Transferência segue a ação autorizada para Admin/Gestor, com PIN. |
| Encerrar OS | Exige também `maintenance.close`. Não foram concedidas permissões novas em lote; `Internos` continua sem manutenção. |
| Upload | Valida cabeçalho binário e deriva extensão/MIME do conteúdo. PDF continua aceito no acompanhamento; PDFs e arquivos legados não reconhecidos são baixados como anexo, não HTML executável. Isso não é antivírus nem validação semântica completa de cada arquivo. |
| Etiquetas | Dimensões precisam ser números válidos. Templates inválidos/legados sem elementos não são carregados como layout novo; revisar pelo editor. Zebra/ZPL e comunicação com Browser Print não foram reescritos. Impressão física ainda requer conferência operacional. |
| Sessões no deploy | A chave JWT local tem menos de 64 caracteres. Será necessário substituí-la para subir a versão e os usuários precisarão entrar novamente. A chave de CPF **não deve ser trocada** nesse procedimento. |

## Cobertura das correções

| Achados | Implementação | Evidência principal |
|---|---|---|
| A01/A02 | Solicitação pendente, confirmação de empresa/projeto, aprovação exclusiva e remoção de vínculos automáticos | `registration.service.ts`, `registration.controller.ts`, `manager.guard.ts`, tela `aprovacao-clientes` |
| A03 | Retiradas 7 leituras públicas e ServeStatic `/uploads`; entrega central autenticada por dono/empresa/permissão; compartilhamento explícito | módulo `media`, interceptor de resposta, consumidores dos três portais |
| A04 | Terceirizado não pode informar `assetId` para mudar patrimônio arbitrário | `maintenance.service.ts`, teste HTTP sem efeitos colaterais |
| A05 | Atribuição inicial atômica; rota legada também não substitui responsável | `tickets.service.ts`, teste de disputa |
| A06 | Bloqueio de formulário assinado e mutações de bloco confirmado sob trava da OS | `maintenance.service.ts`, três portais |
| A07 | Encerramento exige `maintenance.close` no servidor | `maintenance.controller.ts`, papel de teste com execute sem close |
| A08 | Seed não contém senha/PIN padrão, não imprime credenciais e preserva administrador existente | `prisma/seed.ts`; credenciais históricas em produção **ainda não verificadas** |
| A09 | Startup rejeita JWT ausente/default/curto; Compose exige variáveis sem fallback público | `security-config.ts`, `docker-compose.yml`; configuração real ainda precisa ajuste |
| A10 | Storage Multer comum com classificação por bytes; nomes UUID/extensão segura; resposta nosniff/sandbox/download | `media-storage.ts`, `media.service.ts`, testes de HTML forjado e PDF |
| A11 | Schema Zod de layout compartilhado; validação na API/parse frontend; impressão por DOM sem document.write | `packages/shared/src/zod/label-layout.ts`, `label-template.ts`, `etiquetas/page.tsx` |
| A12 | Lista de clientes usa seleção explícita sem hash de senha nem CPF | `clients.service.ts` |

## Migração

`apps/api/prisma/migrations/20260915180000_security_client_approval_media_shares/migration.sql` cria apenas `ClientRegistrationRequest`, `MediaShareLink` e seus índices. Ativa RLS nessas **duas tabelas novas**, sem políticas para consumidores Supabase anon/authenticated; acesso previsto pelo usuário servidor/owner do Prisma. Não altera nem remove tabelas existentes.

SQL gerado por comparação offline entre schema auditado e schema novo, sem shadow database nem conexão ao banco compartilhado. A migração foi aplicada no PostgreSQL em memória com registro pré-existente e verificação de preservação/RLS. Antes da produção, conferir drift e lista de migrations pendentes; não aplicar outras migrations inadvertidamente.

## Testes e reprodução

Resultados atualizados em `regression-results.json` e compilação em `build-results.json`. A rodada completa passou nos 33 cenários, incluindo o parser/impressor real de etiquetas no navegador com payload XSS rejeitado. Testes usam API NestJS real, Prisma 6, PostgreSQL PGlite em memória e Chrome headless; nenhum dado real. PGlite serializa conexões: **não equivale a teste de carga/concorrência multiprocesso no Supabase**.

Na raiz, com dependências do workspace já instaladas:

```powershell
New-Item -ItemType Directory -Force tmp/security-test-deps
Copy-Item docs/security-audit/test-dependencies.json tmp/security-test-deps/package.json
npm install --prefix tmp/security-test-deps --ignore-scripts --no-audit --no-fund
node docs/security-audit/prepare-security-tests.cjs
node docs/security-audit/generate-security-migration.cjs
node docs/security-audit/build-security.cjs
node docs/security-audit/test-security.cjs --browser
node docs/security-audit/preflight-security.cjs
```

`prepare` gera o Prisma Client em `tmp/security-tests/client` sem tocar no engine travado pela API em produção. `build` compila API, pacote compartilhado e Next/Turbopack em diretórios isolados, com `tsc --noEmit` do web; não substitui `apps/api/dist`. Tailwind recebe fonte explícita apenas na cópia temporária, pois ignora diretórios gitignored por padrão. A configuração Vercel foi atualizada para compilar `@zyllen/shared` antes do web.

O teste de navegador usa Playwright já disponível no runtime local, localizável por `AUDIT_RUNTIME_ROOT`, e Chrome em `AUDIT_CHROME_PATH` (opcional). Sobe apenas portas de teste 3998/3999 em loopback e encerra seus próprios processos. Não usa 3001, não inicia watch, não consulta impressora real. Capturas ficam em `tmp/security-tests/browser-qa/`; não contêm clientes reais. A sessão do teste só permite rede para loopback.

## Pendências antes da publicação

1. Confirmar troca da chave JWT e janela/aviso de novo login. A pré-checagem local foi somente leitura e não mostrou valores: `preflight-results.json`.
2. Confirmar backup restaurável e versão anterior dos artefatos. Não realizar reset, seed, migrate dev ou db push com perda de dados.
3. Conferir migrations pendentes/drift e permissões do usuário servidor. Se Storage Supabase for habilitado, verificar bucket realmente privado e políticas; startup falha se não conseguir confirmar bucket privado. O `.env` local inspecionado não habilita esse storage; não foram consultadas políticas remotas.
4. Verificar privadamente se o administrador histórico usa credenciais conhecidas do seed e tratar se necessário. Remover defaults do código não troca senhas existentes nem remove o histórico Git. Não houve reescrita do histórico.
5. Publicação coordenada API + Vercel conforme `docs/DEPLOY.md`, com o pacote compartilhado e Prisma Client atualizados **antes** de compilar a API. Não liberar front novo isoladamente contra backend antigo.
6. Homologação operacional: Safari/dispositivos usados, PDF com mídias, vídeo/range, Zebra física e fluxos específicos do negócio. Cookies de mídia `SameSite=Lax` dependem de frontend/API no mesmo site (`skylineti.com` / `api.skylineti.com`; local ambos `127.0.0.1`). Preview Vercel em outro domínio precisa ambiente same-site ou estratégia própria — não liberar anexos anonimamente para contornar cookies.
7. Retorno seguro: preservar as tabelas aditivas. Não restaurar rotas públicas/defaults fracos como rollback automático. Se necessário, pausar uma função e corrigir; não remover dados em lote.

As evidências/PDF da auditoria original foram preservadas. Estes arquivos registram a remediação e seus limites, não uma alegação de ausência de qualquer outra falha no sistema.
