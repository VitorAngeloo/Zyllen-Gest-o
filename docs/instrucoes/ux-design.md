# UX design do Zyllen Gestão

**Criado em:** 20/09/2026. **Natureza:** base de consulta para planejar, desenhar e avaliar a experiência de uso. **Fontes:** Laws of UX, de Jon Yablonski, livro e site, complementados pelas referências de acessibilidade do W3C.

Este guia reúne uma síntese em linguagem própria e sua aplicação ao projeto. As recomendações são critérios de projeto e avaliação; não afirmam que todos os padrões já estejam implementados. O diagnóstico e a ordem das próximas melhorias ficam no [plano de identidade visual e UX](plano-identidade-visual.md#ciclo-de-ux-de-20092026). O comportamento atual fica no [frontend](frontend.md) e nos guias de cada domínio.

## Como usar esta base

Antes de alterar uma tela, identificar quem realiza a tarefa, qual resultado precisa alcançar, o contexto de uso e as consequências de um erro. Consultar os princípios e padrões pertinentes; formular uma hipótese e verificar seu efeito na tarefa. Ao concluir, registrar o que foi observado e atualizar o guia técnico da funcionalidade.

As leis psicológicas orientam decisões, mas dependem do contexto e não substituem pesquisa, acessibilidade ou regras de negócio. Distinguir sempre:

- **Observação:** comportamento do código ou dificuldade efetivamente registrada em uso, com data e contexto.
- **Hipótese:** explicação ou melhoria que ainda será testada.
- **Decisão:** escolha explícita de produto, com motivo e limites.
- **Implementação:** comportamento entregue e verificado; só então deve ser descrito como atual.

As regras de [OS](ordens-de-servico.md), [estoque](estoque-e-patrimonio.md), [permissões](autenticacao-e-permissoes.md) e [segurança](seguranca.md) continuam nas suas referências principais. Uma recomendação de UX não autoriza ampliar acesso, remover confirmações obrigatórias ou alterar registros imutáveis.

## O que queremos melhorar

UX abrange encontrar uma tarefa, compreender escolhas, executar, receber retorno e recuperar problemas. A interface visual é parte dessa experiência. Uma tela bonita pode parecer mais fácil, mas sua qualidade precisa ser verificada quando há pressa, muitos registros, celular, interrupção ou conexão instável.

No Zyllen Gestão, o resultado desejado é trabalho concluído corretamente, com clareza sobre o que aconteceu e com pouco retrabalho. Tempo gasto no sistema, quantidade de cliques e quantidade de recursos não são indicadores de sucesso isoladamente.

Considerar as diferenças entre a equipe interna, técnicos, gestores, clientes e parceiros. A mesma aparência pode servir a tarefas e permissões diferentes. Usar vocabulário da operação, explicar termos quando necessário e manter consistência sem tornar todos os portais funcionalmente iguais.

## Princípios e aplicação ao produto

Os dez princípios abaixo correspondem aos capítulos centrais do livro. As aplicações e cautelas são a interpretação adotada para este projeto; consultar o [mapa de leitura](#fontes-e-mapa-de-leitura) para a fundamentação.

| Princípio | Ideia útil | Aplicação ao Zyllen Gestão | Cuidado na aplicação |
|---|---|---|---|
| Lei de Jakob | Padrões familiares ajudam a antecipar como uma interface funciona. | Manter busca, filtros, detalhes, salvar e cancelar em posições e com comportamentos consistentes. | Preservar a identidade da marca; copiar a aparência de outro produto não garante adequação à nossa operação. |
| Lei de Fitts | Distância e tamanho do alvo influenciam a facilidade de acioná-lo. | Aproximar a ação do conteúdo relacionado e ampliar áreas clicáveis de controles compactos, inclusive no celular. | Tamanho do ícone e tamanho da área de toque são coisas distintas. Separar ações destrutivas para reduzir acionamento acidental. |
| Lei de Miller | A memória de trabalho é limitada; agrupamentos significativos ajudam a organizar informação. | Agrupar campos por assunto, mostrar o contexto e permitir reconhecer opções sem memorizar códigos e etapas anteriores. | Não transformar “sete, mais ou menos dois” em limite universal de itens de menu ou de campos por tela. |
| Lei de Hick | Escolhas numerosas ou difíceis de distinguir podem tornar a decisão mais lenta. | Destacar a ação principal, nomear operações pelo resultado e revelar opções complementares quando pertinentes. | Esconder tudo em submenus ou acrescentar etapas pode aumentar o esforço. Não retirar informações necessárias à decisão. |
| Lei de Postel | Aceitar variações razoáveis de entrada reduz esforço desnecessário. | Normalizar espaços e formatos previstos, explicar erros e manter o preenchimento para correção. | Flexibilidade de formato não permite dados inválidos, associação ambígua de pessoas ou contorno de autorização. Validar também no servidor. |
| Regra do pico e do fim | Momentos marcantes e o desfecho podem influenciar a lembrança da experiência. | Cuidar das falhas, da recuperação e da confirmação de conclusão, indicando o registro e o que ainda falta. | Um encerramento agradável não compensa perda de trabalho. Não inventar sucesso ou esconder uma etapa pendente. |
| Efeito estética-usabilidade | Aparência agradável pode aumentar a percepção de facilidade. | Usar hierarquia, alinhamento, tipografia legível e identidade consistente para apoiar a leitura. | Preferência visual não comprova usabilidade; avaliar conclusão, erros e recuperação durante tarefas reais. |
| Efeito von Restorff | Um elemento diferente entre semelhantes tende a chamar mais atenção. | Reservar contraste forte para ação prioritária, seleção e exceções que precisam ser percebidas. | Se tudo está destacado, a hierarquia perde força. Não depender exclusivamente de cor ou movimento para comunicar estados. |
| Lei de Tesler | Parte da complexidade de uma tarefa precisa ser administrada, não simplesmente eliminada. | O sistema pode reaproveitar informações conhecidas, calcular totais e explicar relações, reduzindo trabalho repetitivo. | Automatizar não significa adivinhar vínculos ou ocultar consequências. Permitir conferir os dados antes da confirmação exigida. |
| Limiar de Doherty | Respostas rápidas ajudam a manter a continuidade da interação. | Reconhecer ações prontamente, carregar regiões independentemente e indicar o andamento das operações. | Os 400 ms discutidos na referência não são um prazo universal para toda requisição. Não criar esperas artificiais nem simular progresso. |

O site amplia essa base com outros conceitos úteis:

- **Proximidade, região comum e similaridade:** espaçamento, limites e aparência indicam relações. Agrupar título, campos e ações de uma mesma tarefa; manter grupos diferentes distinguíveis. Isso orienta o alinhamento dos menus e a organização dos formulários. [Proximidade](https://lawsofux.com/law-of-proximity/), [região comum](https://lawsofux.com/law-of-common-region/) e [similaridade](https://lawsofux.com/law-of-similarity/).
- **Carga cognitiva e agrupamento:** reduzir a necessidade de lembrar detalhes, interpretar siglas e comparar informações distantes; manter instruções úteis próximas da tarefa. [Carga cognitiva](https://lawsofux.com/cognitive-load/) e [chunking](https://lawsofux.com/chunking/).
- **Atenção seletiva:** considerar o objetivo de quem usa a tela ao decidir o que destacar. Não assumir que um aviso será lido apenas por estar visível. [Atenção seletiva](https://lawsofux.com/selective-attention/).

Pareto não prova que 20% das funções respondem por 80% do uso deste sistema. Efeitos sobre memória ou atenção também não justificam pressionar a pessoa, esconder alternativas ou criar urgência falsa. Prioridades dependem de evidências da nossa operação.

## Padrões para consultas, estados e mensagens

Toda região que consulta ou grava dados precisa comunicar seu estado real. A página pode continuar útil quando apenas uma parte falha.

| Situação | Comportamento desejado | Exemplo de mensagem ou ação |
|---|---|---|
| Carregamento inicial | Indicar atividade, manter estrutura estável e não apresentar ausência de dados antes da resposta. | “Carregando ordens de serviço…” |
| Atualização com dados anteriores | Preservar contexto, leitura e foco. Identificar falha de atualização e oferecer recuperação. | “Não foi possível atualizar. Exibindo os últimos dados carregados.” |
| Consulta concluída sem registros | Explicar a ausência e oferecer ação compatível com a permissão. | “Nenhuma OS cadastrada.”; criar apenas quando autorizado. |
| Filtros sem correspondência | Mostrar os filtros ativos e um caminho para ajustá-los. | “Nenhuma OS corresponde aos filtros.”; “Limpar filtros”. |
| Erro de consulta | Explicar o que não pôde ser carregado, preservando filtros e dados independentes. | “Não foi possível carregar os anexos.”; “Tentar novamente”. |
| Falha de opções do formulário | Sinalizar o problema na região dependente, mantendo os demais campos. | “Não foi possível carregar os projetos deste cliente.” |
| Envio em andamento | Reconhecer o acionamento e impedir submissão duplicada. | “Salvando…”; manter os dados visíveis. |
| Sucesso parcial | Informar o que concluiu, o que está pendente e como continuar. | “OS criada. Há anexos pendentes de envio.” |
| Resultado da gravação incerto | Verificar o registro antes de repetir uma operação que possa duplicá-lo. | Orientar conferência ou retomada; timeout não prova que o servidor deixou de salvar. |
| Permissão insuficiente ou registro indisponível | Oferecer uma saída compreensível, sem revelar dados protegidos. | Voltar à lista ou explicar que a ação não está disponível para a conta. |

Mensagens devem dizer o que aconteceu e como prosseguir, com o nível de detalhe útil à pessoa. Erros de campo ficam próximos ao campo e associados a ele; uma notificação passageira não deve ser a única explicação de uma pendência importante. Não inventar zeros para indicadores indisponíveis, sucesso antecipado em operações críticas ou retentativa automática de gravação sem garantia contra duplicação.

## Formulários, salvamento e recuperação

1. Apresentar campos em grupos coerentes, com rótulos permanentes, unidades, obrigatoriedade e instruções necessárias antes do envio. Placeholder não substitui rótulo.
2. Reutilizar informações já conhecidas quando a origem for confiável e o vínculo confirmado. Deixar a pessoa conferir o resultado; não associar registros apenas por semelhança de nomes.
3. Validar sem apagar o preenchimento. Explicar a correção e manter os erros acessíveis por teclado e leitor de tela. Validação no cliente complementa a do servidor.
4. Ao navegar entre etapas, preservar o que ainda é válido. Quando mudar uma escolha invalida dados dependentes, explicar o efeito antes de descartá-los.
5. Indicar com precisão se há alterações não salvas, envio em andamento, rascunho salvo ou falha. Avisar antes de descartar trabalho relevante; não acrescentar confirmação a toda navegação sem necessidade.
6. Dimensionar revisão e confirmação pela consequência da ação, respeitando PINs e confirmações existentes. Um resumo no formulário pode ser suficiente quando não houver uma etapa obrigatória adicional.
7. Confirmar a conclusão com o resultado real e o acesso ao registro quando permitido. Distinguir uma tarefa inteira concluída de uma etapa concluída.

Na OS, criação e anexação precisam de retornos separados. Depois que a criação conclui, a recuperação do upload usa a OS existente. Se a criação falha, preservar os arquivos locais conforme o fluxo atual. Não prometer que arquivos ainda em memória sobreviverão ao fechamento do navegador. Rascunho manual existente, rascunho automático proposto e anexo persistido são estados diferentes.

Uma futura persistência de rascunho deve definir escopo por conta, expiração, proteção dos dados, limpeza ao sair e conflitos entre sessões. Não incluir credenciais, senhas, PINs ou tokens. A escolha do armazenamento depende da sensibilidade e do contrato da funcionalidade. Desfazer ou retomar nunca deve contornar a imutabilidade de blocos confirmados.

## Navegação, listas e continuidade

- Usar nomes compreensíveis para as tarefas, preservar grupos já conhecidos e indicar a localização atual. Evitar renomear áreas apenas para variar a aparência.
- Manter uma hierarquia previsível de ação principal, ações secundárias e filtros. Opções complementares precisam continuar descobríveis por quem usa o sistema com frequência.
- Ao abrir detalhes e retornar, preservar busca, filtros, ordenação, página e posição quando aplicável. Evitar que uma atualização periódica retire o foco ou interrompa a ação em curso.
- Usar URL para estado de consulta compartilhável e não sensível, quando adequado. Links diretos por identificador continuam sujeitos à autorização. Nunca colocar credenciais ou conteúdo privado na URL.
- Se preferências forem persistidas, definir seu escopo, duração e possibilidade de restaurar o padrão; evitar mistura de contextos entre contas. Não adicionar filtros salvos ou busca global sem necessidade observada.
- Na sidebar recolhida, manter alvo confortável, nome acessível, estado ativo e foco visível. Ajuda por tooltip deve funcionar também com teclado; nenhum comando essencial pode depender de hover.
- Em tabelas densas, alinhar dados comparáveis, identificar unidades e datas e manter ações relacionadas à linha. Conteúdo abreviado precisa ter uma forma acessível de consulta integral.

A seção Acesso Rápido foi removida por decisão do usuário. Consistência com padrões externos não é motivo para recriá-la. A navegação e as ações também não devem ultrapassar o escopo autorizado de cada portal.

## Dashboard, alertas e conclusão de tarefas

O dashboard deve ajudar a perceber pendências e entender o próximo passo permitido. Diferenciar indicadores do período de situações atuais; identificar filtros e, quando relevante, a atualização dos dados. Um número só é útil se a pessoa entende o que conta e o que pode fazer a partir dele.

Alertas precisam de motivo, contexto e ação quando ela existir. Usar texto e outros sinais além da cor; reservar destaque forte para exceções. Avaliar competição entre alertas sem remover automaticamente os comportamentos operacionais atuais. A dashboard de Internos é de consulta: não sugerir ações de negócio em cartões que não as permitem.

Em telas de acompanhamento sem operador, tratar a altura visível como recurso limitado. Toda informação essencial deve aparecer ou avançar automaticamente em páginas legíveis, com indicação da quantidade e da posição; barras de rolagem e ações de hover não são uma forma de descoberta nesse contexto. Manter uma alternativa de fluxo vertical para celular e janelas menores, e verificar a leitura à distância na resolução usada pela TV.

Ao concluir uma tarefa, deixar claro o resultado e eventuais pendências. Pedidos de avaliação e lembretes devem ser estudados quanto ao momento, compreensão e interrupção. Mudanças na avaliação obrigatória são decisões de produto registradas no plano, não consequência automática deste guia.

## Acessibilidade e adaptação

Acessibilidade faz parte da definição da interação. A revisão combina inspeção, ferramentas e uso manual; uma ferramenta automática sozinha não demonstra conformidade.

- **Semântica e teclado:** usar controles apropriados, nomes acessíveis, ordem de leitura e foco visível. Permitir concluir as ações com teclado e anunciar estados importantes sem produzir notificações repetitivas a cada atualização.
- **Diálogos:** ao abrir, mover o foco para um ponto apropriado; manter a navegação de Tab dentro de um modal ativo; disponibilizar fechamento e devolver o foco a uma origem coerente. Identificar título, natureza modal e conteúdo relevante. O padrão APG prevê Escape para fechar; bloqueios obrigatórios ou estados ocupados precisam ser explicitamente avaliados, com saída compreensível e sem declarar aderência ao padrão quando houver exceção. [Dialog modal — W3C APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
- **Reutilização do foco:** o projeto já tem [useDialogFocus](../../apps/web/src/lib/use-dialog-focus.ts). Antes de centralizar comportamento em componentes, verificar consumidores, diálogos sobrepostos e tratamento durante envio, evitando listeners e restaurações de foco concorrentes.
- **Contraste:** medir os pares reais. A WCAG 2.2, critério 1.4.3, nível AA, usa pelo menos 4,5:1 para texto comum e 3:1 para texto grande conforme sua definição. A exceção para logotipos não se estende ao texto funcional. [Contraste mínimo — W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- **Alvos de interação:** a WCAG 2.2, critério 2.5.8, nível AA, estabelece 24 × 24 pixels CSS, com exceções, incluindo espaçamento. Como objetivo de conforto em controles de toque frequentes, buscar áreas de aproximadamente 44 × 44 pixels CSS quando viável; esse objetivo do produto não é o mínimo AA. Medir a área acionável, não apenas o desenho do ícone. [Tamanho mínimo do alvo — W3C](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- **Celular e zoom:** conferir larguras pequenas, intermediárias, desktop e ampliação de texto. Não cortar ações essenciais, rótulos ou mensagens; tabelas podem precisar de rolagem própria. As verificações do plano são cenários de teste, não uma certificação de conformidade.
- **Movimento:** respeitar preferência por movimento reduzido e manter o significado do estado sem animação. Transições devem explicar continuidade sem atrasar a execução ou deslocar o alvo durante uma ação.

## Identidade visual e desempenho percebido

Usar os vetores oficiais, proporções e tokens existentes; manter a relação de destaque já definida entre Zyllen e Skyline. A marca orienta a composição, enquanto rótulos, números e textos operacionais precisam permanecer legíveis. Evitar tipografia excessivamente pequena e maiúsculas extensas em informações de leitura frequente.

Alinhamento, espaçamento e hierarquia devem explicar as relações entre os elementos. O verde da marca serve à identidade e à orientação, respeitando os estados semânticos dos componentes. Não transformar cada número ou ação em um destaque concorrente.

Reconhecer ações rapidamente e manter regiões independentes utilizáveis durante consultas. Medir tempos com condições representativas de dispositivo e conexão antes de definir metas. Só mostrar percentuais quando o progresso for conhecido; quando não for, descrever a atividade. Melhorar percepção de desempenho não pode mascarar uma falha ou indicar conclusão antes da confirmação real.

## Avaliação por tarefas

### Roteiro de um ciclo

1. **Delimitar:** escolher uma tarefa e os perfis que realmente a executam, incluindo situações de uso diferentes. Registrar problema observado, evidência disponível e hipótese.
2. **Estabelecer referência:** observar a experiência atual com dados sintéticos. Registrar início e fim da tarefa, conclusão, necessidade de ajuda, erros, interrupções e recuperação.
3. **Prototipar:** demonstrar o percurso principal e os estados difíceis, especialmente falhas e retorno após interrupção. Manter fidelidade suficiente para testar a hipótese.
4. **Observar sem conduzir:** apresentar um objetivo, como “registre a saída destes itens para este projeto”, sem indicar em qual botão clicar. Anotar dúvidas e intervenções do observador.
5. **Comparar e ajustar:** repetir cenários equivalentes, considerando que conhecer a primeira versão pode facilitar a segunda. Registrar problemas persistentes e diferenças entre perfis; evitar generalizar uma amostra pequena.
6. **Verificar e documentar:** conferir acessibilidade, regressões e regras do domínio; registrar resultados, limites e decisão. Uma preferência estética e uma melhoria de execução podem divergir e devem ser descritas separadamente.

Não existe número universal de participantes que comprove qualidade. Selecionar pessoas e tarefas pela diversidade dos contextos importantes; fazer rodadas curtas e ampliar a investigação quando surgirem diferenças ou dúvidas. Nesta máquina, protótipos e testes devem usar ambiente isolado e dados sintéticos, conforme as [instruções do projeto](instrucoes-para-agentes.md).

### Medidas úteis

| Medida | Como registrar | Interpretação |
|---|---|---|
| Conclusão sem ajuda | Quantas pessoas concluíram entre as que tentaram, por tarefa e perfil. | Mostrar contagens junto de proporções e informar o tamanho da amostra. |
| Erros e retrabalho | Tipo de erro, consequência e passos refeitos. | Um fluxo mais rápido não é melhor se gerar mais erros graves. |
| Tempo para concluir | Mesmo início/fim definidos, com indicação das interrupções e do resultado. | Comparar tarefas equivalentes; mediana pode ser útil, mas não esconder falhas e desistências. |
| Recuperação | Se a pessoa retoma após falha e o que precisa preencher ou enviar novamente. | Verificar perda de trabalho e duplicação, além de tempo. |
| Compreensão e confiança | Pedir que explique o que aconteceu, o que está salvo e qual o próximo passo. | Complementar opiniões com a execução observada. |

Não publicar metas percentuais sem referência inicial. Não coletar dados pessoais, conteúdo de OS, anexos ou credenciais só para medir UX. Qualquer futura instrumentação deve ter finalidade, dados mínimos e proteção definidos; este guia não adiciona ferramentas de rastreamento.

### Registro mínimo de uma decisão

```text
Data e tarefa:
Perfis e contexto:
Problema observado e evidência:
Hipótese e resultado esperado:
Alternativas consideradas:
Escopo e regras que precisam ser preservadas:
Cenários e critérios de aceite:
Resultado da avaliação e limitações:
Decisão, pendências e referência da implementação:
```

Guardar propostas e resultados datados no plano pertinente, evitando criar um guia concorrente por tela. Quando houver implementação, atualizar o documento técnico do domínio com o comportamento entregue. Evoluir esta base quando uma aprendizagem for reutilizável em várias áreas.

## Checklist de revisão de uma entrega

- A pessoa entende onde está, o objetivo da tela e a próxima ação permitida.
- Vocabulário, hierarquia e controles são consistentes com as telas relacionadas.
- Carregamento, vazio confirmado, filtro sem resultado, erro e sucesso parcial estão diferenciados.
- Preenchimento, contexto e foco são preservados nas transições relevantes.
- Falhas permitem recuperação sem perda silenciosa, duplicação ou falsa confirmação.
- Teclado, nomes acessíveis, contraste, toque, celular, zoom e movimento foram verificados no escopo alterado.
- Perfis e portais mantêm suas permissões, confirmações e restrições de leitura/edição.
- Critérios foram avaliados por tarefa; resultado, limitações e documentação correspondem à entrega real.

Aplicar o checklist ao escopo da mudança. Ele complementa as verificações técnicas do projeto e não exige reimplementar ou retestar toda a aplicação em cada ajuste pequeno.

## Fontes e mapa de leitura

**Livro:** YABLONSKI, Jon. *Laws of UX: Using Psychology to Design Better Products & Services*. 2ª edição. O’Reilly Media, 2024. Referência: PDF de 186 páginas fornecido pelo usuário; a numeração impressa do miolo difere da posição no PDF. Este guia contém síntese e aplicações próprias, sem reproduzir o livro ou armazenar sua cópia no repositório.

| Tema | Capítulo | Página impressa inicial | Página inicial no PDF |
|---|---|---|---|
| Lei de Jakob | 1 | 1 | 21 |
| Lei de Fitts | 2 | 15 | 35 |
| Lei de Miller | 3 | 29 | 49 |
| Lei de Hick | 4 | 39 | 59 |
| Lei de Postel | 5 | 53 | 73 |
| Regra do pico e do fim | 6 | 65 | 85 |
| Efeito estética-usabilidade | 7 | 79 | 99 |
| Efeito von Restorff | 8 | 93 | 113 |
| Lei de Tesler | 9 | 107 | 127 |
| Limiar de Doherty | 10 | 119 | 139 |
| Aplicação dos princípios no design | 11 | 131 | 151 |
| Responsabilidade no uso dos princípios | 12 | 139 | 159 |

**Site do autor:** [Laws of UX](https://lawsofux.com/), consultado em 20/09/2026. As páginas específicas estão ligadas às aplicações acima; livro e site servem à fundamentação, enquanto as recomendações para o Zyllen Gestão dependem de validação local.

**Acessibilidade:** referências oficiais do W3C vinculadas na seção correspondente. WCAG define critérios de acessibilidade; APG fornece padrões de interação. Conferir o critério completo e suas exceções na avaliação de conformidade, sem usar uma lei psicológica como substituto.

**Referências do projeto:** [plano de identidade e UX](plano-identidade-visual.md), [frontend](frontend.md), [organização da arquitetura](organizacao-da-arquitetura.md) e [índice da documentação](README.md).
