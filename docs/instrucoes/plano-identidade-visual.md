# Plano de identidade visual e UX do ZYLLEN Gestão

**Data:** 17/09/2026. **Estado:** planejamento consolidado, piloto funcional validado e primeira expansão transversal iniciada em 19/09/2026. **Escopo:** identidade, navegação, apresentação e experiência de uso do frontend. **Origem:** pedido do usuário para uma aparência mais profissional, menos genérica e com mais cuidado nos detalhes, ampliado pelo pedido de uma UX mais agradável.

**Atualização em 18/09/2026:** referências e preferências incorporadas, fontes atuais conferidos e primeiro ciclo de trabalho detalhado com mapa de navegação, composição do dashboard, cenários e entregas.

**Decisão posterior do usuário — 18/09/2026:** a seção Acesso Rápido e sua personalização foram removidas da dashboard no refinamento R2. A navegação usa a sidebar e os links dos resumos operacionais. Esta decisão substitui a proposta anterior de compactar e preservar os atalhos; as diretrizes abaixo já refletem a mudança. Comportamento atual no [guia do frontend](frontend.md#dashboard-e-painel-de-acompanhamento).

**Primeiro piloto — 19/09/2026:** a sidebar passou a organizar os destinos visíveis por contexto de trabalho e o dashboard recebeu hierarquia mais editorial, superfícies discretas e indicadores sem caixas aninhadas. Rotas, permissões, filtros e fluxos operacionais foram preservados. A fonte permanece fora deste ciclo, conforme decisão do usuário.

**Validação do piloto — 19/09/2026:** arquitetura, TypeScript e build isolado aprovados; suíte específica do dashboard aprovada em 10/10 cenários, com capturas de desktop e celular em `tmp/architecture-validation/ticket-dashboard-qa/`. A suíte ampliada de painéis passou em 50/54 cenários. Permanecem uma expectativa de rota de localização do estoque e três cenários do indicador de estoque no espelho, falhas já reproduzidas com o build anterior e fora dos arquivos deste piloto.

**Escopo global confirmado pelo usuário — 19/09/2026:** o redesign abrange o projeto completo. O dashboard é o piloto para definir e validar a linguagem do produto; não é o limite da entrega. A expansão deve alcançar todas as telas internas, autenticação e cadastro, portais de cliente e parceiro, painel por espelho e todos os componentes e estados compartilhados.

**Primeira expansão transversal — 19/09/2026:** a fundação do piloto foi aplicada aos componentes compartilhados e às entradas principais de atendimento, OS, estoque, patrimônio, projetos e agenda, carros, gestão, autenticação, cadastro e portais. Cabeçalhos, campos, botões, abas, badges, cartões e diálogos passaram a seguir a mesma hierarquia. Esta passagem estabelece consistência global; o refinamento profundo de formulários, tabelas, detalhes e estados de cada família continua nas etapas seguintes.

**Validação da expansão — 19/09/2026:** arquitetura, TypeScript, diff e build isolado aprovados. A suíte do dashboard passou em 10/10 cenários e a regressão ampliada manteve 50/54. As quatro falhas são as mesmas já reproduzidas antes da expansão: uma expectativa de rota de localização do estoque e três expectativas do indicador de estoque no espelho. Não pertencem aos componentes visuais alterados e permanecem registradas para uma entrega funcional separada.

**Aprofundamento de identidade e UX — 19/09/2026:** a direção deixou de depender apenas da uniformidade dos componentes. Foi definida uma linguagem operacional editorial com grafites de temperatura verde, geometria angular discreta nos cabeçalhos, linhas contínuas para registros, contagens tabulares e verde reservado a posição, foco e ação. As rotinas pessoais e filas operacionais de chamados e OS receberam contexto de filtro, quantidade de resultados, metadados alinhados, estados vazios orientados e navegação por teclado, reduzindo a repetição de cartões e pills típica de templates genéricos.

**Validação do aprofundamento — 19/09/2026:** TypeScript, arquitetura e build isolado das 43 rotas aprovados. A suíte do dashboard permaneceu em 10/10 e a regressão ampliada em 50/54, com as mesmas quatro falhas funcionais anteriores do estoque/espelho e sem novas regressões nas jornadas cobertas.

**Primeira passagem profunda em Estoque e Patrimônio — 19/09/2026:** a navegação interna foi organizada por intenção de acompanhar, movimentar e configurar. Painel, custódia, patrimônio, equipamentos e saídas receberam barras de contexto, filtros nomeados, indicadores em faixas, listas e tabelas contínuas, contagens, estados vazios orientados e melhor navegação por teclado. Dados, rotas, consultas, permissões, ações, PIN e confirmações existentes foram preservados. Esta passagem estabeleceu a base para o aprofundamento dos fluxos secundários do mesmo ciclo.

**Validação de Estoque e Patrimônio — 19/09/2026:** TypeScript, arquitetura e build isolado das 43 rotas aprovados. As suítes de custódia passaram em 20/20 cenários de API e 13/13 no navegador; as de indicadores passaram em 17/17 e 13/13, respectivamente. A regressão ampliada permaneceu em 50/54, com as mesmas quatro falhas funcionais anteriores do estoque/espelho e sem regressões novas nas jornadas redesenhadas.

**Complemento profundo de Estoque e Patrimônio — 19/09/2026:** saldos e movimentações receberam busca contextual, quantidade de resultados, tabelas contínuas, acesso por teclado e estados vazios recuperáveis. Relatórios passaram a apresentar indicadores em faixas, situação dos patrimônios e distribuição física sem mosaico de cartões. Cadastros foi organizado por catálogo, estrutura e regras operacionais, com retorno explícito quando um filtro não encontra registros. Etiquetas apresenta a sequência de seleção, impressão, templates e histórico como um fluxo único. Compras ganhou relação clara entre pedidos, itens, recebimentos e registro de novas quantidades, adaptando a mesma ordem ao celular. Consultas, mutações, paginação, exportação CSV, impressão, permissões e contratos existentes foram preservados.

**Validação do complemento — 19/09/2026:** arquitetura aprovada com 400 arquivos e 1.340 dependências internas; TypeScript e build isolado das 43 rotas aprovados. Custódia permaneceu em 20/20 cenários de API e 13/13 no navegador; indicadores permaneceram em 17/17 e 13/13. Cadastros, Etiquetas e Compras foram exercitados com respostas sintéticas em desktop e celular, sem erro de página ou estouro horizontal. A regressão ampliada permaneceu em 50/54 com as mesmas quatro divergências funcionais anteriores do estoque/espelho.

**Aprofundamento de Operação e Planejamento — 19/09/2026:** Projetos e Agenda foram organizados pelas intenções de planejar e executar, mantendo a entrada unificada e as cinco áreas existentes. Indicadores de projetos e operações passaram a usar faixas contínuas e destaques ordenados; filtros de período, tipo, situação e trajeto ganharam contexto explícito. Projetos, agenda, viagens e reservas de carros receberam contagens, listas contínuas, estados vazios orientados e melhor adaptação ao celular. Calendário, equipe, formulários, detalhes, paginação, atalhos de teclado, consultas, mutações, permissões e contratos foram preservados.

**Validação de Operação e Planejamento — 19/09/2026:** arquitetura, TypeScript e build isolado das 43 rotas aprovados. As suítes de projetos passaram em 29/29 cenários e seus indicadores em 39/39; viagens passaram em 56/56 e carros em 21/21. A jornada unificada de Projetos e Agenda passou em 46/46 cenários no navegador, com capturas desktop e celular. A regressão ampliada permaneceu em 50/54, somente com a divergência antiga de rota e as três expectativas antigas do indicador do estoque no espelho. A revisão das capturas confirmou a hierarquia, a adaptação móvel e a ausência de estouro horizontal nas amostras de projetos, agenda, viagens e carros.

**Aprofundamento de Gestão e Conta — 19/09/2026:** Clientes passou a separar formulários de cadastro das listas administrativas de empresas e usuários externos, mantendo projetos, vínculos e ações existentes. Aprovação de clientes ganhou filtro contextual, contagem e leitura guiada sem reduzir a conferência obrigatória de identidade e empresa. Parceiros e colaboradores usam listas contínuas com situação, vínculo e ações visíveis também no toque. Permissões explicita que as regras pertencem ao perfil de acesso e afetam todas as pessoas associadas; Acesso resume perfis, pessoas e permissões antes da manutenção detalhada. Perfil pessoal e detalhe do colaborador reúnem identidade, acesso e atividade em uma hierarquia única. Endpoints, confirmações, senha, PIN, RBAC, CPF e restrições entre perfis foram preservados.

**Validação de Gestão e Conta — 19/09/2026:** arquitetura aprovada com 400 arquivos e 1.359 dependências internas; TypeScript e build isolado das 43 rotas aprovados. Sete jornadas sintéticas no navegador cobriram Clientes, Aprovação de clientes, Parceiros, Colaboradores, Permissões, Acesso e Perfil em desktop e celular. Trocas de aba, busca, abertura da análise, seleção de colaborador e exibição das matrizes foram exercitadas sem chamadas externas, erro de página ou estouro horizontal. A regressão ampliada permaneceu em 50/54, com a mesma divergência antiga de rota e as três expectativas antigas do indicador do estoque no espelho.

**Aprofundamento de Entrada e Portais Externos — 19/09/2026:** o login passou a apresentar os contextos de colaborador, cliente e parceiro antes das credenciais, com composição editorial e orientação curta para cada público. O cadastro público explicita o percurso em três passos e distingue a análise obrigatória da solicitação de cliente do acesso posterior do parceiro. A confirmação de solicitação organiza situação, próximos passos e retorno à conta sem interromper uma sessão existente. Os portais de cliente e parceiro usam navegação identificada por audiência, ações em sequência, atendimento atual e históricos contínuos de chamados, OS e acompanhamentos. Endpoints, rotas, redirecionamentos, tipos de usuário, sessão, atualização periódica, anexos, mensagens, assinaturas e formulários foram preservados.

**Aplicação do acervo oficial de marca — 19/09/2026:** a autenticação passou a usar uma fotografia de automação fornecida pela Zyllen, a fonte `Obviously` já presente no projeto, a assinatura Zyllen Systems completa e o lema “Experiências que transformam.”. A composição combina grafite, verde elétrico e linhas angulares em um tom moderno e sofisticado. A imagem fica reservada à entrada, enquanto a geometria, a tipografia de expressão e as cores podem aparecer com menor intensidade no restante do sistema para manter o foco operacional. O acesso interno identifica corretamente a equipe Skyline. Credenciais, seleção de público, sessão, rotas e redirecionamentos não foram alterados.

**Validação de Entrada e Portais Externos — 19/09/2026:** arquitetura aprovada com 401 arquivos e 1.362 dependências internas; TypeScript e build isolado das 43 rotas aprovados. Dez jornadas sintéticas no navegador cobriram o login renovado em desktop e celular, troca de audiência, cadastro de parceiro, confirmação de solicitação, páginas iniciais dos dois portais e listas de chamados, OS e acompanhamentos. A abertura e o fechamento do menu móvel, o conteúdo por público e a ausência de estouro horizontal foram verificados sem chamadas externas ou acesso ao banco compartilhado; capturas ficam em `tmp/architecture-validation/external-portals-browser-qa/`. A suíte do dashboard permaneceu em 10/10 e a regressão ampliada em 50/54, com a mesma divergência antiga de rota e as três expectativas antigas do indicador do estoque no espelho.

## Objetivo

Construir uma interface reconhecível como ZYLLEN, confortável para trabalho diário e com hierarquia clara entre o que precisa de atenção, as ações disponíveis e as informações de apoio. O cuidado deve aparecer na composição e no funcionamento de cada estado da tela.

A experiência deve orientar a pessoa, manter o contexto do trabalho e comunicar o que aconteceu depois de cada ação. Planejar estrutura, comportamento e aparência em conjunto, com transições discretas, mensagens específicas e ações próximas das informações a que pertencem.

O dashboard interno e sua navegação são a tela piloto confirmada para estabelecer o padrão. Depois da revisão desta base, o mesmo sistema visual e de interação será aplicado a todo o frontend, respeitando as necessidades específicas de cada área.

**Definição confirmada pelo usuário:** a instalação da fonte da marca fica para uma etapa posterior. Os protótipos e o refinamento inicial devem usar a fonte que já funciona na interface, ajustando sua hierarquia, pesos e espaçamento. A nova fonte não é pré-requisito para avançar no visual e na UX.

**Referências externas:** o usuário autorizou usar sites como inspiração e base, mantendo uma solução original. O estudo deve extrair princípios de organização e interação e traduzi-los para as tarefas e a identidade do ZYLLEN.

## Princípio de produto: produtividade com orientação

**Posicionamento confirmado pelo usuário:** Zyllen Systems é um SaaS de produtividade. A experiência deve combinar acesso guiado e simples com uma apresentação sofisticada, bonita e agradável, transmitindo a sensação de que cada coisa está onde deveria estar.

Essa diretriz orienta a avaliação das propostas visuais e de UX. As aplicações específicas continuam como hipóteses a prototipar. A definição de posicionamento não acrescenta requisitos técnicos de SaaS ou mudanças de autorização a este plano.

| Princípio | Como deve aparecer na interface |
|---|---|
| Orientação desde a entrada | A página inicial evidencia o trabalho relevante para o perfil. Cada área explica brevemente sua finalidade e oferece um ponto claro para começar. |
| Organização previsível | Nas famílias de telas, manter padrões de posição para título, ação principal, busca, filtros, detalhes e confirmação. Nomes de menu e ações devem acompanhar o vocabulário das tarefas. |
| Informação no momento certo | Apresentar primeiro o que é necessário para decidir ou agir. Opções avançadas e informações complementares aparecem em grupos identificados e fáceis de descobrir. |
| Próximo passo compreensível | Formular escolhas explícitas, indicar dependências entre campos e explicar o efeito de ações importantes. Mostrar progresso quando houver etapas reais. |
| Ritmo de trabalho | Guiar o primeiro uso com ajuda contextual e permitir acesso direto às tarefas recorrentes. Evitar tutoriais repetidos ou etapas adicionais sem benefício para a tarefa. |
| Sofisticação nos detalhes | Hierarquia, alinhamento, espaçamento, contraste, estados e transições devem formar um conjunto coerente. A identidade da marca permanece presente e a informação operacional conduz a composição. |
| Continuidade | Manter contexto de consulta e dados preenchidos. Resultado, erro e recuperação devem oferecer uma direção clara para seguir trabalhando. |

### Regra obrigatória: preservar dados e funcionalidades

O refinamento visual não pode remover, ocultar sem alternativa equivalente ou alterar o significado de dados e funcionalidades existentes. Cada entrega deve manter:

- registros, anexos, históricos, filtros, ordenações, paginação e estados já disponíveis;
- rotas, contratos da API, permissões, escopos por perfil, PINs e confirmações;
- ações de consulta e escrita, inclusive seus estados de carregamento, vazio, erro, retentativa e sucesso;
- valores preenchidos quando uma validação ou requisição falhar, evitando perda de trabalho;
- distinção entre ausência real de dados, falta de permissão e falha de carregamento.

Mudanças de apresentação devem ser comparadas com o comportamento anterior por leitura dos contratos e testes com dados sintéticos. Qualquer alteração funcional ou de dados deve ser tratada como trabalho separado, com regra de negócio documentada e validação própria. Nenhuma etapa deste plano autoriza migração, exclusão ou transformação de dados de produção.

### Aplicação na tela piloto

- Definir locais consistentes para navegação, contexto da página, ação principal e conteúdo de trabalho. Ajustar a disposição ao celular preservando essa hierarquia.
- Agrupar o menu pelas tarefas e manter um destino principal claro para cada área. Atalhos devem apontar para esses mesmos destinos, com nomes consistentes.
- Nos formulários, orientar a decisão antes dos campos e manter explicações junto ao ponto em que são úteis. Mostrar somente os campos pertinentes à operação escolhida, preservando as exigências de negócio.
- No exemplo de entrada/devolução, estudar uma sequência compreensível no próprio formulário: escolher a operação, informar item ou patrimônio e local, conferir o efeito e confirmar com o PIN exigido.
- Dar acesso identificável às opções complementares. A simplificação deve preservar a descoberta de recursos e as informações necessárias para decidir.

### Avaliação de uso

Observar se uma pessoa no primeiro uso consegue identificar a área correta, começar uma tarefa e compreender o próximo passo sem um tutorial obrigatório. Para quem usa diariamente, verificar se a orientação permite concluir a mesma tarefa diretamente. Comparar a previsibilidade da localização de busca, ações e detalhes em Dashboard, Estoque e OS.

## Base da análise

O diagnóstico inicial considera os fontes e as capturas locais de validação do dashboard consultados em 17/09/2026. Não constitui uma inspeção da versão publicada ou dos dados de produção. As capturas usam conteúdo sintético e incluem estados de foco e alerta.

**Conferência dos fontes em 18/09/2026:** o [layout interno](../../apps/web/src/components/layouts/dashboard-layout.tsx) já oferece Painel pessoal, Projetos e Agenda e Viagens. As rotas de [Projetos](../../apps/web/src/app/dashboard/projetos/page.tsx) e [Agenda](../../apps/web/src/app/dashboard/agenda/page.tsx) delegam à mesma tela. O [quadro de chamados](../../apps/web/src/features/tickets/components/ticket-dashboard-board.tsx) inclui indicadores, filtro de origem e modo de leitura reutilizado pelo painel pessoal. A [tela de estoque](../../apps/web/src/features/inventory/screens/inventory-screen.tsx) dá acesso ao painel e ao estoque por cliente. O planejamento deve preservar essa evolução e os filtros, escopos e regras descritos no [guia do frontend](frontend.md). Essa conferência foi feita por leitura de código, sem executar tarefas ou acessar dados de produção.

**Atualização após a conferência:** a revisão aprovada em 18/09/2026 concentrou indicadores e configuração do espelho na dashboard e retirou Painel pessoal da sidebar. A descrição acima registra o estado anterior; aplicar a organização atual do [painel de acompanhamento](painel-de-acompanhamento.md).

| Elemento atual | Observação | Direção proposta |
|---|---|---|
| Identidade | Grafite, verde `#ABFF10` e logos já dão uma base própria. | Preservar essa identidade e estabelecer regras de aplicação. |
| Acesso rápido | Na avaliação inicial, havia cartões grandes, ícones com várias cores e posição antes da fila operacional. | Seção removida por decisão do usuário; navegação pela sidebar e pelos links dos resumos operacionais. |
| Navegação | Lista contínua com áreas de atendimento, estoque e administração no mesmo nível visual. | Criar grupos legíveis e manter a visibilidade de cada item conforme as permissões existentes. |
| Chamados | Vários níveis de caixas, badges, divisórias e ações; alguns badges usam texto de 10px. | Melhorar a leitura de título, solicitante, responsável e tempos; reduzir a decoração redundante. |
| Tipografia | O código declara Obviously para a marca, Space Grotesk para o corpo e JetBrains Mono para dados; o usuário informa que não conseguiu colocar a fonte da marca no projeto. Seu funcionamento não foi validado nesta análise. | Definir a escala com a fonte atualmente funcional e retomar a instalação da fonte da marca depois. |
| Tema | Tokens `--zyllen-*`, tokens semânticos dos componentes e valores em TypeScript coexistem; telas também aplicam cores diretamente. | Mapear as cores de marca aos papéis semânticos e reduzir definições concorrentes na implementação. |
| Login | Painel de marca com slogan, padrões geométricos e brilho difuso. | Estudar uma composição mais contida e uma apresentação objetiva dos três tipos de acesso. |

As observações visuais são julgamentos de design para orientar a discussão; não indicam falhas nas regras operacionais.


**Atualização após a conferência:** a revisão aprovada em 18/09/2026 concentrou indicadores e configuração do espelho na dashboard e retirou Painel pessoal da sidebar. A descrição da conferência acima registra o estado anterior; aplicar a organização atual do [painel de acompanhamento](painel-de-acompanhamento.md).

## Direção recomendada

**Simples na organização, sofisticada no acabamento e acolhedora no uso.** Preservar grafite e verde da identidade ZYLLEN, com hierarquia legível, superfícies discretas e verde reservado à ação principal, seleção e pequenos detalhes da marca. Cor de prioridade e alerta permanece semântica e acompanhada de texto. As novas referências orientam a simplicidade e o foco no conteúdo; a escolha entre área de trabalho clara ou escura continua em avaliação.

| Área | Regra inicial |
|---|---|
| Composição | Organizar pela tarefa: atenção e fila operacional primeiro; resumos operacionais e informações secundárias em posições de apoio. |
| Tipografia | Usar a fonte atualmente funcional para leitura, controles e títulos, com uma escala consistente; mono apenas onde alinhamento ou leitura de códigos/tempos ajudar. Avaliar Obviously em pontos da identidade após a etapa posterior de instalação. |
| Espaçamento | Estabelecer uma escala comum baseada em múltiplos de 4px; dar mais espaço entre seções e menos entre informações do mesmo registro. |
| Superfícies | Usar caixas quando delimitarem uma interação ou conteúdo independente; evitar enquadrar cada nível da mesma informação. |
| Bordas e cantos | Poucos raios consistentes e divisórias discretas; destaque proporcional à importância do elemento. |
| Ícones | Manter Lucide, com tamanhos e pesos coerentes; cores neutras para navegação e atalhos sem significado de status. |
| Texto | Priorizar instruções específicas e mensagens úteis; concentrar a expressão institucional nos pontos apropriados da marca. |
| Movimento | Transições discretas que expliquem mudanças de estado; preservar o alerta de chamados e a preferência por movimento reduzido. |

O detalhe próprio pode partir da geometria do logo: estudar um único recorte ou traço discreto em um ponto da composição. Validar se melhora o reconhecimento antes de repeti-lo. A identidade não deve depender de decoração em todas as seções.

Uma alternativa a comparar no protótipo é manter a navegação grafite com área de trabalho clara. Essa alternativa precisa de avaliação de conforto, contraste e compatibilidade dos componentes; não é uma mudança de tema já escolhida.

## Referências de inspiração

### Referências enviadas pelo usuário em 18/09/2026

Essas referências têm prioridade na discussão de gosto e direção visual. As preferências registradas vêm do usuário; os pontos de aplicação são hipóteses para o ZYLLEN. Nesta sessão foi possível consultar o conteúdo e a estrutura pública dos sites, mas o navegador conectado e o integrado estavam indisponíveis, impedindo uma inspeção visual completa de cores, espaçamentos, animações e responsividade.

| Referência | Preferência expressa pelo usuário | Estrutura consultada | Aplicação proposta |
|---|---|---|---|
| [TabNews](https://www.tabnews.com.br/) | O simples que funciona. | Lista de títulos, metadados próximos ao conteúdo, alternância entre relevantes e recentes e paginação. | Estudar listas legíveis e objetivas para chamados e OS, com informação útil por registro e poucos controles bem identificados. |
| [Reddit](https://www.reddit.com/) | Aprecia a linha visual mais limpa. | Navegação, busca no cabeçalho, ordenação e opções de apresentação em cartão ou compacta. | Estudar a separação clara entre navegação, controles da lista e conteúdo de trabalho, adaptando a densidade às tarefas do SaaS. |
| [ViktorKav](https://viktorkav.com.br/) | Aprovação parcial; considera alguns aspectos genéricos e com aparência de criação por IA. | Seções identificadas, links de projetos e busca no acervo; referências textuais a terminal. | Investigar quais detalhes interessam ao usuário antes de selecionar elementos para o painel de referências. Não presumir aprovação dos motivos de terminal, tipografia ou efeitos visuais. |

A ressalva sobre aparência de IA registra uma avaliação estética do usuário, não uma conclusão sobre como o site foi produzido. Os detalhes específicos de ViktorKav que agradam e desagradam ainda não foram identificados.

**Tradução proposta para o ZYLLEN:** conteúdo e tarefas em primeiro plano, navegação previsível, controles explícitos e densidade confortável. A sofisticação deve aparecer no alinhamento, hierarquia, contraste e consistência das interações. A linguagem final continua própria da marca e acompanha os fluxos guiados de produtividade; as referências de publicação e comunidade não definem funcionalidades sociais para o produto.

### Referências complementares selecionadas em 17/09/2026

Materiais oficiais para apoiar padrões de produtos de gestão. Os pontos de aplicação são propostas de design para o ZYLLEN, não uma decisão de reproduzir as telas ou adotar as funcionalidades desses produtos.

| Referência | O que estudar | Aplicação proposta no ZYLLEN |
|---|---|---|
| [Linear](https://linear.app/) e [My issues](https://linear.app/docs/my-issues) | Separação entre navegação, trabalho pessoal e propriedades do registro; organização das tarefas por contexto e prioridade. | Estudar uma hierarquia mais clara do dashboard e dos chamados, mantendo a ordenação operacional existente. |
| [Attio](https://attio.com/) | Demonstrações de listas de empresas com colunas, responsáveis e controles de visualização. | Estudar a leitura das tabelas de clientes, patrimônios e estoque, com conteúdo e ações próprios de cada área. |
| [Front — inbox de atendimento](https://front.com/product/omnichannel-support-inbox) | Relação entre fila de atendimento, histórico e contexto do cliente. | Estudar a continuidade entre lista, detalhes e ações do chamado, preservando o popup existente no dashboard. |
| [Carbon — tabelas de dados](https://carbondesignsystem.com/components/data-table/usage/) | Hierarquia de título, busca, ferramentas, linhas, seleção e paginação; espaço disponível para dados. | Avaliar padrões consistentes para tabelas e filtros de estoque e patrimônio, reutilizando os componentes locais. |

### Como transformar referências em uma solução própria

1. Selecionar um trecho ou comportamento específico e registrar qual problema ele resolve. Exemplo: conferir dados de um registro sem abandonar a lista.
2. Explicar o princípio observado em linguagem simples: manter o contexto de consulta durante a investigação de um detalhe.
3. Desenhar uma aplicação original com os dados, permissões, ações, identidade e componentes do ZYLLEN. Neste exemplo, refinar o popup atual e preservar busca e posição da lista.
4. Comparar o protótipo com a interface atual, avaliando as tarefas prioritárias e os critérios deste plano.

Cada referência deve receber uma anotação do que interessa e do que não atende às tarefas locais. O painel de referências deve reunir poucos exemplos comentados de navegação, listas, formulários e estados de interação. Isso permite discutir escolhas concretas em vez de selecionar um site inteiro como modelo.

Os logos, textos, recursos gráficos e composição final devem ser próprios do ZYLLEN. Aplicar uma linguagem comum de componentes e tokens para que as referências resultem em um produto coerente. A instalação da fonte da marca continua adiada.

## Experiência de uso proposta

As melhorias abaixo são hipóteses para prototipar e avaliar. A inspeção de código identifica comportamentos existentes; a frequência de uso e as dificuldades das pessoas ainda precisam de observação.

| Frente | Experiência desejada | Proposta concreta |
|---|---|---|
| Orientação | Entender onde está e o que pode fazer. | Menu agrupado, título específico, localização atual visível e ação principal coerente com a tarefa e as permissões. |
| Página inicial | Saber por onde começar o trabalho. | Pendências, fila e resumos operacionais em destaque; navegação pela sidebar e pelos links dos resumos, respeitando o escopo de cada perfil. |
| Consulta e detalhe | Investigar um registro e continuar de onde parou. | Preservar busca, filtros e posição da lista ao fechar detalhes; usar o popup existente de chamados como referência de continuidade. |
| Escolha de operação | Compreender a diferença entre operações antes de preencher. | No Estoque, estudar uma escolha explícita entre entrada de item novo e devolução de patrimônio existente, com explicação curta do resultado. |
| Formulários | Saber quais informações faltam e como corrigir. | Agrupar campos por assunto, diferenciar obrigatório de opcional e mostrar erros próximos ao campo, mantendo o que foi preenchido. |
| Confirmação | Compreender o efeito antes de concluir uma operação. | Apresentar um resumo com item, quantidade, local e efeito da operação; manter PIN e confirmações exigidas. |
| Resultado | Reconhecer que a tarefa terminou e identificar o próximo passo. | Mensagem específica, lista atualizada e acesso ao registro ou aos códigos efetivamente gerados. |
| Falha e recuperação | Corrigir o problema sem repetir trabalho ou duplicar registros. | Distinguir validação, falha de consulta e falha de envio; preservar os dados e oferecer uma retomada compatível com a etapa concluída. |
| Celular | Executar as mesmas tarefas com controles confortáveis. | Reorganizar informação e ações para a largura disponível, com áreas de toque adequadas e nenhuma ação essencial dependente de hover. |
| Interações | Sentir continuidade entre os estados. | Seleção evidente, feedback de clique e envio, transições discretas e carregamento que preserve a estrutura da tela. |

### Jornadas prioritárias

| Jornada | Base observada | Hipótese a avaliar no protótipo |
|---|---|---|
| Atender um chamado | Dashboard já abre detalhes em popup e oferece ações com confirmação por PIN. | Dar mais clareza à prioridade, ao responsável e ao próximo passo; manter a fila e sua posição durante consulta e execução. |
| Registrar entrada ou devolução | Na entrada, preencher o código de patrimônio seleciona retorno; deixá-lo vazio seleciona item novo. Há mensagens explicativas e exibição dos códigos gerados. | Escolher explicitamente a operação antes do preenchimento e apresentar um resumo do efeito antes da confirmação. |
| Criar uma OS com anexos | Wizard seleciona o tipo, reúne dados e arquivos; criação e anexação ocorrem em etapas distintas. Arquivos locais são preservados quando a criação falha. | Orientar por grupos de informação, explicar o andamento e distinguir OS criada de anexos enviados; falha de anexação deve oferecer retomada do envio na OS existente. |

### Detalhes de comportamento

- Separar ausência de registros, busca sem resultados e erro de carregamento. Cada estado deve oferecer uma ação útil quando disponível: cadastrar com permissão, limpar busca ou tentar carregar novamente.
- Preservar busca e filtros durante a consulta de detalhes. Avaliar sua continuidade entre rotas sem armazenar credenciais ou PINs nem expor conteúdo entre contas.
- Manter dados preenchidos em falhas e avisar antes de descartar alterações. Rascunho persistente de OS é uma evolução a avaliar; não prometer recuperação de arquivos após fechar o navegador.
- Em listas com atualização periódica, preservar foco e orientar mudanças sem deslocar a pessoa inesperadamente. Manter a ordenação operacional exigida e testar a chegada de registros novos.
- Usar botões com verbos específicos e uma hierarquia clara. Ações secundárias devem continuar fáceis de encontrar e acessíveis por teclado.
- Evitar uma etapa extra de revisão em toda operação. Avaliar um resumo no próprio formulário quando ele explicar suficientemente o efeito, preservando as confirmações obrigatórias.
- Manter as distinções dos três portais: colaborador organiza e executa o trabalho autorizado; cliente acompanha e solicita; parceiro acessa suas demandas conforme as permissões existentes.

Os ganhos devem ser observados por tarefa: tempo para localizar informação, dúvidas na escolha de operação, erros de preenchimento e capacidade de retomar após uma falha. Reduzir cliques só é útil quando preserva clareza e as confirmações necessárias.

## Plano de execução

### Etapas e dependências

| Etapa | Trabalho | Entrega para revisão | Condição para concluir |
|---|---|---|---|
| 0. Planejamento | Consolidar preferências, conferir os fontes e delimitar o piloto. | Este documento, com navegação, composição e cenários propostos. | Diretrizes confirmadas distintas das hipóteses; destinos e fluxos compatíveis com o código. Planejamento inicial concluído nesta atualização. |
| 1. Estrutura e referências | Preparar referências comentadas e desenhar a organização do dashboard. | Esquema da tela em desktop e celular, com mapa do menu. | Localização, início e próximo passo de cada tarefa compreensíveis; nenhum destino atual perdido. |
| 2. Protótipo visual | Dar acabamento e demonstrar interações com dados sintéticos. Comparar a mesma composição em grafite refinado e área de trabalho clara. | Protótipo navegável do dashboard/menu, incluindo detalhes, PIN e estados de falha. | Tarefas e estados previstos demonstrados; direção avaliada com o usuário sobre um resultado concreto. |
| 3. Componentes e piloto funcional | Consolidar tokens e refinar componentes; aplicar ao layout e dashboard preservando contratos e consumidores. | Dashboard funcional e regras implementadas registradas em `frontend.md`. | Validação visual, arquitetura, tipos, build isolado e regressões aplicáveis concluídos. |
| 4. Expansão | Aplicar padrões por família: Estoque, OS, Projetos e Agenda/Viagens, administração, login e outros portais. | Cada família funcional com estados e tarefas revisados. | Componentes coerentes, autorização preservada e verificações aplicáveis concluídas por entrega. |
| Posterior. Fonte | Investigar instalação e aplicação da fonte da marca. | Fonte funcionando no navegador, com pesos e fonte alternativa verificados. | Quebras de linha, controles e legibilidade revisados em desktop e celular. |

As etapas 1 a 4 seguem essa ordem. A instalação da fonte permanece independente. As próximas entregas são definidas por resultado; não há estimativa de calendário sem medir o esforço do primeiro ciclo.

### Primeiro ciclo: dashboard e navegação

**Objetivo:** demonstrar uma experiência própria do ZYLLEN para localizar trabalho, consultar um chamado e assumir o atendimento. O piloto usa as tarefas e contratos existentes com conteúdo de demonstração.

**Escopo da primeira entrega:** layout interno, agrupamento do menu, hierarquia do dashboard, resumos operacionais, leitura dos chamados, popup de detalhes e confirmação por PIN. Demonstrar carregamento, conteúdo vazio, erro, recuperação e responsividade. Os indicadores e filtros atuais fazem parte da composição.

Entrada/devolução e OS com anexos recebem esquemas de fluxo para avaliar consistência com o piloto. Seus protótipos completos e implementação pertencem à expansão, evitando transformar o primeiro ciclo em uma reforma de todas as telas.

### Mapa aplicado no primeiro piloto

Este agrupamento organiza os 19 destinos atuais do menu. Os grupos aparecem somente quando têm itens visíveis, sem ampliar permissões. Rotas e regras de acesso foram preservadas.

| Grupo | Destinos atuais |
|---|---|
| Início | Dashboard (`/dashboard`), com indicadores e configuração do espelho. Painel de acompanhamento somente pelo link `/painel/espelho/<token>`. |
| Minha rotina | Meus Chamados TI (`/dashboard/chamados-ti`) e Minhas OS (`/dashboard/minhas-os`). |
| Atendimento | Chamados (`/dashboard/chamados`), Abertura de OS (`/dashboard/manutencao`) e Acompanhamento (`/dashboard/acompanhamento`). |
| Operação | Projetos e Agenda (`/dashboard/projetos`), incluindo Viagens como aba da área unificada, e Carros (`/dashboard/carros`). |
| Estoque e patrimônio | Estoque (`/dashboard/estoque`), Cadastros (`/dashboard/cadastros`), Patrimônio (`/dashboard/patrimonio`), Compras (`/dashboard/compras`) e Etiquetas (`/dashboard/etiquetas`). |
| Gestão | Clientes (`/dashboard/clientes`), Aprovar clientes (`/dashboard/aprovacao-clientes`), Parceiros (`/dashboard/terceirizados`), Colaboradores (`/dashboard/colaboradores`), Permissões (`/dashboard/permissoes`) e Acesso (`/dashboard/acesso`). |

Perfil e saída permanecem em uma área consistente da conta. Testar a compreensão dos nomes em tarefas reais antes de renomear rótulos. A distinção entre meus chamados e fila operacional deve ficar evidente.

Preservar a área unificada de Projetos e Agenda e sua rota de compatibilidade. Estruturas, Equipe, painéis de projetos/operações e consultas de estoque continuam acessíveis a partir de suas áreas canônicas. Validar a descoberta desses acessos na expansão. O painel de acompanhamento permanece isolado por link, com leitura, rotação e detalhes que suspendem a troca. A dashboard autenticada reúne indicadores e ações, sem rotação; não recriar uma segunda entrada de painel na sidebar.

### Composição proposta do dashboard

| Região | Conteúdo e comportamento |
|---|---|
| Contexto | Título da página, saudação e descrição curta de sua finalidade. A navegação deixa evidente a localização atual. |
| Controles e resumo | Filtros existentes de origem/período e indicadores atuais, com hierarquia compacta. Identificar quais indicadores são do período e quais representam pendências atuais. |
| Trabalho que pede atenção | Alerta de chamados e aprovações de estoque conforme o escopo autorizado. Manter o limite de uma hora e o acesso aos chamados mais antigos. |
| Fila operacional | Chamados abertos e em atendimento, na ordem atual. Título e resumo conduzem a leitura; solicitante/contexto, responsável, prioridade e tempos têm posições consistentes. |
| Navegação a partir da dashboard | Sidebar e links dos resumos operacionais dão acesso à gestão de cada área. A seção Acesso Rápido foi removida. |
| Informação de apoio | Monitor de atenção a clientes e outros conteúdos já existentes, com peso visual secundário e identificação do período. |

No celular, conservar a hierarquia e reorganizar colunas, filtros e ações para a largura disponível. O popup deve manter o contexto da fila e devolver o foco ao fechar. Atualizações periódicas e mudanças de contagem não podem deslocar inesperadamente a interação.

### Jornada principal do protótipo

1. Abrir o dashboard de um perfil autorizado e identificar um chamado que exige atenção.
2. Consultar título, resumo, solicitante, responsável, prioridade e tempos para decidir o próximo passo.
3. Abrir detalhes e voltar à fila preservando contexto, filtros e posição compreensível.
4. Escolher Assumir e informar o PIN na confirmação existente. Demonstrar PIN inválido, erro de envio e retomada.
5. Exibir o resultado sintético: chamado atualizado para atendimento, confirmação específica e manutenção do contexto de trabalho.

Esse percurso não redefine a regra de ordenação por antiguidade. Prioridade visual e idade do chamado são dimensões distintas.

### Cenários obrigatórios da primeira entrega

| Cenário | O que precisa ser demonstrado |
|---|---|
| Uso normal e conteúdo longo | Leitura de registros com títulos, nomes e descrições longos; muitos chamados; acesso às ações e aos detalhes. |
| Carregamento inicial e atualização | Estrutura estável, retorno de dados compreensível e foco preservado. Manter atualização e contadores existentes na implementação. |
| Ausência de chamados e filtro | Mensagem pertinente ao estado; filtro ativo identificado e caminho para ajustar a consulta. |
| Falha parcial | Erro nos indicadores permite usar os cartões; erro na lista e no detalhe oferece recuperação própria. |
| Atenção e movimento | Limite de uma hora, destaque sem depender só de cor e preferência por movimento reduzido. |
| Confirmação e resultado | PIN inválido, envio pendente, falha e sucesso; bloquear envio duplicado e preservar dados relevantes. |
| Perfil e permissões | Administrador/Gestor, técnico conforme acessos reais e perfil Internos. Preservar a entrada de Internos em Meus Chamados TI e sua ausência de manutenção; manter diferenças de escopo e ações. |
| Acessibilidade e tamanhos | Teclado, foco visível/retorno, celular a partir de 320px, larguras intermediárias, desktop e zoom de 200%. |

### Lista de trabalho e estado atual

| Item | Prioridade | Estado |
|---|---|---|
| Consolidar diretrizes e referências fornecidas | Inicial | Concluído no planejamento; inspeção visual externa completa ainda pendente. |
| Conferir estrutura atual e propor agrupamento do menu | Inicial | Agrupamento aplicado no piloto; teste de compreensão com usuários ainda pendente. |
| Definir composição, jornada e matriz de estados do piloto | Inicial | Concluído no planejamento e representado no primeiro piloto funcional. |
| Preparar painel de referências comentadas e esquema da tela | Primeiro ciclo | A fazer. |
| Construir protótipo navegável e comparar composições | Primeiro ciclo | Primeira composição grafite implementada no produto; alternativa clara ainda não preparada. |
| Avaliar tarefas e registrar ajustes de direção | Primeiro ciclo | Próximo passo após revisão das capturas e uso do piloto. |
| Consolidar componentes e aplicar piloto funcional | Após protótipo | Base compartilhada aplicada ao layout, dashboard, controles e cabeçalhos das áreas principais. |
| Expandir por famílias e verificar os consumidores comuns | Após piloto | Primeira passagem transversal concluída; refinamento profundo por família em andamento. |
| Retomar instalação da fonte da marca | Posterior | Adiado por orientação do usuário. |

A avaliação inclui usuários representativos quando disponíveis, com registro do tempo, dúvidas e erros nas tarefas atuais e no protótipo. A falta de detalhes específicos sobre ViktorKav não impede desenhar a estrutura: TabNews e Reddit já dão uma base de preferência. Usar essas duas referências como prioridade e registrar explicitamente as hipóteses restantes.

### Expansão e componentes

Estoque valida tabelas, filtros, entrada/devolução, posse por cliente e relatórios já existentes. OS valida formulários, anexos, recuperação e estados confirmados. Projetos e Agenda/Viagens validam a área unificada, calendário, responsáveis e acesso às estruturas e painéis. Administração e demais portais validam consistência e conteúdo por audiência.

Definir tokens semânticos, escala tipográfica com a fonte atual, espaçamento, raios e estados; revisar botões, campos, badges, tabelas, tabs e diálogos nos consumidores antes de alterações globais. Os componentes de chamados e indicadores também servem ao painel pessoal de leitura e precisam de revisão nesse uso. Registrar padrões implementados no [guia do frontend](frontend.md).

Os três portais compartilham linguagem visual, preservando conteúdo, ações e autorização. A evolução de indicadores e funcionalidades segue seu [planejamento próprio](plano-evolucao-operacional-e-paineis.md). Usar dados e métricas existentes no produto; o protótipo tem valores sintéticos identificados como demonstração.

### Roteiro do redesign completo

Cada ciclo inclui desktop e celular, teclado, conteúdo longo, carregamento, vazio, erro, retentativa, sucesso e perfis autorizados. Uma família só é considerada concluída depois da comparação funcional com o estado anterior e das regressões aplicáveis.

| Ciclo | Superfícies incluídas | Foco do redesign |
|---|---|---|
| 1. Base do produto | Layout interno, sidebar, dashboard, indicadores, chamados no dashboard e configuração do espelho. | Consolidar hierarquia, densidade, navegação e direção visual. Primeiro piloto em andamento. |
| 2. Atendimento e OS | Meus Chamados TI, Chamados, Minhas OS, Abertura de OS, Acompanhamento, detalhes, anexos, mensagens e confirmações por PIN. | Tornar prioridade, responsável, andamento, ações e recuperação de falhas fáceis de compreender. |
| 3. Estoque e patrimônio | Painel de estoque, saldos, itens, patrimônios, locais, estoque por cliente, entradas, saídas, devoluções, movimentações, relatórios, cadastros, etiquetas e compras. | Organizar tarefas densas, tabelas, filtros e formulários sem perder dados, rastreabilidade ou ações. |
| 4. Operação e planejamento | Projetos, visão geral, Agenda, Viagens, Carros, serviços, estruturas, ciclos, equipe, calendários e reservas. | Unificar leitura temporal, responsáveis, vínculos e estados operacionais em calendário, listas e detalhes. |
| 5. Gestão e conta | Clientes, aprovação de clientes, parceiros, colaboradores, permissões, acesso e perfil. | Melhorar administração, hierarquia de risco e clareza do efeito de alterações de acesso. |
| 6. Entrada e portais externos | Login, solicitação de cadastro, retorno da solicitação, portal do cliente, portal do parceiro e painel público por espelho. | Criar uma apresentação coerente por audiência, com entrada simples e estados de acesso claros. |
| 7. Consolidação transversal | Tokens, tipografia atual, botões, campos, selects, tabelas, tabs, badges, diálogos, notificações, PDFs e impressão quando houver interface visual. | Remover divergências restantes, validar acessibilidade e garantir consistência entre todas as famílias. |

O roteiro define cobertura e ordem de trabalho, não autoriza mudanças de regra de negócio. Componentes compartilhados podem ser consolidados antes de um ciclo quando isso reduzir inconsistência, desde que todos os consumidores sejam verificados.

## Critérios para avaliar o resultado

- A pessoa identifica primeiro o trabalho que precisa de atenção e consegue encontrar a ação principal sem percorrer decoração ou atalhos grandes.
- Menu, títulos, tabelas e formulários seguem o mesmo vocabulário visual.
- Texto essencial permanece legível; cores de destaque não competem com prioridade e alerta.
- Contraste deve ser medido no protótipo e na implementação: pelo menos 4,5:1 para texto normal e 3:1 para texto grande, conforme as definições de [contraste de texto do W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html); adotar 3:1 para os elementos visuais essenciais dos controles, conforme [contraste não textual do W3C](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
- Foco de teclado é visível, ações têm nomes acessíveis e os status não dependem somente de cor.
- Validar celular a partir de 320px, larguras intermediárias, desktop e zoom de 200%, sem sobreposição ou perda de ações. Tabelas podem ter rolagem própria quando necessário.
- A área principal comporta nomes e descrições longos sem esconder os dados necessários para a tarefa.
- Verificar com usuários representativos pelo menos três tarefas: localizar um chamado prioritário, abrir detalhes e encontrar uma área do sistema. Registrar dúvidas e comparar com a tela anterior.
- O protótipo demonstra uma composição deliberada e reconhecível mesmo sem brilhos, slogans ou uma cor diferente para cada atalho.
- A pessoa distingue entrada nova e devolução antes de confirmar; o resumo corresponde à operação efetiva.
- Busca e filtros permanecem ao consultar e fechar detalhes; o foco retorna ao controle de origem e a lista mantém uma posição compreensível.
- Validação orienta a correção sem apagar o formulário; o estado de envio impede confirmações duplicadas.
- O resultado de uma OS diferencia criação de anexação e permite retomar um envio pendente sem criar outra OS. Falha de criação preserva arquivos locais.
- Comparar as tarefas do protótipo com a referência atual e ajustar os pontos que ainda provoquem dúvidas ou erros. Não declarar ganhos percentuais antes dessa avaliação.
- A pessoa identifica onde está, por onde começar e qual é o próximo passo; ajuda contextual acompanha a tarefa sem exigir tutoriais repetidos.
- A localização e o nome de busca, filtros, ações e detalhes são previsíveis entre famílias de telas, preservando diferenças justificadas pelas tarefas.
- Opções complementares continuam identificáveis e acessíveis; usuários frequentes conseguem executar tarefas sem orientação obrigatória a cada uso.

## Limites e implementação

Este plano propõe apresentação e usabilidade, incluindo escolhas explícitas de operação, contexto de consulta, validação e recuperação. Preservar URLs, contratos de API, permissões, PINs e confirmações. Preservar no dashboard a ordenação dos chamados, o limite de uma hora para atenção, a atualização dos contadores, o destaque vermelho pulsante com movimento reduzido e os detalhes em popup. Seguir as regras de criação em duas etapas e imutabilidade de OS; nenhuma ação de desfazer pode contornar registros confirmados.

O trabalho visual não exige alteração do banco ou da API. Quando houver implementação, seguir a [organização da arquitetura](organizacao-da-arquitetura.md): componentes comuns em `components/`, telas e componentes de negócio em `features/`, rotas e composição em `app/`. Reutilizar os recursos existentes de marca e as mensagens comuns.

Executar as verificações de arquitetura, tipos, builds isolados e regressões aplicáveis conforme [desenvolvimento](desenvolvimento.md) e [frontend](frontend.md). Fazer a validação com dados sintéticos, seguindo as [restrições desta máquina e do banco compartilhado](instrucoes-para-agentes.md).

## Decisões para a próxima etapa

- Revisar o piloto do dashboard e registrar os ajustes que formarão o padrão das demais telas.
- Identificar as tarefas mais frequentes e os pontos de maior dificuldade para priorizar as hipóteses de UX.
- Comparar a proposta grafite com a alternativa de área de trabalho clara.
- Identificar os detalhes específicos de ViktorKav que agradam ou parecem genéricos ao usuário; registrar essas escolhas no painel de referências.
- Definir a composição de logos e a denominação institucional, preservando os ativos atuais até essa decisão.
- Consolidar a direção a partir do piloto concreto e expandir na ordem do roteiro completo.

Este documento registra o planejamento de identidade visual e UX, o piloto funcional e a primeira expansão transversal. Avaliação com usuários e refinamento profundo por família permanecem como próximas etapas; a instalação da fonte da marca foi adiada por orientação do usuário.
