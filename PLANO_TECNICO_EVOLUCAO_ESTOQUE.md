# Plano Técnico Executável — Evolução de Estoque e Patrimônio

> Projeto: Zyllen Gestão  
> Data: 24/04/2026  
> Foco: robustez estrutural, rastreabilidade, escalabilidade e preparação para etiquetas

---

## 1) Objetivo Executivo

Evoluir o módulo de estoque para:

- Ter **fonte única de verdade** para movimentações
- Separar claramente **Produto (SKU)** de **Unidade Física (Patrimônio)**
- Garantir **rastreabilidade completa** por item e por patrimônio
- Preparar integração futura com **impressoras de etiquetas** sem acoplamento ao domínio

---

## 2) Escopo da Execução

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

## 3) Arquitetura Alvo (resumo)

### Domínio

- **Produto** (`SkuItem`): definição do item no catálogo
- **Patrimônio** (`Asset`): unidade física individual com código único vitalício
- **Movimento** (`StockMovement`): evento imutável (entrada, saída, transferência, baixa, ajuste)

### Princípios

- Ledger imutável para auditoria e reconciliação
- Escrito uma vez, lido por múltiplas projeções
- Compatibilidade reversa durante migração (dual-write + feature flags)

---

## 4) Backlog Executável por Épico

## Épico E1 — Hardening de Integridade (P0)

**Objetivo:** eliminar inconsistências críticas sem quebrar contratos principais.

### História E1-H1 — Validar recebimento contra pedido de compra

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

### História E1-H2 — Corrigir inconsistência de status de compra (schema vs service)

**Tarefas técnicas**

1. Unificar enum de status entre `packages/shared/src/zod/index.ts` e `PurchasesService`.
2. Definir matriz de transição permitida (ex.: DRAFT → SENT → PARTIAL/COMPLETED).
3. Bloquear transições inválidas no backend.

**Critérios de aceite**

- Status aceitos pelo schema são os mesmos aceitos no service.
- API rejeita transição fora da matriz definida.

---

### História E1-H3 — Validar vínculo Patrimônio x SKU em movimentação

**Tarefas técnicas**

1. Em entrada/saída de estoque, quando `assetId` for informado, validar `asset.skuId === skuId`.
2. Rejeitar movimentação inconsistente com erro 400.
3. Cobrir casos de reversão e aprovações com a mesma regra.

**Critérios de aceite**

- Não é possível movimentar patrimônio em SKU diferente do cadastro.
- Fluxo atual sem `assetId` permanece funcional.

---

### História E1-H4 — Aplicar regras de `MovementType` ao patrimônio

**Tarefas técnicas**

1. Ao registrar movimento com `assetId`, aplicar `setsAssetStatus` quando configurado.
2. Em entradas com `defaultToLocationId` e `toLocationId` ausente, preencher automaticamente.
3. Registrar alterações derivadas no `AuditLog`.

**Critérios de aceite**

- Tipos de movimento impactam status/local do patrimônio conforme configuração.
- Configuração ausente mantém comportamento atual.

---

### História E1-H5 — Corrigir fluxo de aprovação com PIN no frontend

**Tarefas técnicas**

1. Ajustar chamadas da tela de dashboard para enviar `pin` em aprovar/rejeitar.
2. Garantir UX mínima para captura de PIN (sem alterar fluxo de negócio).
3. Tratar erro de PIN inválido com mensagem adequada.

**Critérios de aceite**

- Aprovação/rejeição sem PIN não é enviada.
- Aprovação/rejeição com PIN válido funciona ponta a ponta.

---

## Épico E2 — Ledger Único e Migração Segura (P0/P1)

**Objetivo:** tornar `StockMovement` a fonte única de verdade para entradas/saídas.

### História E2-H1 — Introduzir camada de escrita unificada de movimentos

**Tarefas técnicas**

1. Criar serviço interno de domínio (ex.: `StockLedgerService`) para escrita de eventos.
2. `InventoryService` e `ProductExitsService` passam a usar essa camada.
3. Consolidar regras de saldo e auditoria no mesmo ponto.

**Critérios de aceite**

- Novas saídas sempre geram `StockMovement`.
- Cálculo de saldo permanece correto.

---

### História E2-H2 — Compatibilidade com `ProductExit` (dual-write controlado)

**Tarefas técnicas**

1. Introduzir feature flag `FF_LEDGER_UNIFIED_WRITE`.
2. Com flag ligada: grava em ledger e mantém gravação legada em `ProductExit` temporariamente.
3. Com flag desligada: comportamento legado intacto.

**Critérios de aceite**

- Possível ligar/desligar sem redeploy estrutural.
- Sem perda de dados em alternância de flag.

---

### História E2-H3 — Backfill histórico de `ProductExit` para `StockMovement`

