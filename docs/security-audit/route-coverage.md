# Cobertura de rotas — Zyllen Gestão

Base: `f3b2727190adbf96c9d35dc57b927e79f5c85275`. 198 handlers / 20 controllers.

Controle observado significa que a fronteira de autorização pertinente foi localizada; não certifica ausência de toda vulnerabilidade. Recursos internos são globais sob RBAC. A01/A02 comprometem o ingresso na empresa mesmo quando o filtro downstream está correto. /uploads é superfície adicional fora dos 198 handlers.

## apps/api/src/app.controller.ts

Health público, sem dados de negócio.

| Linhas | Método e rota | Política | Resultado |
|---|---|---|---|
| 5-8 | `GET /health` | Público de cadastro/login/health; sem guard RBAC | Controle observado |

## apps/api/src/modules/access/access.controller.ts

RBAC interno global; todos os handlers têm RequirePermission para consulta/gestão de papéis e permissões.

| Linhas | Método e rota | Política | Resultado |
|---|---|---|---|
| 33-38 | `GET /access/roles` | access.view; interno/global | Controle observado |
| 40-45 | `GET /access/roles/:id` | access.view; interno/global | Controle observado |
| 47-52 | `POST /access/roles` | access.manage_roles; interno/global | Controle observado |
| 54-62 | `PUT /access/roles/:id` | access.manage_roles; interno/global | Controle observado |
| 64-69 | `DELETE /access/roles/:id` | access.manage_roles; interno/global | Controle observado |
| 75-80 | `GET /access/permissions` | access.view; interno/global | Controle observado |
| 82-87 | `POST /access/permissions` | access.manage_permissions; interno/global | Controle observado |
| 89-94 | `DELETE /access/permissions/:id` | access.manage_permissions; interno/global | Controle observado |
| 100-111 | `POST /access/roles/:id/permissions` | access.manage_permissions; interno/global | Controle observado |

## apps/api/src/modules/assets/assets.controller.ts

RBAC interno global para consultas por código/SKU/ID, contagens, criação e movimentação; patrimônio não possui tenant externo por funcionário.

| Linhas | Método e rota | Política | Resultado |
|---|---|---|---|
| 25-39 | `GET /assets` | assets.view; interno/global | Controle observado |
| 41-53 | `GET /assets/summary` | assets.view; interno/global | Controle observado |
| 55-60 | `GET /assets/lookup/:assetCode` | assets.lookup; interno/global | Controle observado |
| 62-67 | `GET /assets/:id` | assets.view; interno/global | Controle observado |
| 69-74 | `GET /assets/:id/timeline` | assets.view; interno/global | Controle observado |
| 76-86 | `POST /assets/:id/events` | assets.create; interno/global | Controle observado |
| 88-101 | `POST /assets/bulk` | assets.create; interno/global | Controle observado |
| 103-108 | `POST /assets` | assets.create; interno/global | Controle observado |
| 110-115 | `PUT /assets/:id/status` | assets.create; interno/global | Controle observado |
| 117-122 | `PUT /assets/:id/location` | assets.create; interno/global | Controle observado |

## apps/api/src/modules/auth/auth.controller.ts

Login/refresh/logout são fluxos públicos de sessão. Gestão usa RBAC; perfil/PIN usam identidade do JWT. Bootstrap/defaults tratados em A08/A09.

