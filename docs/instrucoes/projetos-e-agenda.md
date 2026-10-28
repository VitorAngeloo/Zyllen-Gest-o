# Cronograma e Planejamento

## Retirada dos projetos anteriores ao ZIP em 28/10/2026

Após a publicação, o usuário solicitou retirar os projetos que não vieram do ZIP e confirmou **somente a retirada de Cronograma e Planejamento**, preservando banco e vínculos. A leitura identificou 15 `ProjectService` anteriores e 240 registros legados. A lista explícita dos 15 IDs fica na configuração `NEXT_PUBLIC_PLANNING_HIDDEN_SERVICE_IDS`, no frontend local e na produção Vercel; os valores não são versionados. `chronogram-visibility.ts` aplica esse escopo após combinar as fontes e deduplicar seus vínculos, antes dos filtros, cards, calendário, quadro, pendências, resumos e lateral. Assim, os agendamentos vinculados não reaparecem como compromissos avulsos. A agenda complementar recebe a mesma lista por uma propriedade opcional; os demais consumidores de `ScheduleWorkspace` mantêm seu escopo anterior.

Os registros do ZIP continuam somente de consulta. Novos projetos, com IDs fora da lista, aparecem normalmente. Cadastros de clientes, dashboard geral, viagens, OS, estoque, histórico, permissões e estado operacional dos projetos permanecem preservados. Não há exclusão, cancelamento, migration ou escrita no banco nessa alteração. Restaurar a exibição exige retirar os IDs da configuração e reconstruir o frontend; não é um controle de autorização.

Publicado no localhost e no domínio de produção, deployment `dpl_2WqGjpgNiajps4fgG7uV6moJccqK`. A configuração dos 15 IDs foi confirmada nos arquivos efetivamente servidos por ambos. Arquitetura, tipos, build isolado, 21 verificações de domínio e 44 cenários de navegador passaram. O cenário adicional de escopo usa `AUDIT_HIDDEN_PROJECT_SERVICE_ID` sintético igual ao valor compilado em `NEXT_PUBLIC_PLANNING_HIDDEN_SERVICE_IDS` no build isolado, sem credenciais ou acesso real. Leitura pós-alteração confirmou os 15 serviços e seus 15 agendamentos preservados, os 52 cadastros `Project` e os 240 legados. API permaneceu no mesmo PID 24956, com saúde local/pública `200`; não houve recompilação ou reinício do backend.

## Publicação operacional em 28/10/2026

