# Painel de acompanhamento

Refinamento R1 implementado em 18/09/2026. **API atualizada e seis migrations aplicadas ao banco compartilhado, com autorização do usuário**, conforme [integração e publicação](#integração-e-publicação). Os indicadores publicados foram consultados no banco real em transação somente de leitura. A interface nova está disponível no localhost; esta atualização não publicou o frontend no Vercel. Geração/revogação foram verificadas na cópia restaurada do banco, sem criar links ou contas fictícias em produção. A conferência pela conta real do operador e o uso em TV continuam pendentes.

## Dashboard autenticada e espelho por link

A entrada autenticada é a **Dashboard** (`/dashboard`), com sidebar, indicadores e ações dos chamados. No refinamento R2, **Visão operacional** apresenta resumos simultâneos de estoque, projetos, viagens e agenda dos carros, com permissões e links para a gestão. Composição e limites estão no [guia do frontend](frontend.md#dashboard-e-painel-de-acompanhamento); API/migration de carros foram publicadas após autorização, conforme [seu guia](carros-e-reservas.md#publicação-autorizada--18092026). Não há rotação no acesso pela conta. `/painel` e `/dashboard/painel` encaminham para `/dashboard`, descartando parâmetros antigos de rotação.

No cabeçalho da dashboard, **Espelho por link** abre a configuração de compartilhamento. Selecionar as visões e pressionar **Gerar link** produz um endereço `/painel/espelho/<token>`. Quem possuir esse link poderá ler as visões escolhidas, sem login. Esse ambiente é isolado: não apresenta sidebar, formulários, ações operacionais ou navegação para a gestão. A sessão já salva no navegador não é usada nem apagada.

| Visão | Seleção na URL | Permissão da conta proprietária | Regra dos indicadores |
|---|---|---|---|
| Atendimentos internos | `atendimentos` | `tickets.view` | Origem fixa `INTERNAL`; [Chamados](frontend.md#visão-compacta-de-atendimentos) |
| Atendimentos de clientes | `atendimentos-clientes` | `tickets.view` | Origem fixa `CLIENT`; [Chamados](frontend.md#visão-compacta-de-atendimentos) |
| Clientes de atenção | `clientes-atencao` | `tickets.view` | Curadoria manual feita na dashboard; nome e contato mínimo no espelho |
| Projetos | `projetos` | `schedule.view` | [Projetos e agenda](projetos-e-agenda.md#dashboard-geral-de-projetos) |
| Instalações e viagens | `operacoes` | `schedule.view` | [Viagens e operações](viagens-e-operacoes.md) |
| Estoque | `estoque` | `inventory.view` | [Estoque e reposição](estoque-e-patrimonio.md#painel-de-estoque-e-reposição) |
| Carros | `carros` | `vehicles.view` ou `schedule.view` | Disponibilidade, uso atual e reservas atuais/futuras |

Administrador tem o bypass existente. Seleção desconhecida ou negada usa a primeira visão permitida, sem consultar os dados da negada. Conta sem visões permitidas não consulta indicadores. O espelho mostra somente a interseção entre as visões compartilhadas e as permissões atuais do proprietário.

## Seleção, rotação e atualização

No espelho, as visões são selecionadas diretamente no menu superior. A seleção manual pausa a rotação para manter a tela escolhida. O único controle de rotação é um pequeno botão circular de play/pausa no canto inferior direito, com nome acessível. A troca automática fica **fixa em um minuto**; parâmetros e preferências antigas de intervalo são ignorados.

### Leitura em telas sem mouse — 21/09/2026

O espelho tem uma composição própria para telas de acompanhamento. Cabeçalho, navegação, indicadores, listas e estado da rotação compartilham a altura disponível do navegador. Em telas amplas, as listas deixam de depender de rolagem: mostram uma página de registros e avançam automaticamente a cada dez segundos. O número total e a página/faixa atual aparecem junto à lista. A posição de cada visão continua de onde parou quando a rotação volta a ela; abrir um detalhe suspende temporariamente a passagem das páginas.

Em **Atendimentos internos** e **Atendimentos de clientes**, os seis indicadores ficam em uma faixa compacta, seguidos pelas filas de abertos e em atendimento. A terceira leitura respeita o contexto: internos exibem **Aberturas por setor** e clientes exibem **Aberturas por cliente**, agrupadas pela empresa do chamado. Cada visão possui origem fixa e expõe somente o controle de período, evitando mistura ou desaparecimento de uma origem. Em **Clientes de atenção**, a grade se adapta à quantidade definida na dashboard e mostra apenas nome, responsável e telefone disponíveis, sem piscar. Em **Projetos**, os indicadores e os destaques ocupam o mesmo quadro. Em **Instalações e viagens**, os cinco grupos permanecem identificados e seus registros avançam. Em **Estoque**, entradas, saídas e naturezas de movimentação ficam visíveis lado a lado. Em **Carros**, os totais de disponibilidade ficam acima de duas listas: uso atual, com motorista, e reservas atuais/futuras, com responsável e horário. Conteúdo excedente avança dentro de seu grupo, sem alterar a rotação de um minuto entre visões. Em celular ou janela muito baixa, a página volta ao fluxo vertical para conservar controles e leitura.

O verde da marca orienta seleção e valores principais; azul identifica andamento, verde suave indica conclusões, amarelo sinaliza pendência e vermelho fica reservado a chamados que exigem atenção. Rótulos e números acompanham as cores para que o significado não dependa delas. A dashboard autenticada mantém sua apresentação e suas ações operacionais.

No espelho, seleção e pausa persistem neste navegador; a URL explícita prevalece no carregamento. Exemplo: `/painel/espelho/<token>?visao=estoque&pausado=1`. Somente visão e pausa são normalizadas na query; o caminho do espelho mantém seu token. Não adicionar JWT, PIN ou credenciais da conta ao endereço.

Atualizar os dados ou as visões autorizadas do espelho não reinicia nem retoma uma pausa escolhida. Se uma visão perder autorização, selecionar a primeira ainda permitida, preservando a pausa. Popup de chamado suspende a troca temporariamente; fechar preserva a pausa escolhida e inicia um novo minuto se a rotação estava ativa. Seleção de outra visão fica desabilitada enquanto o popup está aberto.

Projetos, operações e estoque atualizam a cada 30 segundos. Listas de chamados e autorização do espelho atualizam a cada 15 segundos; indicadores de chamados, a cada 30 segundos; os tempos de atendimento, a cada segundo. No espelho, apenas a visão aberta consulta seus indicadores. Na dashboard, chamados e resumos permitidos consultam dados independentemente. Não existem botões de visão anterior/próxima, seletor de intervalo, atualização geral ou cópia do endereço da visão.

Consulta bem-sucedida sem registros apresenta zeros pertinentes e mensagens neutras. Falha inicial não inventa dados; dados anteriores do mesmo escopo podem permanecer com aviso. Há recuperação nas mensagens de falha e uma barreira de erro de apresentação, preservando os seletores. Indisponibilidade do link oculta o conteúdo do espelho, inclusive dados em cache.

Projetos/operações usam os últimos 30 dias do calendário local convertidos para UTC, com situação atual independente do período. Estoque usa 30 dias corridos. Chamados preservam o período escolhido dentro da visão de origem fixa.

## Chamados e estoque existente

Atendimentos mantém assunto, solicitante, responsável, tempo, popup com descrição e alerta vermelho. O limite é de cinco horas para chamados internos e uma hora para chamados de clientes, sempre contado desde a abertura. No espelho, `atendimentos` autoriza somente registros `INTERNAL` e `atendimentos-clientes` somente registros `CLIENT`; a API aplica essa separação também na lista e no detalhe. Ambas permitem somente chamados abertos ou em atendimento e respeitam o escopo do proprietário: Administrador/Gestor têm visão global; demais contas veem abertos e suas atribuições.

O acesso pela conta mantém o leitor autenticado e os anexos privados autorizados. O leitor do espelho seleciona explicitamente dados do pedido e nomes; não entrega contatos, credenciais, arquivos privados ou histórico de mensagens. Compartilhamento de anexos continua seguindo sua [regra própria](autenticacao-e-permissoes.md).

Estoque consulta o contexto geral `ALL`, usando `Asset`, `SkuItem`, `Location` e `StockMovement` existentes. Totais e movimentações não exigem depósito principal nem classificação prévia de todos os locais. Disponibilidade conta somente patrimônios ativos em locais internos classificados; locais desconhecidos não são assumidos como disponíveis. Reservas/prioridades continuam calculadas por depósito, na área própria. Não criar estoque paralelo nem associar locais/clientes por nome.

## Contratos e proteção do espelho

O módulo `panels` compõe os serviços existentes de estatísticas; não duplica agregações. Contratos e validações ficam em `packages/shared/src/panels`. O frontend em `features/panels` separa API, rotação, apresentação compartilhada, configuração do link e tela do espelho. `features/dashboard` compõe os indicadores autenticados reutilizando o mesmo leitor e as mesmas visualizações, sem duplicar agregações. As entradas em `app` são reexports.

- `GET /personal-panel/statistics`: indicadores autenticados, com autorização da visão.
- `GET/POST/PUT/DELETE /personal-panel/mirror`: consultar, gerar/substituir, atualizar as visões sem trocar a URL e revogar o link da própria conta.
- `GET/PUT /personal-panel/attention-clients`: pesquisar empresas e manter a seleção de até 12 clientes do proprietário.
- `GET /panel-mirrors/:token`: visões atualmente autorizadas.
- `GET /panel-mirrors/:token/statistics`: indicadores da visão.
- `GET /panel-mirrors/:token/tickets` e `GET /panel-mirrors/:token/tickets/:id`: lista paginada e detalhe de chamados ativos.
- `GET /panel-mirrors/:token/attention-clients`: nomes e contatos mínimos dos clientes selecionados.
- `GET /panel-mirrors/:token/vehicles`: disponibilidade, usos e reservas dos carros.

`PanelMirror` guarda somente SHA-256 de um token aleatório de 32 bytes. Há um link atual por conta, válido até revogação; gerar outro invalida o anterior. O endereço bruto é entregue somente na geração e não é recuperável pela consulta de status. Geração/revogação são auditadas atomicamente sem guardar o token na auditoria.

Conta desativada, revogação e mudanças de permissões são verificadas no servidor a cada requisição, sem cache de permissões nesse caminho. O token não autentica endpoints internos. Rotas públicas aceitam somente leitura, têm limite de requisições, `no-store`, `no-referrer` e `noindex`. As consultas do espelho usam fetch sem cookies ou Authorization, com chaves de cache distintas das consultas da conta.

## Integração e publicação

O espelho original usa a migration `20260918080000_panel_mirrors`, aplicada ao banco compartilhado em 18/09/2026. A curadoria de clientes acrescenta a migration aditiva `20260923120000_panel_attention_clients`, com chave composta, FKs restritivas e RLS. Essa migration foi aplicada em 23/09/2026 após backup restaurado em PostgreSQL isolado; as 20 migrations estão em dia e a API ativa já contém os endpoints correspondentes. Links existentes conservam exatamente as visões previamente autorizadas. A configuração autenticada permite atualizar essa seleção sem trocar o token ou a URL; gerar outro endereço continua sendo uma ação separada e explícita.

Validação de 23/09/2026: tipos de shared/API/web, schema Prisma, arquitetura e build isolado aprovados. O conjunto passou por 28 cenários integrados de API, 61 cenários de navegador do painel e carros, 9 cenários dedicados da dashboard, 8 cenários de estatísticas de chamados e 22 cenários de veículos. Os cenários adicionais confirmam que a atualização do espelho preserva o token, grava auditoria, sincroniza as caixas com a seleção ativa e inclui Atendimentos de clientes sem gerar outro endereço. A cadeia de dez migrations foi aplicada em PostgreSQL descartável, preservou os registros anteriores, permaneceu equivalente ao schema e confirmou RLS nas 16 tabelas novas. Antes da única migration pendente, um dump novo foi restaurado integralmente em PostgreSQL isolado, com 62 tabelas e 19 migrations. Depois da aplicação no banco compartilhado, a tabela `PanelAttentionClient` foi conferida vazia, com RLS, chave composta e duas FKs; o schema ficou com 20 migrations aplicadas. As capturas de Clientes de atenção na dashboard e no espelho, além de Carros, confirmaram encaixe em computador, celular e TV. A aplicação da migration não criou registros de teste. O link operacional moderno foi atualizado em transação para acrescentar `atendimentos-clientes`, preservando o endereço atual e registrando a alteração em auditoria; um link legado com seleção diferente permaneceu intacto.

A inspeção anterior somente de leitura confirmou seis migrações pendentes, das etapas de projetos, viagens, custódia, reservas, ciclos e espelho, e artefatos antigos sem os novos endpoints. Essa dependência causava os erros observados; ausência de cadastros não explicava a falha. Depois da publicação autorizada, as tabelas existem e os endpoints estão na API ativa. O estoque existente foi confirmado por contagens agregadas, sem consultar dados pessoais.

Seguir [implantação](implantacao.md), com backup restaurável, revisão de todas as pendências e atualização coordenada de shared, Prisma Client, API e web. Não usar watch na API de produção nem aplicar SQL durante os testes. Abrir o localhost não publica o backend.

A comparação somente de leitura com o schema real confirmou mudanças aditivas. A introspecção pelo pooler expirou; pela conexão de migrações `DIRECT_URL` foi concluída. A conferência final confirmou as FKs de solicitante, tipo de movimento e aprovação, e o vínculo restritivo entre lote e itens da custódia, já presentes na migração anterior. `pnpm test:panels:migrations` conferiu o conjunto das seis migrações em PostgreSQL descartável: preservação de registros antigos, equivalência dos campos/índices/FKs ao schema e RLS nas 12 tabelas novas.

Validação anterior da R1: `pnpm test:panels` aprovou 21 cenários de API/migração em PostgreSQL descartável; `pnpm test:panels:browser` aprovou 25 cenários de rotação, seletores, acesso interno/espelho, detalhes, permissões, falhas, geração/revogação, cabeçalhos e celular, incluindo regressões dos atendimentos. Tipos do web, build isolado e arquitetura aprovados; 807 arquivos fora do escopo preservados, incluindo migrações anteriores, artefatos da API ativa e auditoria. Regressões de projetos/ciclos (42), custódia (19) e estoque (17) também aprovadas. Artefatos ficam em `tmp/architecture-validation/personal-panels-api-qa/` e `personal-panels-browser-qa/`. Conferidos os dois acessos no localhost existente, com API inteiramente simulada, em `personal-panels-localhost-qa/`. Os testes não usam credenciais ou registros reais.

## Consolidação da dashboard — 18/09/2026

### Diagnóstico do ambiente em uso e preparação da atualização

Após o usuário confirmar que os erros e a falha ao gerar o link persistiam, uma nova inspeção somente de leitura confirmou a API antiga na porta 3001 e as mesmas seis migrations pendentes. Ausência de cadastros não explica essas falhas: as rotas novas não fazem parte do artefato em execução e as tabelas necessárias ainda não existem.

Foi criado um backup do schema `public`, uploads locais, configuração e artefatos anteriores da API/shared/Prisma, em diretório protegido por ACL fora do repositório: `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\operational-20260918-1135`. A restauração completa de 47 tabelas foi verificada em PostgreSQL restrito a loopback. Os dados copiados permanecem nesse diretório privado; nenhum registro ou segredo integra os artefatos públicos de QA.

Uma segunda cópia restaurada recebeu as seis migrations revisadas: as contagens de todas as tabelas anteriores permaneceram iguais e as 12 tabelas novas mantiveram RLS. A API compilada nova carregou os indicadores de atendimentos e as quatro visões, reconheceu 2.614 patrimônios e disponibilizou os 31 clientes cadastrados para seleção. Projetos e viagens sem registros apresentaram resultados bem-sucedidos. Geração, acesso anônimo, proteção da gestão e revogação do espelho funcionaram com proprietário sintético somente nessa cópia. Os servidores de restauração/validação foram encerrados.

Pré-checagem final conferiu 191 arquivos do candidato, os checksums das oito migrations aplicadas, exatamente as seis pendências revisadas e a configuração de segurança do startup. Essa preparação não alterou SQL, processo ou artefatos de produção; a publicação ocorreu depois da autorização explícita do usuário, registrada abaixo. Não presumir que o novo frontend ou os testes isolados corrigem a API ativa.

### Resultado da consolidação local

A revisão aprovada retirou a tela autenticada duplicada e concentrou os indicadores e a configuração do espelho na dashboard. O nome atual é Painel de acompanhamento, somente para leitura pelo link. A documentação principal foi renomeada para refletir esse acesso. Rotação e pausa pertencem ao espelho; consultas e visualizações dos indicadores continuam compartilhadas com a dashboard. Esta revisão não altera banco, migrations ou endpoints.

Validação desta consolidação: 26 cenários de navegador aprovados, incluindo regressões dos chamados, ações de PIN, permissões por visão, compatibilidade dos dois endereços antigos, rotação exclusiva do espelho, geração/revogação, recuperação de falhas e indicadores no celular. Tipos do web, build isolado e arquitetura passaram. Os dois acessos foram conferidos no localhost existente com API simulada. Nessa etapa foram preservados 832 arquivos fora do escopo, incluindo banco/schema, todas as migrations, saídas compiladas da API ativa e auditoria. Conferidos índice e 274 links locais em 32 arquivos Markdown. As capturas da dashboard e seus indicadores em computador/celular ficam em `tmp/architecture-validation/personal-panels-browser-qa/`. Esses resultados antecedem a publicação autorizada da API descrita a seguir.

### Publicação autorizada e verificação — 18/09/2026

Após o usuário autorizar, somente o processo anterior da API foi encerrado. Shared foi compilado, Prisma Client regenerado com a API parada e API compilada com sucesso. `prisma migrate deploy` aplicou as seis migrations revisadas. O novo processo `node --enable-source-maps dist/main.js`, PID 17672, atende 3001 com `NODE_ENV=production`, sem watch. Houve breve interrupção durante a atualização. JWT, chave de CPF e configuração da API permaneceram intactos; não foram executados seed, reset ou saneamento.

Onze verificações pós-publicação passaram: health local/público, existência e proteção JWT das rotas novas, CORS para geração do espelho no localhost, rejeição de token público inválido, cabeçalhos de privacidade, equivalência do candidato/configuração e integridade das 14 migrations aplicadas, sem pendências ou falhas. RLS continua nas 12 tabelas novas. Foram preservados os 233 arquivos de fontes API/shared, migrations e auditoria conferidos contra o snapshot anterior.

Os quatro serviços publicados de estatísticas também foram executados diretamente em uma transação `READ ONLY` contra o banco real, com resultado agregado: 2 chamados pendentes, 1 em atendimento, 2.614 patrimônios, 127 itens, nenhum projeto operacional ou viagem ainda cadastrado. Ausência de classificação dos locais mantém disponibilidade calculada em zero; 1.886 patrimônios ativos estão em locais não classificados. Não classificar automaticamente nem inventar saldo para contornar esse estado.

O localhost passou a usar `http://localhost:3001`, por override privado em `apps/web/.env.local`, preservando o arquivo anterior no backup. A configuração do Next foi recarregada sem alterar seu conteúdo; CSP agora permite a mesma API usada pelo frontend. Os dois acessos no localhost passaram novamente com API simulada. Nenhuma sessão autenticada de navegador estava disponível para testar pela conta real do operador, nem foram criadas contas ou links de teste em produção. Recarregar a dashboard e gerar o espelho pela própria conta é a conferência operacional restante; não confundir esta publicação de API/banco com deploy do frontend público.

Logs e evidências pós-publicação ficam no mesmo diretório privado do backup: `api-operational-run.log`, `api-operational-error.log`, `migration-deploy-result.json`, `production-operational-verification.json` e `production-statistics-read-only-verification.json`. Não copiá-los para artefatos públicos. O relatório PDF e as evidências congeladas da auditoria permanecem intactos.
