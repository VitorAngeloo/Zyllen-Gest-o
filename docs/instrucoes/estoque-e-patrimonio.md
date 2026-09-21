# Estoque, ledger e patrimônio

**Estado em 18/09/2026:** API e migrações de custódia/mínimos publicadas na R1. Almoxarifado existente identificado como estoque interno/principal às 18h20, com auditoria. Mínimos informados pelo usuário aplicados aos 127 SKUs às 18h47 e conferidos às 18h48. Nove lotes, totalizando 677 patrimônios legados, foram regularizados após confirmação explícita dos destinos; o lote interno final foi aplicado às 21h39, conferido e consolidado às 21h41. Todos os 534 itens que estavam pendentes na revisão da timeline têm destino estruturado: 495 de clientes e 39 de uso interno. Revisão de apresentação disponível no localhost; frontend ainda não publicado no Vercel. A consulta agrupada de todos os clientes e o fluxo obrigatório de saída por cliente/projeto permanecem pendentes, conforme os registros abaixo.

## Responsabilidades

`catalog` define SKU/produto; `assets` representa unidade física; `inventory` controla saldo e movimentos. `StockLedgerService` centraliza registro de saída em ledger. Compras/recebimentos precisam respeitar SKU, quantidade e vínculo do patrimônio.

Arquivos de referência em `apps/api`:

- `src/modules/inventory/inventory.service.ts` e `stock-ledger.service.ts`.
- `src/modules/assets/assets.service.ts`.
- `src/modules/purchases/purchases.service.ts`.
- `prisma/backfill-product-exits-ledger.ts` e `reconcile-stock-ledger.ts`.

O [plano de evolução](plano-evolucao-estoque.md) preserva backlog e decisões de abril de 2026. Flags e critérios daquele plano não devem ser presumidos ativos ou pendentes.

## Custódia por cliente e devolução parcial

Consulta em `/dashboard/estoque/clientes`, acessível pelo Estoque, usando API publicada. O endereço pode indicar `aba=patrimonios`, `aba=historico` ou `aba=locais`; mudar a visão atualiza a URL e permite recarregar/voltar pelo navegador. A identificação tem acesso direto por `/dashboard/estoque/clientes?aba=locais`, sem consultar a lista de patrimônios nessa visão. Histórico depende de `inventory.historico`. Links de retorno para Estoque e Indicadores permanecem no cabeçalho.

`Location.kind` distingue `INTERNAL` e `CLIENT`; nulo identifica um local legado ainda não classificado. Locais de cliente exigem `companyId` e podem indicar `projectId`, validado como unidade/projeto da mesma empresa. `Asset.currentLocationId` continua sendo a única origem da custódia atual. Condição e local são independentes: apenas `ATIVO` em local interno compõe disponibilidade para um novo envio. Manutenção, uso, baixa e estados desconhecidos não são disponibilidade.

Em **Identificação dos locais**, selecionar explicitamente o depósito existente como **Estoque principal Skyline**. A seleção é única, auditada e não cria empresa ou depósito. Não inferir esse vínculo por nome, nem atribuir patrimônios sem local ao estoque principal. O diagnóstico de leitura mostra unidades sem localização, unidades em locais não classificados e locais pendentes; a identificação inicial de um local antigo aplica sua classificação às unidades já vinculadas, com aviso para conferência. Consulta bem-sucedida sem locais mostra mensagem normal; falha mantém retentativa e desabilita cadastro/identificação enquanto as opções estão indisponíveis. Cargas e caches incluem a conta e não consultam dados operacionais para audiência externa.

### Conferência real de disponibilidade — 18/09/2026

Os três leitores publicados, em transação `READ ONLY` com visão consistente, reconheceram **2.614 patrimônios e 127 SKUs**. Dos patrimônios não baixados, **716 estavam sem local e 1.886 em locais não classificados**. Os três locais existentes ainda não tinham classificação; nenhum depósito principal ou mínimo estava configurado. A ausência de identificação explica a disponibilidade interna zero no contexto geral e **indisponível** no contexto do depósito; não significa ausência dos patrimônios cadastrados.

O levantamento identificou o cadastro existente **Almoxarifado skyline**, com 1.866 patrimônios vinculados; sua definição como interno/principal não foi gravada automaticamente. Há ainda um local secundário e um local genérico de cliente a conferir. Não atribuir os itens do local genérico a uma empresa por nome, nem preencher mínimos com exemplos do planejamento. Detalhes com IDs/locais permanecem no relatório privado; não copiar dados reais para artefatos públicos de testes.

No painel, a orientação explica como identificar o local existente e configurar mínimos depois. **Identificar locais**, no painel e no aviso da dashboard, abre diretamente a visão de identificação. A visão geral informa **Disponíveis em locais internos identificados** e apresenta as pendências fora desse saldo. O componente de leitura usado pelo espelho mantém apenas a explicação, sem acesso à gestão.

**Validação da revisão:** 56/56 cenários de navegador aprovados em `node scripts/quality/test-ticket-dashboard.cjs --panels --custody --inventory-statistics`, com dados sintéticos e regressões de chamados/dashboard/espelho/carros. Foram conferidos acesso direto, recarga/voltar, vazio versus falha, bloqueio de cadastros sem opções, audiência/permissões, disponibilidade indisponível e pendências fora do saldo. Capturas de computador/celular revisadas; resultados em `tmp/architecture-validation/personal-panels-browser-qa/results.json`. Tipos locais, arquitetura e builds isolados passaram. As três entradas web do estoque responderam no localhost com CSP para a API local; as três rotas internas consultadas continuaram protegidas e a API saudável. Hashes confirmaram preservação dos artefatos/configuração de produção, schema/migrations e auditoria. Nenhum teste escreveu na base compartilhada.

