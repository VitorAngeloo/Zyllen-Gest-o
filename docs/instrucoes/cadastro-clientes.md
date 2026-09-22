# Cadastro e aprovação de clientes

## Solicitação pública

`POST /register/client` cria uma solicitação pendente, sem criar usuário/empresa nem conceder acesso à empresa informada. Nome da empresa, projeto e demais dados do formulário representam uma intenção; não são autorização de vínculo. O cadastro não apropria OS por correspondência de nome.

Após sucesso, o frontend usa `router.replace('/cadastro/solicitacao-enviada')` e apresenta **Solicitação enviada / Aguardando aprovação**. A confirmação explica a aprovação por Administrador/Gestor e orienta contato com a equipe; não promete e-mail automático.

## Sessão e navegação

- Sessão existente é preservada. Usuário conectado vê aviso e **Voltar para minha conta**; visitante vê **Ir para o login**. Navegação depende de clique.
- **Enviar outra solicitação** abre formulário vazio. Recarregar a confirmação não repete o POST.
- Erros de envio permanecem no formulário, sem exibir confirmação de sucesso.
- Não há senha, email, CPF ou identificador na URL da confirmação, nem novo armazenamento de dados pessoais.
- A página é informativa: não é comprovante autenticado nem consulta ao estado atualizado da solicitação.

## Aprovação interna

Na aba **Empresas** de **Clientes**, o campo de busca consulta a API privada por razão social ou CNPJ e pagina os resultados em lotes de 50. A busca por CNPJ ignora pontuação, inclusive quando o cadastro antigo guarda o número formatado. O total exibido corresponde aos resultados da consulta; a lista não fica limitada às primeiras 500 empresas do carregamento legado. A navegação oferece Anterior, Próxima e entrada numérica para ir diretamente a uma página válida; uma busca nova retorna à primeira página. `GET /clients/companies?q=...&page=...` exige `settings.view` e responde com `data`, `total`, `page` e `pageSize`. A chamada sem parâmetros preserva o contrato anterior para os demais consumidores.

Somente Administrador/Gestor aprovam/rejeitam solicitações ou criam diretamente contas de clientes. O servidor verifica o papel, confirma empresa/projeto, valida a relação em transação e grava auditoria. A tela **Aprovar clientes** não substitui a checagem da API.

Ao cadastrar uma empresa diretamente, a mesma transação cria um estoque geral vazio `CLIENT`, vinculado à empresa e sem projeto presumido. Quando uma aprovação cria uma empresa nova, o estoque é criado durante a aprovação; aprovar acesso para uma empresa existente não duplica seus locais. Falha na criação do estoque desfaz também a nova empresa. O estoque automático recebe auditoria com o administrador ou gestor responsável.

Clientes existentes mantêm seus vínculos. A correção não certifica a legitimidade dos cadastros antigos; revisão/vinculação histórica precisa de procedimento explícito, com prévia e auditoria. Não executar saneamento ou backfill automaticamente.

Solicitação pendente não é conta desativada. Não conceder login de cliente antes da aprovação nem vincular OS por similaridade de nome.

## Parceiros e terceirizados

O cadastro de parceiro/terceirizado tem fluxo distinto: conta ativa após suas validações e retorno ao login, sem a aprovação obrigatória de cliente introduzida nesta entrega. Não aplicar automaticamente a regra de cliente aos parceiros.

## Arquivos e validação

Frontend: `apps/web/src/features/registration/screens/registration-screen.tsx`, `cadastro/solicitacao-enviada/page.tsx` e `dashboard/aprovacao-clientes/page.tsx`. API: módulos `registration`, `clients` e `auth/manager.guard.ts`.

Os cenários registrados incluem envio com/sem sessão de administrador, empresa existente/nova, recarga, cliente pendente sem login e parceiro com cadastro/login. Resultados e escopo histórico estão no [registro de publicação](historico-publicacao-seguranca.md); reprodução está na [remediação](seguranca.md). Testar com base descartável, sem enviar solicitações fictícias ao Supabase real.