| Linhas | Método e rota | Política | Resultado |
|---|---|---|---|
| 40-60 | `POST /auth/login` | Fluxo público de sessão | Controle observado |
| 62-74 | `POST /auth/refresh` | Fluxo público de sessão | Controle observado |
| 76-87 | `POST /auth/logout` | Fluxo público de sessão | Controle observado |
| 89-106 | `POST /auth/users` | access.manage; interno/global | Controle observado |
| 108-115 | `POST /auth/setup-pin` | JWT + identidade do chamador; sem ID alheio livre | Controle observado |
| 117-123 | `GET /auth/has-pin` | JWT + identidade do chamador; sem ID alheio livre | Controle observado |
| 125-131 | `GET /auth/users` | access.view; interno/global | Controle observado |
| 133-139 | `GET /auth/users/:id` | access.view; interno/global | Controle observado |
| 141-153 | `PUT /auth/users/:id` | access.manage; interno/global | Controle observado |
| 155-161 | `DELETE /auth/users/:id` | access.manage; interno/global | Controle observado |
| 163-167 | `GET /auth/me` | JWT + identidade do chamador; sem ID alheio livre | Controle observado |
| 169-178 | `GET /auth/me/profile` | JWT + identidade do chamador; sem ID alheio livre | Controle observado |
| 180-201 | `PUT /auth/me/profile` | JWT + identidade do chamador; sem ID alheio livre | Controle observado |
| 203-208 | `GET /auth/me/permissions` | JWT + identidade do chamador; sem ID alheio livre | Controle observado |
| 210-217 | `POST /auth/validate-pin` | JWT + identidade do chamador; sem ID alheio livre | Controle observado |
| 219-226 | `POST /auth/users/:id/reset-pin` | access.manage; interno/global | Controle observado |

## apps/api/src/modules/catalog/catalog.controller.ts

RBAC interno global em todas as rotas. Upload tem restrição adicional de papel no handler; arquivos sofrem A10.

| Linhas | Método e rota | Política | Resultado |
|---|---|---|---|
| 51-61 | `GET /catalog/categories` | catalog.view; interno/global | Controle observado |
| 63-68 | `GET /catalog/categories/:id` | catalog.view; interno/global | Controle observado |
| 70-75 | `POST /catalog/categories` | catalog.create; interno/global | Controle observado |
| 77-82 | `PUT /catalog/categories/:id` | catalog.update; interno/global | Controle observado |
| 84-89 | `DELETE /catalog/categories/:id` | catalog.delete; interno/global | Controle observado |
| 93-105 | `GET /catalog/skus` | catalog.view; interno/global | Controle observado |
| 107-112 | `GET /catalog/skus/:id` | catalog.view; interno/global | Controle observado |
| 114-145 | `POST /catalog/skus` | catalog.create; interno/global | A10 |
| 147-152 | `PUT /catalog/skus/:id` | catalog.update; interno/global | Controle observado |
| 154-159 | `DELETE /catalog/skus/:id` | catalog.delete; interno/global | Controle observado |

## apps/api/src/modules/clients/clients.controller.ts

Login e buscas de cadastro são públicos. Demais operações exigem settings.view/manage. Lista de usuários tem excesso de campos (A12). Busca pública permite descobrir empresa para A01.

| Linhas | Método e rota | Política | Resultado |
|---|---|---|---|
| 25-31 | `POST /clients/login` | Público de cadastro/login/health; sem guard RBAC | Controle observado |
| 34-40 | `GET /clients/companies/search` | Público de cadastro/login/health; sem guard RBAC | Controle observado |
| 43-49 | `GET /clients/companies/:companyId/projects-public` | Público de cadastro/login/health; sem guard RBAC | Controle observado |
| 52-58 | `GET /clients/contractors` | settings.view; interno/global | Controle observado |
| 60-66 | `PUT /clients/contractors/:id` | settings.manage; interno/global | Controle observado |
| 68-74 | `DELETE /clients/contractors/:id` | settings.manage; interno/global | Controle observado |
| 77-83 | `GET /clients/companies` | settings.view; interno/global | Controle observado |
| 85-91 | `GET /clients/companies/:id` | settings.view; interno/global | Controle observado |
| 93-99 | `POST /clients/companies` | settings.manage; interno/global | Controle observado |
| 101-107 | `PUT /clients/companies/:id` | settings.manage; interno/global | Controle observado |
| 109-115 | `DELETE /clients/companies/:id` | settings.manage; interno/global | Controle observado |
| 118-124 | `GET /clients/companies/:companyId/projects` | settings.view; interno/global | Controle observado |
| 126-135 | `POST /clients/companies/:companyId/projects` | settings.manage; interno/global | Controle observado |
| 137-146 | `PUT /clients/projects/:id` | settings.manage; interno/global | Controle observado |
| 148-154 | `DELETE /clients/projects/:id` | settings.manage; interno/global | Controle observado |
| 157-169 | `GET /clients/users` | settings.view; interno/global | A12 |
| 171-182 | `POST /clients/users` | settings.manage; interno/global | Controle observado |

