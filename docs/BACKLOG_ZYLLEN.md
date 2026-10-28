# Backlog Zyllen — Cronograma e Planejamento

**Entrega posterior autorizada em 28/10/2026 — concluída/publicada:** liberar edição dos 240 cards do ZIP e restaurar o quadro Projetos. Dependências: autorização expressa do usuário, preservação da fonte e RBAC atual. Aceite: formulário conforme ZIP; pendências/anotações/auditoria persistidas; controle de concorrência; cancelamento justificado; projetos anteriores e 50 planejamentos ativos importados visíveis no quadro; sem gerar agendamentos/conclusões reais. Uma migration adicional aplicada (28 totais), com ensaio em restauração, 70 cenários API e 48 de navegador aprovados. Matriz ampliada e conversão operacional continuam pendentes. [Detalhes](instrucoes/projetos-e-agenda.md#edição-dos-registros-do-zip-e-retorno-do-quadro-em-28102026).

**Publicação de 28/10/2026:** etapa 6 executada por autorização do usuário. Cinco migrations aplicadas, frontend/API publicados e 240 registros/seis pendências do ZIP carregados como legado somente de consulta. Internos bloqueado; matriz dos demais acessos adiada. [Evidências e limites](instrucoes/projetos-e-agenda.md#publicação-operacional-em-28102026). Os registros de preparação abaixo descrevem o estado anterior quando assim identificados.

**Atualização:** 28/10/2026. Referência: [roadmap e inventário técnico](ROADMAP_ZYLLEN.md). Definições de negócio: [decisões pendentes](DECISOES_PENDENTES.md).

Este backlog registra a preparação e a publicação na branch `codex/cronograma-planejamento`: frontend, cadastro técnico, etapas/previsões, colaboração, ações/histórico, indicadores e legado de consulta. As cinco migrations desta entrega estão aplicadas. Responsáveis e estimativas das expansões futuras ainda não foram definidos.

**Avanço em F01-04/F02-03 (28/10):** contrato técnico opcional, persistência preparada, auditoria transacional e editor canônico, com cards/filtros consumindo os campos explícitos. Compatibilidade com API/clientes antigos preserva dados. Permanecem parciais: ainda faltam aceite de negócio, homologação/publicação e os demais campos/estados do MVP. D02/D10 não estão integralmente resolvidas. Detalhes e verificação no [guia da área](instrucoes/projetos-e-agenda.md#cadastro-técnico-preparado-em-28102026).

## Como acompanhar

### Ciclo autorizado: cinco etapas antes da homologação

Não confundir estas entregas do MVP com as fases 00–07 do roadmap. O usuário pediu concluir as cinco etapas técnicas abaixo antes da sexta (homologação/publicação).

| Etapa | Entrega | Estado local | O que falta para o aceite operacional |
|---|---|---|---|
| 1 | Múltiplas pendências, resolução e anotações com autoria/histórico | Implementada, validada e publicada na etapa 6. | Aceite de uso pela equipe e futura matriz ampliada. |
| 2 | Ações rápidas, cancelamento justificado, reagendamento e histórico consultável | Implementada, validada e publicada na etapa 6. | Aceite de uso; reagendamento mantém cadastro canônico e fluxos antigos preservados. |
| 3 | Validar ZIP e preparar ensaio idempotente da importação | Preparação concluída e carga de legado executada na etapa 6: 240 registros/seis pendências preservados. | Conversão futura para registros operacionais exige vínculos/endereço/horários/datas reais/autoria validados; a consulta de legado não depende desses preenchimentos. |
| 4 | Conciliar indicadores e integrar dashboard | Concluída localmente: categorias/conclusões e ações manuais na dashboard interna, com escopos explícitos. 68 cenários API de projetos/indicadores, 35 de painéis e 95 de navegador aprovados. | Aceite de negócio e dados revisados; espelho mantém projeção anterior. |
| 5 | Preparar autorização e validar restrições | Referência por ação e RBAC preservados, bloqueio explícito de Internos publicado e requisições negativas testadas. | Matriz por área adiada pelo usuário para depois da publicação; sem concessões automáticas. |
| 6 | Homologar, importar e publicar | Publicado/verificado em 28/10: cinco migrations, 240 legados/seis pendências, health/CORS/proteção e leitores reais conferidos. 75 cenários API e 43 de navegador aprovados. | Aceite de uso pela equipe, matriz dos demais acessos e eventual conversão dos legados permanecem como acompanhamento; Internos sem acesso. |

A retirada dos registros do cronograma usará **cancelamento com justificativa e histórico**, conforme resposta do usuário. Nenhuma exclusão física foi autorizada. As permissões por área serão definidas posteriormente; preservar concessões atuais.

**Avanço em F01-02/F01-05/F02-03 (28/10, bloco seguinte):** etapas e previsão mensal/diária com persistência preparada, formulário, cards, agrupamento do quadro, filtros separados de execução e calendário de previsões. Conclusão real, cancelamento e agendamento não são alterados pela classificação. Auditoria, omissão/limpeza explícita e compatibilidade antiga cobertas na verificação do [guia da área](instrucoes/projetos-e-agenda.md#etapas-e-previsões-preparadas-em-28102026). O aceite completo permanece parcial, sem declarar todas as decisões D08/D10 resolvidas.

- **Concluído (documental):** análise entregue nos arquivos indicados, sem mudança de comportamento.
- **Parcial (existente):** há código reaproveitável; o aceite da integração ainda não foi atendido.
- **Parcial (adaptação local):** a primeira integração de frontend foi implementada; os critérios completos da fase e sua publicação continuam pendentes.
- **A validar:** depende de definição de negócio ou conferência de fonte/ambiente.
- **Não iniciado:** implementação da nova proposta ainda não começou, mesmo quando o pacote já oferece a função.
- P0 atende ao Marco 1; P1 ao Marco 2; P2 expande viagens e OS. D01–D13 são IDs do registro de decisões. Dependências abaixo são condições de início/aceite, não autorização para executar.

## Fase 00 — Preparação e estrutura (P0)

| ID | Tarefa e reaproveitamento | Dependências | Critério de aceitação | Estado |
|---|---|---|---|---|
| F00-01 | Auditar navegação, módulos, contratos, banco e documentação atual. | Fontes locais do Zyllen. | Inventário do roadmap aponta evidências de código e diferencia existente, parcial e ausente, sem assumir publicação atual. | Concluído (documental) |
| F00-02 | Especificar a navegação Cronograma e Planejamento e a transição das vistas antigas. | D09; F00-03. | Mapa identifica destino inicial, menus recebidos, manutenção de Viagens, Equipe oculta, URLs antigas e pontos de entrada da dashboard; nenhuma remoção de dados/endpoints presumida. | Parcial (adaptação local) |
| F00-03 | Inventariar funções/menus do ZIP e confrontar transcrições. | Anexos recebidos. | Matriz de paridade cobre navegação, filtros, cards, escrita, histórico, tema e atualização, com divergências explícitas. Hashes e diagnóstico agregado registrados sem dados individuais. | Concluído (documental) |
| F00-04 | Completar mapa de usuários, setores, perfis e banco efetivos. | D01; procedimento de leitura aprovado quando houver acesso ao ambiente. | Distinguir papéis configurados, setores textuais, concessões efetivas, schema aplicado e consumidores; registrar só agregados e pendências, sem segredos/dados pessoais. | Parcial (existente) |
| F00-05 | Validar dicionário de projeto, dados técnicos e campos obrigatórios. | D02, D10; inventário de campos no roadmap. | Cada campo tem significado, tipo/unidade, origem, edição/leitura, obrigatoriedade condicional e tratamento de ausência/legado. | A validar |

## Fase 01 — Cronograma e calendário (P0)

| ID | Tarefa e reaproveitamento | Dependências | Critério de aceitação | Estado |
|---|---|---|---|---|
| F01-01 | Integrar a estrutura do cronograma à arquitetura web/API/shared existente e aplicar a nova navegação. | F00-02, F00-05; D01 mínimo, D09, D10. | Entrada usa o nome solicitado, cronograma é inicial, vistas antigas têm destinos definidos, Viagens permanece e Equipe fica oculta sem perder responsáveis. Sessão e transporte usam o Zyllen; fontes brutas não são publicadas no frontend. | Parcial (adaptação local) |
| F01-02 | Adaptar ano/meses, resumo, Agenda, Calendário, Projetos, Pendências, filtros, lateral, tema e atualização. | F01-01; D08, D09, D10. | Cada linha da matriz de paridade tem cenário de verificação; meses/anos, previstos sem dia, vários dias, filtros combinados, retorno de navegação e atualização mantêm escopo e dados. Destino das funções de escrita do pacote fica explícito. | Parcial (adaptação local) |
| F01-03 | Unificar abertura e leitura do card em todas as vistas. | F01-02, F01-04. | Agenda, calendário, quadro, pendências e lateral abrem o mesmo registro por ID, com dados atuais, carregamento/erro/retentativa e modo de leitura sem escrita/arraste. | Parcial (adaptação local) |
| F01-04 | Definir e integrar apresentação/persistência das características técnicas. | F00-05; D02, D10. | Categoria, tipo de sala, formato, projeções, proporção, resolução, controle, som e equipamentos aparecem sem perda; desconhecido continua desconhecido; contrato comum e cadastro têm a mesma fonte. | Parcial (adaptação local) |
| F01-05 | Compatibilizar etapas, previsões, andamento e consulta de disponibilidade. | F01-01; D08, D10, D11. | Oito etapas recebidas têm destino validado; consulta diferencia previsão, agenda e execução. Conflitos existentes permanecem. Não apresentar dia sem evento como capacidade comercial garantida sem regra aprovada. | Parcial (adaptação local) |

## Fase 02 — Dados, dashboard e publicação (P0)

| ID | Tarefa e reaproveitamento | Dependências | Critério de aceitação | Estado |
|---|---|---|---|---|
| F02-01 | Validar os históricos com a área responsável e confirmar a fonte vigente. | F00-05; D08, D10. | Confrontar JSON/planilha vigente quando fornecida; revisar todos os 240 registros e 6 pendências, ou justificar diferenças da fonte nova. Registrar faltas, duplicidades semânticas, datas e vínculos em ambiente privado; não inventar endereço, técnico, categoria ou execução. | A validar |
| F02-02 | Preparar e ensaiar a migração dos dados validados; execução real será uma etapa própria. | F02-01; D02, D07, D08, D10. | Ensaio isolado idempotente preserva origem/IDs/relações e concilia contagens/exceções. Produção exige dados e plano de preservação/publicação revisados; nenhuma inferência por nome ou seed. | Parcial: preparação local ensaiada; executor/carga operacional dependem das exceções |
| F02-03 | Organizar o formulário integrado aproveitando os dois cadastros. | F00-05, F01-04; D02, D10. | Campos condicionais e obrigatórios validados; cliente/projeto/responsáveis identificados; históricos incompletos têm tratamento explícito. Falha preserva rascunho; criação de instalação/desinstalação/manutenção segue decisão aprovada. | Parcial (adaptação local) |
| F02-04 | Reconciliar resumo anual e indicadores com serviços de estatísticas existentes. | F02-01; D08. | Métricas de instalação/desinstalação, salas/telas, andamento, próximos e pendências têm fórmula, período e fonte explícitos; não multiplicam por responsável; não convertem data prevista em conclusão real. Diferenças com o painel recebido ficam explicáveis. | Parcial (existente) |
| F02-05 | Integrar cronograma e resumos à dashboard e avaliar o espelho existente. | F01-03, F02-04, F02-06. | Dashboard reutiliza consultas, abre detalhes permitidos e aponta aos novos destinos; demais resumos continuam funcionando. Acesso por link preserva escopo próprio e não herda automaticamente todos os dados técnicos ou privados. | Parcial (existente) |
| F02-06 | Implementar acesso mínimo de consulta para Comercial, Experiências e Diretoria. | F00-04; D01 mínimo. | Matriz mínima validada, aplicada no servidor e na interface; testes cobrem leitura permitida, escrita negada e ausência de acesso aos demais módulos por concessões excessivas. Não usar Administrador como atalho para Diretoria. | Parcial (existente) |
| F02-07 | Homologar e publicar a primeira versão operacional. | Recorte autorizado: RBAC atual com Internos bloqueado e ZIP somente de consulta. | API/web, migrations, dados, proteções e caminhos publicados verificados; testes de escrita permanecem isolados. | Publicado em 28/10; aceite de uso e matriz completa posteriores |

**Marco 1 publicado no recorte autorizado:** cronograma operacional e consulta do legado disponíveis. O aceite de uso da equipe e os acessos adicionais continuam acompanhados em F02-06/F02-07; não declarar todo o planejamento interno entregue por causa desta publicação.

## Fase 03 — Pendências e projetos (P1)

| ID | Tarefa e reaproveitamento | Dependências | Critério de aceitação | Estado |
|---|---|---|---|---|
| F03-01 | Consolidar múltiplas pendências por projeto, com responsáveis, prazos e resolução. | Marco 1; D01, D07; paridade definida em D09. | Reaproveitamento de checklist/acompanhamento avaliado sem duplicar fonte; várias pendências independentes mantêm abertura/resolução, autor e histórico, inclusive as recebidas. | Parcial (existente) |
| F03-02 | Validar taxonomia e escopo por setor/tipo/relevância. | F03-01; D01. | Cada área consulta apenas pendências autorizadas; filtros e contagens respeitam o mesmo escopo no servidor; casos de pendência multissetorial definidos. | Não iniciado |
| F03-03 | Consolidar Projetos como base central de registros e validação técnica. | Marco 1; D02, D06, D09, D10. | Calendarização, cards e indicadores consomem identidades e dados canônicos; cadastro não cria um segundo banco de projetos. Aprovação só é aplicada se validada. | Parcial (existente) |
| F03-04 | Receber e avaliar a ferramenta de resolução/proporção e sua versão simplificada. | F03-03; D06, D13. | Fonte/fórmulas e unidades fornecidas, validadas com casos de referência; cálculo integrado sem exigir 3D e sem sobrescrever dado técnico aprovado sem fluxo definido. | A validar |

## Fase 04 — Planejamento das equipes (P1)

| ID | Tarefa e reaproveitamento | Dependências | Critério de aceitação | Estado |
|---|---|---|---|---|
| F04-01 | Especificar e integrar calendário geral, pessoal e visão gerencial. | Marco 1; D01, D04; F05-01/F05-02 para aceite de acesso. | Filtro por pessoa no servidor, colaborador com escopo próprio, gestor com escopo aprovado e visão diária da equipe; não confundir filtro de instalador com autorização pessoal. | Parcial (existente) |
| F04-02 | Modelar atividades, cooperação, atribuição e fila sem responsável. | D02, D04; F04-01. | Uma demanda pode estar sem responsável no escopo autorizado e depois ser atribuída sem cópias; distinguir responsável e participante e manter histórico da mudança. | Não iniciado |
| F04-03 | Criar lista mensal pessoal/gerencial com atividades pendentes e concluídas. | F04-02; D03, D04. | Casos de agrupamento por dia/pessoa validados; concluídos aparecem na mesma lista com diferenciação e ordem de execução, conforme decisão; sem inventar trabalho em dias vazios. | Não iniciado |
| F04-04 | Validar e implementar prioridade dinâmica. | D03; F04-02. | Ordenação reproduz casos aprovados de hoje/amanhã, importância, prazo, atraso e empates; recálculo definido; pessoa vê prioridade compreensível sem expor pesos desnecessários. | Não iniciado |
| F04-05 | Implementar histórico mensal e eventual fechamento. | F04-03; D05, D07. | Meses anteriores/próximos consultáveis; histórico ordenado por execução; regras de bloqueio, correção, reabertura e tarefas que atravessam meses são explícitas e auditáveis. | Não iniciado |

## Fase 05 — Permissões e rastreabilidade (P1)

| ID | Tarefa e reaproveitamento | Dependências | Critério de aceitação | Estado |
|---|---|---|---|---|
| F05-01 | Evoluir matriz por setor, função e usuário sobre o RBAC atual. | D01 completo; F00-04. | Precedência, negações, gestão de exceções e perfis de colaborador/gestor/administrador/Diretoria aprovados; não transformar texto de setor em permissão implícita. | Parcial (existente) |
| F05-02 | Aplicar escopo e edição por ação/campo/autoria. | F05-01; D04, D05. | Servidor impede alteração fora do escopo inclusive por requisição direta; leitura, comentário, atribuição, aprovação e conclusão diferenciados conforme matriz. | Parcial (existente) |
| F05-03 | Integrar observações, comentários, dúvidas e justificativas. | F05-01; D06, D07. | Autoria autenticada, vínculo ao item correto e fluxo de resposta definidos; não alterar conteúdo alheio como se fosse observação própria. Notificação depende de validação, sem envio automático presumido. | Parcial (existente) |
| F05-04 | Completar rastreabilidade de mudança, cancelamento, reagendamento e correção. | D05, D07, D10. | Histórico consultável preserva antes/depois pertinentes, datas, autoria e motivo aprovado; cancelamento/correção não apagam execução anterior. Escopo de imutabilidade é validado sem alterar regras atuais de assinaturas. | Parcial (existente) |

**Marco 2 pendente:** aceite conjunto das F03–F05, sem depender de logística avançada ou automação de OS.

## Fase 06 — Gestão de viagens (P2)

| ID | Tarefa e reaproveitamento | Dependências | Critério de aceitação | Estado |
|---|---|---|---|---|
| F06-01 | Reestruturar Viagens preservando calendário, responsáveis, projetos e status atuais. | Continuidade P0 em F01-01; expansão após Marco 2; D04, D10. | Mesmos registros e vínculos, sem calendário/datas duplicados; abertura pela agenda e viagens legadas continuam disponíveis; confirmar futuro cadastro e edição antes de alterar o fluxo. | Parcial (existente) |
| F06-02 | Disponibilizar viagens pessoais por mês e visão geral autorizada. | F06-01; D01, D04. | Colaborador vê viagens próprias, inclusive futuras, e gestor consulta o escopo aprovado; restrição aplicada no servidor. | Não iniciado |
| F06-03 | Integrar passagens, hospedagem, veículos e documentos. | F06-01; D01, D11. | Arquivos privados por objeto, responsáveis definidos e vínculos de reserva sem duplicar o módulo Carros; alterações atualizam a consulta do participante. | Não iniciado |
| F06-04 | Vincular checklist de equipamentos, materiais e ferramentas. | F06-01; D11. | Escopo técnico, preparação, reserva e movimentação são diferenciados; vínculos usam catálogo/custódia existentes sem baixa de estoque automática não aprovada. | Não iniciado |

## Fase 07 — Ordens de serviço (P2)

| ID | Tarefa e reaproveitamento | Dependências | Critério de aceitação | Estado |
|---|---|---|---|---|
| F07-01 | Integrar OS existente ao serviço/atividade com vínculo automático. | Marco 2; D06, D12. | Cardinalidade e gatilho aprovados; vínculo por ID, sem nomes ou duplo cadastro, com idempotência e prevenção de OS duplicada em retentativa. | Parcial (existente) |
| F07-02 | Padronizar processos/formulários e evidências por atividade. | F07-01; D02, D12. | Reusar seis formulários existentes; requisitos de instalação, manutenção e visita técnica validados, com mídia privada, observações e assinatura preservadas nos três portais. | Parcial (existente) |
| F07-03 | Integrar início/fim, duração, conclusão e histórico de execução. | F07-01; D05, D07, D12. | Distinguir previsto e real; conclusão/retentativa/falha parcial não geram estado divergente ou dupla OS; regras de duração e correção aprovadas. | Parcial (existente) |
| F07-04 | Avaliar notificações de início, registro, dúvida e conclusão. | D06, D12; F07-03. | Gatilhos, destinatários, canal, frequência e consentimento operacional definidos antes de automatizar envios; sem exigência arbitrária de notificações repetidas. | A validar |

## Verificação quando a implementação for autorizada

A referência de arquitetura e builds é [desenvolvimento](instrucoes/desenvolvimento.md); banco compartilhado e publicação seguem [banco de dados](instrucoes/banco-de-dados.md) e [implantação](instrucoes/implantacao.md). Não iniciar servidores de desenvolvimento da API nesta máquina de produção.

Reaproveitar os cenários existentes de projetos, agenda, estatísticas, viagens, estruturas e painéis, além dos testes do pacote em `tests/`. Acrescentar cenários para diferenças concretas de integração: oito etapas, previsão mensal/diária, características técnicas, migração idempotente, múltiplas pendências, autorização mínima e compatibilidade dos links. A mudança de OS requer também regressões dos três portais e do upload em duas etapas. Executar somente em ambientes isolados/simulados adequados, sem registros de teste na base real.

A preparação original verificou somente Markdown e links. A adaptação posterior acrescenta arquitetura, tipos, build isolado e cenários sintéticos de domínio/navegador; resultados e limitações estão no [guia da área](instrucoes/projetos-e-agenda.md). Não há migração, publicação ou homologação com gravações reais.

## Próxima tarefa recomendada

Acompanhar o uso da versão publicada e definir a matriz dos demais acessos quando o usuário retomar o assunto. Revisar as exceções privadas somente para eventual transformação dos legados em registros operacionais; manter a consulta aprovada sem inventar dados. Planejamento de equipes, logística avançada e automação de OS seguem nas fases posteriores.