Envio, devolução e transferência interna usam `InventoryTransfer` com UUID de requisição e `InventoryTransferItem` por unidade. Selecionar origem, destino, tipo de movimento, até 100 patrimônios, motivo e PIN. Envio exige interno → cliente e unidades disponíveis; muda a condição para `EM_USO`. Devolução exige cliente → interno, aceita uma parte das unidades e permite indicar `ATIVO` ou `EM_MANUTENCAO`. Transferência interna preserva a disponibilidade de unidades ativas. Nenhuma dessas operações cria/exclui patrimônios ou altera a sequência dos códigos.

Movimentos por unidade preservam ambos os locais, quantidade 1 e referência `CLIENT_SHIPMENT`, `CLIENT_RETURN` ou `INTERNAL_TRANSFER`. Validação, mudança de local/condição, ledger de movimentos, timeline e auditoria estão na mesma transação. Locais e patrimônios são bloqueados em ordem estável. Repetir o mesmo UUID/payload retorna a operação existente; reutilizá-lo com outro payload é conflito. A interface mantém o UUID quando há erro e o formulário não muda, evitando duplicação por falha de conexão.

Quando o tipo exige aprovação, registrar `ApprovalRequest.requestType = CUSTODY_TRANSFER` e manter a custódia na origem. A aprovação usa o fluxo existente, exige PIN/permissão e outro usuário, confere novamente a disponibilidade e mantém o destino selecionado. Não reserva unidades implicitamente. Rejeição mantém a origem. O histórico abre popup com unidades, motivo, datas e aprovação/rejeição para quem tiver permissão.

Saída e entrada legadas e alteração direta de local não podem desanexar patrimônio de cliente nem trocar destinos classificados, contornando PIN/aprovação. Reversão de uma movimentação estruturada restaura local/condição anteriores somente quando não existe movimentação posterior nem mudança de condição. Caso contrário, usar uma nova transferência ou devolução, preservando o histórico. Histórico de operação concluída permanece concluído após uma reversão; o vínculo de reversão está no movimento original.

Na consulta por cliente, listar código, produto/marca, empresa/unidade, local, condição e data do envio comprovada pelo movimento atual. Sem evidência estruturada de envio, mostrar a data como não comprovada, sem usar `updatedAt` ou texto livre.

### Preparação da configuração real — 18/09/2026, 17h19

Após autorização para iniciar estoque/reposição, nova consulta `READ ONLY` reconheceu **2.632 patrimônios e 127 SKUs**. Os três locais continuam sem classificação e não há estoque principal ou mínimos configurados. O almoxarifado existente contém **1.873 patrimônios, dos quais 1.869 estão ativos**; existem ainda 727 patrimônios não baixados sem localização. São instantâneos de consultas diferentes: os números anteriores permanecem como evidência histórica, não como saldo atual.

Foi preparado um relatório privado de revisão e um CSV com os produtos, quantidades vinculadas/ativas no almoxarifado e campos vazios para os mínimos desejados. Os arquivos ficam fora do repositório, sem credenciais ou cadastros de usuários. O plano é classificar **o cadastro existente** como interno e principal; não foi executada escrita. A identificação da conta interna responsável é necessária para a auditoria da configuração, e os mínimos dependem dos valores informados pelo usuário. Os demais locais e patrimônios sem localização continuam aguardando classificação operacional explícita.

As três entradas de estoque compilam no localhost, as rotas internas permanecem autenticadas e a API está saudável. Não houve alteração de código, schema, migrations ou processos de produção nesta preparação.

### Identificação aplicada do estoque principal — 18/09/2026, 18h20

Após o usuário informar sua conta interna responsável, a conta ativa e sua permissão de atualização de locais foram conferidas em leitura. Foi aplicada a identificação do cadastro existente **Almoxarifado skyline** como `INTERNAL` e estoque principal, pelo serviço de locais publicado. A operação e seu registro `LOCATION_UPDATED` foram confirmados na mesma transação, com o responsável informado, dados anteriores/atuais e indicação de classificação inicial. O estado anterior foi salvo em relatório privado fora do repositório.

A transação confirmou preservação dos outros locais, dos vínculos e condições dos patrimônios, das quantidades totais e dos mínimos. Nenhum patrimônio foi movimentado ou associado ao almoxarifado como consequência da configuração. Não houve migration, alteração de código ou reinício da API.

Após a gravação, os leitores publicados foram novamente conferidos em `READ ONLY`: o depósito contém **1.873 patrimônios**, com **1.869 disponíveis**; o total global permanece 2.632 patrimônios/127 SKUs. Permanecem 727 patrimônios não baixados sem localização e 20 em outros locais sem classificação. Há um estoque principal, dois locais pendentes e nenhum mínimo configurado. Os quatro alertas do depósito decorrem de saldo zerado com saída recente, não de mínimos presumidos. A identificação habilita as consultas atuais de disponibilidade, mas não conclui o fluxo de estoque por cliente/projeto descrito adiante.

Entradas de estoque no localhost, autenticação das rotas internas e saúde da API foram reconferidas. Os indicadores usam a atualização periódica existente de 30 segundos; a interface também permite atualizar manualmente.

### API e publicação

- `GET /inventory/custody/options` e `assets`: `inventory.view`, projeção pública sem credenciais/CPF/contatos.
- `GET /inventory/custody/transfers`: `inventory.historico`; paginação até 100.
- `POST /inventory/custody/transfers`: envio/transferência interna, `inventory.bipar_saida`.
- `POST /inventory/custody/returns`: devolução, `inventory.bipar_entrada`.
- Aprovação/rejeição continuam em `/inventory/approvals/:id/{approve,reject}`, com as respectivas permissões existentes.
- Identificar/criar local usa permissões `locations.update/create` e auditoria; Administrador mantém seu bypass existente.

