# Plano de evolução operacional e painéis — ZYLLEN

**Data:** 17/09/2026. **Atualização:** 18/09/2026. **Estado:** etapas 1 a 7 implementadas, API/migrations publicadas e R1 aceita pelo usuário. R2 implementada localmente; API/migration de carros também publicadas após autorização. R3 implementada no localhost. Estoque principal identificado e auditado às 18h20; mínimos dos 127 SKUs preenchidos/aplicados e conferidos às 18h48. Outros locais, consulta agrupada dos estoques de clientes e saída obrigatória por cliente/projeto pendentes. Conferência dos cadastros pela conta real e frontend Vercel pendentes. Preventivas aguardam escolha da fonte. Escolhas provisórias de viagens permanecem registradas. **Origem:** prompt de desenvolvimento encaminhado pelo usuário nesta conversa e esclarecimentos posteriores.

**Refinamento:** o usuário relatou problemas por área e pediu tratá-los posteriormente, em etapas separadas. O diagnóstico e os requisitos atuais estão em [refinamento por etapas](#refinamento-por-etapas--relato-de-18092026). Nenhuma correção ou publicação faz parte deste registro de triagem.

Este planejamento compatibiliza o prompt com o código atual. A análise foi feita nos fontes, contratos e schema Prisma; não houve consulta à massa de produção. Quantidades reais, localização principal, qualidade dos históricos e preenchimento de registros antigos precisam de diagnóstico específico antes das etapas que dependem desses dados.

## Definições confirmadas pelo usuário

- A nova gestão de projetos terá somente serviços de **instalação ou desinstalação**. Essa restrição não remove os outros tipos da agenda que já existem para outros usos.
- **Cada projeto terá um serviço**, conforme confirmação posterior do usuário. Não haverá agrupamento de várias execuções em um projeto operacional.
- As **viagens serão cadastradas no sistema**, começando pela Agenda existente e sua apresentação no calendário, conforme proposta confirmada pelo usuário. Uma tela própria, se necessária, consultará os mesmos registros.
- O **link do painel será destinado ao próprio usuário**, para acompanhamento pessoal e somente de leitura. No relato de refinamento, confirmou acesso pelo link **sem login**, em ambiente isolado, sem acesso à gestão. Quando acessado por conta autenticada, o painel deverá funcionar como aba normal na sidebar. Essa separação ainda não está implementada; o uso em TV continua não confirmado.
- **Skyline representa o depósito principal**, onde os itens ficam disponíveis antes de serem enviados aos clientes. Essa interpretação foi confirmada pelo usuário. Aproveitar o local existente e conferir sua associação na implementação; não se refere a CNPJ, código de patrimônio ou novo cadastro de empresa.
- **Critérios iniciais de reposição confirmados:** saldo disponível no depósito, mínimo configurável por item e saídas dos últimos 30 dias. Priorizar baixa disponibilidade em relação à reserva e maior saída relevante. Os valores de mínimo serão configurados por item; o exemplo de 5 telas continua ilustrativo, sem constituir uma reserva aprovada para um produto real.

## Objetivo e limites

Evoluir a gestão de projetos de instalação/desinstalação, a visibilidade das instalações e viagens, a posse de patrimônios por cliente e os indicadores operacionais. Apresentar as dashboards em um painel central para o próprio usuário, com acesso somente de leitura, alternância automática e controles manuais.

Cada frente terá gestão e consultas próprias. Compartilhar infraestrutura e definições de indicadores, sem criar vínculos automáticos entre projetos, chamados e patrimônio além do escopo solicitado. O cadastro operacional alimenta as dashboards; o painel central apresenta as dashboards disponíveis.

Usar **ZYLLEN** nos textos novos. Skyline permanece como denominação informada para o estoque principal, cuja identificação no cadastro de locais ainda precisa ser conferida. Não renomear identificadores técnicos existentes por causa da grafia.

## Diagnóstico original — antes das entregas de 17/18 de setembro

| Frente | Encontrado no código | Lacuna para o prompt |
|---|---|---|
| Clientes e projetos | `Company` e `Project`, com cadastro de nome, endereço, cidade/UF e outros dados. Projetos pertencem a clientes e são usados por usuários externos, OS, agenda e acompanhamentos. | `Project` não tem status de execução, marcadores de serviço, urgência nem datas reais de conclusão/cancelamento. O cadastro existente não equivale à gestão operacional pedida. |
| Agenda/calendário | `Schedule`, instaladores internos, recorrência, consultas de conflitos e calendário FullCalendar com seleção e alteração de datas. Tipos de instalação, manutenção, desinstalação, suporte e outros. | Datas inicial/final e pelo menos um instalador interno são exigidos na criação. Não atende ao serviço ainda sem data ou à execução somente por terceiros. Faltam viagem explícita, marcador, Google Maps separado e datas reais de conclusão. |
| Terceiros e setores | `ContractorUser` para prestadores e `InternalUser` para colaboradores; setor é texto opcional no colaborador. | Agenda só relaciona executores internos. Não encontrei um cadastro estruturado de viagens nem um modelo de equipes/setores para execução de serviços. |
| Patrimônio e estoque | `Asset` individualizado, código único, `currentLocationId`, status, movimentações com quantidade, PIN, auditoria e timeline que reúne movimentações, OS, etiquetas e eventos manuais. | `Asset` e `Location` não possuem vínculo estruturado de posse com `Company`. Saída em lote registra motivo/evento e retira o local atual; não exige selecionar cliente. |
| Indicadores de estoque | Totais de SKUs/patrimônios, status, movimentações em 7/30 dias e distribuição por local. Saldos atuais agrupam patrimônios por SKU/local. | Faltam rankings por quantidade e período, estoque mínimo e priorização de reposição. Unidade no SKU e `qty` em movimentos não comprovam controle completo de consumíveis separado dos patrimônios. |
| Atendimentos | `Ticket`, origem `INTERNAL`/`CLIENT`, status, prioridade, abertura, primeira resposta, encerramento, duração, setor, mensagens e anexos. Também já existem portal e endpoints de clientes. | Dashboard compacta com indicadores e períodos ainda precisa ser evoluída. Os tipos da nova apresentação devem usar os valores reais `INTERNAL`/`CLIENT`, preservando o valor persistido. |
| Dashboard inicial | Cartões com assunto, resumo, solicitante e técnico; popup de detalhes; contadores separados; alerta após uma hora. Mudança anterior validada no código local. | Reaproveitar essa entrega. Não há confirmação de publicação nem necessidade de refazê-la. Extrair apresentação sem ações para a futura dashboard de leitura. |
| Acesso por link | Compartilhamento de anexos com token opaco, hash persistido, expiração, revogação e auditoria. | Esse recurso autoriza arquivos específicos; não autoriza dashboards. Reaproveitar o padrão técnico em um recurso próprio de acesso ao painel. |
| Preventivas | O prompt informa que a fonte será fornecida depois. | Estrutura e indicadores dessa fonte não foram informados. Manter como frente futura. |

Referências verificadas: [schema Prisma](../../apps/api/prisma/schema.prisma), [cadastro de clientes/projetos](../../apps/api/src/modules/clients/clients.service.ts), [serviço de agenda](../../apps/api/src/modules/schedule/schedule.service.ts), [contratos de agenda](../../packages/shared/src/schedule/schemas.ts), [movimentações de estoque](../../apps/api/src/modules/inventory/inventory.service.ts), [consultas de estoque](../../apps/api/src/modules/inventory/inventory-queries.service.ts), [timeline](../../apps/api/src/modules/assets/assets.service.ts), [chamados](../../apps/api/src/modules/tickets/tickets.service.ts) e [compartilhamento existente](../../apps/api/src/modules/media/media.service.ts).

## Escopo solicitado e recomendações

As entregas obrigatórias deste plano correspondem aos itens solicitados/confirmados do prompt. As seguintes decisões são **recomendações de implementação**, sujeitas à compatibilização com as regras de negócio:

- Suportar vários serviços por projeto, porque o modelo existente já admite vários agendamentos por projeto. Isso não comprova como o usuário define um projeto comercial; confirmar essa definição antes de fechar o modelo.
- Organizar a posse dos patrimônios usando os locais existentes, com vínculo estruturado de cliente/unidade, mantendo uma única fonte de localização atual.
- Incluir devolução parcial e validação de concorrência na mesma frente de posse, para que a saída tenha um caminho consistente de retorno.
- Usar alternância de uma dashboard por vez como apresentação inicial; intervalo sugerido de 30 segundos, configurável. Pausar a alternância mantém a atualização dos dados.

Preparação com início/prazo próprios, cobertura em dias, prazo de reposição, itens sem giro, previsão de compras e personalização da ordem do painel ficam como evolução. Não são funcionalidades automaticamente aprovadas.

## Proposta para a base de projetos e serviços

### Preservar a identidade dos projetos existentes

Manter `Company`/`Project` e suas relações atuais. Acrescentar uma camada operacional vinculada ao projeto, que identifique quais registros participam da gestão de execução. Não transformar automaticamente todo projeto antigo em projeto ativo.

Definição confirmada e implementada: um projeto operacional possui exatamente um serviço. `ProjectService.projectId` é único e preserva a identidade de `Project`; o serviço pode vincular um `Schedule` único ou permanecer pendente sem data. Cliente continua obrigatório como no cadastro existente. O estado do projeto é o do seu serviço, sem agregação de múltiplas execuções.

Para os registros da nova gestão, disponibilizar todos os campos do prompt: nome; marcador de modelo cadastrável; tipo de execução limitado a instalação/desinstalação; data prevista opcional; responsáveis internos/terceiros; setores envolvidos; endereço; link Google Maps separado; observações; status; urgência; cor escolhida pelo organizador; e indicação explícita de viagem. O marcador aparece acima do título. Marcadores de serviço não pertencem ao módulo de etiquetas Zebra.

Urgência, relevância para exibição, tipo de serviço e status são informações independentes. A cor escolhida não substitui a indicação textual de urgência nem a cor já usada para identificar instaladores no calendário.

### Evoluir a agenda existente

Um serviço pendente existe sem agendamento. Quando ganha data, vincula-se ao `Schedule` existente; esse agendamento é a fonte do intervalo previsto exibido na tabela e no calendário. Alterações por qualquer uma dessas visualizações atualizam a mesma fonte, com validação de responsáveis e conflitos.

Não criar um segundo calendário nem dois intervalos previstos editáveis sem sincronização. Preservar agendamentos avulsos e recorrências atuais; associar registros antigos somente quando houver identificação confiável. Na entrega 2, criação/alteração de agendamento, instaladores e recorrências passaram a ser transacionais; as alterações de projetos reutilizam a mesma transação da agenda.

Registrar início realizado, conclusão e cancelamento com datas próprias. `endDate` previsto e `updatedAt` não comprovam quando um serviço terminou. Registros antigos sem data real não devem receber uma data inventada para preencher métricas históricas.

### Status e contagens

Proposta de estados operacionais: pendente de agendamento, agendado/em preparação, em andamento, finalizado e cancelado. Compatibilizar os quatro estados atuais da agenda (`SCHEDULED`, `IN_PROGRESS`, `DONE`, `CANCELLED`) sem renomear em massa os registros persistidos.

Ativos é um agrupamento dos estados abertos, não um sexto estado. Como cada projeto possui um serviço, não há agendamento parcial nem status agregado. Sem agenda, o estado é pendente ou cancelado explicitamente; com agenda, vem de `Schedule.status`. As dashboards devem reutilizar essa definição.

| Indicador | Unidade e referência propostas |
|---|---|
| Projetos ativos | Projetos operacionais únicos não finalizados nem cancelados, situação atual. |
| Projetos em andamento | Projetos únicos no estado geral correspondente, situação atual. |
| Pendentes de agendamento | Projetos únicos na classificação definida para pendência; incluir os sem data prevista. |
| Agendados/em preparação | Projetos únicos nesse estado, sem somar novamente serviços ou recorrências como projetos. |
| Projetos finalizados no período | Projetos únicos com conclusão real identificada no período; definir também o tratamento de reabertura. |
| Projetos cancelados no período | Projetos únicos com cancelamento real identificado no período. |
| Instalações/desinstalações realizadas | Serviços concluídos do tipo correspondente, pela data real, não pela previsão. |
| Viagens previstas/realizadas | Deslocamentos únicos; previsão e realização explicitamente separadas. |

Exibir o período e o contexto de cada indicador. Padronizar fuso e limites de período no servidor; início inclusivo e fim exclusivo evitam contar o mesmo evento em períodos adjacentes.

## Instalações, desinstalações e viagens

Criar uma dashboard de leitura própria, alimentada pelos serviços, com próximas instalações, instalações marcadas como relevantes, até cinco últimas instalações concluídas, até cinco últimas desinstalações concluídas e próximas viagens interestaduais. Incluir totais de instalações/desinstalações concluídas e de viagens previstas/realizadas com período visível.

Recomendação de estrutura: identificar a sala, totem ou estrutura atendida dentro desta frente e registrar ciclos de instalação/desinstalação. Relacionar a desinstalação ao ciclo correspondente quando aplicável, preservando datas e ciclos anteriores. Esse vínculo não cria associação automática ao patrimônio do estoque.

Modelar a viagem como deslocamento explícito, com origem, cidade/UF de destino e datas de ida/retorno. Quando vários serviços compartilham o deslocamento, eles apontam para uma única viagem. A marcação de viagem do serviço deve manter relação consistente com esse registro; não usar texto de observação ou a passagem da data como confirmação de realização.

O cadastro no sistema está confirmado. Começar pela Agenda existente, com ação de cadastrar viagem e abertura dos detalhes no calendário. Se a organização dos registros justificar um painel específico, ele será outra visualização da mesma base de viagens, sem duplicar cadastro ou calendário. Viagem é deslocamento; não acrescenta um terceiro tipo de serviço à gestão de instalação/desinstalação.

Na preparação local da entrega 4, a origem é informada em cada viagem e a diferença entre as UFs determina a classificação interestadual, sem presumir cidade/base fixa. Essa escolha e as ações de início/fim são provisórias enquanto o usuário responde às perguntas enviadas. Registros antigos podem conter viagens descritas em texto; localizar e conferir antes de associá-los.

## Posse e localização dos patrimônios

Recomendação: ampliar `Location` com classificação de local e vínculo opcional a cliente/unidade. `Asset.currentLocationId` continua sendo a fonte da localização atual. Um patrimônio situado em local de cliente aparece na visão daquele cliente; depósitos como Skyline compõem a visão do estoque principal.

Identificar Skyline significa conferir qual local cadastrado representa o depósito onde ficam os itens antes de serem enviados aos clientes. Esse local será usado para separar disponibilidade no depósito de patrimônios em posse de clientes. A conferência é técnica, aproveitando o cadastro atual; o usuário não precisa fornecer um identificador interno nem criar outra empresa.

Evitar um campo de cliente atual independente do local que possa divergir dele. A condição do patrimônio, como em uso ou manutenção, permanece distinta da localização. Determinar quais condições compõem o saldo disponível, incluindo manutenção, trânsito e baixa quando aplicáveis.

O envio para cliente seleciona unidades identificadas, destino e confirmação com as regras atuais de PIN/aprovação. Na mesma transação, validar disponibilidade, atualizar o destino, registrar movimentações e preservar timeline/auditoria. Concorrência deve impedir dois destinos para a mesma unidade. Retentativas não podem duplicar a operação.

O envio preserva o total de patrimônios da empresa e reduz apenas a disponibilidade no depósito de origem. A devolução recomendada permite selecionar parte dos patrimônios e restaurar somente esses itens ao destino interno, mantendo os que ficaram no cliente e todo o histórico.

Revisar reversões e aprovações para preservarem o destino estruturado, sem restaurar cegamente um local antigo depois de outras movimentações. Não apagar eventos nem reutilizar códigos de patrimônio.

Para os registros legados, preparar levantamento e proposta de associação em modo de leitura/dry-run. Conferir casos ambíguos antes de gravar; nomes livres e timeline narrativa não comprovam sozinhos a posse atual. Exibir pendências de associação, sem atribuir cliente fictício nem classificar todos os patrimônios sem local como estoque Skyline.

## Dashboard de estoque e reposição

Evoluir os relatórios existentes para mostrar os itens que mais entram e mais saem, por quantidade, com período, local e tipos de movimentação visíveis. Número de registros de movimentação não equivale à quantidade movimentada.

Classificar transferência, envio para cliente, consumo, devolução, compra, ajuste e baixa conforme os fluxos existentes. Patrimônio transferido para cliente pode sinalizar necessidade de disponibilidade no depósito, mas não equivale a consumo definitivo nem implica compra automática.

Criar uma lista com capacidade para pelo menos dez prioridades, mostrando item, saldo disponível no local selecionado, saídas no período, mínimo configurado e motivo da atenção. Regra inicial confirmada: saldo disponível em relação ao mínimo por item e saída relevante nos últimos 30 dias; priorizar os abaixo da reserva e apresentar também itens zerados com saída recente. A regra exata de alta saída deve ser calibrada com os dados e a natureza do item antes da entrega.

Se existirem menos de dez críticos, mostrar os reais e o contexto. Eventuais posições de atenção complementar devem ser identificadas como tal, sem classificar itens saudáveis como críticos para completar a lista. Cobertura em dias só será calculada quando consumo e saldo tiverem base confiável.

### O que são os critérios de reposição

São regras para decidir quais itens merecem atenção e qual a ordem dessa atenção. A primeira versão confirmada usa:

1. **Saldo disponível no depósito:** itens realmente disponíveis para uma próxima saída, sem somar os patrimônios que estão nos clientes.
2. **Estoque mínimo por item:** quantidade de reserva que a operação deseja manter. Exemplo apenas ilustrativo: mínimo de 5 telas e saldo disponível de 2; o sistema sinaliza falta de 3 para recompor essa reserva.
3. **Saídas no período:** quantidade de cada item enviada/consumida nos últimos 30 dias, janela inicial confirmada, mantendo essas naturezas identificadas. Entre itens abaixo do mínimo, destacar os com maior saída relevante.
4. **Prioridade:** mostrar saldo zerado com saída recente e itens abaixo da reserva, explicando o motivo. A ação indicada pode ser compra, retorno ou remanejamento conforme a natureza da movimentação; patrimônio em cliente não é consumo definitivo.

O uso de saldo disponível, mínimo por item e saídas de 30 dias foi confirmado pelo usuário após a explicação. Os números do exemplo não são dados reais nem parâmetros aprovados. Estoque mínimo precisa ser configurável; sem mínimo informado, mostrar giro/saldo e identificar que a reserva ainda não foi definida. Cobertura em dias e prazo de entrega do fornecedor permanecem como evolução, depois de validar a base necessária. O painel sugere atenção, não gera compras automaticamente.

Permitir contexto de estoque principal, cliente e visão geral. Na visão do cliente, listar patrimônio, produto/modelo, data de envio e condição atual. Compras pendentes entram como reposição prevista somente depois de verificar que seus registros sustentam essa previsão.

## Dashboard compacta de atendimentos

Antecipar esta entrega porque seus dados básicos já existem e a melhoria dos cartões foi implementada anteriormente. É uma adaptação da sequência sugerida no prompt, motivada pela menor dependência de novas estruturas e pela continuidade do trabalho no dashboard inicial.

Reaproveitar `Ticket` e a origem `INTERNAL`/`CLIENT`. Na dashboard inicial, preservar a leitura das duas origens e oferecer filtro para internos/clientes, reaproveitando os mesmos cartões e dados. Não criar outro portal, login ou canal de chamados.

Indicadores da primeira entrega implementada: abertos no período, em atendimento agora, aguardando técnico, encerrados no período, espera média dos aguardando e quantidade que exige atenção. A distribuição por setor complementa os seis indicadores. A apresentação diferencia período histórico e situação atual.

Definição adotada: pendentes de atendimento correspondem a `OPEN` ainda sem técnico e sem encerramento. A espera média usa a idade desde a abertura desses pendentes. `WAITING_CLIENT` aparece como categoria distinta, sem ser tratado como falta de atendimento. `RESOLVED` e `CLOSED` têm rótulos próprios; para métricas históricas, usar `closedAt` de chamados encerrados, sem inferir data de resolução a partir de uma atualização genérica.

Manter a lista curta de atenção por idade desde a abertura e o alerta de uma hora já implementado. Preservar o popup completo no dashboard autenticado. A versão de leitura do painel central expõe somente os dados destinados à audiência do link e não oferece assumir/finalizar/mover.

## Painel central somente de leitura

Criar página fora dos layouts operacionais de edição, destinada ao acompanhamento pessoal do usuário, com dashboards de atendimentos, estoque, projetos e instalações/desinstalações/viagens. Cada dashboard também terá link direto. Preventivas entra no ciclo apenas quando estiver implementada e com uma fonte válida.

Controles solicitados: avançar automaticamente, pausar, retomar e navegar manualmente. Recomendação: uma dashboard por vez, intervalo configurável e seleção da dashboard por URL. Pausa permanece até retomar; atualização de dados é independente da alternância.

Para acesso sem login, criar recurso próprio de link de leitura com escopo, hash do token, revogação e política de validade. Reaproveitar a técnica dos links de mídia, sem ampliar a capacidade de um link de anexo nem inserir JWT administrativo na URL. Se a sessão existente for adequada à audiência, ela também pode servir ao acesso de leitura; não exigir login novo por padrão.

O destinatário está confirmado como o próprio usuário. Reutilizar sua sessão atual é uma opção, sem criar novo login. Se o acesso escolhido for sem login, o link exclusivo funciona como capacidade de leitura revogável dentro do escopo definido; a identidade pessoal não é verificada somente pela posse do link. Definir os campos com base nas dashboards solicitadas e nas permissões disponíveis, sem ampliar o escopo para uma página pública.

O servidor valida o escopo em cada consulta e devolve somente a seleção de indicadores/campos permitidos. O link não autoriza endpoints operacionais de escrita, nem detalhes privados de chamados e anexos por consequência. Tentar POST/PUT/PATCH/DELETE diretamente deve falhar. Nenhuma credencial de banco ou administração vai para o navegador.

Exibir período, contexto, última atualização e aviso de falha, mantendo o último dado com indicação de desatualização. Falha de uma dashboard não impede navegar pelas demais. Consultas agregadas e intervalos proporcionais evitam que cada painel mantenha dezenas de buscas completas desnecessárias.

Frequência inicial recomendada para os dados: 30 segundos, com consultas agregadas e cache compartilhado quando houver vários espectadores. Ajustar após medir tempo de resposta e carga; não confundir esse intervalo com o contador local de segundos ou com o tempo de alternância das telas.

## Etapas e entregas independentes

Executar uma etapa por vez, validar e registrar o resultado antes de avançar. Todas as entregas têm uso próprio, e as quatro primeiras dashboards não dependem da frente futura de preventivas.

| Etapa | Entrega | Dependência | Verificação principal |
|---|---|---|---|
| 0 | Diagnóstico complementar e definições operacionais | Análise dos fontes feita; faltam amostragem de dados e decisões indispensáveis de cada frente. | Relatório de campos existentes, dados legados e regras propostas, sem alterações na base real. |
| 1 | Dashboard compacta de atendimentos — implementada e validada localmente | Origem, status e datas existentes; reaproveita cartões/popup/alertas anteriores. | 8 cenários reais de API em banco descartável e 8 de interface aprovados; detalhes no registro abaixo. |
| 2 | Gestão de projetos e evolução da agenda — implementada e validada localmente | Um serviço por projeto confirmado; responsáveis/status definidos e legados preservados. | Cadastro sem data, agendamento posterior, internos/terceiros, marcadores, urgência, cor, tabela/calendário, conflitos e permissões; registro abaixo. |
| 3 | Dashboard geral de projetos — implementada e validada localmente | Etapa 2 com status e datas reais registrados. | Seis indicadores reconciliados por projetos únicos; pendentes sem data, período real, filtros, reabertura e histórico incompleto verificados. |
| 4 | Cadastro de viagens e dashboard de instalações/desinstalações/viagens | Serviços da etapa 2; identidade da estrutura e origem das viagens definidas. | Viagens cadastradas no sistema e apresentadas no calendário; últimas cinco pela conclusão real, ciclos preservados, viagem contada uma vez para vários serviços. |
| 5 | Estoque por cliente e envio estruturado; retorno parcial recomendado | Cadastros atuais de clientes, locais, unidades físicas, movimentos e timeline. | Posse exclusiva, operação integral, total da empresa preservado e histórico de envio/devolução consultável. |
| 6 | Dashboard útil de estoque e reposição | Etapa 5; natureza dos movimentos e mínimos definidos. | Rankings por quantidade/período/local; lista crítica verificável sem equiparar transferência a consumo. |
| 7 | Painel central para o próprio usuário, links de leitura e apresentação automática | Dashboards disponíveis e campos/forma de acesso compatíveis com uso pessoal. | Alternância, pausa persistente, links diretos, atualização e bloqueio de escrita/revogação efetivos. |
| 8 | Dashboard de preventivas | Fonte a ser fornecida posteriormente. | Diagnosticar primeiro; definir indicadores depois, sem comprometer as outras entregas. |

Não há prazo fechado nesta revisão: migração/associação dos legados e regras de viagem/posse ainda não foram dimensionadas. Estimar cada etapa após fechar suas decisões e a qualidade dos dados, sem tratar o calendário de execução de serviços como cronograma do desenvolvimento.

### Registro da entrega 1 — 17/09/2026

O usuário autorizou iniciar as implementações. A primeira entrega acrescenta a visão compacta acima dos cartões da dashboard inicial, filtros de origem e de período, datas personalizadas e aberturas por setor. O alerta oferece até três chamados mais antigos e abre o popup completo. Os tipos usam `INTERNAL`/`CLIENT`, conforme persistido.

As consultas agregadas pertencem ao módulo de tickets, com contrato compartilhado e componente de leitura próprio. O período filtra abertura/encerramento/setores, enquanto situação atual e idade incluem chamados anteriores. Administrador/Gestor têm visão geral; demais usuários consultam abertos e seus próprios atendimentos. Datas de calendário são convertidas para instantes UTC e o servidor usa início inclusivo/fim exclusivo. Encerramento sem data real não recebe data presumida; nenhuma associação de registros legados foi executada.

**Validação:** `pnpm check:architecture` aprovado; compilação isolada de shared/API, tipos do web e Next build aprovados; `pnpm test:tickets:statistics` com 8/8 cenários aprovados; `pnpm test:dashboard` com 8/8 aprovados. Foram conferidos computador, celular, filtros, erros, teclado, movimento reduzido, popup e ações de PIN. Artefatos ficam em `tmp/architecture-validation/{ticket-statistics-qa,ticket-dashboard-qa}/`. As instruções de reprodução estão em [frontend](frontend.md#visão-compacta-de-atendimentos).

**Publicação:** alterações locais, sem deploy. Esta etapa não altera o schema, exige migração ou preenche dados reais. API e frontend precisam ser publicados de forma coordenada conforme [implantação](implantacao.md#atualização-coordenada-com-a-api). Artefatos da API ativa, banco compartilhado e relatórios originais da auditoria foram preservados.

**Continuidade:** a cardinalidade foi confirmada pelo usuário e a gestão foi executada na entrega 2 abaixo. Preventivas continua aguardando sua fonte.

### Registro da entrega 2 — 18/09/2026

O usuário confirmou **um serviço por projeto**. A tela `/dashboard/projetos`, acessível pela navegação interna, permite criar/selecionar projeto de cliente, cadastrar instalação/desinstalação sem data, atribuir internos e/ou terceirizados, agendar depois, editar e consultar em tabela/calendário. Implementa marcador acima do título, urgência com ordenação, cor, setores, endereço, Maps, observações, indicação de viagem e destaque. O formulário também pode ser consultado em modo de leitura.

`ProjectService` mantém unicidade por `Project` e por `Schedule`. A agenda é a fonte do intervalo previsto e do estado quando agendado; nome/endereço usam o cadastro de projeto. Escritas relacionadas são transacionais e auditadas. Conflitos incluem responsáveis terceirizados e exigem confirmação para prosseguir; arraste conflitante é revertido. Início/conclusão/cancelamento usam datas reais, sem preenchimento presumido dos legados. Reaberturas mantêm a data anterior na auditoria. As regras atuais e permissões estão em [projetos e agenda](projetos-e-agenda.md).

**Validação:** arquitetura e build/tipos isolados aprovados. `pnpm test:projects` cobre 26 cenários de API/migração em PostgreSQL descartável, incluindo 8 regressões dos indicadores de chamados; `pnpm test:projects:browser` cobre 14 de interface, incluindo 8 regressões do dashboard de chamados. Computador/celular, teclado, leitura sem escrita, vazio, erro, recuperação, serviço único, terceirizado, fuso, conflitos, rollback e recorrências foram verificados. Artefatos: `tmp/architecture-validation/project-services-{api,browser}-qa/`.

**Publicação:** código e migração preparados localmente, sem deploy ou alteração da base compartilhada. Migração aditiva `20260918030000_project_operational_service`: quatro tabelas novas com RLS, índices/FKs e três timestamps opcionais da agenda. Conferir drift/pendências, gerar client e atualizar API/web de forma coordenada antes de disponibilizar a tela em produção. Sem associação automática de dados antigos.

**Continuidade:** dashboard geral de projetos executada na entrega 3 abaixo. Viagens (etapa 4) ainda precisam de origem/base e identidade de estrutura/ciclo; o checkbox de necessidade de viagem não cria deslocamento nem confirma realização.

### Registro da entrega 3 — 18/09/2026

O usuário autorizou avançar à próxima etapa. `/dashboard/projetos/painel`, acessível pela gestão de projetos, apresenta ativos, em andamento, pendentes, agendados, finalizados no período e cancelados no período. Traz filtros de serviço/período, totais atuais para reconciliação, histórico sem data real sinalizado, até cinco projetos ativos priorizados, atualização a cada 30 segundos e tentativa novamente. A tela é de consulta e reutiliza `schedule.view`.

Agregação não depende da paginação nem multiplica projetos por responsáveis. Situação atual independe do período. Histórico usa conclusão/cancelamento vigentes, com início inclusivo e fim exclusivo; reabertura retira a realização dos indicadores, mantendo a anterior na auditoria. Previsão e `updatedAt` não substituem datas ausentes. Falha inicial não inventa zeros; falha de atualização mantém dados do mesmo filtro com aviso de desatualização. Contrato de leitura e componente de apresentação podem ser reutilizados posteriormente pelo painel central sem incorporar formulários operacionais.

**Validação:** arquitetura, tipos e build isolados aprovados. `pnpm test:projects:statistics`: 36 cenários de API/migração aprovados, incluindo 26 regressões das etapas anteriores. `pnpm test:projects:statistics:browser`: 21 de interface aprovados, incluindo 14 regressões. Contagens, mais de uma página, múltiplos executores, fuso, reabertura, permissões, filtros, erro, dados desatualizados, recuperação, atualização, virada do dia, computador, celular e teclado conferidos. Artefatos: `tmp/architecture-validation/project-statistics-{api,browser}-qa/`.

**Publicação:** alterações locais, sem deploy nem escrita na base compartilhada. Esta etapa não cria migração adicional, mas depende de `20260918030000_project_operational_service`, da entrega 2, ainda não aplicada nesta sessão. Publicar API/web de forma coordenada conforme [implantação](implantacao.md). Regras atuais e API em [projetos e agenda](projetos-e-agenda.md#dashboard-geral-de-projetos).

**Continuidade:** cadastro de viagens e dashboard de instalações/desinstalações/viagens iniciados no registro 4 abaixo. A frente de identificação de estrutura/ciclos continua pendente da definição do usuário.

### Registro da entrega 4 — núcleo de viagens, 18/09/2026

O usuário autorizou a etapa de viagens. O cadastro único está preparado em **Agenda → Nova viagem** e `/dashboard/viagens`, com origem/destino cidade/UF, saída/retorno previstos, responsáveis internos/terceirizados e seleção de vários serviços. O calendário existente identifica viagem e abre o mesmo cadastro em popup, inclusive em leitura. Todas as páginas da Agenda são carregadas no calendário, para preservar viagens além dos primeiros 100 eventos. A gestão própria tem filtros e paginação. Cada projeto continua com seu único serviço de instalação/desinstalação.

A associação e a necessidade de viagem permanecem consistentes, sem transferência implícita ou cancelamento automático dos serviços. Conflitos consideram viagens e seus terceiros, com confirmação explícita; o próprio serviço da viagem pode sobrepor seu deslocamento. Escritas relacionadas são transacionais/auditadas e não fazem associações dos legados.

`/dashboard/operacoes` apresenta próximos agendamentos de instalação, instalações relevantes, até cinco últimas instalações/desinstalações concluídas pela data real e próximas viagens interestaduais. Totais usam todos os registros, viagem conta uma vez para vários serviços, períodos são visíveis e UTC, dados incompletos são sinalizados, atualização ocorre a cada 30 segundos e falhas/recuperação preservam a distinção entre zero e indisponível. O componente de leitura é separado dos formulários para reutilização futura.

**Escolhas provisórias:** preencher origem em cada cadastro, sem presumir uma base fixa; ações de iniciar/finalizar registram datas reais após confirmação. Finalização exige início, reabertura remove realização vigente dos indicadores e preserva datas anteriores na auditoria. As perguntas sobre origem, lançamento retrospectivo e estrutura/ciclo foram enviadas e ainda não respondidas. **Salas/totens e seus ciclos não foram implementados; a etapa 4 completa permanece pendente desse complemento.**

**Validação:** arquitetura, tipos e builds isolados aprovados. `pnpm test:trips`: 54 cenários de API/migração aprovados; `pnpm test:trips:browser`: 33 de interface aprovados, incluindo as regressões anteriores de chamados/projetos/agenda. Conferidos serviços compartilhando viagem única, responsabilidade terceirizada, conflitos, rollback, estados/datas reais, reabertura/auditoria, fuso, limites, permissões, calendário com mais de 100 eventos, filtros/paginação, falha/recuperação, teclado e computador/celular. Capturas revisadas visualmente, incluindo abertura pelo cabeçalho e legibilidade dos campos em leitura. Índice e 234 links locais conferidos; 754 arquivos fora do escopo preservados, incluindo artefatos/API em execução e auditoria original. Regras, artefatos e limitações no [guia de viagens e operações](viagens-e-operacoes.md).

**Publicação:** alterações locais, sem deploy ou alteração da base compartilhada. Migração aditiva `20260918040000_trips`: duas tabelas com RLS, coluna opcional de vínculo, índices/FKs; depende da migração de projetos da etapa 2. A API da agenda passa a depender dessas estruturas. Conferir drift/pendências, gerar client e publicar API/web de forma coordenada conforme [implantação](implantacao.md). Não usar seed, reset ou migrate dev. Evitar publicação isolada do frontend.

**Continuidade:** responder as escolhas acima e definir se haverá cadastro de estruturas/ciclos; a frente de estoque por cliente é a etapa 5 e exige diagnóstico técnico dos locais atuais. Não foi iniciada nesta entrega.

### Registro da entrega 5 — estoque por cliente, 18/09/2026

O usuário autorizou seguir as próximas implementações automaticamente e deixar a revisão geral de bugs para depois. `/dashboard/estoque/clientes` permite consultar patrimônio/produto/modelo/unidade/condição/data comprovada, identificar locais existentes e registrar envio, transferência interna e devolução parcial. Custódia vem somente do local atual; unidades sem local e locais não classificados são pendências explícitas, sem inferência por nome ou texto livre. O levantamento da massa real e a escolha do depósito existente não foram executados; há diagnóstico de leitura e seleção auditada para realizar esse mapeamento com conferência.

PIN, permissões e aprovação do tipo de movimentação preservados, com destino imutável e disponibilidade revalidada ao aprovar. UUID/payload mantido em uma retentativa; batch, movimentos, timeline, auditoria e localização são atômicos. Aprovações concorrentes e destinos conflitantes não podem duplicar a movimentação. Reversão antiga não sobrescreve custódia/condição posterior. Total, patrimônios e sequência dos códigos preservados.

**Validação:** 19 cenários de API/migração e 16 de navegador aprovados, incluindo regressões de chamados. Conferidos erro/retentativa, falha de auditoria com rollback completo, devolução parcial em manutenção, audiência/RBAC, origem/destino, paginação/seleção, teclado e celular. Tipos/build isolados aprovados; regras e publicação no [guia de estoque](estoque-e-patrimonio.md#custódia-por-cliente-e-devolução-parcial). API em execução e base compartilhada preservadas. Migração aditiva `20260918050000_asset_custody` preparada e não aplicada.

**Continuidade:** painel de estoque/reposição da etapa 6, depois painel pessoal da etapa 7; ambos autorizados nesta conversa. Revisão geral de bugs ao final, sem adiar correções que bloqueiem cada entrega.

### Registro da entrega 6 — estoque e reposição, 18/09/2026

`/dashboard/estoque/painel` apresenta contextos depósito interno/clientes/geral, quantidades de entradas/devoluções/envios/saídas/baixas e naturezas separadas. Patrimônios em cliente e em manutenção não são disponibilidade do depósito. Falta de depósito principal identificado é indisponibilidade explícita. Reservas por SKU/local interno e limite opcional de alta saída são configuráveis/auditados, sem números presumidos. Até dez prioridades reais, quantidade total de críticos e atenção complementar identificada. Sem compras automáticas, cobertura em dias ou previsão de recebimento sem evidência.

**Validação:** 17 cenários de API/migração e 13 de navegador aprovados, incluindo regressões de chamados. Quantidade diferente de número de registros, manutenção/custódia, mínimo ausente, mais de dez críticos, fuso, contexto, configurações, permissões, falha/recuperação e celular conferidos. Tipos/build isolados e arquitetura aprovados; 795 arquivos fora do escopo preservados. Regra e limites no [guia de estoque](estoque-e-patrimonio.md#painel-de-estoque-e-reposição).

**Publicação:** migração aditiva `20260918060000_stock_minimums` preparada e não aplicada. Não houve consulta à massa real nem mudança no processo da API/base compartilhada. Configurar identificação/mínimos reais depois de revisar mapeamento e publicar de forma coordenada; a classificação de locais passa a consultar reservas.

**Continuidade:** implementar o painel pessoal de leitura da etapa 7 com a sessão atual, quatro visões e controle de rotação independente das consultas; preventivas aguardam fonte e estruturas/ciclos aguardam decisão já solicitada.

### Registro da entrega 7 — painel pessoal, 18/09/2026

`/painel`, acessível pelo menu, reúne Atendimentos, Projetos, Instalações/viagens e Estoque, com a sessão interna e permissões atuais. Apenas consulta, sem ações operacionais dos chamados ou formulários de gestão. Link direto/cópia por visão contém somente seleção, intervalo e pausa; não expõe JWT nem cria acesso público. URL é validada contra as visões permitidas à conta.

Rotação de 30/60/120/300 segundos, anterior/próxima, seleção direta, pausa/retomada e atualização manual. Estado persiste por conta/navegador, com URL explícita prevalecendo. Atualização dos dados continua durante a pausa e não reinicia/retoma a rotação. Detalhe de chamado suspende a troca temporariamente e preserva a pausa escolhida. Falha de uma visão não impede navegar/consultar as demais, inclusive erro de apresentação isolado.

**Validação:** 18 cenários de navegador aprovados, incluindo oito regressões de chamados. Conferidos relógio/rotação/atualização independentes, pausa persistente, recarregamento, popup/alertas, permissões/audiências, falha/recuperação, link, leitura sem mutações e desktop/celular. Tipos/build isolados e arquitetura aprovados; 807 arquivos fora do escopo preservados. Regras no [guia do painel de acompanhamento](painel-de-acompanhamento.md).

**Conferência do localhost:** `/painel`, `/dashboard/estoque/clientes` e `/dashboard/estoque/painel` responderam HTTP 200. O web passou a resolver os contratos compartilhados pelo código-fonte, preservando o shared compilado utilizado pela API ativa. Dois envios de formulário com sessão/HTTP inteiramente simulados comprovaram os schemas de remessa e mínimo de estoque no servidor web existente; artefatos em `tmp/architecture-validation/localhost-contracts-qa/`. Isso não publica os novos endpoints nem aplica migrações.

**Publicação e pendências:** entrega local, sem migração própria. Backend depende das migrações anteriores, ainda não aplicadas; nenhuma base/processo de produção foi alterado. Preventivas (etapa 8) continuam reservadas até identificar fonte real. Estruturas/ciclos da etapa 4 aguardam resposta à pergunta já enviada; não houve criação fictícia ou substituição dos projetos existentes. Calibrar identificação dos locais, reservas e alta saída com os dados reais antes do uso operacional.

**Próxima frente:** revisão geral de bugs solicitada pelo usuário após as implementações disponíveis. Regressões e erros que impediam estas entregas foram corrigidos durante a validação; não declarar a massa de produção ou os complementos pendentes como concluídos.

### Ajuste de interface — união de Projetos e Agenda, 18/09/2026

Usuário aprovou reunir as duas áreas. Menu único **Projetos e Agenda**, com Projetos, Agenda e Equipe; calendário/lista completo, projetos sem data na lista e popup canônico por serviço. `/dashboard/agenda` mantém compatibilidade. Implementação somente no frontend, sem migração/deploy ou alteração dos dados reais. Referência principal: [Projetos e Agenda](projetos-e-agenda.md).

Validação: 40 cenários de navegador aprovados, com regressões anteriores, detalhe reaberto em cache, permissões, equipe/opções, filtros/todas as páginas, URLs, teclado e celular. Tipos, build isolado e arquitetura aprovados; 808 arquivos fora do escopo preservados. Regras de estruturas/ciclos e preventivas continuam com as pendências já registradas.

### 9. Estruturas e ciclos — 18/09/2026

O usuário autorizou executar os dois complementos restantes antes da fase de refinamento. Estruturas/ciclos implementados localmente conforme a recomendação: uma estrutura por serviço, identidade por cliente/nome, seleção explícita e vínculo permanente. Uma instalação inicia um ciclo; uma desinstalação exige a instalação correspondente concluída com data real. Tentativas canceladas e ciclos anteriores permanecem consultáveis. Consulta paginada apresenta datas reais, dias instalada e permite abrir o popup completo do projeto. Projetos antigos não foram associados automaticamente. Regras, API e migração adicional em [estruturas e ciclos](estruturas-e-ciclos.md).

Validação: 41 cenários de API/migração em PostgreSQL descartável e 46 de navegador aprovados, incluindo regressões anteriores. Tipos, builds isolados e arquitetura aprovados; 805 arquivos fora do escopo preservados e 263 links locais conferidos. Nenhuma migração ou publicação na base compartilhada foi executada.

**Preventivas:** a análise identificou `MaintenanceOS.formType = MANUTENCAO_TELA_SALA` com `formData.maintenanceType = PREVENTIVA | CORRETIVA`; há distinção explícita nas OS atuais. O prompt original, entretanto, prevê uma base a ser fornecida posteriormente e proíbe assumir fonte/campos/indicadores. Foi solicitada a escolha entre OS atuais, cadastro próprio ou fonte externa; ainda sem resposta. Não foram criadas métricas, periodicidades nem inclusão de uma visão vazia na rotação como entrega pronta. A frente 8 permanece pendente dessa decisão, não da implementação de estruturas.

## Decisões de negócio antes das respectivas etapas

| Decisão | Evidência atual e encaminhamento | Necessária antes de |
|---|---|---|
| O projeto operacional contém uma ou várias execuções? Cliente é obrigatório? | **Um serviço por projeto confirmado pelo usuário.** Entrega 2 preserva cliente obrigatório e a identidade `Project`; vínculo operacional único. | Resolvido para a etapa 2. |
| Como definir o status geral? | Com serviço único, o status vem da agenda quando existe; sem agenda, pendente ou cancelado explícito. Datas reais e reabertura documentadas no guia atual. | Regra adotada nas etapas 2/3. |
| Como identificar sala/totem e seus ciclos? | Entrega 9 adota cadastro por cliente/nome, uma estrutura por serviço e ciclos explícitos, após autorização de executar o complemento. A pergunta de cardinalidade foi enviada; não há associação automática de legados. | Implementado localmente; revalidar se houver necessidade de várias estruturas por serviço. |
| Qual a fonte das preventivas? | As OS atuais possuem classificação explícita `PREVENTIVA`, mas o prompt prevê outra base futura. Escolha solicitada entre OS atuais, cadastro próprio ou fonte externa, ainda sem resposta. | Etapa 8; necessária antes de definir indicadores e implementação dependente. |
| Qual é a origem/base das viagens e como confirmar realização? | Cadastro no sistema confirmado. Preparação local provisória: origem por viagem, iniciar/finalizar registram momentos reais e vários serviços compartilham uma viagem. Perguntas enviadas ainda sem resposta, sem publicação ou gravação de dados reais. | Revalidar escolhas antes da publicação da etapa 4. |
| Conferir o local Skyline e identificar unidades dos clientes. | Skyline está confirmado como depósito principal; localizar o registro correspondente em `Location` é uma conferência técnica. Nomes/associações reais ainda não foram consultados. | Etapa 5. |
| Quais itens são consumíveis e quais são patrimônios? Qual reserva configurar por item? | Critérios iniciais confirmados: saldo disponível, mínimo configurável e saídas dos últimos 30 dias. Falta classificar a natureza dos itens/movimentos e configurar valores reais de reserva; mínimo não aparece no SKU atual. | Etapa 6. |
| Qual forma de acesso pessoal usar? Computador, TV ou ambos? | Destinatário: o próprio usuário. Refinamento confirmado: link de leitura sem login e sem acesso à gestão; acesso autenticado como aba normal na sidebar. A entrega atual só usa sessão. TV ainda não confirmada. | Implementar no refinamento da etapa 7. |

Essas decisões não impedem estudar ou entregar as frentes independentes. Recomendações técnicas reversíveis podem ser resolvidas na implementação; regras de negócio indispensáveis devem ser confirmadas antes da etapa que depende delas.

## Organização da implementação

Seguir a [regra obrigatória de arquitetura](organizacao-da-arquitetura.md). Evoluir `features/tickets`, `schedule`, `inventory` e `clients`; criar funcionalidades de serviços/painel somente para responsabilidades novas. `app/` permanece como composição de rotas. Componentes comuns de apresentação não dependem das telas operacionais.

Na API, manter as regras de execução, posse e métricas nos módulos responsáveis. O módulo de apresentação coordena consultas de leitura e escopos do link; não reimplementa contagens ou movimentações. Compartilhar schemas/tipos por negócio em `@zyllen/shared`, preservando a interface pública.

Não carregar telas de edição no painel por iframe nem copiar serviços inteiros para construir indicadores. Reaproveitar componentes de exibição e contratos de leitura, separando ações operacionais da apresentação.

## Dados, validação e publicação

O banco é compartilhado com produção. Toda evolução de estrutura deve ser aditiva, com SQL revisado e implantação conforme [banco de dados](banco-de-dados.md). Não executar reset, migração de desenvolvimento, seed ou saneamento automático. Associação de legados é uma entrega explícita, com relatório de conferência e preservação do histórico.

Validar os riscos de cada etapa em ambiente descartável:

- Projetos/agenda: pendência sem data, responsáveis internos/terceiros, sincronização das duas visualizações, agendamento parcial, conflitos e recorrências sem dupla contagem.
- Indicadores: projetos únicos versus serviços/viagens, limites de período/fuso, conclusão real, cancelamento e ausência de histórico confiável. Diferenciar zero confirmado de dado indisponível.
- Patrimônio: dois envios concorrentes, falha no meio do lote, devolução parcial, aprovação/reversão com destino, unidades em manutenção/trânsito/baixa e total preservado.
- Estoque: soma das quantidades, filtros de origem/destino, consumo versus transferência, ausência de mínimo e menos de dez itens críticos.
- Painel: acesso direto, tentativas de escrita, escopo de cliente/dashboard, revogação/validade, pausa sem retomada involuntária, falha isolada e dados desatualizados.
- Interfaces: telas vazias, dados longos, erro de consulta, teclado e movimento reduzido; verificar celular/computador e TV se seu uso for confirmado.

Executar `pnpm check:architecture`, tipos e builds isolados nas mudanças de código, com regressões proporcionais. A documentação deste plano exige somente conferência de referências e índice. Preservar os relatórios originais da auditoria e os artefatos da API em produção.

Depois de cada entrega, registrar requisitos atendidos, recomendações incorporadas, regras adotadas, validação, migrações/associações necessárias e próximo passo. Atualizar o estado desta proposta e os guias atuais; checkboxes ou etapas deste plano não comprovam publicação. Publicar conforme [implantação](implantacao.md), considerando que push em `master` pode publicar o frontend.

## Preventivas e evoluções posteriores

A execução da frente de preventivas foi solicitada junto de estruturas, mas ainda precisa da escolha da fonte descrita na entrega 9. As OS atuais têm classificação explícita; não confundir manutenção corretiva com preventiva nem presumir periodicidade. Depois de definir a fonte, analisar campos, qualidade e vínculos para implementar indicadores e incluir a visão no painel. Não apresentar dados fictícios ou uma visão vazia como entrega pronta.

Revisar separadamente, depois das entregas principais, prazo de preparação, dias de cobertura, alertas por prazo de reposição, itens sem giro, reposições previstas e personalização do ciclo do painel. Cada ampliação precisa de fonte confiável e regra definida, sem ampliar silenciosamente o escopo.

## Refinamento por etapas — relato de 18/09/2026

**Escopo desta atualização:** registrar os problemas e conferir causas comuns. O usuário pediu tratar cada área depois, de forma exclusiva e separada. Preventivas continua pendente da escolha da fonte; não bloqueia esta triagem. As entregas locais e seus testes anteriores não comprovam publicação ou funcionamento integrado com a API acessada no navegador.

### Diagnóstico comum dos carregamentos

Verificação somente de leitura na API local, porta 3001:

| Recurso | Evidência | Consequência para a triagem |
|---|---|---|
| Projetos e opções de clientes | `/project-services/options` e `/project-services/statistics` retornam 404; módulo ausente de `apps/api/dist`. | O frontend novo consulta rotas indisponíveis. Falha de cadastro/listagem não comprova ausência de projetos ou clientes. |
| Viagens | `/trips/options` retorna 404; módulo ausente dos artefatos compilados. | Opções/cadastro não estão disponíveis nessa versão do backend. |
| Estruturas/ciclos | `/structures` retorna 404; módulo ausente dos artefatos compilados. | A consulta não alcança o cadastro implementado nos fontes. |
| Indicadores de estoque | `/inventory/statistics` retorna 404; controller ausente dos artefatos compilados. | Não é possível concluir que o estoque existente está vazio pela dashboard. |
| Indicadores de atendimentos | O controller compilado não contém `GET /tickets/statistics`; há a rota antiga `GET /tickets/:id`. | A mesma consulta é reutilizada no painel pessoal e na dashboard principal. O 401 observado sem autenticação não comprova a existência da rota estática de indicadores. Conferir o comportamento autenticado após alinhar as versões. |

O processo que atende a porta 3001 iniciou em 17/09/2026; os artefatos compilados ainda não incluem essas entregas. A integração precisa alinhar fontes, shared, Prisma Client, migrações pendentes e API/web conforme [implantação](implantacao.md). Não foi aplicado SQL, consultada a massa real ou alterado o processo durante o diagnóstico.

**Regra para todas as etapas:** consulta bem-sucedida sem registros deve apresentar estado vazio normal. Falha de conexão, rota indisponível, permissão ou erro do servidor deve permanecer identificável. Não converter indisponibilidade em lista vazia/zeros para esconder o problema. Validar as rotas efetivamente consumidas e as telas integradas, além dos testes isolados.

### Etapa R1 — Painel pessoal

Requisitos apresentados pelo usuário:

- Manter a seleção direta de visões no menu superior.
- Remover os botões de visão anterior/próxima, atualizar dados e copiar link da visão.
- Substituir o botão textual de pausa/retomada por um pequeno controle de player em um canto inferior. Manter nome acessível e indicação de ativo/pausado.
- Fixar o intervalo de troca em **60 segundos**, sem seletor de intervalo. Atualização dos dados continua independente da rotação.
- Corrigir os indicadores de atendimentos e validar o componente compartilhado com a dashboard principal.
- Corrigir as consultas de projetos/operações; sem registros cadastrados, apresentar mensagens neutras de vazio.
- Conectar os indicadores ao estoque que já está em uso. Depois de disponibilizar a API, conferir fonte dos saldos/movimentos, classificação de locais e identificação do depósito principal. Não criar um estoque paralelo nem inferir associações pelo nome.
- Acesso autenticado: painel como aba normal dentro do layout da gestão, com sidebar.
- Acesso pelo link: espelho isolado, sem login, apenas leitura e sem navegação para outras áreas. Exige um acesso próprio de leitura com escopo explícito e revogação, sem expor JWT da conta ou liberar os endpoints internos. Detalhes de chamados/anexos devem respeitar o escopo desse espelho; não herdar permissões da sessão interna.

**Critério de conclusão:** seleção direta, rotação fixa, player pequeno, visões alimentadas pela API disponível, vazio e falha distintos, layout interno normal e link externo isolado. Validar cada modo de acesso e bloquear escrita/acesso à gestão pelo link.

**Execução R1 — 18/09/2026:** interface e endpoints implementados localmente. Painel autenticado em `/dashboard/painel` com sidebar; espelho `/painel/espelho/<token>` sem login/sessão, com visões selecionadas e revogação. Seletores diretos, rotação fixa de um minuto e player inferior substituem os controles redundantes. Seleção manual pausa a troca. Projetos/operações vazios têm indicadores normais; erros reais permanecem identificáveis. Estoque consulta o contexto geral dos registros existentes, preservando a regra de disponibilidade por classificação interna. Detalhes e alerta de chamados permanecem; arquivos privados não são publicados pelo espelho. Referência principal: [Painel de acompanhamento](painel-de-acompanhamento.md).

**Validação e integração:** 21 cenários de API/migração descartável e 25 de navegador aprovados, cobrindo os dois acessos, rotação, falhas, popup, compartilhamento, permissões e celular, com regressões de atendimentos. Tipos/build e arquitetura isolados aprovados; 807 arquivos fora do escopo preservados. Conferidos os dois acessos no localhost existente com API simulada. Inspeção real somente de leitura confirmou estoque existente e seis migrações pendentes: `20260918030000_project_operational_service`, `20260918040000_trips`, `20260918050000_asset_custody`, `20260918060000_stock_minimums`, `20260918070000_structure_cycles` e `20260918080000_panel_mirrors`. A comparação com o schema real confirmou mudanças aditivas; os vínculos de custódia já presentes na migração anterior foram confirmados na conferência final. O conjunto das seis foi conferido em PostgreSQL descartável quanto à preservação, equivalência ao schema e RLS. As tabelas novas não existem no banco e a API ativa está desatualizada. Nenhum SQL/processo de produção foi alterado. R1 depende da publicação coordenada e validação integrada para atender integralmente seu critério; testes isolados não resolvem sozinhos o carregamento no ambiente em uso.

### Etapa R2 — Dashboard principal

- Corrigir os mesmos indicadores de atendimentos da R1, preservando cartões, detalhes e alertas de tempo.
- Reorganizar o layout para comportar resumo de estoque, agenda dos carros e próximos projetos.
- Exibir dados existentes e permitir abrir a área correspondente de forma natural, respeitando permissões.
- Diagnóstico inicial: a agenda organizava compromissos/responsáveis/viagens, sem cadastro de veículos/reservas. Durante R2, o usuário escolheu um local separado para tratar dos carros; implementação em [carros e reservas](carros-e-reservas.md), sem pressupor reserva automática a partir de uma viagem.

**Critério de conclusão:** dashboard com informações de atendimentos e resumos operacionais solicitados, hierarquia visual legível, dados reais, estados vazios claros e navegação natural em computador/celular.

**Execução local R2 — 18/09/2026:** dashboard coloca atendimentos e resumos operacionais lado a lado em telas amplas; no celular, atendimentos vêm primeiro. Estoque/projetos/viagens/carros são apresentados simultaneamente, com estados de carregamento/vazio/falha independentes e links para gestão. Próximos cinco compromissos mostram datas, clientes e responsáveis, com detalhes sem sair da dashboard. Colunas dos indicadores de chamados acompanham a largura do componente. Monitor de clientes carrega todas as páginas, distingue empresas por ID e sinaliza falha sem inventar ausência. Detalhes no [frontend](frontend.md#dashboard-e-painel-de-acompanhamento).

**Refinamento solicitado pelo usuário — 18/09/2026:** removidos Acesso Rápido, botão Personalizar e código de seleção/persistência dos atalhos. A navegação usa a sidebar e os links dos resumos operacionais; o Monitor de Atenção — Clientes vem após atendimentos e resumos. Esta alteração não publica a API/migration de carros, que continua pendente.

**Correção após tentativa de cadastro — 18/09/2026:** API ativa ainda não oferecia carros e retornava 404. A interface agora distingue essa indisponibilidade do estado vazio normal: aviso específico na tela/resumo e cadastro desabilitado até opções disponíveis. Consulta sem registros mantém mensagem vazia e permite o primeiro cadastro. Ativação da API/migration permanece pendente; detalhes em [carros e reservas](carros-e-reservas.md#lista-vazia-e-área-indisponível).

Carros têm entrada própria na sidebar, cadastro e agenda de reservas independente. Responsável interno, intervalo, conflito obrigatório por veículo, cancelamento com histórico, retentativa idempotente e auditoria atômica; disponibilidade pela agenda não comprova devolução física. Na preparação, diff real somente em leitura confirmou duas tabelas aditivas; checksums das 14 migrations anteriores preservados e uma pendência. Backup privado das 59 tabelas restaurado, migration/API candidata verificadas em outra cópia com seis checks integrados. Até essa preparação, nenhum SQL/processo/artefato da produção havia sido alterado. Backend/migration foram publicados posteriormente após autorização, conforme registro abaixo. Regras e evidências no [guia de carros](carros-e-reservas.md).

**Validação R2:** 20 cenários de API/migration descartável, 34 de navegador e três verificações da cadeia completa de migrations aprovados. Builds isolados de shared/API/web, tipos locais do frontend e arquitetura passaram (392 fontes, 1.265 dependências). Conferência de hashes confirmou API/shared/Prisma/configuração em produção preservados, serviço saudável e localhost com CSP correta. Pré-publicação verificou 196 arquivos do candidato, 14 checksums aplicados, única pendência revisada, configuração de segurança e seis checks da cópia restaurada. Não houve teste de escrita pela conta real nem publicação no Vercel. Capturas/evidências públicas são sintéticas; dados copiados do banco ficam somente no backup privado.

**Publicação de carros autorizada — 18/09/2026:** após a confirmação do usuário, criado dump privado adicional e reconferida a única pendência. Shared compilado, Prisma regenerado com API parada, API compilada e migration de carros aplicada por `migrate deploy`. Serviço voltou em produção, PID 21840, sem watch; configuração/chaves preservadas. Nove checks de HTTP/metadados e cinco leitores reais em `READ ONLY` aprovados: opções/reservas/indicadores de carros e estatísticas anteriores disponíveis. Agora são 15 migrations aplicadas, sem pendência/falha, com RLS nas duas tabelas novas. O ajuste da interface passou em 38 cenários de navegador. Não houve cadastro fictício em produção nem publicação web no Vercel. Conferência do envio pela conta real continua pendente. Evidências no [guia de carros](carros-e-reservas.md#publicação-autorizada--18092026).

**Horários explícitos de carros — refinamento solicitado em 18/09/2026:** criação/edição separam data de início e horário de retirada, data de término e horário de devolução. Campos obrigatórios, conversão de hora local para instantes UTC e validação de término posterior ao início mantêm o contrato/API existente. Reservas futuras ocupam o carro somente dentro do intervalo; o resumo atualiza a cada 30 segundos enquanto a dashboard estiver aberta e visível. Nenhuma alteração de backend/schema ou escrita de teste na base compartilhada. Referência: [Carros e reservas](carros-e-reservas.md).

Validação dos horários: **40/40 cenários de navegador**, incluindo dez de carros, tipos locais, arquitetura e compilação isolada aprovados. Criação/edição, horários ausentes/inválidos, devolução no dia seguinte, conversão de fuso e regressões de conflitos/cancelamento conferidos. Capturas de computador/celular revisadas, página disponível no localhost, API saudável e hashes de produção preservados. Frontend Vercel não publicado nesta revisão.

**Correção de digitação e padrão brasileiro — 18/09/2026:** após relato de impossibilidade de preencher horas, a reserva passou a usar texto editável em **DD/MM/AAAA** e **HH:MM**, com formatação de dígitos ao sair do campo, validação de calendário/hora e edição preservada. A digitação foi conferida no frontend real do localhost, em sessão limpa e com API interceptada somente para leituras sintéticas. Nenhuma nova mudança de banco/backend. Regras no [guia de carros](carros-e-reservas.md).

Validação da correção de digitação: **42/42 cenários de navegador**, incluindo doze de carros. Digitação/backspace, saída do campo, calendário/ano bissexto, limites de hora, persistência local/UTC e regressões anteriores aprovadas. Tipos locais, arquitetura, compilação isolada, capturas de computador/celular, links e preservação dos hashes de produção conferidos.

**Reserva resumida na faixa da agenda — 18/09/2026:** a imagem do usuário esclareceu que os campos citados eram os filtros da lista. A faixa passou a oferecer **Reserva rápida**, com carro/data/hora de retirada e devolução e **Reservar agora**, usando a conta logada como responsável e o endpoint existente. Filtros foram reunidos em **Filtrar reservas**, com datas brasileiras e estado independente. O formulário completo continua disponível. Sucesso mostra o registro na lista; falha mantém o rascunho/identidade e alteração de payload gera nova solicitação. A faixa renderizada e a digitação passaram no frontend real do localhost, com leituras sintéticas interceptadas. Backend/banco permanecem inalterados. Referência: [Reserva rápida na agenda](carros-e-reservas.md#reserva-rápida-na-agenda).

Validação da faixa: **46/46 cenários de navegador**, incluindo dezesseis de carros, com envio direto, responsável da conta, visibilidade na lista, independência dos filtros, conflitos/retry/identidade, permissões, indisponibilidade e digitação no celular. Tipos locais, builds isolados, arquitetura (395 fontes, 1.282 dependências), capturas, links/índice e preservação dos hashes de produção aprovados. Nenhuma reserva fictícia gravada na base real; frontend Vercel não publicado.

**Refinamento R2 — formulário único de reserva, 18/09/2026:** todos os campos migraram para **Reserva** na agenda; removido o botão/popup separado. Responsável permite digitar a busca na criação/edição e no novo filtro histórico, combinado com carro/datas antes de paginação/total. API/contrato de consulta publicados com backup privado e reinício somente do processo identificado (PID atual 24784), sem migration ou escrita fictícia. Validação: 21/21 API descartável, 51/51 navegador sintético, oito consultas reais em READ ONLY, tipos/builds/arquitetura e computador/celular/localhost aprovados. Comportamento e evidências no [guia de carros](carros-e-reservas.md#reserva-na-agenda). Frontend Vercel permanece pendente.

**Refinamento R2 — calendário e relógio de rolagem, 18/09/2026:** datas de retirada/devolução e filtros De/Até são escolhidas em calendário em português, com exibição DD/MM/AAAA. Horários são escolhidos em colunas roláveis de horas/minutos, com prévia e confirmação em HH:MM. Campos somente de leitura substituem digitação; cancelar/fechar o relógio mantém o valor anterior. Validação: 54/54 cenários de navegador, tipos/builds/arquitetura e capturas de computador/celular/localhost aprovados. Comportamento no [guia de carros](carros-e-reservas.md#reserva-na-agenda). API/banco/Prisma/configuração preservados e sem reinício/publicação Vercel.

### Etapa R3 — Projetos, agenda e viagens

- Corrigir disponibilidade das rotas, opções de clientes e cadastros de projetos/viagens. Não criar clientes novos para contornar uma lista que falhou em carregar.
- Apresentar ausência de registros como estado vazio, mantendo falhas reais identificáveis.
- Reunir projetos, agenda, indicadores de instalação/desinstalação e viagens em uma única área organizada da sidebar.
- Retirar a entrada separada de viagens; abrir sua gestão dentro da área unificada.
- Incorporar os indicadores a uma visão geral acessível nessa área. Evitar o circuito atual entre páginas com botões levando de uma à outra.
- Fornecer retorno natural dentro da área. A sidebar não deve ser o único caminho para retornar à gestão/listagem.
- Rever a nomenclatura “Estruturas e ciclos”: o usuário prefere “Projeto”. Integrar a apresentação do ciclo/histórico ao fluxo de projetos, sem duplicar `Project` nem apagar a identidade/histórico já modelados.
- Preservar um serviço por projeto, calendário único, responsáveis, datas reais, vínculos de viagem e histórico dos ciclos. URLs anteriores precisam continuar levando ao destino correspondente.

**Organização implementada nesta etapa:** uma entrada **Projetos e Agenda**, com **Visão geral, Projetos, Agenda, Viagens e Equipe**. Histórico/ciclo aparece no detalhe do projeto, sem outro cadastro apresentado como um segundo projeto. O painel de acompanhamento é acessado por link; seus indicadores e a configuração do espelho ficam na dashboard, conforme a revisão aprovada da R1.

**Critério de conclusão:** cadastro utilizável com clientes existentes, navegação única e previsível, indicadores acessíveis, retorno dentro da área, ausência de menus redundantes e preservação dos dados/regras existentes.

**Execução local R3 — 18/09/2026:** entrada separada de viagens retirada. Visão geral reúne as duas fontes de indicadores com período compartilhado, filtro de serviço apenas na seção de projetos e falhas independentes. Projetos, calendário/lista, viagens e equipe mantêm seus cadastros e permissões. Links anteriores de viagens/agenda/indicadores/estruturas normalizam a URL para a aba correspondente, mantendo as cinco abas disponíveis. Resumos da dashboard apontam diretamente para esses destinos.

**Histórico dentro de projetos:** a interface substitui “Estruturas e ciclos” por **Histórico de instalações**, com seleção opcional de **Sala ou totem atendido**. Cadastro inline salva e seleciona o local para o cliente atual sem salvar o projeto nem perder o rascunho. Projeto com vínculo oferece histórico no mesmo popup, inclusive com permissão somente de leitura. Consulta geral permanece na aba Projetos. Identidade física, ciclos e regras permanentes não foram alterados; não há cadastro duplicado de projeto ou associação automática de legados.

**Integração efetiva:** consulta em transação `READ ONLY` usando os serviços publicados confirmou 31 clientes nas opções, 57 responsáveis para viagens e listas operacionais de projetos/viagens vazias. API já disponível; R3 não modifica schema, migrations, shared, backend, Prisma real ou processo de produção. Estados vazios normais foram conferidos no navegador com respostas sintéticas. Escritas são testadas somente por interceptação no ambiente isolado; envio pela conta real continua para conferência do usuário. Frontend Vercel não publicado nesta etapa. Guias atuais: [Projetos e Agenda](projetos-e-agenda.md), [Histórico de instalações](estruturas-e-ciclos.md) e [Viagens](viagens-e-operacoes.md).

**Validação R3:** 82 cenários de navegador aprovados, com regressões das áreas anteriores. Tipos locais, builds isolados e arquitetura passaram (391 fontes, 1.264 dependências internas, sem ciclos não aprovados). Capturas de computador/celular revisadas, links locais e índice conferidos. Verificação de hashes protegeu arquivos fora do escopo, inclusive artefatos/configuração da produção e auditoria. Resultados em `tmp/architecture-validation/structures-browser-qa/results.json`; comandos e comportamento no guia de Projetos e Agenda. Não foi publicada nova API ou migração na R3.

### Ordem e acompanhamento

**Mínimos reais concluídos — 18/09/2026, 18h48:** PDF preenchido entregue pelo usuário, sete páginas revisadas e 127 valores conferidos por duas extrações e pelo catálogo atual (95 positivos/32 zeros explícitos). Prévia em leitura; aplicação atômica pelo serviço publicado, com backup privado e auditoria por configuração. Leitor publicado e consulta independente confirmam 127 reservas, 39 produtos abaixo do mínimo e mais três zerados com saída recente. Impressão digital dos patrimônios preservada, com 2.632 unidades globais/1.869 disponíveis. Nenhuma movimentação, migration, alteração de código ou reinício. Localhost/API reconferidos. Evidências e estado atual no [guia de estoque](estoque-e-patrimonio.md#mínimos-preenchidos-e-aplicados--18092026-18h48). A próxima implementação de estoque é o fluxo confirmado de cliente/projeto; locais legados e preventivas continuam dependentes da operação.

**Estoque principal identificado — 18/09/2026, 18h20:** usuário informou a conta interna responsável pela operação já preparada. Conta ativa/permissão conferidas; serviço publicado identificou o almoxarifado existente como interno/principal e gravou auditoria atomicamente. Leitores publicados confirmam 1.873 patrimônios no depósito, 1.869 disponíveis, 727 não baixados sem localização e 20 em outros locais não classificados; mínimos continuam ausentes. Backup e evidência privados; não houve movimentação de patrimônio, migration, nova implementação ou reinício da API. Localhost e proteção/saúde da API reconferidos. Configuração atual e pendências no [guia de estoque](estoque-e-patrimonio.md#identificação-aplicada-do-estoque-principal--18092026-18h20). Registros anteriores abaixo preservam os instantâneos da preparação.

**Esclarecimento de estoque por cliente/projeto — 18/09/2026:** locais permanecem sob cadastro manual da equipe. Todos os clientes deverão ter uma consulta de estoque, inclusive sem itens, separada por projeto. Saídas para cliente devem indicar explicitamente o cliente e um projeto dele, mantendo rastreabilidade por patrimônio. O modelo atual já possui vínculos opcionais em `Location`; consulta agrupada e projeto obrigatório no envio ainda aguardam implementação, sem atribuição automática aos dados legados. Requisito e situação atual no [guia de estoque](estoque-e-patrimonio.md#fluxo-confirmado-de-estoque-por-cliente-e-projeto--18092026). Excel com todos os 127 SKUs e mínimos em branco entregue para preenchimento; gerar o arquivo não exige e-mail nem altera dados. Auditoria pela interface identifica a conta logada automaticamente.

**Revisão de estoque após R3 — 18/09/2026:** usuário cancelou o pedido de exclusão de carros e pediu seguir. Fiorino/Estrada e a área Carros foram preservados. A próxima pendência disponível foi a conferência do estoque/reposição; preventivas ainda dependem da fonte. Três leitores publicados em `READ ONLY` reconheceram 2.614 patrimônios/127 SKUs, três locais não classificados, 716 unidades não baixadas sem local e 1.886 em locais sem classificação. Nenhum depósito principal ou mínimo configurado. Cadastro existente do Almoxarifado skyline identificado para revisão, sem classificar unidades ou aplicar valores por suposição.

**Interface dessa revisão:** painel explica a sequência de identificação/mínimos; links da dashboard e do painel abrem diretamente `aba=locais`. Visões da custódia ficam na URL, com recarga/voltar do navegador e retorno para estoque/indicadores. Vazios e falhas de opções são distintos; indisponibilidade bloqueia cadastros. Caches incluem a conta e consultas são internas. Aviso reutilizado no espelho é somente de leitura. Regras, evidências e configurações restantes no [guia de estoque](estoque-e-patrimonio.md#conferência-real-de-disponibilidade--18092026). Não foi alterado banco, backend ou API ativa.

**Validação da revisão de estoque:** 56/56 cenários de navegador com dados sintéticos aprovados, incluindo regressões de dashboard/espelho/chamados/carros. Tipos locais, arquitetura e builds isolados passaram; capturas de computador/celular revisadas. Entradas do estoque compilam no localhost, com API saudável e rotas internas protegidas. Hashes confirmaram preservação de produção/schema/migrations/auditoria. Índice e links da documentação conferidos. Nenhuma escrita na base real, exclusão de carro ou publicação no Vercel.

**Configuração real iniciada — 18/09/2026, 17h19:** usuário autorizou começar estoque/reposição. Conferência atual em `READ ONLY` e relatório/CSV privados preparados para revisar o almoxarifado existente e definir mínimos, conforme o [guia de estoque](estoque-e-patrimonio.md#preparação-da-configuração-real--18092026-17h19). Nenhuma classificação ou mínimo foi gravado. Para aplicar, aguarda identificação da conta interna responsável pela auditoria; os valores dos mínimos e a classificação dos outros locais dependem da operação. Entradas do localhost, proteção das rotas e saúde da API conferidas. Não há nova implementação ou migration nesta preparação.

**Destinos antigos na timeline — 18/09/2026, 19h00:** preparado levantamento privado somente de leitura para conferir cliente/projeto e custódia atual dos patrimônios com anotações. Não houve regularização automática. Movimentos posteriores, uso interno, itens baixados e nomes ambíguos foram separados; a futura correção deve preservar o histórico e evitar uma segunda saída. Diagnóstico e critérios no [guia de estoque](estoque-e-patrimonio.md#conferência-de-destinos-na-timeline-legada--18092026-19h00).

**Primeiro lote confirmado — 18/09/2026, 19h12:** após esclarecimentos explícitos do usuário, regularizados 143 patrimônios legados em três destinos de cliente/projeto, com prévia, backup, transação e auditoria. Preservados todos os itens, saídas/anotações originais e mínimos, sem novo movimento de quantidade. Um projeto de identidade cadastrado com o nome informado, sem serviço operacional presumido. Leitores publicados conferidos em leitura após o commit. Planilha privada preparada para confirmar os 534 itens restantes deste levantamento; internos/baixados permanecem separados. A consulta agrupada de todos os clientes, saída obrigatória por cliente/projeto e demais confirmações continuam pendentes. Procedimento e limites no [guia de estoque](estoque-e-patrimonio.md#primeiro-lote-legado-regularizado--18092026-19h12).

**Decisões pela conversa — 18/09/2026, 20h34, atualizadas às 20h38:** usuário definiu nomes de pessoas, Skyline e marketing como uso interno e os demais destinos do levantamento legado como clientes. Confirmou também os sete itens de TI e o par notebook/fonte como internos. Regra e confirmação adicional preservadas em registros privados, sem depender de novo preenchimento da planilha: **39 itens internos e 495 de clientes**, sem pendência de categoria neste levantamento. Nenhum novo vínculo aplicado no banco; identificar cliente/projeto ou local interno permanece necessário antes da próxima regularização. Escopo e limites no [guia de estoque](estoque-e-patrimonio.md#classificação-informada-pela-conversa--18092026-20h34).

**Segundo lote confirmado — 18/09/2026, 21h02:** após confirmação separada de Brasal/Casa Cor, Santa Inês e dois projetos da EBM, foram regularizados 218 patrimônios em quatro destinos de cliente/projeto. A prévia conferiu ausência de alterações posteriores; aplicação usou plano imutável, backup, transação e auditoria. Três projetos foram criados e o projeto Sala Espaço EBM foi reutilizado. Conferência independente preservou os 2.632 patrimônios, 1.709 movimentos, 127 mínimos e todas as anotações anteriores; repetição reconhece o lote e não escreve novamente. Restam 277 itens de clientes e 39 internos para identificar. Procedimento e números no [guia de estoque](estoque-e-patrimonio.md#segundo-lote-legado-regularizado--18092026-21h02).

**Terceiro lote confirmado — 18/09/2026, 21h07:** após confirmação de FR/T4, Neolar e Scorsatto, foram regularizados 147 patrimônios em três novos projetos e estoques de cliente. Prévia, plano imutável, backup, transação e auditoria repetiram o procedimento anterior. Conferência independente preservou 2.632 patrimônios, 1.709 movimentos, 127 mínimos e as anotações anteriores; a repetição é idempotente. Restam 130 itens de clientes e 39 internos. Procedimento no [guia de estoque](estoque-e-patrimonio.md#terceiro-lote-legado-regularizado--18092026-21h07).

**Quarto lote confirmado — 18/09/2026, 21h22:** regularizados 85 patrimônios em Plano & Plano, Integra e Direcional/Riva após autorização explícita, inclusive para os sete itens com anotação genérica “DIRECIONAL”. Três projetos e locais criados; prévia, backup, transação e auditoria concluídos. Verificação independente preservou os totais, movimentos, mínimos e anotações anteriores; repetição não escreve novamente. Restam 45 itens de clientes e 39 internos. Procedimento no [guia de estoque](estoque-e-patrimonio.md#quarto-lote-legado-regularizado--18092026-21h22).

**Quinto lote confirmado — 18/09/2026, 21h25:** outros 17 patrimônios da Impper foram confirmados no mesmo projeto/local Impper Casa Pietra do primeiro lote. O destino foi reutilizado sem duplicação; prévia, backup, transação, auditoria e verificação independente concluídos. Permanecem 28 itens de clientes e 39 internos. Procedimento no [guia de estoque](estoque-e-patrimonio.md#quinto-lote-legado-regularizado--18092026-21h25).

**Sexto lote confirmado — 18/09/2026, 21h27:** regularizados 12 patrimônios em Magen, GPL e BRDU, com três projetos e locais novos. Prévia, backup, transação, auditoria, verificação independente e idempotência conferidos. Restam 16 itens de clientes e 39 internos. Procedimento no [guia de estoque](estoque-e-patrimonio.md#sexto-lote-legado-regularizado--18092026-21h27).

**Sétimo lote confirmado — 18/09/2026, 21h30:** investigação dos 16 itens finais encontrou correspondência estruturada para Avanço Aval e HCON. Dois patrimônios foram regularizados em projetos/locais de identidade, com o procedimento completo e sem criar serviço operacional. Limeira, Paulínia/Cataguá e SOMOS permaneceram separados por não haver cliente cadastrado compatível. Restam 14 itens de clientes e 39 internos. Procedimento no [guia de estoque](estoque-e-patrimonio.md#sétimo-lote-legado-regularizado--18092026-21h30).

**Oitavo lote confirmado — 18/09/2026, 21h34:** com autorização explícita, foram criados os cadastros de identidade Limeira, Cataguá e SOMOS, seus três projetos/locais e regularizados os 14 patrimônios restantes de clientes. Nenhum CNPJ ou serviço operacional foi inferido. Prévia, backup, transação, auditoria, verificação independente e idempotência concluídos. Todos os 495 itens classificados como clientes na revisão restante têm destino; faltam os 39 internos. Procedimento no [guia de estoque](estoque-e-patrimonio.md#oitavo-lote-legado-regularizado--18092026-21h34).

**Revisão de custódia concluída — 18/09/2026, 21h41:** criado o local interno Uso interno - Skyline e regularizados os 39 itens internos, preservados como `EM_USO` e fora da disponibilidade do almoxarifado. Verificação independente e repetição idempotente concluídas. A consolidação dos nove lotes confirmou 677 IDs únicos regularizados: os 143 iniciais e todos os 534 que estavam pendentes, sendo 495 de clientes e 39 internos. Os 66 registros internos/baixados originalmente preservados permanecem fora dos lotes; os 743 itens da revisão estão explicados. Procedimento no [guia de estoque](estoque-e-patrimonio.md#lote-interno-e-encerramento-da-revisão--18092026-21h41).

Tratar R1, R2 e R3 separadamente, conforme a divisão do usuário. Antes da validação funcional de cada área, resolver suas dependências de API/banco disponíveis. Uma correção compartilhada, como indicadores de atendimentos, deve ser verificada nos dois consumidores, com o resultado registrado na etapa responsável.

Estado atual: **R1 aceita pelo usuário após API/banco publicados. R2 implementada localmente com API/migration de carros publicadas. R3 implementada no localhost, com navegação unificada e os endpoints operacionais já publicados. Conferência dos cadastros pela conta real ainda pendente. Frontend não publicado no Vercel**. Ao finalizar uma etapa, registrar correção, comportamento observado na integração efetiva, validação e pendências da próxima, sem declarar as demais concluídas por associação.

### Revisão aprovada da R1 — dashboard e espelho, 18/09/2026

O usuário decidiu eliminar o painel autenticado duplicado. **Painel de acompanhamento** passa a designar somente o espelho por link, sem login ou navegação para a gestão. O item Painel pessoal sai da sidebar; `/painel` e `/dashboard/painel` encaminham para `/dashboard`.

A dashboard preserva atendimentos e suas ações, reúne estoque/projetos/operações em uma seleção manual sem rotação e oferece configuração do link no cabeçalho. Permissões, fonte dos indicadores, detalhes, alertas e revogação continuam com as regras da R1. Esta decisão substitui o requisito anterior de um painel autenticado com entrada própria, registrado acima como histórico. Não encerra a revisão completa R2 nem a unificação de navegação R3. A publicação da API/migrações e validação com dados reais permanecem pendentes.

**Validação da revisão:** 26 cenários de navegador aprovados, com regressões de atendimentos, dashboard/espelho, permissões, redirecionamentos, compartilhamento, falhas e celular. Tipos/build isolados e arquitetura passaram; 832 arquivos fora do escopo preservados. Dashboard e espelho conferidos no localhost existente, com API simulada. Guia atual: [Painel de acompanhamento](painel-de-acompanhamento.md). Nenhum SQL, artefato ou processo da API ativa foi alterado.

**Retorno do usuário e preparação da publicação — 18/09/2026:** os erros e a geração do espelho permanecem indisponíveis na API antiga. A inspeção real somente de leitura confirmou as mesmas seis migrations pendentes e artefatos sem as rotas novas. Backup privado do schema `public`/uploads/configuração/artefatos foi restaurado com sucesso (47 tabelas). As seis migrations foram aplicadas somente a uma cópia local desse backup, preservando as contagens anteriores e RLS. A API candidata carregou atendimentos, projetos, operações e estoque existentes; opções exibiram os 31 clientes; geração/leitura/revogação do espelho passaram com proprietário sintético na cópia. Pré-checagem verificou os oito checksums aplicados e 191 arquivos do candidato. Publicação preparada, aguardando confirmação para migrations/reinício no serviço de produção. Não foram alterados banco, API em execução ou artefatos de produção.

**Publicação autorizada — 18/09/2026:** após a confirmação do usuário, shared/API foram compilados, Prisma Client regenerado com API parada e as seis migrations aplicadas por `migrate deploy`. API nova atende 3001 em produção, PID 17672, sem watch; configuração e chaves JWT/CPF preservadas, sem seed/reset. Onze verificações HTTP/metadados locais/públicas passaram; 14 migrations aplicadas, nenhuma pendência/falha e RLS nas 12 tabelas novas. Os quatro serviços de estatísticas publicados passaram em transação `READ ONLY` real, reconhecendo estoque existente e retornando projetos/viagens vazios normais. Override privado do localhost aponta para a API local, com CSP recarregada e ambos os acessos novamente conferidos com API simulada. Não foram criadas contas/links fictícios em produção. A geração/revogação já passou na cópia restaurada; uso pela conta real e publicação do frontend Vercel continuam distintos desta entrega. Logs/evidências e detalhes no guia principal do painel de acompanhamento, fora dos artefatos públicos da auditoria.
