# Instruções do Zyllen Gestão

Esta pasta reúne os guias para entender, desenvolver e operar o projeto. Os arquivos ficam diretamente aqui, com uma referência principal para cada assunto. Registros históricos têm data e escopo explícitos. Em divergências, o código prevalece; confirmar também a configuração efetiva do ambiente antes de uma operação.

## Regra obrigatória

Toda alteração de código ou documentação deve seguir a [regra de organização da arquitetura](organizacao-da-arquitetura.md). Ler antes de começar e conferir seus critérios antes de concluir a tarefa.

## Por onde começar

1. Ler a [visão geral](visao-geral.md) para conhecer o sistema e as aplicações.
2. Consultar a [arquitetura](arquitetura.md) e a [autenticação](autenticacao-e-permissoes.md) para entender a organização e os três portais.
3. Antes de executar ou alterar o projeto, ler [desenvolvimento](desenvolvimento.md), [ambiente](variaveis-de-ambiente.md) e [banco de dados](banco-de-dados.md).
4. Para publicar mudanças, seguir [implantação](implantacao.md). Agentes devem ler integralmente as [instruções para agentes](instrucoes-para-agentes.md) antes de qualquer tarefa.

## Guias por assunto

| Preciso de… | Documento de referência |
|---|---|
| Conhecer a finalidade e as aplicações do sistema | [Visão geral](visao-geral.md) |
| Entender o sistema e encontrar o código | [Arquitetura](arquitetura.md) |
| Manter pastas, responsabilidades e documentação organizadas | [Regra obrigatória de organização](organizacao-da-arquitetura.md) |
| Encontrar as referências específicas do web | [Frontend](frontend.md) |
| Planejar e avaliar a experiência de uso com uma base comum | [UX design](ux-design.md) |
| Instalar, desenvolver, verificar e seguir convenções | [Desenvolvimento](desenvolvimento.md) |
| Configurar o ambiente sem expor valores | [Variáveis de ambiente](variaveis-de-ambiente.md) |
| Alterar schema ou entender retries do Prisma | [Banco de dados](banco-de-dados.md) |
| Atualizar Vercel ou API Windows | [Implantação](implantacao.md) |
| Entender login, sessão, RBAC e PIN | [Autenticação e autorização](autenticacao-e-permissoes.md) |
| Trabalhar com OS, assinatura e anexos | [Ordens de serviço](ordens-de-servico.md) |
| Gerenciar projetos com um serviço, agenda e equipe na área unificada | [Projetos e agenda](projetos-e-agenda.md) |
| Cadastrar viagens e entender os indicadores de instalações/desinstalações/viagens | [Viagens e operações](viagens-e-operacoes.md) |
| Cadastrar carros e organizar sua agenda independente de reservas | [Carros e reservas](carros-e-reservas.md) |
| Identificar salas/totens e consultar seus ciclos de instalação/desinstalação | [Estruturas e ciclos](estruturas-e-ciclos.md) |
| Trabalhar com saldo, ledger, custódia por cliente, envios e devoluções | [Estoque e patrimônio](estoque-e-patrimonio.md) |
| Indicadores da dashboard e espelho de leitura sem login | [Painel de acompanhamento](painel-de-acompanhamento.md) |
| Trabalhar com templates e Zebra | [Etiquetas e impressão](etiquetas-e-impressao.md) |
| Entender solicitação e aprovação de clientes | [Cadastro de clientes](cadastro-clientes.md) |
| Entender as proteções aplicadas e reproduzir regressões | [Segurança](seguranca.md) |
| Consultar achados, correções e evidências | [Auditoria de segurança](auditoria-de-seguranca.md) |
| Seguir as regras comuns dos agentes de código | [Instruções para agentes](instrucoes-para-agentes.md) |

## Planejamento e histórico

Os arquivos `plano-*.md` e `historico-*.md` estão nesta mesma pasta. Seus nomes e avisos identificam a natureza datada do conteúdo; não são procedimentos atuais nem backlog automaticamente aprovado.

