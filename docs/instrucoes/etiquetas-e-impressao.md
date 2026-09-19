# Etiquetas, templates e impressão Zebra

> Guia técnico e registro das decisões de impressão. As fases e pendências ao final pertencem ao registro original; confirmar seu estado no código antes de retomar trabalho.
> Frontend em Next.js (deploy no **Vercel** → `skylineti.com`). Impressora **Zebra ZD220** (203 DPI), mídia **50×30 mm em 2 colunas** (2-across).

---

## 1. Ponto de partida

O usuário começou a usar o sistema para imprimir etiquetas e enfrentou dois problemas iniciais:

1. Ao clicar em imprimir, o sistema mandava um **print da tela inteira** (página A4 escura) em vez da etiqueta.
2. Precisava definir **quantas colunas** de impressão (as etiquetas de patrimônio têm 2 colunas).

Arquivo central: [apps/web/src/features/labels/screens/labels-screen.tsx](../../apps/web/src/features/labels/screens/labels-screen.tsx)

---

## 2. Evolução da impressão (do HTML ao ZPL)

### 2.1 Primeira correção — popup isolado + colunas
- Impressão passou a abrir um **popup HTML limpo** só com a etiqueta (em vez de imprimir a página).
- Adicionado seletor de **colunas** (1–4) e depois inputs de **tamanho** da etiqueta.
- `@page { size: WxH mm }` para o Chrome mandar o tamanho físico à impressora.
- **Limitação:** dependia do diálogo do Chrome e não funcionava bem na Zebra.

### 2.2 Migração para ZPL nativo
Decisão: usar **ZPL** (linguagem nativa da Zebra) em vez de HTML/CSS.

- A impressora está em **USB num computador remoto** que acessa `skylineti.com` — então a impressão precisa sair do **navegador daquela máquina**, não do backend.
- Solução: **Zebra Browser Print** (app local que expõe API em `127.0.0.1:9100/9101`).
- Cliente: [apps/web/src/features/labels/utils/zebra-print.ts](../../apps/web/src/features/labels/utils/zebra-print.ts) (`sendZpl`, `getZebraPrintUrl`, `setZebraPrintUrl`).

### 2.3 Conexão com o Browser Print
- A ordem local atual em `zebra-print.ts` é HTTP `127.0.0.1:9100` → HTTP `localhost:9100` → HTTPS em 9101. HTTP loopback é preferido para evitar o certificado self-signed da 9101.
- A URL configurada na tela (`localStorage: zebraPrintUrl`) tem prioridade; em seguida vem `NEXT_PUBLIC_ZEBRA_PRINT_URL`, e depois a tentativa local.
- Tunnelmole foi usado no histórico como alternativa. Sua URL pode mudar após reinício; não é requisito do fluxo local atual.
- CSP mantém allowlist explícita em [next.config.ts](../../apps/web/next.config.ts). Qualquer host externo novo precisa ser incluído e testado.

### 2.4 Calibragem
- **Física:** calibrar a mídia na ZD220 — segurar **FEED** até **2 piscadas** e soltar.
- **Fina:** offset (deslocamento em mm) — hoje é um campo do **template**.

---

## 3. Redesign do módulo (Fases)

O usuário pediu reorganização completa em 4 páginas: **Seleção · Impressão · Templates · Histórico** (removendo as antigas abas Patrimônio/Lote), além de um **editor visual de templates**.

Decisões do usuário:
- Editor: abordagem **incremental** (primeiro campos x/y/tamanho + preview fiel; depois arrastar-e-soltar).
- Começar por **Fundação + Estrutura**.

### Causa raiz do bug de posicionamento (antes do redesign)
Havia **duas verdades separadas**: o preview (HTML fixo) e o ZPL (posições fixas no código). Eles divergiam e elementos se sobrepunham. A correção foi criar um **modelo de template único** que alimenta preview **e** ZPL.

### Entregas registradas no redesign

| Fase | Entrega | Arquivos principais |
|---|---|---|
| **0 — Fundação** | Motor de template como fonte única (preview = impressão) | `lib/label-template.ts`, `lib/label-zpl.ts`, `components/etiquetas/label-preview.tsx` |
| **1 — Estrutura** | Abas Seleção/Impressão/Templates/Histórico + fila de impressão | `app/dashboard/etiquetas/page.tsx` |
| **4.1 — Editor por campos** | Cada elemento com posição/tamanho/conteúdo + preview ao vivo; salvar/duplicar/excluir/padrão | `components/etiquetas/template-editor.tsx` |
| **4.2 — Arrastar-e-soltar** | Mover/redimensionar elementos no preview (pointer events, sem libs); calibragem virou campo do template; removidos "Ajuste" e "Colunas" da Impressão | `label-preview.tsx`, `template-editor.tsx` |
| **4.3 — Logo em ZPL** | Logo sai na impressão via bitmap `^GF` (rasterização SVG→canvas→1-bit) | `lib/logo-zpl.ts` |
| **5 — Histórico (frontend)** | Busca por patrimônio/usuário + botão "Reimprimir" (adiciona à fila) | `page.tsx` |
| **5 — Histórico (backend)** | ⛔ **PENDENTE** — colunas ricas (template, impressora, cópias) exigem migração Prisma + deploy manual da API. Adiada por decisão do usuário. | — |

---

## 4. Modelo de dados do template