**Tarefas técnicas**

1. Criar script idempotente em `apps/api/prisma/` para converter histórico.
2. Usar `referenceType='PRODUCT_EXIT_BACKFILL'` e `referenceId` para deduplicação.
3. Gerar relatório final de reconciliação.

**Critérios de aceite**

- Script pode rodar mais de uma vez sem duplicar eventos.
- Diferença entre saldo e ledger reportada e rastreável.

---

### História E2-H4 — Troca de leitura para ledger

**Tarefas técnicas**

1. Introduzir `FF_LEDGER_UNIFIED_READ`.
2. Endpoints de histórico/relatório passam a ler do ledger quando flag ligada.
3. Monitorar performance e coerência via métricas de reconciliação.

**Critérios de aceite**

- Mesmos resultados funcionais esperados com leitura nova.
- Rollback de leitura possível apenas desligando flag.

---

## Épico E3 — Código de Patrimônio e Etiquetas (P1)

**Objetivo:** tornar identificação física previsível, auditável e pronta para impressão.

### História E3-H1 — Gerador sequencial de código de patrimônio

**Tarefas técnicas**

1. Criar tabela de sequência (ex.: `AssetCodeSequence`) com controle transacional.
2. Definir padrão (ex.: `PAT-000001` ou manter `SKY-` com numeração sequencial).
3. Migrar criação de patrimônio para gerador sequencial.
4. Garantir não reutilização de código (mesmo após baixa/exclusão lógica).

**Critérios de aceite**

- Código gerado em ordem crescente, único, sem colisão concorrente.
- Não depende de retry aleatório para funcionar.

---

### História E3-H2 — Contrato de dados para etiqueta

**Tarefas técnicas**

1. Definir DTO estável para impressão (`assetCode`, `skuCode`, `description`, `barcode`, `qrContent`, `templateId`).
2. Versionar template/layout (`layoutVersion`).
3. Ajustar endpoint de label data para retornar contrato completo.

**Critérios de aceite**

- Payload único atende PDF atual e integração futura com impressora.
- Templates antigos permanecem válidos ou têm fallback.

---

### História E3-H3 — Porta de integração de impressão (adapter)

**Tarefas técnicas**

1. Definir interface de saída (ex.: `LabelPrinterPort`).
2. Implementar adapter inicial `PdfLabelPrinterAdapter` (estado atual).
3. Preparar `RawPrinterAdapter` (stub) para futura integração de hardware.

**Critérios de aceite**

- Domínio não conhece detalhes de protocolo da impressora.
- Troca de adapter não quebra regras de negócio.

---

## 5) Ordem de Deploy (Zero Downtime)

## Fase A — Expand

1. Adicionar estruturas novas (camada de ledger, sequência, flags).
2. Deploy sem trocar leitura principal.

## Fase B — Migrate

1. Ativar dual-write (`FF_LEDGER_UNIFIED_WRITE=true`).
2. Rodar backfill idempotente.
3. Executar reconciliação e corrigir divergências.

## Fase C — Switch Read

1. Ativar `FF_LEDGER_UNIFIED_READ=true` em janela controlada.
2. Monitorar KPIs e erro por 48h.

## Fase D — Contract

1. Remover dependência funcional de `ProductExit`.
2. Manter apenas compatibilidade temporária (ou arquivar tabela via migration posterior).

---

## 6) Plano de Sprints (sugestão)

- **Sprint 1 (E1 completo):** integridade, status, validações, PIN aprovação
- **Sprint 2 (E2 parcial):** camada unificada + dual-write + início backfill
- **Sprint 3 (E2 final + E3 parcial):** switch de leitura + sequência de patrimônio
- **Sprint 4 (E3 final):** contrato de etiqueta + adapter + estabilização

---

## 7) Matriz de Risco

| Risco | Impacto | Mitigação |
|------|:-------:|-----------|
| Divergência entre saldo e ledger no backfill | Alto | Script idempotente + reconciliação por SKU/local |
| Quebra de frontend em mudança de contrato | Médio | Compat layer + feature flags |
| Regressão em aprovações | Alto | Testes de fluxo com PIN + validação e2e |
| Performance de relatórios | Médio | Índices + agregação SQL + paginação |

---

## 8) Critérios Globais de Conclusão

1. Todo evento de saída gera registro no ledger único.
2. Timeline por patrimônio é completa e consistente.
3. Recebimento de compras não aceita SKU inválido nem excesso.
4. Código de patrimônio é único, sequencial e não reutilizável.
5. Endpoints de etiqueta entregam payload estável e versionado.

---

## 9) Checklist de Execução Técnica