Migração aditiva `20260918050000_asset_custody`: campos opcionais em `Location`, duas tabelas com RLS sem política pública, índices/FKs e restrição de classificação; aplicada na publicação autorizada da R1. Alterações futuras exigem conferir drift e todas as migrações pendentes, gerar client com a API identificada parada e coordenar API/web conforme [implantação](implantacao.md). Não aplicar seed/backfill automaticamente. Esta revisão não altera backend/schema ou dados.

Validação: `pnpm test:inventory:custody` usa Nest/Prisma reais em PGlite descartável; verifica atualização aditiva, PIN/RBAC, custódia exclusiva, retentativas, devolução parcial, aprovação, concorrência de requisições, reversão e rollback completo com falha de auditoria injetada. A interface usa Chrome/Next isolados em `pnpm test:inventory:custody:browser`. Artefatos em `tmp/architecture-validation/custody-{api,browser}-qa/`; não são uma validação da massa de produção.

### Fluxo confirmado de estoque por cliente e projeto — 18/09/2026

O usuário confirmou que os locais continuam sendo cadastrados pela equipe conforme a necessidade. Cada cliente deverá ter uma consulta de estoque, inclusive quando não possuir itens, com total por cliente e separação por projeto. Essa consulta representa os patrimônios sob sua custódia; não presume um novo depósito físico nem cria locais em massa.

Na saída para cliente, selecionar a origem, o cliente e **um projeto pertencente a esse cliente**, além dos patrimônios. O destino deve manter esses vínculos para permitir consultar onde cada unidade está e em qual projeto é usada. Envios e devoluções continuam preservando os registros de movimentação e auditoria. Um estoque por cliente não deve reunir os projetos sem possibilidade de identificar o destino individual.

**Diferença para a implementação atual:** `Location` já permite vincular cliente e projeto, mas o projeto é opcional e o formulário de envio seleciona um local previamente cadastrado. A consulta agrupada de todos os clientes e a exigência de projeto no envio ainda precisam de implementação. Preservar os locais e movimentos existentes; o local legado genérico `Cliente` e os patrimônios sem localização não recebem vínculos por suposição.

Foi entregue um Excel com os **127 produtos/SKUs** do levantamento das 17h19, quantidades ativas no almoxarifado e uma coluna amarela de quantidade mínima, inicialmente vazia. Mínimos são definidos por produto/local interno, não por patrimônio individual. A planilha tem filtros, cabeçalho fixo e validação de números inteiros de zero a um milhão; foi reaberta e conferida com o levantamento, com prévias visuais revisadas. Preencher o arquivo não aplica configurações no banco.

Para gerar ou preencher a planilha, não é necessário informar e-mail. Nas configurações pela interface, a auditoria usa automaticamente a conta autenticada. Na preparação das 17h19, o e-mail foi solicitado para identificar o responsável por uma aplicação manual ainda pendente naquela consulta. As aplicações posteriores do estoque principal e dos mínimos usaram a conta informada e os serviços publicados, conforme os registros datados deste guia.

### Conferência de destinos na timeline legada — 18/09/2026, 19h00

Após o usuário informar que os destinos antigos foram anotados na timeline, uma consulta `READ ONLY` reconheceu **846 eventos manuais em 743 patrimônios**. Desses patrimônios, 671 estavam sem local, sendo 661 `EM_USO` e dez baixados; 56 estavam em local interno e 16 em local não classificado. Esses números descrevem somente os patrimônios com anotações, não todos os itens sem localização na base.

A timeline combina movimentos, OS, etiquetas e `AssetEvent`; o evento manual guarda texto e data de registro, sem vínculo estruturado de cliente/projeto. Foram encontrados 47 patrimônios com movimentação posterior à última anotação, incluindo entradas no almoxarifado. Usar o texto antigo como destino atual pode contrariar o histórico posterior. A data da anotação não comprova a data do envio.

Foi preparado um levantamento privado fora do repositório, agrupado por última anotação, com código/produto, condição/local atuais, movimentos posteriores e candidatos de cliente/projeto. Correspondências por nome, abreviação ou projeto são sugestões para conferência; 94 patrimônios `EM_USO` sem local tinham menção a um único cliente e projeto cadastrado como candidatos. Nomes ambíguos, diferenças de grafia, projetos não identificados e uso interno continuam separados. Nenhum vínculo foi confirmado ou gravado por essa análise.

A regularização depende de confirmar a custódia atual e os cadastros corretos de cliente/projeto. Deve preservar notas, saídas, reversões e auditoria existentes, registrar a correção com sua evidência e distinguir a data da regularização da eventual data histórica comprovada. Não contabilizar uma segunda saída nem apresentar um envio novo como se fosse o evento antigo. Na consulta das 19h00, o lote ainda não estava confirmado para aplicação.

### Primeiro lote legado regularizado — 18/09/2026, 19h12

O usuário confirmou a presença atual dos dois grupos com cliente/projeto identificados e esclareceu o cliente e nome do projeto de um terceiro grupo ambíguo. O lote revisado contém **143 patrimônios**, todos `EM_USO`, sem local e com as anotações/movimentos originais inalterados desde a conferência. Outros textos semelhantes do mesmo cliente não foram incluídos na autorização desse lote.

Foi aplicada uma manutenção administrativa específica, com prévia `READ ONLY`, plano imutável dos IDs, backup durável antes da escrita e transação única com bloqueio dos patrimônios. Três locais de custódia de cliente/projeto foram cadastrados pelo serviço publicado de locais; dois projetos foram reutilizados e um cadastro de identidade `Project` foi criado com o nome informado. Não foi criado serviço operacional, agendamento ou estado de instalação por suposição. Os três locais originais, inclusive o genérico `Cliente`, permaneceram intactos.

