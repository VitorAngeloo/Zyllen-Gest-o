# Regra obrigatória de organização da arquitetura

Esta instrução deve ser seguida por colaboradores e agentes em toda criação, alteração ou reorganização de código e documentação. Antes de começar, ler este documento e consultar a [arquitetura atual](arquitetura.md). Uma alteração só está concluída quando respeita as responsabilidades das pastas, preserva os contratos existentes e tem suas referências e verificações atualizadas.

## Antes de criar ou mover um arquivo

1. Identificar a funcionalidade responsável pelo conteúdo e procurar uma implementação ou documentação equivalente no projeto.
2. Reutilizar ou ampliar a referência existente quando a responsabilidade for a mesma. Criar outro arquivo somente quando houver uma responsabilidade distinta.
3. Escolher o destino pela tabela abaixo e seguir o padrão dos arquivos vizinhos. Criar somente as subpastas necessárias; não gerar estruturas vazias para funcionalidades futuras.

## Onde cada responsabilidade deve ficar

| Responsabilidade | Destino obrigatório |
|---|---|
| Entradas de rotas e composição de layouts do web | `apps/web/src/app/`. As entradas `page.tsx` delegam às telas de suas funcionalidades. |
| Telas, componentes, hooks, chamadas de API, tipos e utilitários de um negócio | `apps/web/src/features/<negocio>/`, em subpastas como `screens/`, `components/`, `hooks/`, `api/`, `types/` e `utils/`, conforme a necessidade. |
| Componentes visuais reutilizáveis entre negócios | `apps/web/src/components/`, nos grupos existentes de UI, identidade, layouts e mídia. |
| Transporte HTTP, providers e utilitários gerais do web | `apps/web/src/lib/`. Chamadas específicas de um negócio ficam no `api/` da funcionalidade. |
| Controllers, serviços e regras de negócio da API | `apps/api/src/modules/<negocio>/`. Separar serviços por responsabilidade quando necessário. |
| Pipes, filtros e interceptors comuns da API | `apps/api/src/common/`. |
| Banco, criptografia, armazenamento e integrações técnicas da API | `apps/api/src/infrastructure/`. Validação de configuração fica em `apps/api/src/config/`. |
| Tipos, enums e schemas consumidos pelos dois aplicativos | `packages/shared/src/<negocio>/`, mantendo a interface pública de `@zyllen/shared`. |
| Verificações de arquitetura e builds isolados | `scripts/quality/`. Scripts de manutenção específicos permanecem no aplicativo responsável. |
| Guias, instruções, planos e registros descritivos do projeto | Diretamente em `docs/instrucoes/`, seguindo as [regras de organização dos documentos](README.md#organização-dos-documentos). |

Schema e migrations permanecem em `apps/api/prisma/`. Artefatos e scripts da auditoria permanecem em `docs/security-audit/`; relatórios e evidências da versão auditada preservam conteúdo, hashes e referências originais.

## Responsabilidades, nomes e reutilização

- Manter uma responsabilidade principal por arquivo. Quando uma tela ou serviço acumular apresentação, chamadas HTTP, formatação e fluxos independentes, separar essas responsabilidades na funcionalidade correspondente.
- Código usado por apenas um negócio permanece nesse negócio. Extrair para uma área comum somente quando houver reutilização entre negócios e uma responsabilidade comum clara.
- Manter uma única definição para cada regra, tipo, enum ou schema. Arquivos de compatibilidade podem reexportar a definição principal, sem criar uma segunda implementação.
- Usar nomes descritivos em inglês e `kebab-case` no código, conforme as [convenções](desenvolvimento.md). Evitar nomes como `novo`, `final`, `diversos` e arquivos genéricos que acumulem funções sem relação.
- Documentos descritivos usam português e `kebab-case`, sem acentos ou espaços. Atualizar o guia principal do assunto; criar outro documento somente para um assunto distinto e incluí-lo no índice. Planos e históricos usam os prefixos `plano-` e `historico-`, com data e escopo.
- Preservar as entradas curtas `README.md`, `AGENTS.md` e `CLAUDE.md` nos locais convencionais. As instruções completas ficam nesta pasta; os demais arquivos apontam para elas.

## Limites das dependências

- `app/` compõe as funcionalidades; `features/` não importa arquivos de `app/`.
- `components/` e `lib/` do web não dependem de funcionalidades de negócio. A integração existente com `features/auth/context/` é a exceção para o contexto central de autenticação; não ampliá-la para outros negócios.
- A infraestrutura da API não depende de módulos de negócio. Serviços de negócio utilizam a infraestrutura.
- API e web compartilham contratos por `@zyllen/shared`; não importam os arquivos internos um do outro. O shared não depende dos aplicativos.
- Evitar dependências circulares. Relações existentes entre módulos NestJS com `forwardRef` explícito devem permanecer justificadas; não usar essa exceção para contornar uma separação incorreta de responsabilidades.

Compartilhar componentes ou regras não elimina diferenças de autorização entre os portais interno, cliente e terceirizado. Uma reorganização deve preservar URLs, formatos de resposta, permissões, transações e dados. Mudanças nesses contratos exigem tratamento próprio dentro do escopo da tarefa.

## Ao reorganizar código ou documentação

1. Atualizar imports, exports, carregamentos dinâmicos, scripts e links afetados pelos novos caminhos.
2. Remover cópias substituídas depois de conferir os consumidores. Manter reexports de compatibilidade apenas quando necessários, com uma definição principal única.
3. Ao fundir documentos, preservar informações únicas, distinguir histórico de instruções atuais e registrar a origem no [índice](README.md#arquivos-consolidados).
4. Atualizar o guia principal do assunto. Quando a estrutura mudar, atualizar também [arquitetura](arquitetura.md) e o [índice da documentação](README.md).
5. Se for necessário mudar um limite arquitetural, registrar a justificativa e atualizar os guias e a verificação correspondente. Não desativar regras apenas para fazer uma alteração passar.

## Verificação obrigatória antes de concluir

Para alterações de código, executar na raiz e corrigir todas as violações:

```powershell
pnpm check:architecture
```

Esse comando verifica entradas de rotas, imports locais, limites entre camadas e ciclos em execução. A localização de novos documentos, os nomes e a separação de responsabilidades também precisam ser revisados; o comando não automatiza todas as regras deste documento.

Executar ainda as verificações de tipos, builds e regressões aplicáveis à mudança, seguindo [desenvolvimento](desenvolvimento.md) e as [restrições de produção](instrucoes-para-agentes.md). Nesta máquina, usar builds isolados para preservar os artefatos da API em execução. Alterações somente em Markdown exigem conferir links, índice e coerência das instruções; não exigem recompilar os aplicativos.

Antes de entregar, conferir se os arquivos estão no destino correto, se não há duplicações, se os consumidores e guias foram atualizados e se as verificações aplicáveis passaram. Se houver uma violação pendente, informar o problema e a validação incompleta; não apresentar a organização como concluída.