Fonte única de verdade — [apps/web/src/features/labels/utils/label-template.ts](../../apps/web/src/features/labels/utils/label-template.ts):

```ts
interface LabelTemplate {
  name; description;
  widthMm; heightMm; columns; gapXMm; gapYMm;
  marginTopMm; marginLeftMm; dpi;
  offsetXMm; offsetYMm;        // calibragem de impressão
  elements: LabelElement[];
}

interface LabelElement {
  id; type;                     // text | itemName | assetCode | sku | location | date | qrcode | barcode | logo | line
  xMm; yMm;                     // posição
  text?; fontMm?; widthMm?; maxLines?;  // texto
  sizeMm?;                      // QR
  heightMm?;                    // barras/linha/logo
}
```

- Templates do novo modelo são **serializados em JSON** no campo `layout` que já existia no backend → **sem mudança de backend**.
- Seleção do template padrão salva em `localStorage: defaultTemplateId`.
- QR do preview: `buildQrContent` replica o JSON do backend (com preenchimento do tamanho de um cuid) para o tamanho do QR bater com a impressão.

---

## 5. Impressão multi-coluna (2-across)

Em mídia com 2 colunas, a impressora trata a **linha inteira** como uma etiqueta só. Por isso o gerador compõe **N etiquetas por linha** num único bloco `^XA`:

- `PW` (largura) = `colunas × largura + (colunas−1) × vão`
- Cada item deslocado em X por `coluna × (largura + espaçamento)`
- Preview da Impressão mostra a **1ª linha** com as colunas lado a lado.

Para alinhar 100%, o template precisa bater com a mídia física:
- **Largura** = uma etiqueta só · **Altura** = uma etiqueta · **Espaço col.** = vão entre colunas (dica: `passo − largura`).

---

## 6. Peculiaridade do QR Code (importante)

**NÃO usar o comando nativo `^BQ`.** Ele ancora o QR num ponto diferente do `^FO` usado pelos demais elementos, fazendo **só o QR** sair fora do lugar (texto, linha e logo acertam).

**Solução em produção:** gerar a matriz do QR (lib **`qrcode`**) e desenhá-la como **bitmap `^GFA`** — igual ao logo, que respeita o `^FO`.
- Código: [apps/web/src/features/labels/utils/qr-zpl.ts](../../apps/web/src/features/labels/utils/qr-zpl.ts) (`qrToZplGf`, `qrPrintedSizeMm`, `qrMagForSize`).
- O preview usa a **contagem real de módulos** para o tamanho na tela bater com o impresso.

Histórico de tentativas anteriores no dimensionamento do QR (todas superadas pela abordagem `^GF`):
- `round(dots/42)` → chute de módulos.
- módulos estimados + `floor` → QR pequeno demais.
- auto-encaixe (encolher) e sobe-para-caber → o usuário não queria que o QR mudasse; queria posição fiel. Resolvido com `^GF`.

---

## 7. Arquivos de referência

**Motor e componentes:**
- `apps/web/src/features/labels/utils/label-template.ts` — modelo + `DEFAULT_TEMPLATE` + helpers do editor
- `apps/web/src/features/labels/utils/label-zpl.ts` — geração de ZPL a partir do template (unitário/lote/colunas)
- `apps/web/src/features/labels/utils/logo-zpl.ts` — rasterização do logo → `^GF`
- `apps/web/src/features/labels/utils/qr-zpl.ts` — QR → `^GF`
- `apps/web/src/features/labels/utils/zebra-print.ts` — cliente Browser Print
- `apps/web/src/components/etiquetas/label-preview.tsx` — preview fiel (com modo edição)
- `apps/web/src/components/etiquetas/template-editor.tsx` — editor de templates

**Integração com a aplicação:**
- `apps/web/src/features/labels/screens/labels-screen.tsx` — reestruturação completa (abas + fila)
- `apps/web/next.config.ts` — CSP (tunnelmole + Browser Print local)
- `apps/web/package.json` + lockfile raiz — dependência `qrcode`

---

## 8. Implantação e validação

Seguir o [guia único de implantação](implantacao.md). Não repetir comandos de deploy neste módulo. Layouts são validados pelo schema compartilhado em `packages/shared/src/zod/label-layout.ts`; templates inválidos/legados precisam de revisão no editor. A impressão pelo navegador não deve interpolar HTML não confiável.

O contrato da API é `v1`, layout `1`, com campos `contractVersion`, `layoutVersion`, `assetId`, `skuId`, `description`, `barcodeValue`, `qrContent` e `templateId`, preservando campos legados de etiqueta. Validar posição/tamanho e impressão física no dispositivo operacional.

## 9. Pendências do registro original

Os itens abaixo pertencem à sessão original. Não representam um backlog revalidado nesta reorganização; comparar com a implementação atual antes de iniciar trabalho.

- [ ] **Validar impressão do QR** via `^GF` (deve cair na posição do editor).
- [ ] **Fase 5 backend** — histórico rico (template, impressora, cópias, reimpressão) → migração Prisma + deploy manual da API. Recomendado configurar antes o **deploy automático do backend**.
- [ ] (Opcional) Barras reais no preview (hoje é placeholder listrado; o ZPL já imprime barras de verdade).
- [ ] (Opcional) Automatizar deploy do frontend adicionando os secrets do Vercel no GitHub Actions.