A correção preenche somente `Asset.currentLocationId` nos 143 itens confirmados, preservando condição, SKU, motivo da saída e códigos. Acrescenta uma anotação de regularização e auditoria `ASSET_CUSTODY_REGULARIZED` por item, com evidência original, estado anterior/atual e identificador do lote; o fechamento usa `LEGACY_CUSTODY_REGULARIZED_BATCH`. Repetir o mesmo plano identifica o lote já aplicado antes de escrever. Não foram criados movimentos de quantidade nem `InventoryTransfer`: esta operação não representa um novo envio. Os fluxos normais de envio/devolução continuam exigindo PIN, autorização e suas regras existentes.

Conferência independente após o commit confirmou **2.632 patrimônios**, preservação integral das **1.709 movimentações, 846 anotações originais e 127 mínimos**, mais 143 notas/auditorias de regularização. Os leitores publicados reconhecem 143 itens nos três estoques de clientes e mantêm a data do envio como não comprovada. O depósito continua com 1.869 disponíveis e 42 produtos críticos; há 584 patrimônios não baixados sem local globalmente. Não houve exclusão de item, alteração de schema, reinício ou publicação de aplicações.

Foi entregue uma planilha privada com **534 patrimônios pendentes em 49 grupos de anotação**, campos separados para sugestões/confirmações e exceções por item, mais os 143 regularizados e 66 internos/baixados preservados no detalhamento. São os 743 patrimônios do levantamento original; itens sem anotação não estão automaticamente incluídos. As confirmações restantes precisam de nova revisão do estado atual e dos projetos antes de outra manutenção. A regularização genérica ainda não está disponível como formulário no sistema; o fluxo futuro não deve reaplicar automaticamente este lote.

### Classificação informada pela conversa — 18/09/2026, 20h34

O usuário passou a informar as decisões pela conversa por estar perdendo o preenchimento da planilha. Para os destinos deste levantamento legado, confirmou: anotações com nome de pessoa, Skyline ou marketing representam **uso interno**; as demais representam **clientes**. Referências a clientes cadastrados não devem ser confundidas com pessoas que usam equipamentos.

A regra e sua aplicação aos 49 grupos restantes foram salvas em registros privados com data, evidência e os IDs dos patrimônios, além de um resumo legível. A conferência inicial separou 30 patrimônios de uso interno, 495 de clientes e nove aguardando esclarecimento: sete anotados somente como setor e um par notebook/fonte cujas notas apenas vinculam os equipamentos. **Às 20h38, o usuário confirmou TI e o par notebook/fonte como uso interno**, resultando em **39 patrimônios internos e 495 de clientes**, sem pendência de categoria neste levantamento. A confirmação adicional foi salva em novo registro, preservando a decisão anterior. A planilha não foi sobrescrita; as próximas decisões podem ser preservadas diretamente pela conversa.

Essa etapa registra a categoria de destino, sem aplicar novos vínculos no banco. Uso interno não comprova o local físico nem devolve equipamentos ao saldo disponível do almoxarifado; uso por cliente ainda depende de identificar seu cadastro e projeto. Os 143 itens já regularizados e os 66 internos/baixados preservados continuam separados. Antes de outra regularização, conferir o estado atual dos itens e os destinos específicos, preservando histórico e auditoria conforme o procedimento anterior. A regra deste levantamento não substitui a seleção estruturada de destino nos novos envios.

### Segundo lote legado regularizado — 18/09/2026, 21h02

O usuário confirmou quatro destinos atuais para **218 patrimônios**: 87 na Brasal Incorporações/projeto Casa Cor, 65 na Santa Inês/projeto Santa Inês, 62 na EBM/projeto Sala Espaço EBM e quatro na EBM/projeto Goiânia Shopping. Variações de maiúsculas, espaços e a grafia antiga “Basal” foram vinculadas somente porque estavam dentro do grupo apresentado e confirmado. A divisão dos quatro itens do Goiânia Shopping foi confirmada separadamente.

Uma prévia `READ ONLY` comparou IDs, condição, local anterior, última anotação e movimentações com o levantamento preservado. Todos continuavam `EM_USO`, sem anotação ou movimentação posterior. O plano imutável, as respostas do usuário e o backup integral anterior à escrita foram salvos fora do repositório. Na aplicação, foram criados os projetos Casa Cor, Santa Inês e Goiânia Shopping; o projeto existente Sala Espaço EBM foi reutilizado. Quatro locais de custódia de cliente/projeto foram cadastrados pelo serviço publicado.

A regularização atualizou o local dos 218 itens, dos quais 204 estavam sem localização e 14 estavam em um local legado genérico. Foram acrescentadas uma anotação e uma auditoria por patrimônio, mais a auditoria do lote. Não houve novo envio, movimento de quantidade ou inferência da data histórica de saída. Condição, SKU, código e motivo anterior foram preservados.

Conferência independente em transação `READ ONLY` validou os 218 itens, quatro locais, quatro projetos envolvidos e 218 auditorias individuais. Permaneceram **2.632 patrimônios, 1.709 movimentações e 127 mínimos**; as 989 anotações anteriores foram preservadas e receberam 218 registros de regularização. Os patrimônios não baixados sem localização passaram de 584 para 380. A repetição da prévia reconheceu o lote aplicado e não executou escrita.

Após esse lote, restam no levantamento classificado **277 patrimônios de clientes** que ainda exigem cliente/projeto específico e **39 de uso interno** que exigem local interno, totalizando 316. Os 66 itens originalmente preservados como internos/baixados continuam fora desses grupos. Cada novo lote deve repetir a conferência de estado atual antes de qualquer aplicação.

### Terceiro lote legado regularizado — 18/09/2026, 21h07

O usuário confirmou **147 patrimônios** em três destinos: 50 na FR Incorporadora/projeto T4, incluindo o item cuja anotação dizia somente “FR”; 53 na Neolar Incorporadora/projeto Neolar; e 44 na Scorsatto/projeto Scorsatto. Os três projetos e seus locais de custódia foram cadastrados porque ainda não existiam.

