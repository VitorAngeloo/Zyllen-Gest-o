# Plano de evolução de estoque e patrimônio

> Planejamento histórico de 24/04/2026, consolidado de `PLANO_TECNICO_EVOLUCAO_ESTOQUE.md`. Backlog, checkboxes e responsáveis não foram revalidados como pendências atuais. Os comandos de manutenção e as restrições de retorno estão em [estoque e patrimônio](estoque-e-patrimonio.md).

As flags `FF_LEDGER_UNIFIED_WRITE` e `FF_LEDGER_UNIFIED_READ` descritas na proposta não são consumidas pelo código atual em `apps/api/src`; não usá-las como mecanismo de ativação ou rollback. Alterações de sequência não podem reutilizar códigos. Toda migration segue o [guia do banco compartilhado](banco-de-dados.md).

## Objetivo Executivo

Evoluir o módulo de estoque para:

- Ter **fonte única de verdade** para movimentações
- Separar claramente **Produto (SKU)** de **Unidade Física (Patrimônio)**
- Garantir **rastreabilidade completa** por item e por patrimônio
- Preparar integração futura com **impressoras de etiquetas** sem acoplamento ao domínio

---

## Escopo da Execução

### Incluído

- Correções de integridade e consistência de fluxo (P0)
- Unificação progressiva do registro de saída em ledger único
- Endurecimento de validações de recebimento de compra
- Serviço de geração de código de patrimônio não reutilizável
- Contrato técnico para impressão de etiquetas

### Não incluído nesta execução

- Integração direta com hardware de impressora (driver/protocolo)
- Reestruturação visual completa do frontend
- Mudanças de domínio fora de estoque/patrimônio/compras/etiquetas

---

## Arquitetura Alvo (resumo)

### Domínio

- **Produto** (`SkuItem`): definição do item no catálogo
- **Patrimônio** (`Asset`): unidade física individual com código único vitalício
- **Movimento** (`StockMovement`): evento imutável (entrada, saída, transferência, baixa, ajuste)

### Princípios

- Ledger imutável para auditoria e reconciliação
- Escrito uma vez, lido por múltiplas projeções
- Compatibilidade reversa durante migração (dual-write + feature flags)

---

## Backlog Executável por Épico

### Épico E1 — Hardening de Integridade (P0)

**Objetivo:** eliminar inconsistências críticas sem quebrar contratos principais.

#### História E1-H1 — Validar recebimento contra pedido de compra

**Tarefas técnicas**

1. Em `PurchasesService.receiveItems`, validar se cada `skuId` recebido existe no pedido.
2. Bloquear recebimento que excede `qtyOrdered` considerando histórico acumulado por SKU.
3. Retornar erro de domínio claro (`BadRequestException`) com SKU e limite.
4. Adicionar auditoria para tentativa inválida (opcional recomendado).

**Critérios de aceite**

- Recebimento com SKU fora do pedido retorna 400.
- Recebimento acima do saldo pendente retorna 400.
- Recebimento parcial válido continua funcionando.

---

#### História E1-H2 — Corrigir inconsistência de status de compra (schema vs service)

**Tarefas técnicas**

1. Unificar enum de status entre `packages/shared/src/zod/index.ts` e `PurchasesService`.
2. Definir matriz de transição permitida (ex.: DRAFT → SENT → PARTIAL/COMPLETED).
3. Bloquear transições inválidas no backend.

**Critérios de aceite**

- Status aceitos pelo schema são os mesmos aceitos no service.
- API rejeita transição fora da matriz definida.

---

#### História E1-H3 — Validar vínculo Patrimônio x SKU em movimentação

**Tarefas técnicas**

1. Em entrada/saída de estoque, quando `assetId` for informado, validar `asset.skuId === skuId`.
2. Rejeitar movimentação inconsistente com erro 400.
3. Cobrir casos de reversão e aprovações com a mesma regra.

**Critérios de aceite**

- Não é possível movimentar patrimônio em SKU diferente do cadastro.
- Fluxo atual sem `assetId` permanece funcional.

---