## apps/api/src/modules/followups/client-followups.controller.ts

Dois handlers: assertCompany, companyId na consulta/total e comparação da empresa no detalhe. Correto após estabelecimento confiável da identidade (A01).

| Linhas | Método e rota | Política | Resultado |
|---|---|---|---|
| 20-37 | `GET /client/followups` | JWT + tipo externo + companyId do chamador | Controle observado |
| 39-47 | `GET /client/followups/:id` | JWT + tipo externo + companyId do chamador | Controle observado |

## apps/api/src/modules/followups/followups.controller.ts

CRUD/histórico/checklists/comentários internos têm RBAC e associação pai-filho; arquivo público é A03 e upload é A10.

| Linhas | Método e rota | Política | Resultado |
|---|---|---|---|
| 50-66 | `GET /followups` | followups.view; interno/global | Controle observado |
| 68-73 | `GET /followups/:id` | followups.view; interno/global | Controle observado |
| 75-86 | `POST /followups` | followups.create; interno/global | Controle observado |
| 88-97 | `PUT /followups/:id` | followups.edit; interno/global | Controle observado |
| 99-108 | `PUT /followups/:id/status` | followups.edit; interno/global | Controle observado |
| 110-115 | `DELETE /followups/:id` | followups.delete; interno/global | Controle observado |
| 119-128 | `POST /followups/:id/blocks` | followups.edit; interno/global | Controle observado |
| 130-140 | `PUT /followups/:id/blocks/:blockId` | followups.edit; interno/global | Controle observado |
| 142-151 | `DELETE /followups/:id/blocks/:blockId` | followups.edit; interno/global | Controle observado |
| 155-181 | `POST /followups/:id/blocks/:blockId/attachments` | followups.edit; interno/global | A10 |
| 183-211 | `GET /followups/:id/blocks/:blockId/attachments/:attId/file` | Público; apenas relação dos IDs pai/filho | A03 |
| 213-226 | `DELETE /followups/:id/blocks/:blockId/attachments/:attId` | followups.edit; interno/global | Controle observado |
| 230-239 | `POST /followups/:id/blocks/:blockId/checklist` | followups.edit; interno/global | Controle observado |
| 241-251 | `PUT /followups/:id/blocks/:blockId/checklist/:itemId` | followups.edit; interno/global | Controle observado |
| 253-262 | `DELETE /followups/:id/blocks/:blockId/checklist/:itemId` | followups.edit; interno/global | Controle observado |
| 266-276 | `POST /followups/:id/blocks/:blockId/comments` | followups.edit; interno/global | Controle observado |
| 280-285 | `GET /followups/:id/history` | followups.view; interno/global | Controle observado |

## apps/api/src/modules/inventory/inventory.controller.ts

RBAC interno global: listagens, estatísticas e aprovações usam screen.action. IDs de estoque não representam tenant de cliente. Upload é A10.