A prévia `READ ONLY` conferiu que todos permaneciam `EM_USO`, sem nova anotação, movimentação ou mudança de local desde o levantamento. O lote usou plano imutável com as respostas, backup anterior à escrita, transação, anotação e auditoria por patrimônio. Os 147 estavam sem localização e passaram aos destinos confirmados. Nenhum movimento de quantidade ou data histórica de envio foi criado.

A verificação independente em transação `READ ONLY` confirmou os 147 itens, três locais, três projetos e 147 auditorias, preservando **2.632 patrimônios, 1.709 movimentações, 127 mínimos e as 1.207 anotações anteriores**. Depois das 147 notas de regularização, há 233 patrimônios não baixados sem localização. A repetição da prévia reconheceu o lote já aplicado sem nova escrita.

Restam no levantamento classificado **130 patrimônios de clientes** e **39 de uso interno**, totalizando 169 ainda sem destino estruturado. Os itens internos não devem entrar no saldo disponível do almoxarifado apenas por terem sido classificados como internos.

### Quarto lote legado regularizado — 18/09/2026, 21h22

Após o usuário autorizar a divisão apresentada, foram regularizados **85 patrimônios**: 31 na Plano & Plano/projeto Plano & Plano, 28 na Integra/projeto Integra e 26 na Direcional/projeto Riva. Os sete itens cuja anotação mencionava somente “DIRECIONAL” foram incluídos no projeto Riva pela confirmação explícita, junto aos 19 que já mencionavam Riva.

A prévia `READ ONLY` confirmou que todos os itens permaneciam `EM_USO`, sem localização e sem alteração posterior no histórico. Foram criados os três projetos e locais de custódia correspondentes. Plano imutável, backup, transação, anotações e auditorias seguem o procedimento dos lotes anteriores; não houve movimento de quantidade ou data de envio presumida.

Conferência independente validou os 85 itens, os três projetos/locais e as 85 auditorias. Foram preservados **2.632 patrimônios, 1.709 movimentações, 127 mínimos e as 1.354 anotações anteriores**. Após 85 novas notas de regularização, permanecem 148 patrimônios não baixados sem localização. A prévia repetida reconheceu o lote aplicado sem nova escrita.

Restam neste levantamento **45 patrimônios de clientes** e **39 de uso interno**, totalizando 84 sem destino estruturado.

### Quinto lote legado regularizado — 18/09/2026, 21h25

O usuário confirmou que os 17 itens anotados como “Uso na Impper” e “Em uso na impper” pertencem ao mesmo projeto Impper Casa Pietra dos 49 itens regularizados no primeiro lote. A prévia verificou o destino existente e o estado atual: 15 itens estavam sem localização e dois no local legado genérico, todos `EM_USO` e sem alteração posterior.

Os 17 patrimônios foram vinculados ao projeto e local de custódia já existentes, sem criar cadastro duplicado. O procedimento preservou códigos, condições, motivo anterior, movimentos e anotações; acrescentou somente o registro de regularização e sua auditoria. Não houve movimento de quantidade ou inferência de data histórica.

A verificação independente confirmou os 17 itens, o destino reutilizado e as 17 auditorias. Permaneceram **2.632 patrimônios, 1.709 movimentações, 127 mínimos e as 1.439 anotações anteriores**; os não baixados sem localização passaram de 148 para 133. A repetição reconheceu o lote aplicado sem escrever novamente. Restam **28 itens de clientes e 39 internos**, totalizando 67 sem destino estruturado.

### Sexto lote legado regularizado — 18/09/2026, 21h27

Com autorização do usuário, foram regularizados **12 patrimônios**: cinco na Magen/projeto Magen, quatro na GPL/projeto GPL e três na BRDU/projeto BRDU. A prévia confirmou que todos permaneciam `EM_USO`, sem localização e sem alteração posterior. Foram criados os três projetos e locais de custódia correspondentes.

O lote usou plano imutável, backup, transação, anotação e auditoria por item, sem criar movimento de quantidade ou data histórica. A conferência independente validou os 12 itens, projetos, locais e auditorias, preservando **2.632 patrimônios, 1.709 movimentações, 127 mínimos e as 1.456 anotações anteriores**. Depois das 12 notas novas, há 121 patrimônios não baixados sem localização. A repetição da prévia não realizou nova escrita.

Restam neste levantamento **16 itens de clientes** que exigem destino específico e **39 de uso interno** que exigem local interno.

### Sétimo lote legado regularizado — 18/09/2026, 21h30

Após o usuário autorizar a investigação dos grupos finais, registros operacionais relacionaram de forma consistente uma anotação a **Avanço Aval** e outra a **HCON Engenharia e Construções**. Os demais grupos sem cadastro compatível permaneceram separados. A prévia confirmou que os dois patrimônios continuavam `EM_USO`, sem localização e sem alteração posterior.

Foram criados os projetos de identidade Avanço e HCON e os respectivos locais de custódia. Nenhum serviço operacional foi inferido. Plano imutável, backup, transação, notas e auditorias preservaram o procedimento dos lotes anteriores, sem movimento de quantidade ou data histórica presumida.

A verificação independente confirmou os dois itens, projetos, locais e auditorias, preservando **2.632 patrimônios, 1.709 movimentações, 127 mínimos e as 1.468 anotações anteriores**. Os não baixados sem localização passaram de 121 para 119, e a repetição da prévia não escreveu novamente. Restam **14 itens de clientes** sem cadastro/destino comprovado e **39 internos** sem local estruturado.

### Oitavo lote legado regularizado — 18/09/2026, 21h34