#### História E1-H4 — Aplicar regras de `MovementType` ao patrimônio

**Tarefas técnicas**

1. Ao registrar movimento com `assetId`, aplicar `setsAssetStatus` quando configurado.
2. Em entradas com `defaultToLocationId` e `toLocationId` ausente, preencher automaticamente.
3. Registrar alterações derivadas no `AuditLog`.

**Critérios de aceite**

- Tipos de movimento impactam status/local do patrimônio conforme configuração.
- Configuração ausente mantém comportamento atual.

---

#### História E1-H5 — Corrigir fluxo de aprovação com PIN no frontend

**Tarefas técnicas**

1. Ajustar chamadas da tela de dashboard para enviar `pin` em aprovar/rejeitar.
2. Garantir UX mínima para captura de PIN (sem alterar fluxo de negócio).
3. Tratar erro de PIN inválido com mensagem adequada.

**Critérios de aceite**

- Aprovação/rejeição sem PIN não é enviada.
- Aprovação/rejeição com PIN válido funciona ponta a ponta.

---

### Épico E2 — Ledger Único e Migração Segura (P0/P1)

**Objetivo:** tornar `StockMovement` a fonte única de verdade para entradas/saídas.

#### História E2-H1 — Introduzir camada de escrita unificada de movimentos

**Tarefas técnicas**

1. Criar serviço interno de domínio (ex.: `StockLedgerService`) para escrita de eventos.
2. `InventoryService` e `ProductExitsService` passam a usar essa camada.
3. Consolidar regras de saldo e auditoria no mesmo ponto.

**Critérios de aceite**

- Novas saídas sempre geram `StockMovement`.
- Cálculo de saldo permanece correto.

---

#### História E2-H2 — Compatibilidade com `ProductExit` (dual-write controlado)

**Tarefas técnicas**

1. Introduzir feature flag `FF_LEDGER_UNIFIED_WRITE`.
2. Com flag ligada: grava em ledger e mantém gravação legada em `ProductExit` temporariamente.
3. Com flag desligada: comportamento legado intacto.

**Critérios de aceite**

- Possível ligar/desligar sem redeploy estrutural.
- Sem perda de dados em alternância de flag.

---

#### História E2-H3 — Backfill histórico de `ProductExit` para `StockMovement`

**Tarefas técnicas**

1. Criar script idempotente em `apps/api/prisma/` para converter histórico.
2. Usar `referenceType='PRODUCT_EXIT_BACKFILL'` e `referenceId` para deduplicação.
3. Gerar relatório final de reconciliação.

**Critérios de aceite**

- Script pode rodar mais de uma vez sem duplicar eventos.
- Diferença entre saldo e ledger reportada e rastreável.

---

#### História E2-H4 — Troca de leitura para ledger

**Tarefas técnicas**

1. Introduzir `FF_LEDGER_UNIFIED_READ`.
2. Endpoints de histórico/relatório passam a ler do ledger quando flag ligada.
3. Monitorar performance e coerência via métricas de reconciliação.

**Critérios de aceite**

- Mesmos resultados funcionais esperados com leitura nova.
- Rollback de leitura possível apenas desligando flag.

---

### Épico E3 — Código de Patrimônio e Etiquetas (P1)

**Objetivo:** tornar identificação física previsível, auditável e pronta para impressão.

#### História E3-H1 — Gerador sequencial de código de patrimônio

**Tarefas técnicas**

1. Criar tabela de sequência (ex.: `AssetCodeSequence`) com controle transacional.
2. Definir padrão (ex.: `PAT-000001` ou manter `SKY-` com numeração sequencial).
3. Migrar criação de patrimônio para gerador sequencial.
4. Garantir não reutilização de código (mesmo após baixa/exclusão lógica).

**Critérios de aceite**

- Código gerado em ordem crescente, único, sem colisão concorrente.
- Não depende de retry aleatório para funcionar.

---

#### História E3-H2 — Contrato de dados para etiqueta

**Tarefas técnicas**

