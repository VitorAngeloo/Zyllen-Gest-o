# Decisões pendentes — Cronograma e Planejamento

**Decisões adicionais de publicação em 28/10/2026:** usuário autorizou a etapa 6 antes da matriz completa, determinou que **Internos ainda não terá acesso à página** e aprovou disponibilizar o ZIP **somente como histórico legado de consulta, sem gerar agendamentos ou conclusões reais**. Esses pontos foram implementados/publicados; matriz dos demais acessos e conversão futura dos legados continuam pendentes. [Registro da entrega](instrucoes/projetos-e-agenda.md#publicação-operacional-em-28102026). Esta autorização substitui as condições anteriores de aguardar a matriz antes da etapa 6.

**Atualização:** 28/10/2026. Referências: [roadmap](ROADMAP_ZYLLEN.md) e [backlog](BACKLOG_ZYLLEN.md). Todas as decisões abaixo estão **pendentes de validação completa**; recomendações não são regras aprovadas nem autorização para implementar.

O pedido atual já define o nome **Cronograma e Planejamento**, a substituição das vistas antigas, a permanência de Viagens, Equipe temporariamente oculta, a preservação funcional do cronograma recebido e a prioridade do MVP. Não é necessário rediscutir essas direções. Este arquivo trata das escolhas que faltam para executá-las sem inventar regras.

**Respostas do usuário em 28/10/2026:** usar os dados do **ZIP enviado** como referência histórica (D10); substituir retirada/exclusão por **cancelamento com justificativa e histórico** (D07/D09); **adiar a matriz de acessos** até concluir as cinco etapas técnicas (D01). Estas respostas são decisões aprovadas nesses pontos específicos. Não autorizam importar na base compartilhada, conceder acessos, inventar vínculos/datas ou publicar. As demais partes das decisões permanecem pendentes.

**Continuidade autorizada:** a adaptação local já aplica nome, Cronograma/Viagens, os quatro menus do pacote e Equipe oculta. A continuação de 28/10 prepara o grupo técnico descritivo sobre cadastro/API/autorização existentes, com migration não aplicada. Essas entregas não resolvem automaticamente as decisões de dados/permissões abaixo nem representam paridade completa. A implementação e seus limites estão no [guia da área](instrucoes/projetos-e-agenda.md).

Os validadores indicados são áreas sugeridas, não responsáveis pessoais nomeados. Registrar cada resposta na própria decisão, atualizar as tarefas afetadas e manter a distinção entre decisão tomada, código implementado e versão publicada. Nenhuma resposta foi inferida do silêncio, de exemplos da reunião ou dos defaults do pacote.

## D01 — Matriz de permissões: acesso mínimo e evolução completa

**Decisão de 28/10:** usuário adiou esta definição até encerrar as cinco etapas técnicas. `PROJECT_PLANNING_ACCESS` centraliza a proteção por ação sem alterar concessões existentes. Testes de API/interface cobrem leitura, escrita e portais; a matriz por Comercial/Experiências/Diretoria continua pendente e será retomada antes da etapa 6. Não converter setores textuais ou papéis sintéticos dos testes em acessos reais.

**Estado:** pendente. **Prioridade:** P0 para consulta do MVP; P1 para granularidade completa. **Validadores sugeridos:** responsável pelo sistema, Operações, Comercial, Experiências e Diretoria. **Afeta:** F00-04, F02-06, F03-02, F04-01, F05-01/F05-02 e F06-02.

O Zyllen autoriza por papel e `screen.action`; o guard dá bypass ao papel Administrador. `InternalUser.sector` é texto opcional, não permissão. Os papéis previstos são Administrador, Gestor, Técnico e Internos; não foi consultada a configuração efetiva. O acesso limitado de Internos à dashboard não concede acesso geral ao módulo.

Definir a matriz mínima de **telas e campos consultáveis** por Comercial, Experiências e Diretoria, quem mantém o cadastro do MVP e se alguma escrita será liberada a essas áreas. A reunião distingue visibilidade ampla da Diretoria de alteração de permissões; não define Diretoria como Administrador nem fecha todas as ações de edição.

Para P1, definir composição setor/função/usuário, precedência entre permissão e negação, exceções individuais, escopo de gestor e delegação. Acesso a pendências, comentários, contatos e anexos pode precisar de escopo próprio. Esconder menu ou filtrar no navegador não atende à autorização.

**Recomendação para validação:** começar pela consulta necessária ao MVP, usando a estrutura existente onde for suficiente, sem conceder permissões de outros módulos ou clonar contas administrativas. A implementação completa da F05 pode vir depois; a autorização mínima precisa existir antes da publicação. Referência da reunião: 00:01:44–00:15:47. Restrições atuais em [autenticação](instrucoes/autenticacao-e-permissoes.md) permanecem válidas.

## D02 — Campos obrigatórios e dicionário de dados

**Implementação local de 28/10/2026:** o grupo técnico descritivo do ZIP ganhou contrato, cadastro e persistência preparados, sem adicionar obrigatórios nem calcular medidas. Ausências continuam explícitas e textos preservam a descrição/unidade informada. Essa compatibilidade técnica não encerra a validação de obrigatoriedade, unidades, taxonomia e tratamento do legado descrita abaixo. Ver [dicionário implementado](instrucoes/projetos-e-agenda.md#cadastro-técnico-preparado-em-28102026).

**Estado:** pendente. **Prioridade:** P0. **Validadores sugeridos:** Operações e responsáveis pelo cadastro, com Comercial/Experiências. **Afeta:** F00-05, F01-04, F02-01/F02-03 e F03-03.

Validar cliente/projeto, endereço, cidade/UF, Maps, contato local, tipo de serviço, categoria, datas/previsões, responsáveis, equipamentos e campos de sala. Para dados técnicos, definir tipo/unidade de formato, projeções, proporção, resolução, controle (totem/tablet) e som; quais são condicionais e quais podem ficar desconhecidos. O [roadmap](ROADMAP_ZYLLEN.md) contém a comparação dos campos recebidos com os contratos atuais.

Hoje o cadastro operacional exige endereço, enquanto o pacote só fornece cliente e cidade/UF. Contato existe em outros cadastros, mas isso não define um contato do local do serviço. Entre as salas recebidas há tipos ausentes; não assumir “imersiva” pelo fallback da interface. Definir tratamento dos históricos incompletos, sem dados fictícios para passar na validação.

**Saída esperada:** dicionário com campo, significado, origem, formato/unidade, obrigatoriedade por situação, quem consulta/edita e comportamento de legado. Não alterar exigências atuais antes dessa validação. Referência: 00:03:22–00:04:19 e 00:21:40–00:22:28.

## D03 — Cálculo e apresentação de prioridades

**Estado:** pendente. **Prioridade:** P1; não bloqueia o Marco 1. **Validadores sugeridos:** gestor e colaboradores da operação. **Afeta:** F04-03/F04-04.

A urgência atual é fixa (0–2); o destaque eleva à urgência máxima. Isso não representa o cálculo dinâmico discutido. A reunião propõe importância e proximidade do prazo, com hoje/amanhã subindo na lista, mas alterna exemplos de precedência e pesos. Os números de cinco, dez e vinte dias são exemplos, não limiares aprovados.

Definir entradas, fórmula ou tabela de faixas, vencimentos, ausência de prazo, empates, ordem dentro do dia, possibilidade de prioridade manual, momento de recálculo e fuso. Distinguir prioridade do dia e da atividade, com agrupamento validado em D04. Definir também o que acontece com tarefa atrasada quando o mês muda.

**Saída esperada:** conjunto pequeno de exemplos com ordem esperada e regra verificável, exibindo somente o necessário para a pessoa decidir o próximo trabalho. Não codificar pesos com base apenas nas falas. Referência: 00:23:32–00:28:28 e 00:29:32–00:37:45.

## D04 — Atribuição, fila sem responsável e agrupamento

**Estado:** pendente. **Prioridade:** P1; decisões sobre o fluxo atual de viagens também afetam P2. **Validadores sugeridos:** Operações e gestores dos setores. **Afeta:** F04-01/F04-03, F05-02, F06-01/F06-02.

Definir quem cria, atribui, assume e redistribui atividades; um ou vários responsáveis; distinção de participante/cooperador; visibilidade e autorização de tarefas sem responsável; agrupamento por dia/pessoa e separação da visão gerencial. Agenda atual exige responsável; projeto pode existir sem responsável enquanto não agendado. Nenhum dos dois equivale à fila de atividades proposta.

A reunião inicialmente inclui itens sem atribuição na visão pessoal e depois restringe esses itens ao calendário, fora da lista individual. Preservar essa evolução como hipótese a confirmar: não atribuído no calendário autorizado; atribuído aparece na lista da pessoa. Validar a apresentação de várias atividades dentro de um único dia e os casos em que devem aparecer separadas. Referência: 00:22:42–00:23:32 e 00:28:28–00:40:24.

**Saída esperada:** fluxo de estados/atribuições e exemplos para colaborador, gestor e Diretoria. Não reativar a aba Equipe para implementar a distribuição sem nova definição de navegação.

## D05 — Bloqueio de registros encerrados e fechamento mensal

**Estado:** pendente. **Prioridade:** P1. **Validadores sugeridos:** Operações e responsável pelo sistema. **Afeta:** F04-05, F05-02/F05-04 e F07-03.

Decidir o que é encerramento de atividade e de mês, quem encerra/reabre, correções permitidas, justificativas e tratamento de atividade atravessando meses. O fim do mês civil fecha automaticamente a edição? Tarefa não executada é transferida, mantida como atraso ou corrigida? A lista histórica deve ordenar por início, fim ou outro evento real? Validar ordem crescente/decrescente e preservar a execução já registrada.

Hoje a viagem encerrada precisa ser reaberta para editar planejamento; essa regra não define o bloqueio de toda atividade ou projeto. Também não existe fechamento mensal do novo planejamento. A reunião propõe histórico por data e bloqueio após o mês (00:29:32–00:35:26), sem resolver todas as exceções.

**Limite já vigente:** assinatura/bloco confirmado de OS é imutável, inclusive para administrador, conforme [guia de OS](instrucoes/ordens-de-servico.md). A decisão futura não autoriza enfraquecer essa regra nem prometer retificação de assinatura.

## D06 — Fluxo de aprovação e validação das informações

**Estado:** pendente. **Prioridade:** P1; eventual aprovação obrigatória do cadastro do MVP precisa ser decidida em P0. **Validadores sugeridos:** Operações e responsáveis pelos dados técnicos. **Afeta:** F02-03 se exigido, F03-03/F03-04, F05-03 e F07-01.

Definir quais dados precisam de revisão, quem solicita/aprova/rejeita, se há rascunho, como fica o último dado aprovado, reaprovação após alteração e devolução para correção. A reunião menciona validação técnica entre cadastro e publicação da proporção/resolução, mas não fixa o processo (00:18:43–00:19:38).

As aprovações de estoque, contas e reservas de carros têm regras próprias. Não reutilizar suas permissões ou estados como se aprovassem automaticamente projetos, prioridades, dados técnicos ou conclusão de OS. Esclarecer também se comentários/dúvidas exigem resposta formal ou apenas registro, e quando há encaminhamento ao autor/gestor.

**Saída esperada:** fluxo mínimo, responsáveis por função e consequências de cada decisão. Se não houver aprovação necessária no MVP, registrar isso explicitamente; não criar uma etapa burocrática por inferência.

## D07 — Histórico, justificativas, correções e exclusão

**Estado:** pendente. **Prioridade:** P0 para compatibilidade e migração; P1 para fluxo completo. **Validadores sugeridos:** Operações e responsável pelo sistema. **Afeta:** F02-02, F03-01, F04-05, F05-03/F05-04 e F07-03.

O Zyllen já preserva cancelamentos e registra auditoria, inclusive dados anteriores relevantes de status. Isso não garante uma trilha funcional completa de todas as alterações de datas, anotações e motivos. O pacote permite excluir fisicamente um registro e guarda apenas data original/última atualização; essas ações não equivalem ao histórico discutido.

Definir eventos que exigem justificativa, informações de antes/depois consultáveis, possibilidade de corrigir/desconsiderar sem apagar, atribuição de autoria, acesso ao histórico e tratamento de autoria histórica desconhecida. A reunião pede preservação das informações, inclusive quando quem lançou errou, e motivo de reagendamento (00:40:36–00:45:48). Detalhes de implementação/retenção ainda precisam ser validados.

**Decisão de 28/10:** retirada do registro será **cancelamento com justificativa e histórico**. Nova ação implementada/testada, sem exclusão física. Histórico consultável e primeira data confirmada anterior ao reagendamento estão preparados. Detalhes restantes de motivo obrigatório para outros eventos, retenção, correção e autoria histórica continuam pendentes; fluxos operacionais legados mantêm seus contratos. Preservar auditoria e imutabilidade das OS.

## D08 — Indicadores e significado das datas

**Implementação técnica em 28/10:** resumo anual distingue previsto/real; dashboard interna usa o período consultado para conclusões reais e a situação atual para ações manuais. Categorias desconhecidas são explícitas, joins não multiplicam projetos e aviso derivado de confirmação é distinto de pendência manual. Testes conciliam totais e extremos do período; o aceite de negócio do catálogo de métricas e dos históricos permanece pendente. [Definições implementadas](instrucoes/projetos-e-agenda.md#indicadores-e-preparação-de-acessos-em-28102026).

**Continuidade local de 28/10/2026:** a integração mantém etapas e previsões independentes da execução. Conclusões exigem estado operacional concluído e data real; previsão não gera data de execução e agendamento confirmado prevalece no calendário sem apagar a previsão. Etapa desatualizada não reabre execução encerrada nem a exclui das conclusões reais. Essas proteções estão implementadas; a reconciliação dos históricos, fórmulas completas e aceite de negócio abaixo continuam pendentes.

**Estado:** pendente. **Prioridade:** P0. **Validadores sugeridos:** Operações, Comercial e responsáveis pela dashboard. **Afeta:** F01-02/F01-05 e F02-01/F02-05.

O resumo recebido conta concluídos pelo ano de `Início` e estado atual. O Zyllen conta resultados por data real de conclusão/cancelamento e não substitui essas datas por previsão. A base recebida não tem campo separado de conclusão real. Confirmar se o histórico será validado como realizado, permanecerá com qualidade incompleta ou terá uma apresentação histórica própria; não inventar `completedAt`.

Definir período, fuso, inclusão de cancelados/pausados, diferença entre registro/serviço/projeto/estrutura/equipamento, contagem por salas/telas, manutenção e próximos eventos. O resumo do pacote usa filtros de categoria/serviço/UF/busca, mas não aplica o filtro de status nem o mês selecionado às mesmas contagens anuais; algumas contagens de andamento/próximos atravessam anos. Validar o comportamento esperado antes de preservá-lo ou ajustá-lo.

Separar pendências manuais do aviso derivado “confirmar realização”: a passagem da data só gera aviso, não comprova execução. Não equiparar “em andamento” do pacote, que agrupa etapas abertas/pausadas, a `Schedule.IN_PROGRESS`. Referências: 00:02:32–00:06:40, 00:14:19–00:16:27 e 00:20:44–00:21:36.

**Saída esperada:** catálogo de métricas com exemplos conciliados entre base histórica, card, resumo e dashboard; diferenças intencionais documentadas.

## D09 — Paridade funcional e composição dos menus

**Estado:** pendente nos detalhes; direções principais já confirmadas. **Prioridade:** P0. **Validador sugerido:** solicitante com Operações. **Afeta:** F00-02, F01-01/F01-02, F02-07 e F03-03.

O pedido atual remove **as vistas antigas** Visão geral/Projetos/Agenda, preserva Viagens e oculta Equipe. O cronograma recebido possui **seus próprios menus** Agenda, Calendário, Projetos e Pendências. A referência inicial é preservar esses quatro menus e suas funções; a fala de ocultar Projetos no começo e de renomear Agenda não substitui automaticamente essa orientação.

Confirmar o nome da lista cronológica do cronograma, o lugar dos menus recebidos, o destino de links antigos e a futura entrada de Planejamento. Especificar o destino acessível dos agendamentos avulsos, recorrências, configurações de marcadores, histórico de instalações e indicadores atuais quando suas vistas antigas saírem. Esconder Equipe deve preservar a seleção de responsáveis e seus vínculos.

Validar como manter a capacidade de várias pendências/anotações recebida no MVP sem antecipar classificação setorial avançada; quais ações estarão disponíveis para quem pode manter registros; e a adaptação da exclusão descrita em D07. Tema claro/escuro, lembrança de aba, atualização e entrada de edição também precisam de equivalente explícito na matriz de paridade. Sessão do Zyllen substitui a autenticação de PIN compartilhado; não introduzir outro login no módulo por cópia do pacote.

**Saída esperada:** mapa de navegação e checklist de paridade aprovado. Eventuais mudanças funcionais precisam ser identificadas, não apresentadas como simples mudança de cores. A discussão da reunião sobre prioridade do cronograma não autoriza descartar menus/funções já recebidos.

## D10 — Fonte de dados, identidades, estados e migração

**Bloco de etapas/previsões autorizado em 28/10/2026:** oito classificações preservadas em `ProjectService.planning.stage`, com previsão mês/dia em `planning.forecast`, sem conversão para `Schedule.status`. Contrato/cadastro/persistência preparados e segunda migration aditiva não aplicada. Não foram inventadas transições automáticas, datas reais, atribuições ou condições comerciais obrigatórias; validações adicionais do fluxo, dados históricos e corte de fonte continuam pendentes. Referência: [etapas e previsões](instrucoes/projetos-e-agenda.md#etapas-e-previsões-preparadas-em-28102026).

**Implementação local de 28/10/2026:** dados técnicos preparados no próprio `ProjectService`, com JSON opcional validado no shared e migration aditiva ainda não aplicada. Omissão em edições antigas preserva dados; limpeza é explícita. Não houve importação operacional, corte de escrita ou associação por nome. As oito etapas e sua normalização histórica estão preparadas. A decisão completa continua pendente.

**Estado:** pendente. **Prioridade:** P0. **Validadores sugeridos:** responsável pelo cadastro e responsável técnico do sistema. **Afeta:** F00-05, F01-01/F01-05, F02-01/F02-03, F03-03 e F06-01.

**Fonte confirmada em 28/10:** usar os dados do ZIP enviado. Preparação offline e ensaio idempotente preservam 240 registros e 6 pendências em área privada, com relatórios de exceções e modelo de vínculos por ID. Não houve carga operacional nem sincronização com Planilhas. A revisão dos vínculos, endereço, horários/duração, datas reais, autoria e políticas de serviços legados continua pendente. O corte de escrita e a carga operacional pertencem à etapa 6, após revisão; não manter cadastros independentes sem reconciliação.

O pacote usa IDs próprios e cliente/técnico como texto. O Zyllen usa IDs relacionados e um único serviço por `Project`; o mesmo cliente pode ter muitos registros de instalação/desinstalação. Definir a correspondência validada, preservação do ID original, casos sem vínculo, importação idempotente e tratamento de duplicidade semântica. Não associar por nome/cidade ou converter técnico textual em conta automaticamente.

Validar a representação das oito etapas: aguardando contrato, aguardando kickoff, sem previsão, data pré-definida, agendado por e-mail, pausado, concluído e cancelado. Também decidir manutenção/upgrade e desinstalação: o pacote contém 1 manutenção e 91 desinstalações, mas a criação operacional nova do Zyllen aceita somente instalação. Não contornar validações nem ampliar o modelo sem decisão explícita.

Definir datas de dia inteiro versus horários, fim inclusivo no pacote versus intervalo UTC, duração quando fim não foi informado, previsão mensal/diária e preservação de reagendamentos. Não fabricar horários ou datas reais para satisfazer contratos. Validar endereço ausente e autoria histórica junto de D02/D07/D08.

**Saída esperada:** matriz campo/estado/origem → destino, política de identidade e de atualização, relatório de exceções e plano de ensaio isolado. Estruturas/migrations novas, se necessárias, devem ser propostas e revisadas antes de qualquer mudança no banco compartilhado.

## D11 — Disponibilidade comercial e recursos de viagens

**Estado:** pendente. **Prioridade:** P0 para o significado de disponibilidade no cronograma; P2 para reserva/logística. **Validadores sugeridos:** Comercial, Operações, Estoque e responsáveis pelos veículos. **Afeta:** F01-05 e F06-03/F06-04.

O calendário já mostra intervalos e conflitos de responsáveis; estoque/custódia e reservas de carros têm fontes próprias. Esclarecer se disponibilidade comercial significa capacidade de equipe, data de instalação, sala/tela física, equipamento disponível ou combinação. A ausência de evento não demonstra, sozinha, capacidade para uma venda.

Para viagens, validar lista técnica versus separação/reserva/saída real, materiais consumíveis, ferramentas reutilizáveis, responsáveis por preparar/devolver, documentos e vínculo de carro. Decidir se um vínculo apenas informa ou também reserva; não gerar movimentação, compra ou baixa automática sem regra aprovada. Confirmar se o fluxo de origem/período/participantes atual do projeto continuará ou será ampliado.

**Saída esperada:** definição mínima de consulta para o MVP e, em P2, contrato dos vínculos com estoque, custódia, reservas e anexos privados. Referências: 00:01:51–00:02:31 e 00:45:48–00:48:30.

## D12 — Integração das OS e notificações de execução

**Estado:** pendente. **Prioridade:** P2; não bloqueia o Marco 1. **Validadores sugeridos:** Operações, técnicos e responsáveis pelos três portais. **Afeta:** F07-01/F07-04.

OS já existe e pode apontar para `Project`, mas não possui vínculo automático com a nova atividade/serviço. Decidir cardinalidade, momento da criação/vinculação, tipos de formulário por atividade, responsável pela execução e o efeito da conclusão da OS sobre a atividade e vice-versa. Preservar OS legadas sem forçar vínculos por nomes.

Definir captura de início/fim, duração prevista/real, retorno ao local, falha parcial, reabertura e idempotência. A conclusão precisa distinguir OS criada de anexos pendentes; manter o fluxo em duas etapas e as assinaturas imutáveis. Reaproveitar os formulários e a mídia privada em vez de criar outra ferramenta de OS.

Avaliar notificações: destinatário, canal, frequência, gatilho, horário e como lidar com falta de conexão. A fala sobre lembretes repetidos não define uma política pronta. A expressão de transcrição envolvendo “Trello” não confirma integração com esse serviço. Referência: 00:48:40–00:51:57.

## D13 — Ferramenta simplificada de resolução e proporção

**Estado:** pendente; fonte não recebida. **Prioridade:** P1. **Validadores sugeridos:** responsáveis pelo projeto técnico e cadastro. **Afeta:** F03-04.

A reunião menciona uma ferramenta anterior de cálculo (00:18:27–00:19:38), sem fornecer seus arquivos ou fórmulas. O cronograma do ZIP armazena proporção/resolução, mas não implementa esse cálculo. Confirmar qual é a ferramenta, suas entradas, unidades, arredondamento, casos de referência, limites e o fluxo de validação de D06.

**Saída esperada:** referência verificável e escopo da versão simplificada, sem exigir apresentação 3D ou substituir manualmente dados técnicos por resultado não validado. Não tratar a mera existência dos campos como calculadora pronta.

## Sequência para resolver

Primeiro, fechar D01 mínimo, D02, D08, D09, D10 e D11 mínimo; isso libera a especificação do MVP e sua primeira implementação futura. Tratar D06 em P0 somente se a validação do cadastro exigir aprovação, e resolver D07 no que afeta migração/paridade. Depois validar D03–D07 e D13 para o planejamento interno; detalhar D11/D12 para as expansões.

Ao resolver, registrar data, decisão, área validadora, exemplos de aceite e tarefas afetadas. Até lá, preservar o comportamento existente e consultar os [guias atuais](instrucoes/README.md) para regras já vigentes.