O usuário confirmou a criação dos cadastros de identidade **Limeira**, **Cataguá** e **SOMOS**, sem CNPJ ou dados não informados. Foram criados respectivamente os projetos Limeira, Paulínia e SOMOS e seus locais de custódia, atendendo cinco, cinco e quatro patrimônios. A relação Cataguá/Paulínia também constava no motivo original das cinco saídas; os outros nomes vieram das anotações e da confirmação do usuário.

A prévia `READ ONLY` confirmou os 14 itens `EM_USO`, sem localização ou alteração posterior, e a ausência de clientes com os mesmos nomes. O lote usou IDs e respostas imutáveis, backup, transação e auditoria para clientes, projetos, locais e patrimônios. Nenhum CNPJ, serviço operacional, movimento de quantidade ou data histórica foi inventado.

Conferência independente validou os três clientes, três projetos, três locais, 14 itens e suas auditorias, preservando os cadastros anteriores, **2.632 patrimônios, 1.709 movimentações, 127 mínimos e as 1.470 anotações anteriores**. Restam 105 patrimônios não baixados sem localização no conjunto global. A repetição da prévia reconheceu o lote sem nova escrita.

Com este lote, os **495 itens classificados como clientes** na revisão restante estão regularizados. Permanecem **39 patrimônios classificados como uso interno** aguardando definição de local interno; essa classificação não os torna disponíveis no estoque principal.

### Lote interno e encerramento da revisão — 18/09/2026, 21h41

Com autorização explícita, foi criado o local `INTERNAL` **Uso interno - Skyline** e vinculados os 39 patrimônios classificados por nomes de pessoas, Skyline, marketing, TI e o par notebook/fonte. A prévia confirmou que todos permaneciam `EM_USO`, sem localização ou alteração posterior. A condição foi preservada, portanto nenhum desses itens integra o saldo disponível do almoxarifado principal.

O lote usou plano imutável, backup, transação, nota e auditoria por patrimônio. Não foram criados movimentos de quantidade, projetos, clientes ou datas históricas. Conferência independente validou o local interno, os 39 itens `EM_USO`, as 39 auditorias e a ausência de qualquer item ativo/disponível nesse grupo. Permaneceram **2.632 patrimônios, 1.709 movimentações, 127 mínimos e as 1.484 anotações anteriores**; após 39 notas de regularização, existem 66 patrimônios não baixados sem localização no conjunto global. Esses 66 não são automaticamente parte do levantamento revisado.

A consolidação dos planos e recibos confirmou **677 patrimônios regularizados sem ID repetido**: 143 do primeiro lote e os 534 que estavam pendentes, compostos por 495 de clientes e 39 internos. Os outros 66 registros internos/baixados do levantamento original permaneceram preservados fora dos lotes. Assim, os 743 patrimônios da revisão da timeline estão integralmente explicados entre regularizados e preservados. A repetição do lote interno reconheceu a aplicação existente sem escrever novamente.

### Regularização complementar das saídas legadas — 19/09/2026, 13h40

Uma consulta posterior encontrou 66 patrimônios `ATIVO` sem localização que não faziam parte do levantamento pela timeline: todos possuíam uma saída legada sem destino e sem referência estruturada, mas nenhum `AssetEvent`. O usuário confirmou seis destinos de cliente — quatro itens para Plano & Plano/projeto Plano & Plano, um para EBM/projeto Sala Espaço EBM e um para SOMOS/projeto SOMOS — e confirmou oito motivos genéricos de uso como uso interno. Os 14 itens passaram a `EM_USO` nos locais confirmados, com anotação e auditoria individual. As saídas históricas foram preservadas e não foi criado movimento com data atual.

A regra operacional também foi confirmada: uso interno permanece `EM_USO` no local **Uso interno - Skyline**, fora do saldo disponível; baixa e perda encerram definitivamente a disponibilidade, mas não excluem o patrimônio nem sua timeline. Com base nessa regra, outros 12 itens explicitamente marcados como uso interno foram vinculados ao local interno, e 13 motivos legados iniciados por “Baixa” mais um motivo “Perda” foram corrigidos de `ATIVO` para `BAIXADO`. Todos receberam evento e auditoria, mantendo código, SKU, motivo e movimento anterior.

As duas aplicações usaram plano imutável, backup privado anterior, bloqueio, transação e conferência independente. O local **Uso interno - Skyline** passou de 39 para **59 patrimônios**; os itens `BAIXADO` passaram de 12 para **26**; as **1.709 movimentações** permaneceram intactas. Restaram **26 patrimônios não baixados sem localização**: 16 saídas rápidas e dez registros de manutenção, ainda sem destino confirmado. Os arquivos privados das aplicações estão em `legacy-custody-20260919-133615` e `legacy-final-internal-20260919-134047`, fora do repositório.

### Encerramento dos itens sem localização — 19/09/2026

Após confirmação do usuário, foi criado o local interno **Manutenção** para os dez patrimônios com esse motivo. Eles passaram de `ATIVO` para `EM_MANUTENCAO` e continuam fora do saldo disponível enquanto estiverem nesse local. O estado não é definitivo: depois do reparo, a entrada individual ou em lote pode devolver o patrimônio a um almoxarifado Skyline e registrar o retorno na timeline.

Também foi criado o local interno **Outros** para as 16 saídas rápidas legadas sem destino identificado. Esses patrimônios passaram a `EM_USO`, permanecem fora do saldo disponível e podem ser revisados individualmente depois. O local legado genérico **Cliente** foi excluído porque estava vazio e não possuía patrimônios, movimentos, transferências nem mínimos vinculados; os estoques estruturados de clientes e projetos não foram alterados.

A aplicação utilizou prévia somente leitura, backup privado, plano imutável, bloqueio e uma única transação. Cada patrimônio recebeu evento de timeline e auditoria, sem criar uma nova saída ou alterar o movimento histórico. A conferência posterior confirmou **zero patrimônios não baixados sem localização**, dez itens em Manutenção, 16 em Outros e preservação das **1.709 movimentações**. O plano, o estado anterior e o recibo ficam em `remaining-stock-20260919-194954`, fora do repositório.