| Linhas | Método e rota | Política | Resultado |
|---|---|---|---|
| 61-101 | `POST /inventory/entry` | inventory.bipar_entrada; interno/global | A10 |
| 104-120 | `POST /inventory/exit` | inventory.bipar_saida; interno/global | Controle observado |
| 123-128 | `POST /inventory/exit-batch` | inventory.bipar_saida; interno/global | Controle observado |
| 131-137 | `POST /inventory/approvals/:id/approve` | approvals.approve; interno/global | Controle observado |
| 140-146 | `POST /inventory/approvals/:id/reject` | approvals.reject; interno/global | Controle observado |
| 149-154 | `POST /inventory/movements/:id/reversal` | inventory.historico; interno/global | Controle observado |
| 157-163 | `POST /inventory/reversals/:id/approve` | approvals.approve; interno/global | Controle observado |
| 166-171 | `GET /inventory/approvals/pending` | approvals.view; interno/global | Controle observado |
| 174-179 | `GET /inventory/stats` | inventory.view; interno/global | Controle observado |
| 182-196 | `GET /inventory/movements` | inventory.historico; interno/global | Controle observado |
| 199-207 | `GET /inventory/balances` | inventory.view; interno/global | Controle observado |
| 210-215 | `GET /inventory/movement-types` | inventory.view; interno/global | Controle observado |
| 217-222 | `POST /inventory/movement-types` | settings.manage; interno/global | Controle observado |
| 224-229 | `PUT /inventory/movement-types/:id` | settings.manage; interno/global | Controle observado |
| 231-236 | `DELETE /inventory/movement-types/:id` | settings.manage; interno/global | Controle observado |
| 239-244 | `GET /inventory/exit-reasons` | inventory.view; interno/global | Controle observado |
| 246-251 | `POST /inventory/exit-reasons` | settings.manage; interno/global | Controle observado |
| 253-258 | `PUT /inventory/exit-reasons/:id` | settings.manage; interno/global | Controle observado |
| 260-265 | `DELETE /inventory/exit-reasons/:id` | settings.manage; interno/global | Controle observado |

## apps/api/src/modules/labels/labels.controller.ts

Impressão/histórico/dados exigem labels.print/view; templates usam settings.manage. Falta de schema do layout resulta em A11, não falta de guard.

| Linhas | Método e rota | Política | Resultado |
|---|---|---|---|
| 16-21 | `POST /labels/print` | labels.print; interno/global | Controle observado |
| 23-28 | `POST /labels/print-batch` | labels.print; interno/global | Controle observado |
| 30-35 | `GET /labels/history` | labels.view; interno/global | Controle observado |
| 37-42 | `GET /labels/data/:assetId` | labels.view; interno/global | Controle observado |
| 45-50 | `GET /labels/templates` | labels.view; interno/global | Controle observado |
| 52-57 | `POST /labels/templates` | settings.manage; interno/global | A11 |
| 59-64 | `PUT /labels/templates/:id` | settings.manage; interno/global | A11 |
| 66-71 | `DELETE /labels/templates/:id` | settings.manage; interno/global | Controle observado |

## apps/api/src/modules/locations/locations.controller.ts

Cinco handlers com RequirePermission; domínio global interno, sem tenant externo exposto.

| Linhas | Método e rota | Política | Resultado |
|---|---|---|---|
| 24-34 | `GET /locations` | locations.view; interno/global | Controle observado |
| 36-41 | `GET /locations/:id` | locations.view; interno/global | Controle observado |
| 43-48 | `POST /locations` | locations.create; interno/global | Controle observado |
| 50-55 | `PUT /locations/:id` | locations.update; interno/global | Controle observado |
| 57-62 | `DELETE /locations/:id` | locations.delete; interno/global | Controle observado |

## apps/api/src/modules/maintenance/client-maintenance.controller.ts

Seis handlers autenticados usam empresa do chamador; dois handlers de arquivo são públicos (A03). Assinatura de testemunha sofre A06.

| Linhas | Método e rota | Política | Resultado |
|---|---|---|---|
| 37-54 | `GET /client/maintenance` | JWT + tipo externo + companyId do chamador | Controle observado |
| 56-62 | `GET /client/maintenance/:id` | JWT + tipo externo + companyId do chamador | Controle observado |
| 64-71 | `GET /client/maintenance/:id/followup-blocks` | JWT + tipo externo + companyId do chamador | Controle observado |
| 74-90 | `PUT /client/maintenance/:id/followup-blocks/:blockId` | JWT + tipo externo + companyId do chamador | Controle observado |
| 93-103 | `PUT /client/maintenance/:id/witness-signature` | JWT + tipo externo + companyId do chamador | A06 |
| 105-116 | `POST /client/maintenance/:id/followup-blocks/:blockId/lock` | JWT + tipo externo + companyId do chamador | Controle observado |
| 119-143 | `GET /client/maintenance/:id/attachments/:attachmentId/file` | Público; apenas relação dos IDs pai/filho | A03 |
| 145-172 | `GET /client/maintenance/:id/followup-blocks/:blockId/attachments/:attId/file` | Público; apenas relação dos IDs pai/filho | A03 |

