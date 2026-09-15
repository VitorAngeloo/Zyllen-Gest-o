# Confirmação do cadastro de cliente — 15/09/2026

Melhoria posterior à publicação de segurança, motivada pelo teste de cadastro enquanto uma sessão de administrador estava aberta.

## Comportamento

- Após sucesso de `POST /register/client`, o frontend usa `router.replace('/cadastro/solicitacao-enviada')`. Não retorna à página de login, que redirecionaria a sessão existente ao seu painel.
- A tela apresenta **Solicitação enviada / Aguardando aprovação**, explica a aprovação por Administrador/Gestor e orienta contato com a equipe. Não promete e-mail automático de aprovação.
- Sessões existentes são preservadas. Para quem está conectado, há aviso explícito e botão **Voltar para minha conta**; para visitantes, **Ir para o login**. A navegação depende de clique.
- **Enviar outra solicitação** abre um formulário vazio. Recarregar a confirmação não repete o POST.
- Não há senha, email, CPF ou identificador do solicitante na URL nem armazenamento novo de dados pessoais. A página é informativa, não um comprovante autenticado nem uma consulta ao status atualizado da solicitação.
- Erros no envio permanecem no formulário, sem exibir confirmação.
- Cadastro de parceiros/terceirizados não foi alterado: conta ativa após validações e retorno ao login, sem nova aprovação obrigatória.

## Verificação

Compilação isolada da API/shared, `tsc --noEmit` do web e Next/Turbopack passaram. Suíte expandida de 33 para **37 cenários**, todos aprovados em banco descartável, incluindo envios reais à API de teste com/sem sessão de admin, empresas existente/nova, recarga, login de cliente pendente negado e cadastro/login de parceiro. O cenário de erro da interface simula uma resposta 409; os demais cenários novos usam a API real de teste.

Evidências: `build-results.json`, `regression-results.json`, `test-security-browser.cjs`. Capturas locais em `tmp/security-tests/browser-qa/solicitacao-*.png`; layout mobile inspecionado.

## Publicação

Alteração somente de frontend. Não requer migration, troca de chaves, novo login ou reinício da API. A entrega segue o push do `master` para o projeto Vercel `web`; confirmar a rota `/cadastro/solicitacao-enviada` e a saúde da API após o deploy, sem enviar cadastros fictícios ao banco real.