## Painel de estoque e reposição

### Mínimos preenchidos e aplicados — 18/09/2026, 18h48

O usuário entregou o PDF preenchido da planilha de mínimos. As sete páginas foram renderizadas/revisadas, e extrações independentes por coordenadas e texto concordaram nos **127 SKUs**, com **95 mínimos positivos e 32 zeros explícitos**. Códigos, nomes e valores foram comparados à lista original e ao catálogo atual; espaços finais nos nomes não representam novos produtos. Nenhum valor veio da coluna de saldo ativo ou de instruções externas ao pedido. Não havia campo de mínimo em branco ou ambíguo.

Uma prévia `READ ONLY` conferiu o estoque principal, a conta ativa/permissão de configuração e a ausência de mínimos anteriores. Os 127 valores foram gravados atomicamente pelo serviço publicado de estatísticas/estoque, com auditoria por configuração e backup privado do estado anterior. Limites opcionais de alta saída não foram presumidos. A operação usa somente as tabelas de configuração/auditoria; não altera patrimônios, localização, condições ou movimentos.

Conferência independente após a gravação confirmou todos os valores persistidos, incluindo os zeros, e seus registros de auditoria. O leitor publicado reconheceu **127 reservas configuradas, 39 produtos abaixo do mínimo e outros três zerados com saída recente**, totalizando 42 críticos; mostra as dez prioridades conforme o limite existente. Identidade/SKU/local/condição dos patrimônios foram comparados por impressão digital antes, durante e depois da importação, com resultado idêntico. Permaneceram **2.632 patrimônios**, 1.869 disponíveis no depósito, 727 não baixados sem localização e 20 em outros locais sem classificação.

Arquivo original, extrações, prévia, backup e evidências ficam privados fora do repositório. Não houve migration, alteração de código, reinício ou publicação de aplicações. Entradas do localhost, proteção das rotas e saúde da API foram reconferidas. A conclusão é dos mínimos do estoque principal; a saída obrigatória para cliente/projeto e a consulta de todos os estoques de clientes continuam pendentes.