## apps/api/src/modules/maintenance/contractor-maintenance.controller.ts

Tipo e dono verificados nos handlers autenticados. Exceções: criação associa assetId alheio (A04), dois arquivos públicos (A03), exclusão de bloco confirmado (A06) e upload (A10).

| Linhas | Método e rota | Política | Resultado |
|---|---|---|---|
| 53-70 | `GET /contractor/maintenance` | JWT + contractor + dono da OS (criação fixa autor) | Controle observado |
| 72-80 | `GET /contractor/maintenance/:id` | JWT + contractor + dono da OS (criação fixa autor) | Controle observado |
| 82-115 | `POST /contractor/maintenance` | JWT + contractor + dono da OS (criação fixa autor) | A04 |
| 117-135 | `PUT /contractor/maintenance/:id/form-data` | JWT + contractor + dono da OS (criação fixa autor) | Controle observado |
| 137-154 | `PUT /contractor/maintenance/:id/status` | JWT + contractor + dono da OS (criação fixa autor) | Controle observado |
| 158-207 | `POST /contractor/maintenance/:id/attachments` | JWT + contractor + dono da OS (criação fixa autor) | A10 |
| 209-218 | `GET /contractor/maintenance/:id/attachments` | JWT + contractor + dono da OS (criação fixa autor) | Controle observado |
| 220-250 | `GET /contractor/maintenance/:id/attachments/:attachmentId/file` | Público; apenas relação dos IDs pai/filho | A03 |
| 252-266 | `DELETE /contractor/maintenance/:id/attachments/:attachmentId` | JWT + contractor + dono da OS (criação fixa autor) | Controle observado |
| 270-277 | `GET /contractor/maintenance/:id/followup-blocks` | JWT + contractor + dono da OS (criação fixa autor) | Controle observado |
| 279-290 | `POST /contractor/maintenance/:id/followup-blocks` | JWT + contractor + dono da OS (criação fixa autor) | Controle observado |
| 292-304 | `PUT /contractor/maintenance/:id/followup-blocks/:blockId` | JWT + contractor + dono da OS (criação fixa autor) | Controle observado |
| 306-317 | `DELETE /contractor/maintenance/:id/followup-blocks/:blockId` | JWT + contractor + dono da OS (criação fixa autor) | A06 |
| 319-330 | `POST /contractor/maintenance/:id/followup-blocks/:blockId/lock` | JWT + contractor + dono da OS (criação fixa autor) | Controle observado |
| 332-354 | `POST /contractor/maintenance/:id/followup-blocks/:blockId/attachments` | JWT + contractor + dono da OS (criação fixa autor) | A10 |
| 356-383 | `GET /contractor/maintenance/:id/followup-blocks/:blockId/attachments/:attId/file` | Público; apenas relação dos IDs pai/filho | A03 |
| 385-401 | `DELETE /contractor/maintenance/:id/followup-blocks/:blockId/attachments/:attId` | JWT + contractor + dono da OS (criação fixa autor) | Controle observado |

## apps/api/src/modules/maintenance/maintenance.controller.ts

CRUD interno global sob RBAC. my-orders usa req.user.id; listagens/totais globais são permitidos por maintenance.view. Exceções A03/A06/A07/A10.

