# Histórico de instalações

**Revisão de 21/09/2026:** o formulário de Novo projeto não mostra mais **Sala ou totem atendido** nem o cadastro inline desse local. Os vínculos de sala/totem já registrados continuam preservados e visíveis no detalhe e em **Histórico de instalações**. A API mantém os contratos e as regras de ciclo para os dados existentes; esta revisão não remove estruturas, ciclos ou histórico do banco.

**Estado em 18/09/2026.** API/migração publicadas na R1. Na R3, cadastro e histórico aparecem dentro da área Projetos e Agenda: seleção opcional de sala/totem no formulário, histórico no detalhe e consulta **Histórico de instalações** na aba Projetos. O endereço antigo `/dashboard/projetos/estruturas` abre essa aba com `historico=1`. A nova navegação está no localhost; frontend ainda não publicado no Vercel. Cada projeto continua contendo um único serviço de instalação ou desinstalação, conforme [projetos e agenda](projetos-e-agenda.md).

## Identidade e associação

`OperationalStructure` identifica uma sala, totem ou outra estrutura pelo cliente e nome. Nomes são únicos por cliente, sem diferenciar maiúsculas/minúsculas. Clientes diferentes podem usar o mesmo nome. O vínculo não pressupõe integração com estoque, patrimônio, OS ou viagens.

A interface atual mantém **Histórico de instalações** como consulta. Projeto representa um serviço; a sala/totem dos vínculos anteriores preserva a identidade física entre serviços de instalação e desinstalação. Os modelos técnicos e o histórico permanecem iguais.

Na interface de 18/09, era possível cadastrar e selecionar sala/totem dentro do formulário. Essa etapa foi retirada do formulário de projeto na revisão de 21/09; o cadastro de locais e a consulta do histórico permanecem na área **Histórico de instalações**.

A regra dos vínculos existentes é **uma estrutura por serviço**, com associação opcional e explícita. Criar uma estrutura não altera registros existentes. A API preserva a criação e associação de `StructureCycle` para os registros legados; o formulário atual não inicia novos vínculos de estrutura.

Depois da associação, tipo, estrutura e ciclo são permanentes: outro atendimento exige outro projeto/serviço. O formulário mostra o vínculo existente sem oferecer troca, e a API valida a mesma regra, inclusive pela agenda. O vínculo com cliente/projeto continua preservado.

## Ciclos, cancelamentos e datas

- Uma estrutura possui no máximo um ciclo aberto. Outra instalação exige a desinstalação concluída do ciclo atual ou cancelamento de uma instalação ainda sem desinstalação vigente.
- A desinstalação vinculada exige instalação `DONE` com data real de conclusão. Datas previstas não confirmam instalação.
- O ciclo pode manter várias tentativas de desinstalação **canceladas**, mas só uma tentativa vigente. Uma nova tentativa é outro projeto; as anteriores permanecem consultáveis.
- Concluir a desinstalação fecha o ciclo. A instalação seguinte cria um novo ciclo, sem substituir o anterior.
- Não reabrir/cancelar a instalação enquanto existe desinstalação vigente. Não reabrir um ciclo anterior depois da criação de um ciclo posterior. Tentativas canceladas não podem ser reativadas quando há outra desinstalação vigente.
- Status e datas reais vêm do `Schedule` canônico. Reaberturas permitidas seguem suas regras e preservam os valores anteriores na auditoria. Não existem datas reais paralelas editáveis no cadastro de estrutura.

O histórico apresenta instalação, todas as tentativas de desinstalação, situação, datas reais e dias instalada. Projetos podem ser abertos no popup completo sem sair da consulta. Duração corresponde à diferença entre as conclusões reais; em estruturas instaladas, é calculada até o instante da consulta, em dias inteiros de 24 horas. Ausência/inconsistência de datas resulta em `—`, sem substituir por previsão. Status legado desconhecido fica como dados incompletos e não libera outro ciclo.

No detalhe do projeto, **Ver histórico de instalações** funciona também para contas com leitura, fora dos campos desabilitados de edição. O histórico aparece no mesmo popup, sem navegar ou abrir outro diálogo. Na consulta de locais da aba Projetos, os nomes dos serviços abrem seu detalhe pelo callback do componente pai. Essa separação evita dependência circular entre seleção, histórico e formulário.

## API, autorização e consistência

| Endpoint | Permissão interna | Resultado |
|---|---|---|
| `GET /structures` | `schedule.view` | Lista paginada, filtro por cliente/nome |
| `POST /structures` | `schedule.create` | Cadastro e auditoria na mesma transação |
| `GET /structures/:id/cycles` | `schedule.view` | Histórico paginado de um cadastro |
| `GET /structures/:id/available-cycle` | `schedule.view` | Instalação atual elegível para desinstalação ou `null` |

Clientes/terceirizados não acessam estes endpoints internos. Não são concedidas permissões novas; o bypass de Administrador permanece. Contratos públicos não retornam documentos, contatos, credenciais ou anexos das OS.

Associação, cadastro operacional, responsáveis, agenda e auditoria são transacionais. `StructureCyclesService` concentra a regra usada por `ProjectServicesService` e pelo caminho canônico `ScheduleService`; bloqueio transacional por estrutura serializa as decisões do ciclo. FKs com `RESTRICT` preservam vínculos históricos. Não há endpoint de exclusão ou associação automática de legados.

## Banco e verificação

Migração aditiva [20260918070000_structure_cycles](../../apps/api/prisma/migrations/20260918070000_structure_cycles/migration.sql): duas tabelas privadas com RLS sem políticas públicas, coluna opcional `ProjectService.removalCycleId`, índices, FKs e validação do tipo da estrutura. Gerada por comparação offline de schemas; depende da migração de projetos e deve ser revisada junto das demais pendências. Nenhuma consulta/gravação de dados reais foi necessária. Seguir [banco de dados](banco-de-dados.md) e [implantação](implantacao.md) para publicação coordenada.

```powershell
pnpm check:architecture
pnpm validate:isolated
pnpm test:structures
pnpm test:structures:browser
```

As verificações usam Prisma/API reais com PostgreSQL PGlite descartável e Next/Chrome isolados com API sintética. Incluem regressões de projetos, chamados, agenda, painéis e viagens. Artefatos em `tmp/architecture-validation/structures-api-qa/` e `structures-browser-qa/`. PGlite não representa ensaio de carga multiprocesso. Builds preservam os artefatos/processo de produção. Mapeamento dos registros antigos e operação na massa real continuam fora desta entrega.

**Resultado da entrega inicial em 18/09/2026:** 41 cenários de API/migração e 46 de navegador aprovados; tipos, builds isolados e arquitetura aprovados. Capturas de computador/celular revisadas, 805 arquivos fora do escopo preservados e 263 links locais conferidos. Naquela entrega, processo e banco permaneceram inalterados; a publicação da migração ocorreu posteriormente na R1. A integração de navegação da R3 não exige outra migração.
