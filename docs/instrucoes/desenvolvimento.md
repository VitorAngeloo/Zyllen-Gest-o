# Desenvolvimento e convenções

## Antes de iniciar

O Supabase é compartilhado com produção. Executar a API de desenvolvimento contra esse banco não cria um ambiente isolado. Testes de escrita, seed e saneamento não fazem parte do setup rotineiro; usar banco descartável/fixtures para testes.

Nesta máquina de produção não iniciar API watch nem `iniciar-servidor.bat`: a API efetiva usa `node dist/main.js` na 3001. O launcher também pode encerrar outros processos Node.

## Pré-requisitos e instalação

- Node.js **20.9 ou superior**, mínimo exigido pelo Next.js 16.1.6 instalado. O campo `engines` da raiz ainda diz 18; não atende o frontend atual.
- pnpm 9 ou superior, conforme o workspace.
- PowerShell para os exemplos deste guia.
- Variáveis por aplicativo, conforme [configuração de ambiente](variaveis-de-ambiente.md).

Na raiz do repositório:

```powershell
pnpm install --frozen-lockfile
pnpm --filter @zyllen/shared build
```

Se o Prisma Client precisar ser atualizado, seguir o procedimento de [banco de dados](banco-de-dados.md). No Windows, gerar com a API parada para evitar EPERM. A aplicação não precisa de reset, migrate dev ou seed para instalar dependências.

## Desenvolvimento em máquina sem a API de produção

Usar dois terminais na raiz:

```powershell
# Terminal 1: API na 3001
pnpm dev:api
```

```powershell
# Terminal 2: web na 3000
pnpm dev:web
```

A raiz também tem `pnpm dev`, com paralelismo por `&`; os dois terminais tornam a execução explícita no PowerShell 5.1. Acessos locais: `http://localhost:3000` e `http://localhost:3001/health`. Para testes de integração, configurar banco descartável e portas distintas.

O `tsconfig.json` do web resolve `@zyllen/shared` pelo código-fonte do pacote. Assim, o localhost acompanha novos contratos sem reemitir `packages/shared/dist`, que é consumido pela API em execução. A API continua utilizando o pacote compilado; sua atualização exige publicação coordenada. O build isolado adapta esse caminho para seu próprio shared compilado.

## Build, tipos e lint

Na raiz:

```powershell
pnpm --filter @zyllen/shared build
pnpm --filter @zyllen/api build
pnpm --filter @zyllen/web exec tsc --noEmit
pnpm --filter @zyllen/web build
```

Antes de commit/push de frontend, executar **tsc e Next build**. O build Turbopack não substitui a verificação de tipos. `pnpm build` compila recursivamente o workspace; `pnpm lint` chama os scripts de lint existentes.

Não reemitir `apps/api/dist` durante validação rotineira nesta máquina sem considerar o serviço em produção. A suíte de segurança possui [builds isolados](seguranca.md), que não substituem o dist utilizado pelo serviço.

## Testes disponíveis

A API tem Jest e `@nestjs/testing`, mas não há script `test` nem suíte convencional de specs nos aplicativos. Existe uma suíte isolada de segurança em `docs/security-audit`, com NestJS/Prisma real e PostgreSQL PGlite descartável. A última melhoria de cadastro registrou 37 cenários; não é cobertura total nem teste de carga do Supabase.

Para reprodução e dependências, consultar [remediação](seguranca.md). Os scripts `verify-offline.cjs`/`verify-browser.cjs` da auditoria original reproduzem vulnerabilidades da revisão antiga; não são a suíte pós-correção. Não adaptar testes para escrever na base real.