| Linhas | Método e rota | Política | Resultado |
|---|---|---|---|
| 44-56 | `GET /maintenance/my-orders` | maintenance.view; interno/global | Controle observado |
| 58-71 | `GET /maintenance` | maintenance.view; interno/global | Controle observado |
| 73-78 | `GET /maintenance/:id` | maintenance.view; interno/global | Controle observado |
| 80-88 | `POST /maintenance` | maintenance.open; interno/global | Controle observado |
| 90-99 | `PUT /maintenance/:id/status` | maintenance.execute; interno/global | A07 |
| 101-110 | `PUT /maintenance/:id/form-data` | maintenance.execute; interno/global | Controle observado |
| 114-160 | `POST /maintenance/:id/attachments` | [maintenance.open, maintenance.execute]; interno/global | A10 |
| 162-167 | `GET /maintenance/:id/attachments` | maintenance.view; interno/global | Controle observado |
| 169-199 | `GET /maintenance/:id/attachments/:attachmentId/file` | Público; apenas relação dos IDs pai/filho | A03 |
| 201-210 | `DELETE /maintenance/:id/attachments/:attachmentId` | maintenance.execute; interno/global | Controle observado |
| 214-219 | `GET /maintenance/:id/followup-blocks` | maintenance.view; interno/global | Controle observado |
| 221-229 | `POST /maintenance/:id/followup-blocks` | maintenance.execute; interno/global | Controle observado |
| 231-240 | `PUT /maintenance/:id/followup-blocks/:blockId` | maintenance.execute; interno/global | Controle observado |
| 242-250 | `DELETE /maintenance/:id/followup-blocks/:blockId` | maintenance.execute; interno/global | A06 |
| 252-260 | `POST /maintenance/:id/followup-blocks/:blockId/lock` | maintenance.execute; interno/global | Controle observado |
| 262-283 | `POST /maintenance/:id/followup-blocks/:blockId/attachments` | maintenance.execute; interno/global | A10 |
| 285-312 | `GET /maintenance/:id/followup-blocks/:blockId/attachments/:attId/file` | Público; apenas relação dos IDs pai/filho | A03 |
| 314-327 | `DELETE /maintenance/:id/followup-blocks/:blockId/attachments/:attId` | maintenance.execute; interno/global | Controle observado |

## apps/api/src/modules/purchases/purchases.controller.ts

Cinco handlers com view/create/approve/receive no servidor; escopo operacional interno global.

| Linhas | Método e rota | Política | Resultado |
|---|---|---|---|
| 16-28 | `GET /purchases` | purchases.view; interno/global | Controle observado |
| 30-35 | `GET /purchases/:id` | purchases.view; interno/global | Controle observado |
| 37-42 | `POST /purchases` | purchases.create; interno/global | Controle observado |
| 44-49 | `PUT /purchases/:id/status` | purchases.approve; interno/global | Controle observado |
| 51-65 | `POST /purchases/:id/receive` | purchases.receive; interno/global | Controle observado |

## apps/api/src/modules/registration/registration.controller.ts

Três fluxos públicos com throttling. Cadastro de cliente tem A01/A02. Cadastro/login contractor usam validação e hash; nenhum dado real foi criado.

| Linhas | Método e rota | Política | Resultado |
|---|---|---|---|
| 18-38 | `POST /register/client` | Público de cadastro/login/health; sem guard RBAC | A01, A02 |
| 41-56 | `POST /register/contractor` | Público de cadastro/login/health; sem guard RBAC | Controle observado |
| 59-67 | `POST /register/contractor/login` | Público de cadastro/login/health; sem guard RBAC | Controle observado |

## apps/api/src/modules/schedule/schedule.controller.ts

Oito handlers com permissões específicas no servidor, inclusive conflitos/listagem e gestão de instaladores; domínio global interno.