1. Definir DTO estável para impressão (`assetCode`, `skuCode`, `description`, `barcode`, `qrContent`, `templateId`).
2. Versionar template/layout (`layoutVersion`).
3. Ajustar endpoint de label data para retornar contrato completo.

**Critérios de aceite**

- Payload único atende PDF atual e integração futura com impressora.
- Templates antigos permanecem válidos ou têm fallback.

---

#### História E3-H3 — Porta de integração de impressão (adapter)

**Tarefas técnicas**

1. Definir interface de saída (ex.: `LabelPrinterPort`).
2. Implementar adapter inicial `PdfLabelPrinterAdapter` (estado atual).
3. Preparar `RawPrinterAdapter` (stub) para futura integração de hardware.

**Critérios de aceite**

- Domínio não conhece detalhes de protocolo da impressora.
- Troca de adapter não quebra regras de negócio.

---

## Ordem de Deploy (Zero Downtime)

### Fase A — Expand

1. Adicionar estruturas novas (camada de ledger, sequência, flags).
2. Deploy sem trocar leitura principal.

### Fase B — Migrate

1. Ativar dual-write (`FF_LEDGER_UNIFIED_WRITE=true`).
2. Rodar backfill idempotente.
3. Executar reconciliação e corrigir divergências.

### Fase C — Switch Read

1. Ativar `FF_LEDGER_UNIFIED_READ=true` em janela controlada.
2. Monitorar KPIs e erro por 48h.

### Fase D — Contract

1. Remover dependência funcional de `ProductExit`.
2. Manter apenas compatibilidade temporária (ou arquivar tabela via migration posterior).

---

## Plano de Sprints (sugestão)

- **Sprint 1 (E1 completo):** integridade, status, validações, PIN aprovação
- **Sprint 2 (E2 parcial):** camada unificada + dual-write + início backfill
- **Sprint 3 (E2 final + E3 parcial):** switch de leitura + sequência de patrimônio
- **Sprint 4 (E3 final):** contrato de etiqueta + adapter + estabilização

---

## Matriz de Risco

| Risco | Impacto | Mitigação |
|------|:-------:|-----------|
| Divergência entre saldo e ledger no backfill | Alto | Script idempotente + reconciliação por SKU/local |
| Quebra de frontend em mudança de contrato | Médio | Compat layer + feature flags |
| Regressão em aprovações | Alto | Testes de fluxo com PIN + validação e2e |
| Performance de relatórios | Médio | Índices + agregação SQL + paginação |

---

## Critérios Globais de Conclusão

1. Todo evento de saída gera registro no ledger único.
2. Timeline por patrimônio é completa e consistente.
3. Recebimento de compras não aceita SKU inválido nem excesso.
4. Código de patrimônio é único, sequencial e não reutilizável.
5. Endpoints de etiqueta entregam payload estável e versionado.

## Registro de execução em 24/04/2026

O checklist original marcou como concluídos validações P0, camada de movimento, flag de escrita, backfill idempotente, reconciliação, sequência de patrimônio, contrato de etiqueta e runbook. São declarações daquele registro, não comprovação do estado atual.

A reconciliação registrada leu 0 saldos e 0 movimentos, comparou 0 chaves e encontrou 0 divergências. Sem massa de dados, o resultado não certifica consistência operacional.

## Indicadores (KPIs)

- **Integridade:** % de movimentos válidos sem erro de regra de domínio
- **Confiabilidade:** diferença entre saldo projetado e saldo materializado
- **Rastreabilidade:** % de saídas com vínculo de referência auditável
- **Operação:** tempo médio de emissão de etiqueta por patrimônio

---

## Dono por Trilha (preencher)

- Backend Domínio Estoque: `[owner]`
- Banco/Migrations: `[owner]`
- Frontend Dashboard: `[owner]`
- QA/Validação funcional: `[owner]`
- Release/Deploy: `[owner]`

## Próximos passos do registro original

O texto original sugeria iniciar E1-H1, E1-H2 e E1-H3, apesar de o checklist já marcar validações P0 concluídas. Essa divergência deve ser resolvida contra o código antes de retomar o plano; nenhuma execução é autorizada por este arquivo.