A visão de atendimentos possui verificações próprias em `scripts/quality`: `pnpm test:tickets:statistics` usa a API/Prisma reais e PostgreSQL PGlite descartável; `pnpm test:dashboard` usa Chrome e respostas sintéticas em um build isolado. Executar `pnpm validate:isolated` antes; dependências, cenários e artefatos estão em [frontend](frontend.md#visão-compacta-de-atendimentos).

A gestão de projetos também possui `pnpm test:projects` e `pnpm test:projects:browser`, com migração/API em PostgreSQL descartável e UI com respostas sintéticas. Reutilizam as regressões de atendimentos e ficam em `scripts/quality`; consultar [projetos e agenda](projetos-e-agenda.md#migração-validação-e-publicação).

O dashboard de projetos é validado por `pnpm test:projects:statistics` e `pnpm test:projects:statistics:browser`, incluindo as regressões anteriores de projetos/agenda/chamados. Executar o build isolado antes; regras dos indicadores e artefatos em [projetos e agenda](projetos-e-agenda.md#dashboard-geral-de-projetos). São consultas/escritas de fixtures somente em ambiente descartável, sem acesso ao banco compartilhado.

A área unificada Projetos/Agenda/Equipe usa `pnpm test:projects:agenda:browser`, após `pnpm validate:isolated`. Inclui as regressões de chamados, projetos, dashboards e viagens, com cenários de navegação/links anteriores, editor compartilhado, equipe/permissões, filtros, paginação completa, falhas, teclado e celular. Usa Chrome/Next isolados com HTTP inteiramente simulado; artefatos em `tmp/architecture-validation/projects-agenda-browser-qa/`.

Viagens e o painel operacional usam `pnpm test:trips` e `pnpm test:trips:browser`, que incluem essas regressões anteriores e a migração aditiva de viagens. Regras provisórias, preparação do banco e artefatos estão em [viagens e operações](viagens-e-operacoes.md). Executar `pnpm validate:isolated` antes, preservando o processo e os artefatos da API em produção.

Estruturas e ciclos usam `pnpm test:structures` e `pnpm test:structures:browser`, após o mesmo build isolado. Validam associação explícita, cancelamentos/reaberturas, datas/duração, preservação histórica, transações, RLS, autorização e interface, incluindo regressões da área unificada. Regras e artefatos em [estruturas e ciclos](estruturas-e-ciclos.md).

## Verificações adicionais de estoque e painéis

As entregas de estoque por cliente, reposição e painel pessoal possuem validações adicionais descartáveis, após o build isolado:

```powershell
pnpm test:inventory:custody
pnpm test:inventory:custody:browser
pnpm test:inventory:statistics
pnpm test:inventory:statistics:browser
pnpm test:panels:browser
```

Nenhum desses comandos usa a base compartilhada; consulte [estoque](estoque-e-patrimonio.md) e [painel de acompanhamento](painel-de-acompanhamento.md) para regras, artefatos e limites. A conferência da massa real e a publicação são procedimentos separados.

## Convenções de código

- TypeScript strict; camelCase para funções/variáveis e PascalCase para componentes/classes/tipos.
- Arquivos/pastas novos com nomes descritivos em inglês e `kebab-case`; textos de UI e URLs de negócio permanecem em português. Evitar renomes em massa sem necessidade.
- Alias verificado: `@web/*` aponta para `apps/web/src/*`. Importar contratos comuns de `@zyllen/shared`; não pressupor aliases `@api`/`@shared` dos guias antigos.
- Schemas Zod compartilhados via `ZodValidationPipe`; DTOs com `class-validator` onde o módulo já usa esse padrão.
- Usar enums compartilhados (`MaintenanceStatus`, `TicketStatus`, `TicketPriority`, `AssetStatus`, `ApprovalStatus`, `PurchaseOrderStatus`, `FollowupStatus`, `AuthorType`).
- SKU tem 6 dígitos com zeros à esquerda e unicidade. Patrimônio usa sequência por prefixo, padrão `SKY`, e 5 dígitos; preservar códigos e sequência. OS usa `OS-AAAAMM-XXXX` com retry em colisão. Verificar implementações atuais antes de alterar geradores.
- Operações relevantes/sensíveis gravam `AuditLog`; incluir auditoria ao adicionar novas operações desse tipo.
- Controllers NestJS: declarar rotas estáticas antes de `:id`. Manter limite de paginação e [contratos de resposta](arquitetura.md).
- Componentes genéricos usam tokens da marca; textos comuns vêm de `brand-voice.ts`.
- Separar código específico de negócio do compartilhado conforme a [arquitetura aplicada](arquitetura.md). Evitar `utils.ts` ou serviços genéricos que acumulem funcionalidades sem relação.

## Verificação da organização e build isolado

```powershell
pnpm check:architecture
pnpm validate:isolated
# Somente compilação de shared/API e tipos do web, sem build Next:
pnpm validate:isolated --types-only
```

O build isolado gera Prisma Client próprio e cópias do web/shared em `tmp/architecture-validation`. Não copia arquivos `.env`, não conecta ao banco e não escreve em `apps/api/dist`, `packages/shared/dist` ou no engine Prisma de produção. Os nomes/URLs de teste são locais; não publicar esse build como produção.

Novas rotas devem delegar à tela da funcionalidade. Código em `features/` não importa `app/`; UI e utilitários comuns não importam negócios, salvo o contexto central de autenticação. Infraestrutura da API não depende dos módulos de negócio. Dependências mútuas entre módulos Nest só devem existir com a composição explícita correspondente.

Para regressões de API e navegador, seguir a preparação descartável em [remediação](seguranca.md). Depois do build isolado desse procedimento, executar:

```powershell
node docs/security-audit/test-security.cjs --browser --features
```

`--features` acrescenta verificações de saldo, histórico, estatísticas, aprovação pendente, cadastros de estoque, PIN e navegação/formulários de estoque, agenda e acompanhamento. As fixtures são criadas somente no PostgreSQL PGlite descartável; a rodada de 17/09/2026 passou em 44 cenários. Os testes específicos ficam em `scripts/quality/test-feature-api.cjs` e `test-feature-browser.cjs`.

## Git e revisão

Branch principal utilizada pelo workflow: `master`. Trabalhar em branch de escopo claro e revisar diff antes de commit. O push pode publicar o frontend; considerar a ordem de [implantação](implantacao.md), especialmente quando API e web dependem um do outro. Não incluir `.env`, logs, backups ou dados de clientes.

Documentação histórica de `main`, regras de PR e contagens antigas não substitui a configuração atual do repositório. Verificar a política de proteção efetiva quando necessária.

## Particularidades do Windows

PowerShell 5.1 não suporta `&&`, `||`, ternário nem `??`; executar comandos em linhas separadas e verificar sucesso antes de continuar. Here-strings exigem fechamento na coluna 0. Preferir `Get-Content`, `Select-Object` e `Get-Command` aos comandos Unix indisponíveis; Git Bash também existe.

## Launcher para rede local

`iniciar-servidor.bat`, na raiz, é um atalho para uso local em máquina que não hospede a API de produção. Verifica Node/pnpm, instala dependências, gera Prisma Client, identifica IP e abre API/web de desenvolvimento em janelas minimizadas. Não configura nem isola o banco.

| Acesso | Web | API |
|---|---|---|
| Na própria máquina | `http://localhost:3000` | `http://localhost:3001` |
| Na mesma rede | `http://<IP_DO_SERVIDOR>:3000` | `http://<IP_DO_SERVIDOR>:3001` |

Dispositivos precisam estar na mesma rede e portas 3000/3001 liberadas no firewall; CORS e URL pública da API precisam corresponder ao acesso. O IP é exibido pelo script.

Ao pressionar uma tecla no encerramento, o script chama `taskkill /im node.exe /f`: **encerra todos os processos Node**, inclusive outros serviços. Quando houver outros serviços, encerrar manualmente somente os processos/janelas dessa execução. Fechar a janela não deve ser tratado como garantia de limpeza dos filhos.

## Referências

- [Regras para agentes](instrucoes-para-agentes.md).
- [Ambiente](variaveis-de-ambiente.md).
- [Banco de dados](banco-de-dados.md).
- [Histórico de entregas](historico-desenvolvimento.md).