| Linhas | Método e rota | Política | Resultado |
|---|---|---|---|
| 29-34 | `GET /schedule/installers` | schedule.view; interno/global | Controle observado |
| 36-45 | `PUT /schedule/installers/:userId` | schedule.manage_installers; interno/global | Controle observado |
| 47-72 | `GET /schedule` | schedule.view; interno/global | Controle observado |
| 74-91 | `GET /schedule/conflicts` | schedule.view; interno/global | Controle observado |
| 93-98 | `GET /schedule/:id` | schedule.view; interno/global | Controle observado |
| 100-108 | `POST /schedule` | schedule.create; interno/global | Controle observado |
| 110-118 | `PUT /schedule/:id` | schedule.update; interno/global | Controle observado |
| 120-128 | `DELETE /schedule/:id` | schedule.delete; interno/global | Controle observado |

## apps/api/src/modules/suppliers/suppliers.controller.ts

Cinco handlers com permissões específicas view/create/update/delete; domínio global interno.

| Linhas | Método e rota | Política | Resultado |
|---|---|---|---|
| 24-34 | `GET /suppliers` | suppliers.view; interno/global | Controle observado |
| 36-41 | `GET /suppliers/:id` | suppliers.view; interno/global | Controle observado |
| 43-48 | `POST /suppliers` | suppliers.create; interno/global | Controle observado |
| 50-55 | `PUT /suppliers/:id` | suppliers.update; interno/global | Controle observado |
| 57-62 | `DELETE /suppliers/:id` | suppliers.delete; interno/global | Controle observado |

## apps/api/src/modules/tickets/client-tickets.controller.ts

Cinco handlers vinculam dados ao externalUserId autenticado e validam posse em detalhe/anexos. A10 na validação de arquivo; entrega estática A03.

| Linhas | Método e rota | Política | Resultado |
|---|---|---|---|
| 46-51 | `GET /client/tickets/current` | JWT + externo + externalUserId do chamador | Controle observado |
| 53-70 | `GET /client/tickets` | JWT + externo + externalUserId do chamador | Controle observado |
| 72-81 | `GET /client/tickets/:id` | JWT + externo + externalUserId do chamador | Controle observado |
| 84-122 | `POST /client/tickets` | JWT + externo + externalUserId do chamador | A10 |
| 125-158 | `POST /client/tickets/:id/attachments` | JWT + externo + externalUserId do chamador | A10 |

## apps/api/src/modules/tickets/tickets.controller.ts

Rotas operacionais têm RBAC. my-internal/mensagens/avaliação usam req.user.id e conferem autor; criação interna verifica usuário. A05 em assign-with-pin; A10 no upload.

| Linhas | Método e rota | Política | Resultado |
|---|---|---|---|
| 43-57 | `GET /tickets` | tickets.view; interno/global | Controle observado |
| 59-64 | `GET /tickets/internal-users` | tickets.view; interno/global | Controle observado |
| 66-70 | `GET /tickets/my-internal` | JWT + req.user.id; posse no fluxo my-internal | Controle observado |
| 72-76 | `GET /tickets/my-internal/pending-rating` | JWT + req.user.id; posse no fluxo my-internal | Controle observado |
| 78-113 | `POST /tickets/internal` | JWT + req.user.id; posse no fluxo my-internal | A10 |
| 115-120 | `GET /tickets/:id` | tickets.view; interno/global | Controle observado |
| 122-166 | `POST /tickets` | tickets.triage; interno/global | A10 |
| 168-173 | `PUT /tickets/:id/assign` | tickets.assign; interno/global | Controle observado |
| 175-186 | `PUT /tickets/:id/assign-with-pin` | tickets.view; interno/global | A05 |
| 188-199 | `PUT /tickets/:id/close-with-pin` | tickets.view; interno/global | Controle observado |
| 201-212 | `PUT /tickets/:id/reassign` | tickets.triage; interno/global | Controle observado |
| 214-219 | `PUT /tickets/:id/status` | tickets.triage; interno/global | Controle observado |
| 221-226 | `POST /tickets/:id/messages` | tickets.view; interno/global | Controle observado |
| 228-236 | `POST /tickets/my-internal/:id/messages` | JWT + req.user.id; posse no fluxo my-internal | Controle observado |
| 238-246 | `POST /tickets/my-internal/:id/rating` | JWT + req.user.id; posse no fluxo my-internal | Controle observado |