Etapa 6 autorizada pelo usuário, com matriz dos demais acessos adiada e **Internos sem acesso à página**. Publicação em [skylineti.com/dashboard/projetos](https://skylineti.com/dashboard/projetos), deployment `dpl_7vk4ieZCjMkQmVHosq6jqGdDGnFv`, preparado sem trocar domínio e promovido após verificação da API. API em produção, porta 3001, sem watch, PID **24956**. O localhost usa a API atualizada.

Foram aplicadas as **cinco migrations** de 28/10: especificações, planejamento, colaboração, data original e legado de consulta. As **27 migrations** ficaram em dia. Diferenças de checksum dos arquivos antigos foram reconciliadas por variantes de quebra de linha/BOM/final de arquivo, sem alterar seu SQL nem os registros anteriores.

O usuário definiu o ZIP como **legado somente de consulta**. `ProjectPlanningLegacyImport` registra nome/hash da fonte, hash do ZIP, instante de importação e identificador técnico da publicação. `ProjectPlanningLegacyRecord` preserva ID de origem, payload normalizado, hash e fonte bruta privada. As duas tabelas têm RLS e vínculo restritivo, separadas das identidades e da execução operacional. O operador técnico não é tratado como autor histórico. `ProjectLegacyImportService` usa transação única, bloqueio, lotes limitados e idempotência por conteúdo; não há rotas HTTP de importação, edição ou exclusão.

A carga preservou **240 registros e seis pendências**, sem criar agendamentos, contas, vínculos por nome ou conclusões reais. `GET /project-services/legacy/records` e `/:id` oferecem paginação/detalhe com proveniência e autorização. `project-legacy-api.ts` consulta todas as páginas; `legacyToChronogram` mantém execução desconhecida e mostra Agenda/Calendário/Pendências com indicação de legado e card sem escrita. Registros sem data/previsão aparecem em **Histórico legado sem data informada**. Não entram nos indicadores operacionais nem no quadro ativo. A futura transformação em registros operacionais ainda exige vínculos, endereço, horários, datas reais e políticas validadas.

`canEnterProjectPlanning` e `ProjectPlanningGuard` bloqueiam **Internos**, inclusive com concessões acidentais de `schedule.*`. A navegação e a API preservam sua dashboard limitada. Não foram concedidos acessos nem definidos novos perfis para Comercial/Experiências/Diretoria; a matriz completa fica para depois.

Backup privado em `C:\Users\SERVIDOR ZYLLEN\Documents\Zyllen-Backups\chronogram-20261028-121144`: dump, restauração verificada de **63 tabelas**, uploads locais, configuração, Prisma Client e artefatos anteriores. Ensaio sobre a restauração aplicou as cinco migrations e importou o ZIP duas vezes sem duplicação nem alteração dos totais operacionais. Foram publicados **88 artefatos revisados**; demais módulos/configuração e limite de vídeo vigente de **80 MB** permaneceram intactos. Não foi promovido o aumento de vídeo de 150 MB existente nas fontes. Prisma Client foi gerado com API parada. A inicialização desanexada foi rejeitada pela revisão automática; a execução acompanhada em terminal iniciou normalmente. A pausa foi removida após saúde confirmada; recuperação automática Ready, resultado 0.

Validação: arquitetura, tipos/build isolado, **75 cenários de API**, **43 de navegador** e 20 de domínio aprovados. Consultas reais pós-publicação foram somente de leitura: leitores canônicos, totais operacionais preservados, 240 legados/seis pendências, RLS nas quatro tabelas novas, health local/público `200`, proteção `401` sem sessão e CORS `204`. Arquivos públicos do domínio confirmaram o frontend novo. Não foram criados registros fictícios em produção; testes de gravação/bloqueio por perfil usam ambientes isolados. Aceite de uso pela equipe e matriz completa seguem como acompanhamento posterior.

## Preparação anterior à publicação

**Adaptação local iniciada em 26/10/2026 e continuada em 28/10/2026:** a branch `codex/cronograma-planejamento` inclui cadastro técnico, oito etapas/previsões, colaboração, ações rápidas/histórico, indicadores e preparação de importação/autorização. Quatro migrations estão preparadas, sem aplicação no banco compartilhado. Não houve importação operacional ou publicação. O [roadmap](../ROADMAP_ZYLLEN.md), [backlog](../BACKLOG_ZYLLEN.md) e [decisões pendentes](../DECISOES_PENDENTES.md) orientam a evolução; nenhuma fase inteira está declarada operacional em produção.

## Primeira integração do frontend

O menu agora usa **Cronograma e Planejamento**, mantendo `/dashboard/projetos`. As seções são **Cronograma**, inicialmente aberta, e **Viagens**, com seu funcionamento atual. Equipe deixa de aparecer; seus registros, cores, responsáveis e permissões não foram removidos. A área antiga de indicadores deixa a navegação principal; serviços de estatísticas e dashboard/espelho permanecem existentes.

Dentro de Cronograma, os quatro menus do pacote são preservados: **Agenda**, **Calendário**, **Projetos** e **Pendências**. Ano, meses, ano inteiro, filtros por categoria/serviço/status/UF, busca sem distinção de acentos, resumo, lateral, legendas e tema foram adaptados. O tema claro/escuro altera apenas o cronograma e mantém uma preferência local de apresentação. Busca/filtros/período/visualização ficam na URL, com teclado, recarga e histórico do navegador.

`features/planning` separa tela, componentes, hook de leitura, paginação, modelo de apresentação e seletores puros. As regras de períodos, previsões, pesquisa e aviso de realização foram adaptadas das fontes do ZIP; não foi incorporado o HTML compilado, Apps Script, PIN compartilhado ou JSON privado. O modelo de apresentação não é um contrato de persistência e não cria campos no banco.

Projetos e agendamentos são consultados por todas as páginas, usando a sessão/API existentes, com cache separado por usuário e atualização a cada 30 segundos. O vínculo de agendamento evita duplicar projetos. Compromissos avulsos e viagens continuam no calendário/lista. Falha em uma fonte impede mostrar totais parciais como completos; falha de atualização pode conservar os últimos dados completos com aviso. Intervalos da API têm fim exclusivo, convertido para o último dia ocupado no calendário local; não são gravadas datas novas por essa conversão de apresentação.

Agenda, calendário, quadro, pendências e próximos compromissos abrem cards por ID. Projetos/compromissos consultam detalhe atual; viagens reutilizam seu popup existente. Permissão de atualização abre o editor canônico, e **Novo registro** reutiliza a criação existente. A primeira adaptação reaproveitou rotas; os blocos seguintes acrescentaram colaboração/ações protegidas pelas permissões atuais, sem novas concessões. **Compromissos avulsos e recorrências**, **Histórico de instalações** e **Configurações de projetos** continuam em áreas complementares recolhidas.

O resumo anual conta conclusões por execução e data real, sem preencher ausências pela previsão. Dados técnicos, etapas e colaboração usam campos explícitos. O menu Pendências combina ações manuais abertas com avisos derivados de agendamentos vencidos, mantendo a distinção entre eles. As capacidades novas dependem da API atualizada; a API em produção permanece anterior. Transições/aprovações adicionais, políticas de legado e carga operacional continuam pendentes; o aceite completo do MVP exige a etapa 6.

Compatibilidade: `/dashboard/agenda` abre a Agenda; `aba=agenda&visao=calendario` abre Calendário; `aba=projetos` abre o novo quadro; caminhos de indicadores voltam ao cronograma; `/dashboard/viagens` abre Viagens; `/dashboard/projetos/estruturas` abre Projetos com o histórico expandido. `aba=equipe` volta ao cronograma sem exibir gestão da equipe. Resumos da dashboard continuam usando os mesmos IDs e seus links antigos são normalizados.

## Cadastro técnico preparado em 28/10/2026

`ProjectService.specifications` é um JSON opcional com contrato estrito compartilhado em `shared/src/project-services/specifications.ts`. Mantém a informação descritiva do pacote, sem cálculo automático, associação a patrimônio ou reserva de estoque. O vínculo continua sendo o serviço operacional existente, sem um segundo cadastro de projetos.

| Campo | Origem no ZIP | Representação e ausência |
|---|---|---|
| `category` | `cat` | `sala`, `tela` ou `null` (não informada); sem categoria padrão inferida. |
| `equipment` | `equip` | Lista de modelos em texto, um por linha no formulário; vazios removidos e repetições preservadas. Limites de transporte: 100 linhas de até 300 caracteres. |
| `room.roomType` | `salaTipo` | Texto de até 100 caracteres; vazio não se transforma em imersiva. Permite preservar descrições legadas sem impor taxonomia nova. |
| `room.format`, `room.projections`, `room.proportion`, `room.resolution`, `room.control`, `room.sound` | `formato`, `proj`, `prop`, `res`, `ctrl`, `som` | Texto de até 300 caracteres por campo, preservando unidade/descrição informada. `room: null` representa ausência do grupo; campos vazios continuam desconhecidos. |

Campos técnicos não acrescentam obrigatoriedade ao cadastro operacional. A validação de negócio de unidades e obrigatórios continua em D02. Campos de sala aparecem ao escolher Sala ou quando já há informação preenchida; trocar categoria preserva esses valores. **Limpar dados técnicos** limpa o rascunho e o salvamento envia `specifications: null`; não apaga o projeto. Falhas de salvamento mantêm o preenchimento.

POST/PUT existentes recebem `specifications` opcional: omitir preserva o JSON anterior, inclusive para clientes antigos; `null` o limpa explicitamente; objeto o substitui após validação. Criação/atualização e auditoria ficam na mesma transação. A auditoria registra os valores técnicos antes/depois quando enviados. Edições pela agenda não sobrescrevem o JSON. Listagem/detalhe retornam a mesma fonte e os cards, filtros, busca por equipamento e contagens por categoria a utilizam. Permissões existentes de `schedule.view/create/update` permanecem, sem concessões novas ou acesso pelos portais externos; matriz setorial futura segue pendente.

A API preparada anuncia `capabilities.projectSpecifications: true` em opções. Sem essa capacidade, o frontend conserva o cadastro anterior e omite a propriedade nova no salvamento. Assim, o localhost ligado à API antiga continua utilizável, sem oferecer campos cujo salvamento não está disponível. Ativação exige publicação coordenada da API/shared e revisão/aplicação da migration, conforme [implantação](implantacao.md) e [banco](banco-de-dados.md).

Migration preparada: `20261028100000_project_specifications`, gerada por comparação de schemas locais, com apenas `ALTER TABLE "ProjectService" ADD COLUMN "specifications" JSONB`. Sem backfill, defaults, remoções, mudanças de RLS ou aplicação no Supabase. Banco, artefatos compilados e processo da API de produção não foram alterados.

## Pendências e anotações preparadas em 28/10/2026

### Indicadores e preparação de acessos em 28/10/2026

`ProjectStatisticsService` mantém uma transação `RepeatableRead` para totais atuais, conclusões/cancelamentos do período e agregados do cronograma. `chronogram.completed` particiona instalações/desinstalações concluídas em salas/telas/desconhecidas; a soma reconcilia com `completedInPeriod`. Exige execução `DONE` e `Schedule.completedAt` no intervalo UTC `[start,end)`; previsão ou etapa Concluído não fabricam realização. Ações manuais abertas e quantidade de projetos com ações são situação atual, sem multiplicar por participantes nem confundir várias ações com vários projetos. O aviso de conclusão indicada sem data real mantém a lacuna visível.

A dashboard interna e a visualização autenticada reutilizam esses agregados; a dashboard mantém seus últimos 30 dias, enquanto o cronograma mostra o ano inteiro e explica que mês só organiza a agenda. Busca/categoria/serviço/etapa/UF do cronograma delimitam o resumo local; sem os mesmos filtros/período, não se espera igualdade entre todos os números. Próximos/agendamentos e situação atual têm rótulos próprios. O indicador manual da dashboard não inclui o aviso automático dos agendamentos vencidos nem compromissos avulsos. Atualizações invalidam listas, estatísticas, painel e histórico relacionados. O espelho anônimo continua sem o novo objeto `chronogram`, sem expor anotações, pendências ou características técnicas individuais.

`shared/src/project-services/access.ts` concentra a referência atual por ação, usada no controller e no cronograma. Consulta/histórico usam `schedule.view`; cadastro usa `schedule.create`; alteração, pendências, resolução, anotação e retirada usam `schedule.update`. Não é a matriz futura por setor/perfil: o usuário adiou essa decisão. Nenhum seed, concessão, filtro setorial por suposição ou novo bypass foi aplicado. Os direitos atuais continuam independentes; possuir apenas criação/alteração não concede consulta. Autoria vem da sessão; clientes e terceirizados permanecem sem acesso às novas rotas internas.

Validação final em `tmp/chronogram-delivery-validation`: arquitetura sem violações, tipos/build isolado shared/API/web aprovados; **20 cenários de domínio, 70 de API projetos/indicadores, 35 de API dos painéis e seis de preparação histórica** aprovados. A regressão ampliada de navegador passou **95 cenários**; após centralizar acessos, os **41 cenários do cronograma** passaram novamente. Foram conferidas capturas móveis de colaboração/dashboard. As suítes usam dados sintéticos/PGlite; o ensaio histórico usa somente arquivos/SQLite locais privados. Não houve aplicação de migrations, homologação com gravação real, importação operacional ou publicação.

### Ações rápidas, cancelamento e reagendamento

`ProjectActionsService` oferece alterações parciais de etapa e observações, sem reenviar o cadastro completo. Compara o valor lido ao abrir a edição; conflitos retornam 409 preservando o rascunho. Alterar etapa mantém previsão e execução separadas. Observações permanecem sincronizadas com o `Schedule` canônico. O card usa estas rotas somente quando a API anuncia `actionsAvailable` no registro.

A retirada de registro foi definida pelo usuário como **cancelar com justificativa e histórico**. A nova ação `POST /project-services/:id/cancel` exige motivo, verifica a situação esperada, reaproveita validações de ciclos/agenda e registra o motivo atomicamente. Retentativa da mesma justificativa não duplica o evento; não há exclusão física. Os fluxos operacionais antigos de status/agenda foram mantidos; a exigência de motivo nesta entrega pertence à nova ação de retirada, sem alterar silenciosamente seus contratos legados.

`ProjectService.originalScheduledStartAt` guarda o instante do primeiro início confirmado antes de uma mudança real. A gravação ocorre no serviço de agenda, cobrindo edição pelo cadastro e pela própria agenda; não muda em retentativas, edições sem deslocamento ou deslocamentos posteriores. Valor histórico desconhecido permanece nulo. A migration `20261028143000_project_original_schedule` foi conferida com diff entre schemas locais e está **não aplicada**. O botão Reagendar usa o editor canônico, preservando verificações de responsáveis/conflitos/viagens.

`GET /project-services/:id/history` reúne auditoria do serviço e do seu agendamento por identidade, com paginação limitada, autor/data, justificativas e campos permitidos antes/depois. Não entrega o JSON bruto da auditoria nem dados de autenticação. Usa `schedule.view`; escrita continua em `schedule.update`. Histórico prévio sem valores depois da mudança não é reconstruído por suposição. Validação: build isolado e **57 cenários API/migração, 41 de navegador** aprovados.

### Preparação histórica a partir do ZIP

O usuário confirmou o ZIP enviado como fonte. `apps/api/scripts/prepare-chronogram-import.py` lê somente `data/base-inicial.json`, sem executar código do pacote, sem cliente HTTP/Prisma e sem acessar ambiente/credenciais. Requer Python padrão e saída diretamente em `tmp/`; arquivos privados ficam ignorados pelo Git.

```powershell
python apps/api/scripts/prepare-chronogram-import.py --source 'C:\caminho\cronograma-skyline-ts.zip' --output tmp/chronogram-historical-review
python scripts/quality/test-chronogram-import.py
```

Gera `staging.json` (fonte integral + normalização conservadora), `import-plan.json`, `mapping-template.json`, `exceptions.json`, `summary.json` e um SQLite **local de preparação**. Não é um executor de importação no Zyllen. Chaves estáveis por coleção/ID de origem e hashes de conteúdo evitam duplicação; mudanças posteriores na mesma origem são sinalizadas sem sobrescrever o retrato anterior. O modelo de vínculos exige IDs explícitos; nomes não criam usuários, clientes, projetos ou associações.

Ensaio privado de 28/10 em `tmp/chronogram-historical-review`: **240 registros, 6 pendências, 0 anotações**, preservando 148 instalações, 91 desinstalações, 1 manutenção, 79 salas e 161 telas. Duas passagens mantiveram **246 chaves únicas**, sem conflitos de conteúdo. Os seis cenários sintéticos passaram, incluindo fonte alterada, datas inválidas, órfãos, duplicidade e destinos coincidentes.

Todos os 246 itens continuam bloqueados para carga operacional: faltam vínculos/endereços nos 240 projetos; 190 conclusões não trazem data real; 216 datas de início exigem definição de horário/duração; 92 serviços dependem de política de legado; cinco registros têm técnico textual sem ID; autoria histórica e seis vínculos de pendência precisam de tratamento explícito. O relatório não preenche essas lacunas com previsão, nome, primeiro dia do mês ou usuário importador. A etapa 3 está concluída como **preparação e ensaio**, não como validação de negócio ou carga aprovada. A importação operacional exige revisão e executor coordenado na etapa 6.

`ProjectServicePending` guarda várias ações independentes por serviço, com tipo, responsável descritivo, prazo opcional por dia, detalhes, criador autenticado, versão e resolução com autor/data. Mantém os tipos do ZIP e permite preservar tipos históricos desconhecidos no contrato. O checklist de acompanhamento continua distinto: não possui o mesmo ciclo de prazo/responsável/resolução.

`ProjectServiceNote` é acrescentada ao histórico com autoria/data da sessão; não há rotas para editar/apagar anotações. As quatro rotas de escrita usam a proteção atual `schedule.update`; leitura permanece em `schedule.view`. A matriz futura não foi definida e nenhum acesso foi concedido.

Criação recebe UUID de retentativa, sem aceitar autor/data do cliente. Edição exige versão; resolução é idempotente e ações resolvidas não podem ser editadas. Transações bloqueiam o projeto e gravam auditoria; vínculos impedem apagar o projeto com esses registros. A migration `20261028130000_project_collaboration` prepara tabelas privadas com RLS, sem aplicação no ambiente compartilhado.

O card integra criação/edição/resolução, lista de resolvidas e anotações; a lista Pendências reflete as ações abertas. Rascunhos são preservados na falha; fechamento fica bloqueado durante a gravação. A API antiga continua com consulta compatível e sem controles para as capacidades ausentes. Validação isolada em `tmp/chronogram-delivery-validation`: arquitetura, tipos, build shared/API/web e **52 cenários de API/migração, 39 de navegador** aprovados. Testes usam PGlite descartável e HTTP sintético. Não houve importação, homologação ou publicação.

## Etapas e previsões preparadas em 28/10/2026

O próximo bloco autorizado mantém `ProjectService.planning` opcional, separado de `Schedule.status`, com contrato único em `shared/src/project-services/planning.ts`:

| Campo | Valores e significado |
|---|---|
| `stage` | `contrato`, `kickoff`, `semprev`, `predef`, `agendado`, `pausado`, `concluido`, `cancelado` ou `null`. Preserva as oito classificações recebidas, sem convertê-las nos cinco estados de execução. |
| `forecast` | `AAAA-MM`, `AAAA-MM-DD` ou `null`. Mês/dia reais, com validação de ano bissexto e sem horário/fuso. Faixa técnica de 1970 a 9999, igual à navegação anual existente. Não cria intervalo, atribuição, viagem ou reserva. |

O editor canônico permite selecionar as oito etapas e trocar entre **Somente mês** e **Dia previsto**, com rascunhos independentes para não truncar um dia silenciosamente. Salva apenas a precisão selecionada; falhas preservam o rascunho. **Limpar planejamento** envia `planning: null` sem apagar o projeto, suas especificações, o agendamento ou as datas reais. Ausência da propriedade no input preserva os dados anteriores. Não há preenchimento automático de etapa, exigência nova de responsável/endereço, regras de transição ou aprovação inferidas das transcrições.

Classificar como Concluído/Cancelado não altera execução ou timestamps. Iniciar/concluir/cancelar a execução continua pelo fluxo atual; essas ações não sobrescrevem a etapa nem a previsão. Reagendar pela agenda mantém ambos os campos. Auditoria transacional registra autor e planejamento antes/depois nas atualizações explícitas; histórico de motivo/data original e importação continuam em D07/D10.

Agenda e calendário usam o intervalo confirmado quando existe. Sem intervalo, a previsão diária aparece tracejada no dia; a mensal aparece na lista **sem dia definido**, sem ocupar artificialmente o primeiro dia. O card mantém a previsão consultável mesmo depois de agendar. O quadro agrupa as etapas abertas e preserva colunas de estados antigos quando houver registros sem classificação nova; não reabre projetos executados/cancelados por causa de etapa desatualizada. Os filtros agrupam **Etapas do cronograma** e **Situação da execução**: escolher uma etapa filtra o planejamento; escolher um estado operacional filtra a execução, inclusive em projetos com etapa própria. URL, busca, mês/ano e abertura do mesmo card permanecem.

Cards identificam Cronograma e Execução separadamente. Conclusões anuais exigem `status === DONE` e data real no ano, inclusive quando a etapa do planejamento estiver desatualizada. Etapa Concluído sem data real gera indicação de qualidade, sem contar execução. Projetos ativos excluem execução finalizada/cancelada/desconhecida; próximos compromissos e avisos de data vencida usam o estado operacional. Uma etapa pausada/concluída/cancelada não oculta um agendamento vencido que ainda exige conferência. Contagens de previstos no ano usam a data agendada ou, na ausência dela, a previsão, sem misturar essas contagens com conclusões.

GET de opções anuncia `capabilities.projectPlanning: true`, independentemente da capacidade técnica. API antiga não habilita os campos e não recebe `planning` no salvamento. Permissões de consulta/criação/edição existentes continuam no servidor. Migration `20261028113000_project_planning`, gerada por schemas locais, acrescenta somente `planning JSONB` nullable. Nenhuma das duas migrations desta integração foi aplicada no Supabase; publicação exige revisão conjunta e procedimento coordenado dos guias de [banco](banco-de-dados.md) e [implantação](implantacao.md).

## Verificação da adaptação

`pnpm test:chronogram` verifica datas/fuso, estados sem inferências, deduplicação, filtros, previsões, pendências, métricas e paginação, somente com fixtures. `pnpm test:chronogram:browser` usa o harness de dashboard com a nova navegação e HTTP simulado, incluindo seus cenários anteriores de chamados. Preparar o build isolado conforme [desenvolvimento](desenvolvimento.md); os artefatos desta adaptação ficam em `tmp/chronogram-validation/`. Nenhum teste cria registros na base compartilhada.

Resultado de 26/10: arquitetura, tipos do web e build isolado aprovados; 14 cenários de domínio e 25 de navegador aprovados (13 do cronograma e 12 de regressão da dashboard). Capturas de desktop, calendário no celular e tema claro foram conferidas.

Resultado de 28/10, em `tmp/chronogram-mvp-validation/`: arquitetura, tipos e build isolado de shared/API/web aprovados; **15 cenários de domínio, 39 de API/migração e 29 de navegador**, sem falhas. A API usa Nest/Prisma reais sobre PGlite descartável; inclui migração com preservação do legado/RLS, contrato, criação/leitura/listagem, omissão/limpeza, rollback, auditoria e restrições dos portais. O navegador usa HTTP sintético e cobre card de consulta, filtros/busca, cadastro/edição, falha sem perder rascunho, troca de categoria, limpeza explícita, API antiga e celular. Capturas do card técnico e cadastro móvel foram conferidas. Esses resultados não representam paridade integral, validação dos dados históricos, matriz nova de permissões ou publicação.

Resultado do bloco de etapas/previsões de 28/10, em `tmp/chronogram-stages-validation/`: arquitetura, tipos e build isolado aprovados, com **20 cenários de domínio, 45 de API/migração e 35 de navegador**. Inclui as duas migrations, oito etapas sem transição operacional implícita, datas inválidas/bissextas, precisão mensal/diária, omissão/limpeza, calendário entre anos, intervalo confirmado com previsão preservada, filtros por camada, conclusão real com etapa desatualizada, rascunhos/retentativa e API antiga. Capturas do editor e calendário móvel foram conferidas. PGlite serializa conexões e a interface usa HTTP sintético; não são ensaios de carga, importação histórica ou homologação em produção.

Para reproduzir após `pnpm validate:isolated --artifact-dir tmp/chronogram-stages-validation`, definir `AUDIT_ARTIFACT_DIR=tmp/chronogram-stages-validation`, executar `pnpm test:projects` e `pnpm test:chronogram:browser` (porta web isolada pode ser definida por `AUDIT_WEB_PORT`). O build usa `NEXT_PUBLIC_API_URL=http://127.0.0.1:3999` para o HTTP sintético. Não usar o banco compartilhado nem gerar o client de produção para essa verificação.

As suítes antigas de navegador que esperam cinco abas e tabelas da versão de setembro descrevem a interface anterior e precisam acompanhar sua substituição; não constituem resultado de regressão da nova navegação. A suíte de domínio/API dos módulos existentes continua separada. Builds isolados preservam API/shared/Prisma de produção.

## Referência da interface anterior — setembro de 2026

O registro abaixo preserva regras e entregas anteriores. Para navegação e composição do frontend desta branch, prevalece a seção de adaptação acima; contratos de negócio não alterados continuam aplicáveis.

**Atualização de 21/09/2026:** o cadastro de um projeto novo cria somente uma instalação. O endereço é obrigatório. Quando se seleciona um projeto já cadastrado, o nome existente é preservado e os dados de endereço podem ser completados; o campo de nome aparece apenas para um projeto novo ou na edição. Responsáveis internos são apresentados por setor, e os setores gravados são derivados deles. É possível vincular um acompanhamento existente do mesmo cliente/projeto; marcar **Destaque para acompanhamento** define urgência máxima.

Ao escolher um cliente para **Novo projeto**, o formulário sugere endereço, cidade e UF já cadastrados nele. Os campos permanecem editáveis para registrar o local real do projeto, que é salvo no próprio cadastro criado. Se for selecionado um projeto existente, prevalece o endereço desse projeto; ao voltar para **Criar novo projeto**, os dados sugeridos do cliente reaparecem.

O campo **Cliente** de Novo projeto permite digitar parte do nome para filtrar as empresas disponíveis antes de selecioná-las. Em **Novo Acompanhamento**, a busca consulta clientes pelo nome e a seleção de projeto usa a listagem vinculada ao cliente, inclusive para perfis com permissão de criar acompanhamentos sem acesso às configurações.

O formulário de **Novo projeto** pode ser cancelado pelo botão de fechar no canto superior direito, pelo botão **Cancelar** ou pela tecla Escape. O botão de fechar fica indisponível durante o salvamento.

**Terá viagem?** cria a viagem junto com o projeto, na mesma transação. O destino usa cidade/UF, endereço e período do projeto; a origem é informada separadamente. Somente colaboradores ativos de nível Técnico, Gestor ou Administrador podem participar; a conta de exibição **Dashboard** fica fora da seleção. Agenda mantém **Novo projeto** e **Novo agendamento**; a aba Viagens consolida os deslocamentos criados pelos projetos, sem cadastro avulso. Registros antigos continuam consultáveis. A migração aditiva [20260921130000_project_followup_link](../../apps/api/prisma/migrations/20260921130000_project_followup_link/migration.sql) já foi aplicada à base compartilhada.

Marcadores existentes são escolhidos no formulário do projeto. A criação de novos marcadores fica recolhida em **Projetos → Configurações de projetos**, fora do cadastro cotidiano. Os marcadores de teste sem vínculos foram removidos da base compartilhada em 21/09/2026 após backup. Os campos de texto do cadastro desativam sugestões de preenchimento automático do navegador.

Em **Vincular acompanhamento**, cada opção apresenta o código e o nome do projeto já associado, ou indica **Sem projeto vinculado**. A lista continua limitada ao cliente escolhido e ao projeto selecionado, quando houver; acompanhamentos de outro projeto não podem ser vinculados por engano.

O formulário de **Novo projeto** não apresenta mais **Sala ou totem atendido**. Projetos antigos que já possuem estrutura vinculada preservam o vínculo e permitem consultar seu histórico no detalhe. A aba Projetos mantém **Histórico de instalações** para consulta dos locais atendidos. As regras dos vínculos existentes estão em [estruturas e ciclos](estruturas-e-ciclos.md). Cada projeto mantém um único serviço.

**Estado em 18/09/2026:** API e migrações operacionais publicadas na R1; navegação unificada da R3 disponível no localhost, sem publicação do frontend no Vercel. A gestão segue a definição confirmada pelo usuário: **cada projeto possui exatamente um serviço operacional**, de instalação ou desinstalação.

## Área unificada

O menu **Projetos e Agenda** abre `/dashboard/projetos`, inicialmente em **Visão geral**. A tela reúne cinco abas, respeitando `schedule.view` e a sessão interna:

- **Visão geral:** indicadores de projetos e de instalações/desinstalações/viagens, com período compartilhado, atualização manual ou a cada 30 segundos. A hierarquia separa a situação atual dos resultados do período; viagens agendadas futuras permanecem visíveis no resumo atual mesmo quando estão fora do intervalo histórico. Falha de uma consulta preserva a outra seção. O filtro de serviço, dentro dos indicadores de projetos, vale somente para essa seção.
- **Projetos:** cadastro e lista de instalações/desinstalações, incluindo pendentes sem data, filtros, paginação, responsáveis e status.
- **Agenda:** calendário completo de projetos agendados, viagens e compromissos avulsos, com visualização em lista. Busca e filtros de tipo/status usam o mesmo escopo nas duas visualizações; todas as páginas de agendamentos são consultadas.
- **Viagens:** consolidação de deslocamentos criados por projetos, com filtros, responsáveis, detalhes e ações de realização. Não há entrada separada de viagens na sidebar.
- **Equipe:** consulta dos instaladores. Alterar cor/participação exige `schedule.manage_installers`; `schedule.view` permite somente consultar. Falha da consulta oferece nova tentativa e não aparece como equipe vazia.

Os controles de mês/período anterior e seguinte do calendário usam setas de texto com área clicável de 40 × 40 pixels; assim permanecem legíveis sem depender da fonte de ícones embutida do FullCalendar, bloqueada pela política de fontes da aplicação.

O endereço guarda a seleção: `/dashboard/projetos?aba=visao-geral`, `aba=projetos`, `aba=agenda&visao=calendario`, `aba=agenda&visao=lista`, `aba=viagens` ou `aba=equipe`. Recarregamento e navegação anterior/próxima do navegador mantêm a seção indicada. As abas permitem navegação com setas, Home/End e identificação acessível da seleção. No celular, a barra de abas pode ser rolada horizontalmente sem alargar a página. Somente a seção aberta consulta seus dados.

Links anteriores são normalizados para `/dashboard/projetos`: `/dashboard/agenda` abre Agenda em lista; `/dashboard/viagens` abre Viagens; `/dashboard/projetos/painel` e `/dashboard/operacoes` abrem Visão geral; `/dashboard/projetos/estruturas` abre Projetos com `historico=1`. Todos mantêm as cinco abas e a navegação normal do sistema. Os resumos da dashboard apontam diretamente para a aba correspondente.

Clicar em projeto agendado na Agenda consulta seu serviço pelo ID e abre o mesmo `ProjectServiceFormDialog` usado pela lista, com observações, marcador, responsáveis e demais campos. Aguardar a leitura atual antes de preencher o formulário, inclusive quando há detalhe em cache de uma abertura anterior. Permissão de atualização habilita edição; leitura não oferece gravação ou arraste. Viagens abrem seu próprio popup, e compromissos avulsos mantêm o formulário de agendamento. Carregamento/falha do detalhe permanece em popup, com fechamento e nova tentativa. Alterações na Equipe invalidam as consultas de instaladores, opções de projetos/viagens e agenda, para refletir cores e participação atualizadas.

União local em 18/09/2026, somente no frontend. Reutiliza registros e endpoints já publicados; não adiciona schema, migração ou associação automática de legados. A consulta real em transação `READ ONLY` confirmou 31 clientes nas opções, 57 responsáveis disponíveis e listas operacionais de projetos/viagens vazias. Ausência de registros apresenta mensagem normal; falhas reais oferecem nova tentativa. Opções indisponíveis desabilitam a abertura de um novo projeto.

## Cadastro e identidade

`/dashboard/projetos` permite criar um projeto para um cliente ou selecionar explicitamente um cadastro de projeto existente. O vínculo com `Company`/`Project` é preservado. `ProjectService.projectId` tem unicidade no banco, impedindo dois serviços para o mesmo projeto. Projetos antigos permanecem fora desta gestão até serem selecionados; agendamentos históricos não são associados automaticamente.

O cliente continua obrigatório, como no cadastro existente de `Project`. Após criação, o vínculo com cliente/projeto não é trocado pela tela operacional. Nome, endereço, cidade e UF usam o cadastro de projeto como fonte; os leitores da agenda exibem o nome/endereço atuais. Operações novas não vinculam automaticamente OS, chamados ou patrimônios.

Campos da gestão: serviço, marcador de modelo cadastrável, urgência normal/alta/urgente, cor, responsáveis internos e terceirizados, setores envolvidos, endereço, link HTTPS do Google Maps, observações, indicação de viagem e destaque para acompanhamento. Marcadores são reutilizáveis, com nome normalizado para evitar duplicação por maiúsculas/minúsculas; aparecem acima do título. São independentes das etiquetas Zebra.

## Datas e calendário

O cadastro pode ficar **pendente de agendamento**, sem datas ou responsáveis. Para agendar, informar início e término válidos e pelo menos um responsável interno ou terceirizado ativo. Execução somente por terceirizado é aceita.

Cada serviço vincula no máximo um `Schedule`. Seu intervalo é a única fonte da previsão: a tabela de Projetos e a Agenda usam os mesmos instantes. A alteração no formulário ou ao arrastar/redimensionar o evento atualiza esse intervalo. A Agenda reutiliza `ScheduleCalendar` e consulta todas as páginas do filtro; o calendário separado da página de projetos foi removido. Pendentes sem data continuam na tabela de Projetos.

Uma vez agendado, o intervalo é mantido nas edições; cancelar é uma ação de status, que preserva o evento e o histórico. Não há remoção física de serviços nesta entrega. Agendamentos avulsos e recorrências da Agenda continuam disponíveis; novos agendamentos de um projeto já operacional são feitos pela gestão desse projeto, sem criar um segundo serviço ou série para ele.

Conflitos de responsáveis internos e terceirizados são verificados na nova gestão. Conflito retorna aviso e exige confirmação explícita para prosseguir. Movimentos pelo calendário que conflitem são rejeitados e revertidos visualmente; ajustar ou confirmar pelo formulário. Nos eventos vinculados a projeto, a cor escolhida preenche o cartão do calendário e também sua borda; o texto branco recebe contorno e sombra pretos para continuar legível sobre cores claras. Compromissos avulsos continuam usando a cor do instalador, e a urgência textual permanece disponível.

Datas do formulário usam o fuso do navegador e são enviadas em ISO com offset. Gravações SQL da agenda convertem explicitamente para UTC, inclusive quando a sessão PostgreSQL usa outro fuso.

## Estado e eventos realizados

| Situação | Fonte |
|---|---|
| Pendente de agendamento | Serviço sem `Schedule` e sem cancelamento |
| Agendado / preparação | `Schedule.status = SCHEDULED` |
| Em andamento | `Schedule.status = IN_PROGRESS` |
| Finalizado | `Schedule.status = DONE` |
| Cancelado | `Schedule.status = CANCELLED` ou cancelamento explícito antes do agendamento |

O estado do projeto é o do seu único serviço. Ativos reúne pendentes, agendados e em andamento. Não há agregação de várias execuções.

Alterações de status registram início, conclusão e cancelamento realizados. A previsão ou `updatedAt` não confirma execução. Repetir o status não inventa nem reinicia a data real. Registros antigos sem essas datas continuam sem elas. Reabrir uma conclusão/cancelamento limpa a data vigente correspondente e preserva a anterior na auditoria. Cancelamento antes de agendar não cria evento; reabertura volta a pendente. Serviço sem agendamento precisa ser agendado antes de iniciar/concluir.

Projetos podem ser finalizados/cancelados mesmo quando um responsável histórico foi desativado; alterar seu planejamento exige substituir/remover responsáveis inativos. A indicação **Requer viagem** identifica uma necessidade. O cadastro estruturado e a confirmação de realização estão preparados localmente em [viagens e operações](viagens-e-operacoes.md). Quando vinculado, o formulário mostra a viagem e impede retirar a necessidade antes de desfazer esse vínculo pela gestão de viagens. Retirar a reserva mantém a necessidade marcada. Os conflitos incluem viagens; o intervalo do próprio deslocamento vinculado é uma sobreposição esperada, sem duplicar agendamentos.

## Dashboard geral de projetos

Acessar **Visão geral** em Projetos e Agenda. Os indicadores de projetos são uma seção de consulta, com os mesmos requisitos de `schedule.view`, sem criação, edição, arraste ou alteração de status. O layout usa leitura progressiva: **Situação atual** concentra ativos, andamento, pendências e agendamentos; **Resultados do período** reúne conclusões e cancelamentos; os cartões de acompanhamento aparecem abaixo em grade compacta, usando a cor do projeto como apoio visual. Para operar, selecionar a aba **Projetos**; a troca não concede permissões de escrita. O endereço anterior `/dashboard/projetos/painel` leva à visão geral. O espelho sem login permanece em rota própria, conforme [painel de acompanhamento](painel-de-acompanhamento.md).

| Indicador | Regra |
|---|---|
| Projetos ativos | Pendentes + agendados + em andamento, agora |
| Em andamento | Estado `IN_PROGRESS`, agora |
| Pendentes de agendamento | Sem agendamento e sem cancelamento, incluindo cadastros antigos sem data prevista |
| Agendados / preparação | Estado `SCHEDULED`, agora |
| Finalizados no período | Estado atual `DONE`, com `completedAt` real no intervalo |
| Cancelados no período | Estado atual `CANCELLED`, com `Schedule.cancelledAt` real ou cancelamento do serviço antes de agendar no intervalo |

São projetos operacionais únicos, independentemente do número de responsáveis. Cadastros legados sem `ProjectService`, eventos avulsos e recorrências não entram na contagem. O resumo usa todos os registros do filtro, sem ficar limitado à página da tabela. O total de projetos, os finalizados atualmente e os cancelados atualmente complementam os seis indicadores; `ativos + finalizados atuais + cancelados atuais + não classificados = total`.

O filtro de serviço vale para resumo, histórico, informações pendentes e cartões. Hoje, últimos 7/30 dias ou datas personalizadas controlam apenas os finalizados/cancelados do período; a situação atual inclui projetos anteriores. Os dias usam o fuso do navegador, convertidos a UTC, com início inclusivo e fim exclusivo. Períodos inválidos ou acima de 366 dias não geram consulta. A virada do dia atualiza os limites dos períodos relativos.

Uma reabertura remove a conclusão/cancelamento vigente dos indicadores. O evento anterior permanece na auditoria, mas não é contado como outra realização do projeto. Ao concluir/cancelar novamente, a nova data vigente determina o período. Registros finalizados/cancelados sem data real aparecem em aviso de histórico incompleto; não recebem `endDate` previsto nem `updatedAt` como substituto. Seus estados continuam nos totais atuais. Status inesperados são sinalizados como não classificados, sem virar projetos ativos automaticamente.

**Projetos para acompanhar** mostra até cinco ativos do filtro, ordenados por urgência, destaque, cadastro mais antigo e ID como desempate. Marcador aparece acima do título; cliente, serviço, estado, urgência e início previsto/ausência de data permanecem visíveis. É uma seleção de acompanhamento; não representa toda a lista de projetos. O contrato não expõe observações, contatos, credenciais ou anexos.

Dados atualizam a cada 30 segundos, com opção de atualização manual e horário da última consulta bem-sucedida. Falha inicial mostra erro, sem inventar zeros. Falha de atualização mantém o último dado do mesmo filtro com aviso de desatualização e tentativa novamente. Ao trocar serviço/período, dados anteriores não são apresentados como se pertencessem ao novo filtro.

`ProjectStatisticsService` concentra as contagens e a seleção limitada de cartões, em consultas parametrizadas com retry e uma transação de leitura `RepeatableRead`. Nenhuma alteração de schema adicional é necessária para esta etapa; depende da migração da gestão já preparada abaixo.

## Autorização e transações

Gestão interna, protegida por JWT e RBAC. Reutiliza as permissões existentes da agenda:

- `schedule.view`: listas, opções, detalhes, calendário e indicadores do dashboard.
- `schedule.create`: criar projeto/serviço e cadastrar marcador.
- `schedule.update`: editar, agendar projeto já criado e alterar status.

Cliente e terceirizado não recebem acesso a essas rotas internas. Ser executor terceirizado não autoriza editar a gestão. A interface permite consultar o formulário completo em modo de leitura e não oferece escrita/arraste sem permissão; a API valida independentemente.

Criação/edição reúne projeto, serviço, responsáveis, agenda e auditoria em uma transação. Agendamento, instaladores e recorrência da Agenda também são transacionais. Locks do serviço e do agendamento protegem alterações simultâneas do mesmo registro; unicidade reforça a cardinalidade. Erros deixam os dados anteriores preservados e o formulário disponível para correção.

## Código e API

- API: `apps/api/src/modules/project-services/`; consultas/alterações da agenda permanecem em `modules/schedule/`.
- Frontend: `apps/web/src/features/project-services/{api,hooks,components,screens,utils}/`; todas as entradas de compatibilidade delegam a `projects-agenda-screen.tsx`. `ProjectsOverview` compõe os dois leitores existentes com período comum e limites de erro separados. `ProjectServicesPanel`, `TripsScreen` e `ScheduleWorkspace` mantêm suas responsabilidades por negócio. `ProjectServiceDialog` consulta o detalhe atual para o formulário canônico da lista/agenda/histórico. `StructureHistory` recebe callback opcional para abrir projeto na consulta de locais; dentro do detalhe apresenta somente histórico, sem popup aninhado ou dependência circular.
- Contratos: `packages/shared/src/project-services/`, exportados por `@zyllen/shared`.
- Rotas: `GET /project-services`, `GET /project-services/options`, `GET /project-services/statistics`, `GET /project-services/:id`, `POST /project-services`, `PUT /project-services/:id`, `PUT /project-services/:id/status` e `POST /project-services/markers`.

Listagens têm pesquisa, tipo, status e paginação até 100; urgência vem primeiro. Respostas seguem `{ success, data }` ou `{ success, data, total, page, limit }`.

`GET /project-services/statistics` recebe `type=ALL|INSTALLATION|REMOVAL`, `start` e `end` em ISO com offset. Devolve `generatedAt`, filtro/período normalizados, `current`, `completedInPeriod`, `cancelledInPeriod`, `dataQuality` e `highlights`. A rota estática fica antes de `:id`. O componente `project-dashboard-view.tsx` apenas apresenta esse contrato, separado de autenticação, filtros, consultas e operações. Chamados e projetos reutilizam a conversão de dias em `lib/date-period.ts`, preservando os exports de compatibilidade dos chamados.

## Migração, validação e publicação

**R3 em 18/09/2026:** 82 cenários aprovados por `node scripts/quality/test-ticket-dashboard.cjs --panels --structures --projects-agenda --trips`, incluindo regressões de chamados, projetos/indicadores, viagens/operações, dashboard/espelho e carros. Conferidos cinco abas, destino inicial, período comum, falhas independentes, vazio normal, opções de clientes, links anteriores, menu único, teclado/celular, cadastro inline sem salvar projeto, histórico no popup de leitura e preservação do editor/calendário/equipe. Capturas e resultados em `tmp/architecture-validation/structures-browser-qa/`. Tipos, build isolado e arquitetura aprovados; hashes fora do escopo preservados, incluindo API/shared/Prisma reais, configuração, schema, migrations e auditoria. Navegador usa sessão/HTTP sintéticos; leitura real confirma as opções/listas publicadas, sem cadastros fictícios.

**União inicial de Projetos/Agenda/Equipe:** `pnpm test:projects:agenda:browser` aprovou 40 cenários de interface, incluindo 33 regressões anteriores de chamados, projetos, dashboards e viagens. Conferidos menu único, endereço anterior, abas/URL/teclado, editor completo e releitura de detalhe em cache, salvamento no mesmo serviço, calendário/lista com todas as páginas e filtros, equipe/atualização das opções, erros/nova tentativa e permissões. Capturas de computador/celular revisadas; artefatos em `tmp/architecture-validation/projects-agenda-browser-qa/`. Tipos, build isolado e arquitetura aprovados; 808 arquivos fora do escopo preservados, incluindo toda a API, schema, migrations, shared e auditoria. Testes usam sessão/HTTP sintéticos, sem banco real. Naquela entrega, a API operacional ainda dependia de publicação, realizada posteriormente na R1. A união do frontend não exige migração própria.

Migração [20260918030000_project_operational_service](../../apps/api/prisma/migrations/20260918030000_project_operational_service/migration.sql): quatro tabelas novas, índices/FKs, RLS sem políticas anon/authenticated e três timestamps opcionais em `Schedule`. Gerada por comparação offline dos schemas; não remove colunas, tabelas ou dados nem preenche registros antigos.

A migração acima já foi aplicada na publicação autorizada da R1; a conferência da R3 encontrou 15 migrations aplicadas, nenhuma pendência/falha. Para mudanças futuras, conferir drift e todas as migrations pendentes conforme [banco de dados](banco-de-dados.md). Aplicar somente a evolução revisada e atualizar API/web de forma coordenada conforme [implantação](implantacao.md). Gerar o Prisma Client da produção com a API parada; não usar reset, migrate dev ou seed. A R3 altera somente frontend/documentação/verificações e não requer nova migração.

```powershell
pnpm check:architecture
pnpm validate:isolated
pnpm test:projects
pnpm test:projects:browser
pnpm test:projects:statistics
pnpm test:projects:statistics:browser
pnpm test:projects:agenda:browser
```

Dependências do PGlite e runtime Chrome: [segurança](seguranca.md). API real e migração são verificadas em PostgreSQL em memória; a interface usa Next isolado com respostas sintéticas. Inclui cardinalidade, pendência sem data, executor terceirizado, intervalos/fuso, sincronização, conflitos, rollback, legado, permissões, teclado e celular, além das regressões dos chamados. Resultados ficam em `tmp/architecture-validation/project-services-{api,browser}-qa/`. PGlite serializa conexões; não representa ensaio de carga multiprocesso em produção.

Dashboard: `test:projects:statistics` passou em 36 cenários de API/migração, incluindo as 26 regressões anteriores; `test:projects:statistics:browser` passou em 21 cenários, incluindo as 14 regressões anteriores. Cobrem estados únicos, mais de uma página, vários responsáveis, conclusão/cancelamento reais, reabertura, fuso, limites, permissões, campos permitidos, filtros, falhas, atualização, virada do dia, teclado e celular. Artefatos ficam em `tmp/architecture-validation/project-statistics-{api,browser}-qa/`.

Gestão e indicadores estão reunidos no localhost, usando API/banco publicados. Refinamentos e conferência dos cadastros pela conta real seguem no [planejamento operacional](plano-evolucao-operacional-e-paineis.md).
