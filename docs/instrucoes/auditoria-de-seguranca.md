# Auditoria de segurança — Zyllen Gestão

Data: 14/09/2026 (America/Sao_Paulo). Os timestamps JSON estão em UTC e podem mostrar 15/09/2026.

Base auditada: `f3b2727190adbf96c9d35dc57b927e79f5c85275`.

**Correções posteriores (15/09/2026):** decisões, testes e limites em [remediação](seguranca.md); deploy principal e melhoria posterior do cadastro no [registro de publicação](historico-publicacao-seguranca.md). A rodada posterior registrou 37 cenários; a publicação principal usa evidências de 33 cenários e smoke tests distintos. O PDF descreve a revisão anterior e não foi sobrescrito.

## Navegação

- [Índice geral da documentação](README.md).
- [Remediação: plano e implementação consolidados](seguranca.md).
- [Registro de publicação e validação do cadastro](historico-publicacao-seguranca.md).
- [Fluxo atual de cadastro de clientes](cadastro-clientes.md).
- [Guia atual de implantação](implantacao.md).

Relatório, issues e matrizes abaixo são exports derivados da mesma auditoria, preservados por proveniência e SHA-256. Referências a `PROJETO.md` e outros caminhos antigos pertencem à versão auditada; consultar a tabela de consolidação no índice geral para localizar a documentação atual. Não atualizar hashes ou linhas históricas para acompanhar renomes.

## Auditoria original — 14/09/2026

Resultado: **12 achados — 7 altos e 5 médios**, incluindo um achado adicional de exposição de hashes (A12). Nenhum crítico/baixo/informativo contabilizado. Na auditoria original não houve acesso ao banco, requisição à aplicação de produção, correção, seed, migração, build, deploy ou publicação de issues. A publicação posterior está registrada separadamente.

## Entrega

- [Relatório PDF — 61 páginas](../security-audit/relatorio-auditoria-seguranca.pdf): gráficos, evidências, pontos fortes, prioridades, gates UI/API, matriz dos 198 handlers e 12 issues completas ao final.
- [Relatório textual com todos os trechos](../security-audit/relatorio-auditoria-seguranca.md).
- [Issues completas em Markdown](../security-audit/github-issues.md): copiar/colar, sem quebras de paginação.
- [Cobertura de todos os handlers](../security-audit/route-coverage.md).

Cobertura: 198 handlers em 20 controllers; 222 arquivos textuais versionados; 133 commits locais e 744 blobs textuais (30 binários excluídos); 56 arquivos JS/map do bundle local. Treze verificações offline e duas no navegador isolado, com dados sintéticos. A configuração/RLS efetivos do Supabase e o bundle remoto não foram inspecionados.

## Arquivos gerados

Todos os caminhos abaixo são relativos à raiz do repositório:

| Caminho | Finalidade |
|---|---|
| `docs/security-audit/relatorio-auditoria-seguranca.pdf` | Entrega principal em A4 |
| `docs/security-audit/relatorio-auditoria-seguranca.md` | Relatório textual com trechos |
| `docs/security-audit/github-issues.md` | 12 issues completas, não publicadas |
| `docs/security-audit/route-coverage.md` | Matriz legível dos 198 handlers |
| `docs/security-audit/route-coverage.json` | Matriz estruturada, decorators e chamadas |
| `docs/security-audit/findings.json` | Achados e evidências redigidas |
| `docs/security-audit/source-manifest.json` | SHA-256 dos arquivos citados |
| `docs/security-audit/scan-evidence.json` | Inventário AST; matches de segredos sem valores |
| `docs/security-audit/offline-verification.json` | Resultados dos 13 testes isolados |
| `docs/security-audit/browser-verification.json` | Resultados das duas provas de navegador |
| `docs/security-audit/pdf-verification.json` | Páginas, A4, blocos de issues, hash do PDF |
| `docs/security-audit/visual-qa.json` | Rasterização e revisão visual |
| `docs/security-audit/generate_report.py` | Gerador do PDF, Markdown e matrizes |
| `docs/security-audit/audit_content.py` | Conteúdo manualmente revisado |
| `docs/security-audit/collect-evidence.cjs` | Inventário de rotas e varredura heurística |
| `docs/security-audit/verify-offline.cjs` | Reprodução contra dependências sintéticas |
| `docs/security-audit/verify-browser.cjs` | Provas locais em Chrome headless |
| `docs/security-audit/verify_pdf.py` | Verificações e folhas de contato |
| `docs/security-audit/fixtures/uploaded.html` | Fixture inofensiva para a prova de upload |
| `docs/security-audit/requirements.txt` | Dependências Python isoladas |
| `docs/security-audit/.gitignore` | Ignora cache Python do gerador |
| `docs/instrucoes/auditoria-de-seguranca.md` | Este guia e inventário de entrega |
| `docs/security-audit/README.md` | Entrada curta para os guias desta pasta |
| `tmp/pdfs/.gitignore` | Ignora ambiente e previews locais |