- [Plano de evolução de estoque e patrimônio](plano-evolucao-estoque.md): proposta e registro de abril de 2026; revalidar backlog e premissas antes de executar.
- [Plano de evolução operacional e painéis](plano-evolucao-operacional-e-paineis.md): proposta de 17/09/2026 baseada no prompt do usuário e no código atual; frentes, dependências, regras de indicadores e decisões ainda necessárias.
- [Plano de identidade visual e UX](plano-identidade-visual.md): histórico visual de 17–19/09/2026 e [ciclo de UX de 20/09/2026](plano-identidade-visual.md#ciclo-de-ux-de-20092026), com diagnóstico, prioridades, etapas, critérios de aceite e decisões pendentes. O novo ciclo está em planejamento.
- [Especificação inicial](historico-especificacao-inicial.md): arquitetura, contratos e roteiro da fundação, em fevereiro de 2026.
- [Histórico de desenvolvimento](historico-desenvolvimento.md): entregas e pendências registradas em fevereiro de 2026.
- [Registro de publicação de segurança](historico-publicacao-seguranca.md): deploy de 15/09/2026 e validação posterior do cadastro.

## Organização dos documentos

1. Cada assunto tem uma referência principal. Nos demais documentos, usar links em vez de copiar instruções completas.
2. Arquivos descritivos usam português, letras minúsculas e hífens, sem espaços ou acentos: `banco-de-dados.md`, `ordens-de-servico.md`.
3. `README.md`, `AGENTS.md` e `CLAUDE.md` da raiz mantêm seus nomes convencionais como entradas curtas. O conteúdo completo está em `docs/instrucoes/`; `CLAUDE.md` importa diretamente as mesmas instruções para agentes.
4. Manter os guias, planos e registros diretamente em `docs/instrucoes/`, sem distribuir instruções em outras pastas. Usar os prefixos `plano-` e `historico-` para conteúdo datado. Artefatos e scripts da auditoria ficam em `docs/security-audit/`, com seu guia nesta pasta.
5. Quando um plano vira implementação, atualizar seu estado e apontar para a referência final. Checkboxes antigos não constituem backlog atual.
6. Ao mover ou fundir arquivos, atualizar links e registrar a origem na tabela abaixo. Preservar conteúdo único e distinguir propostas de comportamento confirmado.
7. Não documentar valores de segredos, senhas, PINs ou dados de clientes. Expor apenas nomes de variáveis e placeholders.
8. Regras críticas de banco/permissão estão em `instrucoes-para-agentes.md`; os procedimentos completos ficam nos guias correspondentes. `AGENTS.md` exige a leitura dessa referência, sem manter uma segunda cópia.

A organização de código com `features/`, `common/` e `infrastructure/` está aplicada e descrita no [guia de arquitetura](arquitetura.md). Os imports e as referências dos guias acompanham os novos caminhos; evidências históricas da auditoria mantêm os caminhos da versão auditada.

## Arquivos consolidados

| Origem | Referência após a consolidação |
|---|---|
| `AGENTS.md` e `CLAUDE.md` duplicados | Regras em [instruções para agentes](instrucoes-para-agentes.md); os arquivos da raiz encaminham à mesma referência. |
| `README.md` e README genérico do web | Apresentação completa em [visão geral](visao-geral.md) e referência do [frontend](frontend.md). READMEs fora desta pasta são entradas curtas. |
| `DESENVOLVIMENTO.md` e `SERVIDOR.md` | [Desenvolvimento](desenvolvimento.md), incluindo o launcher de rede local. Roteiro inicial preservado na especificação histórica. |
| `PROJETO.md` e partes de `DESENVOLVIMENTO.md` | [Especificação inicial](historico-especificacao-inicial.md); setup, ambiente, segurança e deploy atuais nos guias por assunto. |
| `MD1.md` e `STATUS.md` | [Histórico de desenvolvimento](historico-desenvolvimento.md), com marcos, verificações, changelog e prioridades datadas. |
| `docs/DEPLOY.md` e instruções de deploy dos outros guias | [Implantação](implantacao.md); procedimento de schema em [Banco de dados](banco-de-dados.md). |
| `docs/CONTEXTO-ETIQUETAS.md` | [Etiquetas](etiquetas-e-impressao.md), com decisões de impressão e conexão atual. |
| `PLANO_TECNICO_EVOLUCAO_ESTOQUE.md` | [Plano de estoque](plano-evolucao-estoque.md) e comandos atuais em [Estoque](estoque-e-patrimonio.md). |
| `security-audit/plano-de-acao.md` e `implementacao.md` | [Remediação](seguranca.md), com decisões finais, implementação e limites do plano original. |
| `security-audit/publicacao.md` e `confirmacao-cadastro.md` | [Registro de publicação](historico-publicacao-seguranca.md) e comportamento em [Cadastro de clientes](cadastro-clientes.md). |
| Guias de `docs/architecture/`, `guides/`, `deployment/` e `modules/` | Referências atuais diretamente nesta pasta, com os nomes descritivos da tabela acima. |
| Documentos de `docs/plans/` e `docs/archive/` | Arquivos com prefixos `plano-` e `historico-` nesta pasta. |

Os relatórios e exports gerados da auditoria mantêm os nomes e conteúdos originais. PDF, Markdown e issues são formatos de entrega da mesma fonte, com proveniência/hash; não são guias independentes a serem fundidos manualmente. Referências antigas dentro das evidências continuam identificando a versão auditada.