- [x] Ajustar validações P0 (`purchases`, `inventory`, `dashboard` aprovações)
- [x] Implementar camada unificada de movimento
- [x] Introduzir flag de escrita (`FF_LEDGER_UNIFIED_WRITE`)
- [x] Criar script de backfill idempotente
- [x] Executar reconciliação e documentar resultado
- [x] Implementar gerador sequencial de patrimônio
- [x] Versionar contrato de etiqueta
- [x] Publicar runbook de rollback

### Configuração atual de feature flags

- `FF_LEDGER_UNIFIED_WRITE`:
	- `true`/`1`/`yes`/`on` → ativa dual-write em `ProductExits` (grava legado + ledger)
	- qualquer outro valor (ou ausente) → mantém fluxo legado (somente `ProductExit` + `StockBalance`)
	- **default atual:** `false` (opt-in explícito)

### Execução do backfill (E2-H3)

- Script: [apps/api/prisma/backfill-product-exits-ledger.ts](apps/api/prisma/backfill-product-exits-ledger.ts)
- Comando padrão (dry-run): `pnpm --filter @zyllen/api backfill:product-exits-ledger`
- Aplicar escrita: `BACKFILL_DRY_RUN=false pnpm --filter @zyllen/api backfill:product-exits-ledger`
- Ajuste de lote (opcional): `BACKFILL_BATCH_SIZE=1000`

### Execução da reconciliação (E2-H3)

- Script: [apps/api/prisma/reconcile-stock-ledger.ts](apps/api/prisma/reconcile-stock-ledger.ts)
- Comando: `pnpm --filter @zyllen/api reconcile:stock-ledger`
- Salvar relatório JSON (opcional): `RECONCILE_OUTPUT_FILE=apps/api/prisma/reports/reconcile.json`

**Resultado da execução em 24/04/2026**

- Saldos lidos: `0`
- Movimentos lidos: `0`
- Chaves comparadas: `0`
- Divergências: `0`

> Observação: execução válida, porém sem massa de dados no ambiente atual para reconciliação operacional.

---

## 10) Runbook de Rollback (resumo)

1. Desligar `FF_LEDGER_UNIFIED_READ` (volta leitura antiga).
2. Se necessário, desligar `FF_LEDGER_UNIFIED_WRITE` (volta escrita antiga).
3. Preservar dados novos no ledger para nova tentativa de cutover.
4. Abrir incidente técnico com snapshot de reconciliação.

### Procedimento operacional detalhado

#### Cenário A — Reverter somente leitura nova

1. Ajustar ambiente: `FF_LEDGER_UNIFIED_READ=false`
2. Reiniciar API
3. Executar reconciliação pós-retorno: `pnpm --filter @zyllen/api reconcile:stock-ledger`
4. Confirmar que relatórios/históricos voltaram à origem legada

#### Cenário B — Reverter dual-write

1. Ajustar ambiente: `FF_LEDGER_UNIFIED_WRITE=false`
2. Reiniciar API
3. Validar novas saídas em `ProductExit` + `StockBalance`
4. Não apagar eventos já escritos no ledger; preservar para auditoria

#### Cenário C — Reverter rollout de sequência de patrimônio

1. Não remover tabela `AssetCodeSequence`
2. Preservar sequência atual para evitar reutilização de código
3. Se necessário, bloquear temporariamente criação de novos patrimônios até normalização operacional
4. Nunca decrementar `currentValue`

#### Checklist pós-rollback

- [ ] API reiniciada com flags corretas
- [ ] Reconciliação executada e arquivada
- [ ] Fluxo de saída validado manualmente
- [ ] Fluxo de patrimônio validado manualmente
- [ ] Registro do incidente anexado ao changelog técnico

### Contrato de etiqueta versionado

- Contrato atual: `v1`
- Campos adicionais introduzidos sem quebra: `contractVersion`, `layoutVersion`, `assetId`, `skuId`, `description`, `barcodeValue`, `qrContent`, `templateId`
- Compatibilidade preservada com campos legados: `assetCode`, `skuCode`, `skuName`, `brand`, `barcode`, `category`, `location`, `status`

---

## 11) Indicadores (KPIs)

- **Integridade:** % de movimentos válidos sem erro de regra de domínio
- **Confiabilidade:** diferença entre saldo projetado e saldo materializado
- **Rastreabilidade:** % de saídas com vínculo de referência auditável
- **Operação:** tempo médio de emissão de etiqueta por patrimônio

---

## 12) Dono por Trilha (preencher)

- Backend Domínio Estoque: `[owner]`
- Banco/Migrations: `[owner]`
- Frontend Dashboard: `[owner]`
- QA/Validação funcional: `[owner]`
- Release/Deploy: `[owner]`

---

## 13) Próximo Passo Imediato

Executar **E1-H1, E1-H2 e E1-H3** na próxima branch técnica, pois são os itens de maior risco de inconsistência de dados em produção.