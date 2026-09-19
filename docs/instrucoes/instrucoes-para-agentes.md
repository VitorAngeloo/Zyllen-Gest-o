# Instruções para agentes — Zyllen Gestão

Estas regras se aplicam a todo o repositório. Usar o [índice da documentação](README.md) para localizar a referência principal de cada assunto. Em divergência entre documento e implementação, o código prevalece; não promover instruções históricas a regras atuais.

## Banco de dados: ler antes de operar

O banco é **um único Supabase PostgreSQL compartilhado entre dev e produção**, com dados reais. Nunca executar:

- `prisma migrate reset`.
- `prisma db push --accept-data-loss`.
- `prisma migrate dev`, inclusive aliases `pnpm db:migrate`/`prisma:migrate` que ainda o chamam.
- `DROP COLUMN`/`DROP TABLE` com dados sem plano manual prévio de preservação/migração.

Preferir mudanças aditivas. Gerar SQL com `migrate diff`, revisar tudo e aplicar com `migrate deploy` apenas depois de conferir todas as pendências. Não executar seed, testes de escrita ou saneamento na base real como parte automática de setup/refatoração. Procedimento: [banco de dados](banco-de-dados.md).

## Produção nesta máquina

- API usa `node dist/main.js` em `apps/api`, porta 3001, `NODE_ENV=production`.
- Não iniciar `nest --watch`, `pnpm dev` ou `iniciar-servidor.bat` nesta máquina de produção.
- Antes de editar fontes da API, verificar se já existe `nest --watch` ativo: ele pode compilar e reiniciar o servidor automaticamente. Encerrar somente o observador identificado, preservando o processo que atende a API, e validar builds em diretório isolado.
- Prisma Client deve ser gerado com API parada no Windows e antes do build que depende dos tipos novos.
- Identificar e encerrar somente os processos da API envolvidos na publicação. Não encerrar todos os processos Node.
- Frontend roda no Vercel; push em `master` pode publicá-lo. Coordenar API/web quando houver dependência.
- Preservar chave de CPF, dados e migrations aditivas; não restaurar rotas públicas/defaults fracos como rollback automático.

Ordem e verificação: [implantação](implantacao.md). Configuração: [variáveis de ambiente](variaveis-de-ambiente.md).

## Regra obrigatória de organização da arquitetura

Antes de criar, alterar ou mover código ou documentação, ler integralmente e seguir a [regra de organização da arquitetura](organizacao-da-arquitetura.md). Ela define o destino dos arquivos, a separação de responsabilidades, os limites dos imports e a atualização dos guias. Alterações de código exigem `pnpm check:architecture` sem violações antes de serem consideradas concluídas.

## Regras de negócio que não devem regredir

- Ao alterar OS, verificar controllers e consumidores dos três portais. Preservar criação em duas etapas: falha de anexação após criação não pode induzir duplicação da OS; falha da criação deve preservar arquivos locais no wizard.
- Assinatura/bloco confirmado é imutável, inclusive para administrador; não há retificação. Não prometer assinatura digital certificada ou congelamento criptográfico do PDF.
- `Internos` intencionalmente não tem manutenção. Encerramento interno exige `maintenance.close`; não conceder permissões em massa para contornar erros.
- Somente Administrador/Gestor aprovam clientes e criam contas diretamente. Cadastro público gera solicitação pendente, sem conta ou vínculo automático de OS por nome.
- Anexos são privados e autorizados por objeto. Não publicar `/uploads` nem JWT na URL. Compartilhamento externo é explícito para Administrador/Gestor, um arquivo, 24 horas e revogação.
- CPF: persistir com `encryptCPF()` e ler com `decryptCPFSafe()`. Não armazenar em texto puro nem alterar a chave para corrigir JWT.
- Preservar ledger/auditoria e sequência de patrimônio; não reutilizar códigos nem decrementar sequência. Flags históricas de ledger não são consumidas pelo código atual.
- Não commitar valores de ambiente, senhas, PINs, logs, backups ou dados pessoais.

## Implementação e verificação

- Seguir padrões dos módulos vizinhos, contratos de `@zyllen/shared` e [convenções](desenvolvimento.md).
- Antes de commit/push de frontend, executar `pnpm --filter @zyllen/web exec tsc --noEmit` **e** build do web, com shared atualizado. Next/Turbopack não substitui tsc.
- Usar `prisma.retry`/`withRetry` em queries críticas, especialmente autenticação.
- Declarar rotas estáticas antes de `:id` no NestJS. Verificar shape real das respostas antes de criar consumidor.
- Adicionar auditoria para operações sensíveis. Usar tokens e textos comuns da marca. Novo host externo precisa entrar no `connect-src` da CSP.
- Validar sem escrever na base compartilhada; suíte e builds isolados estão na [remediação](seguranca.md).

## Referências por tarefa

| Assunto | Documento |
|---|---|
| Estrutura, bootstrap, HTTP e portais | [Arquitetura](arquitetura.md) |
| JWT, refresh, RBAC e PIN | [Autenticação](autenticacao-e-permissoes.md) |
| OS, formulários, assinatura e anexos | [Manutenção](ordens-de-servico.md) |
| Saldo, backfill, reconciliação e patrimônio | [Estoque](estoque-e-patrimonio.md) |
| ZPL, Browser Print, preview e templates | [Etiquetas](etiquetas-e-impressao.md) |
| Solicitação e aprovação | [Cadastro de clientes](cadastro-clientes.md) |
| Relatório, testes e publicação de segurança | [Auditoria](auditoria-de-seguranca.md) |

Arquivos `plano-*.md` e `historico-*.md` nesta pasta são datados e exigem revalidação. Manter instruções técnicas na referência principal em `docs/instrucoes/`; nos outros arquivos, usar links. Manter `AGENTS.md` e `CLAUDE.md` na raiz como entradas curtas para esta referência, para descoberta pelos agentes.