`/dashboard/estoque/painel` consulta `GET /inventory/statistics` com `inventory.view`. Os contextos são depósito interno (principal ou outro selecionado), clientes (todos ou empresa) e visão geral. O total de patrimônios da empresa é global; saldo e manutenção têm contexto indicado. Sem depósito identificado, a disponibilidade é **indisponível**, não zero. A consulta por cliente não compõe disponibilidade interna; as unidades e datas de envio ficam na [consulta por cliente](#custódia-por-cliente-e-devolução-parcial).

Janela inicial é de 30 dias corridos, entre instantes UTC com início inclusivo/fim exclusivo. Rankings usam `SUM(qty)` por SKU, não número de registros. Entradas e devoluções compõem o ranking de entrada; envios, saídas sem destino e baixas compõem saída. Transferências, movimentos revertidos, reversões e casos não classificados são apresentados separadamente. Texto de motivo não comprova consumo definitivo nem posse de cliente. Movimentação negativa é não classificada e não reduz artificialmente as quantidades positivas.

`StockMinimum` define reserva por SKU/local interno, única e auditada; configuração exige `settings.manage`. Mínimo aceita zero explícito, nunca um valor presumido. Limite de alta saída em 30 dias é opcional e positivo, para calibrar por natureza do produto; sem ele, giro ordena prioridades existentes e não inventa classificação de alta saída. Locais com reserva não podem ser reclassificados para cliente.

Prioridades: abaixo da reserva ou zerado com saída recente são críticos reais. Item saudável com saída acima do limite explicitamente configurado é **atenção complementar**. Ordenar críticos antes das atenções, zerados antes dos demais, maior saída recente, maior falta para reserva e SKU. Exibir até dez e indicar a quantidade total de críticos; se houver menos, não completar com itens fictícios/saudáveis classificados como críticos. Sem reserva, mostrar essa ausência. A falta para reserva é a diferença positiva entre mínimo e disponível; não é compra automática. Nenhuma cobertura em dias nem previsão de compra pendente é inferida.

Dados atualizados a cada 30 segundos, com horário de atualização e recuperação manual. Falha inicial não inventa indicadores; falha de atualização conserva somente dados do mesmo contexto/filtro com aviso. Componente `InventoryDashboardView` é leitura pura; configuração fica em diálogo separado da funcionalidade.

Migração aditiva `20260918060000_stock_minimums`: tabela/FKs/índices/restrição de valores e RLS sem política pública; aplicada na R1. API de locais consulta reservas e impede sua reclassificação incompatível. Validações descartáveis: `pnpm test:inventory:statistics` e `pnpm test:inventory:statistics:browser`; artefatos em `tmp/architecture-validation/inventory-statistics-{api,browser}-qa/`.

### Área integrada e movimentações por destino — 19/09/2026

A rota `/dashboard/estoque` concentra o painel, saldos, patrimônios, histórico, relatórios, bipagem, entradas, saídas e identificação de locais. As rotas antigas `/dashboard/estoque/painel` e `/dashboard/estoque/clientes` apenas mantêm compatibilidade e exibem a mesma área integrada. Novas funções de estoque não devem criar outra página isolada quando couberem nessa navegação.

Para dar entrada de um item ainda ausente do catálogo, o perfil `Técnico` pode cadastrá-lo em **Cadastros → Itens** pela permissão `catalog.create_sku`. A entrada continua exigindo `inventory.bipar_entrada` e PIN. Essa permissão não libera cadastro de categorias nem edição ou exclusão de itens; veja [autenticação e permissões](autenticacao-e-permissoes.md#permissões-rbac).

No painel, o contexto **Estoques Skyline** sem local selecionado consolida todos os locais `INTERNAL`. Um local específico limita saldo e movimentos àquele estoque e habilita sua configuração de mínimos. O contexto **Clientes e projetos** exclui locais internos, inclusive quando “Todos os clientes” estiver selecionado, e apresenta métricas próprias: patrimônios nos clientes, projetos atendidos, manutenção, baixas dos últimos 30 dias, itens mais usados, itens com mais baixas e projetos com mais patrimônios. Indicadores de reposição aparecem somente quando existe um estoque interno específico selecionado.

Saídas individuais e em lote para cliente exigem empresa e projeto; o destino persistido é o local `CLIENT` vinculado ao projeto. Os patrimônios saem de seus locais internos reais, passam para `EM_USO` e geram movimento estruturado, auditoria e evento de timeline. Entradas de patrimônio existente não pedem origem: ela é obtida da custódia atual. Entrada em lote aceita até 100 patrimônios, escolhe um destino `INTERNAL`, registra a condição de retorno e grava o texto informado na timeline de cada item. As operações em lote usam UUID de requisição e auditoria como proteção contra repetição.

A consulta de patrimônios sempre exige contexto explícito `CLIENT` ou `INTERNAL` na interface. “Todos os clientes” nunca inclui estoque Skyline; “Todos os estoques Skyline” nunca inclui locais de clientes. Transferências não são iniciadas na consulta de patrimônios: devoluções ficam em Entrada/Entrada em lote, e envios ficam em Saída/Saída em lote.

### Estoque automático de novos clientes — 19/09/2026

O cadastro de uma nova empresa cria, na mesma transação, um local vazio `CLIENT` chamado `Estoque - <nome do cliente>`, vinculado à empresa e sem projeto presumido. A regra vale para o cadastro interno e para a empresa nova criada durante a aprovação de uma solicitação. Selecionar uma empresa existente na aprovação não cria outro estoque. A operação grava auditoria e uma falha impede também a criação parcial da empresa.

Esse local representa o estoque geral do cliente. Ele não elimina a separação por projeto: saídas de patrimônio continuam exigindo um local `CLIENT` vinculado ao projeto selecionado. A alteração não executa backfill nem cria locais para clientes antigos.

A API foi publicada em 19/09/2026, às 11h24, e republicada a partir do commit `4f5ef70` após a consolidação no Git. Não houve migration ou escrita de teste. Health local/público e proteção da rota de empresas foram conferidos; a regra entra em ação somente nos próximos cadastros de empresa.

## Invariantes operacionais

- Não apagar movimentos para corrigir saldo; alterações precisam preservar rastreabilidade e auditoria.
- Baixa é definitiva para a disponibilidade, mas não exclui o cadastro: o patrimônio `BAIXADO`, seus movimentos e sua timeline permanecem consultáveis em Patrimônio. Perda é um motivo de encerramento definitivo e segue a mesma preservação histórica.
- Item de uso interno permanece `EM_USO` em local interno específico e não compõe o saldo disponível dos almoxarifados.
- Item em **Manutenção** permanece `EM_MANUTENCAO`, fora do saldo disponível, mas pode retornar por uma entrada individual ou em lote com registro na timeline.
- O local **Outros** guarda saídas legadas ainda sem destino específico. Seus itens permanecem `EM_USO` e indisponíveis até revisão; esse local não representa cliente ou almoxarifado disponível.
- Validar patrimônio/SKU/local, quantidade disponível e regras do tipo de movimento no caminho correspondente.
- Código de patrimônio utiliza sequência por prefixo, com `SKY` como padrão e 5 dígitos. A sequência existente não pode ser decrementada/removida nem os códigos reutilizados.
- Falhas de operações compostas não devem deixar movimentação/saldo parcialmente aplicados; preservar os limites transacionais existentes.
- PIN e autorização continuam no servidor para ações sensíveis. Consultar [autenticação](autenticacao-e-permissoes.md).

## Backfill de saídas legadas

Executar na raiz, após revisar alvo e escopo. O default é dry-run, com lote default de 500:

```powershell
pnpm --filter @zyllen/api backfill:product-exits-ledger
```

Variáveis opcionais: `BACKFILL_BATCH_SIZE` (inteiro positivo) e `BACKFILL_DRY_RUN`. **`BACKFILL_DRY_RUN=false` habilita escrita** no banco configurado; exigir planejamento explícito e backup, nunca como parte automática de setup. A sintaxe `VAR=valor comando` dos documentos antigos é de shell Unix, não PowerShell.

O script é previsto como backfill idempotente. Isso não dispensa análise da massa real, reconciliação e revisão do resultado.

## Reconciliação

Compara projeção do ledger e saldo materializado:

```powershell
pnpm --filter @zyllen/api reconcile:stock-ledger
```

`RECONCILE_OUTPUT_FILE` salva relatório JSON no caminho configurado; `RECONCILE_INCLUDE_ZERO_DIFF` inclui diferenças zero. Arquivos de relatório com dados reais não devem ser versionados.

O registro de 24/04/2026 tinha zero saldos/movimentos. Resultado sem massa não certifica a consistência do banco atual.

## Retorno e incidentes

As flags `FF_LEDGER_UNIFIED_READ`/`FF_LEDGER_UNIFIED_WRITE` do runbook antigo não são consumidas pelo código atual. Não documentar sua troca como rollback funcional.

Em incidente, preservar ledger, sequência, relatório de reconciliação e auditoria. Revisar uma correção/retorno compatível com o estado dos dados; quando necessário, pausar a operação afetada. Não remover `AssetCodeSequence`, decrementar `currentValue` nem desfazer migrations/dados em massa.

## Referências

- [Migrations e banco compartilhado](banco-de-dados.md).
- [Implantação](implantacao.md).
- [Contratos de etiqueta e Zebra](etiquetas-e-impressao.md).