Arquivos temporários não destinados à entrega/versionamento:

- `tmp/pdfs/security-audit-venv/`: ambiente Python isolado, reutilizando dependências já disponíveis; nada instalado globalmente.
- `tmp/pdfs/security-audit-preview/final-01.png` até `final-61.png`: todas as páginas finais rasterizadas.
- `tmp/pdfs/security-audit-preview/contact-01.jpg` até `contact-06.jpg`: folhas de contato para revisão de todas as páginas.
- `tmp/pdfs/security-audit-preview/page-01.png` até `page-67.png`: primeira versão de QA, supersedida pelas imagens `final-*`.
- `docs/security-audit/__pycache__/`: cache automático do Python, ignorado.

## Regenerar o relatório em fontes compatíveis

O ambiente usado nesta máquina já existe. **Não executar o gerador na árvore atual para reproduzir a auditoria original:** o código foi corrigido e a documentação reorganizada. Ele exige os arquivos/caminhos e linhas da revisão auditada, com hashes correspondentes a `source-manifest.json`, em uma cópia isolada compatível. O histórico arquivado tem conteúdo consolidado e não substitui esses arquivos para checagem de hashes. Os comandos abaixo são referência para esse contexto compatível, não uma regeneração automática do PDF atual.

```powershell
& 'tmp/pdfs/security-audit-venv/Scripts/python.exe' docs/security-audit/generate_report.py
```

O gerador extrai as linhas dos arquivos locais e compara seus SHA-256 com `source-manifest.json`. Se a fonte tiver mudado, ele interrompe: revisar a auditoria/linhas é obrigatório antes de renovar o manifesto. Não editar o manifesto apenas para silenciar essa proteção. As fontes Segoe UI, Consolas e Segoe UI Symbol são lidas de `C:/Windows/Fonts`.

Para um ambiente novo, use um Python real (não o alias vazio da Microsoft Store), um venv e instalação **somente dentro dele**:

```powershell
py -3 -m venv tmp/pdfs/security-audit-venv
& 'tmp/pdfs/security-audit-venv/Scripts/python.exe' -m pip install -r docs/security-audit/requirements.txt
& 'tmp/pdfs/security-audit-venv/Scripts/python.exe' docs/security-audit/generate_report.py
```

Gráficos são vetoriais, gerados pelo próprio ReportLab; matplotlib não é necessário.

## Refazer a QA visual

Com Poppler disponível (o caminho abaixo é o encontrado nesta máquina):

```powershell
New-Item -ItemType Directory -Path tmp/pdfs/security-audit-preview -Force | Out-Null
& 'C:/Users/SERVIDOR ZYLLEN/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe' -r 90 -png docs/security-audit/relatorio-auditoria-seguranca.pdf tmp/pdfs/security-audit-preview/final
& 'tmp/pdfs/security-audit-venv/Scripts/python.exe' docs/security-audit/verify_pdf.py
```

Após regenerar, `verify_pdf.py` marca a revisão manual como pendente: abrir todas as folhas de contato e páginas detalhadas é obrigatório antes de afirmar aprovação visual. Se o número de páginas mudar, use uma pasta nova ou remova somente os antigos previews gerados, após validar seus caminhos. Não apagar o workspace.

## Reproduções seguras

```powershell
node docs/security-audit/verify-offline.cjs
node docs/security-audit/verify-browser.cjs
```

O primeiro script transpila métodos reais para stubs de dependências; não carrega `.env` nem cria conexão Prisma. O segundo usa Playwright já disponível no runtime local e Chrome headless, com um servidor temporário em `127.0.0.1` e rede da página bloqueada fora dessa origem. Não usa o navegador/perfil pessoal do usuário. `AUDIT_RUNTIME_ROOT` pode apontar para outro runtime que contenha `node/node_modules/playwright`.

Estes são testes de **reprodução do estado vulnerável**, não testes de regressão para a correção: alguns devem deixar de passar após os consertos. Não os adaptar para dados/URLs reais.

## Nova auditoria / varredura

```powershell
node docs/security-audit/collect-evidence.cjs all
```

Esse comando só lê código, histórico Git local e bundle, mas sobrescreve `scan-evidence.json`. Não refaz o julgamento manual nem atualiza `audit_content.py`. Em outra revisão do projeto, atualizar o HEAD, revisar todos os handlers/gates, triar matches e criar nova evidência antes de emitir outro relatório. A varredura é heurística, não garante ausência de formatos de segredo desconhecidos. Valores de senha/PIN são redigidos no material entregue.
