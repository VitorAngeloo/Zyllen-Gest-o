# ISSUES PARA O GITHUB

--- ISSUE 1 ---
# [Segurança] Autocadastro permite ingressar em empresa escolhida pelo solicitante
Labels sugeridas: security, alta

Identificador: A01 | Base: f3b2727190adbf96c9d35dc57b927e79f5c85275

## Problema e explorabilidade
POST /register/client é público e usa companyId informado no corpo depois de verificar apenas se a empresa existe. A conta nasce ativa. Também aceita projectId sem validar a relação com a empresa. O login passa a emitir uma identidade legítima da empresa escolhida; os filtros posteriores por companyId deixam de distinguir o invasor dos clientes reais.

Cadastro público habilitado; atacante conhece o UUID da empresa ou informa nome/CNPJ que coincidem com uma empresa existente. A busca pública de empresas fornece id, nome e CNPJ. Não requer conta prévia, convite, comprovação de vínculo ou aprovação no fluxo encontrado.

## Evidência
apps/api/src/modules/registration/registration.service.ts:47-54
```ts
47:         if (data.companyId) {
48:             company = await this.prisma.company.findUnique({ where: { id: data.companyId } });
49:             if (!company) throw new NotFoundException('Empresa não encontrada');
50:         } else if (data.companyName) {
51:             company = data.companyCnpj
52:                 ? await this.prisma.company.findUnique({ where: { cnpj: data.companyCnpj } })
53:                 : null;
54:             if (!company) {
```

apps/api/src/modules/registration/registration.service.ts:66-77
```ts
66:         const user = await this.prisma.externalUser.create({
67:             data: {
68:                 name: data.name,
69:                 email: data.email,
70:                 passwordHash,
71:                 phone: data.phone,
72:                 city: data.city,
73:                 state: data.state,
74:                 position: data.position,
75:                 companyId: company?.id || null,
76:                 projectId: data.projectId || null,
77:             },
```

Demais pontos do mesmo achado:
- apps/api/src/modules/registration/registration.controller.ts:18-21
- apps/api/prisma/schema.prisma:65-67
- apps/api/src/modules/clients/clients.service.ts:166-175

Validação: Reprodução offline executou RegistrationService.registerClient com empresa/projeto sintéticos alheios e confirmou que os identificadores foram persistidos, sem isActive=false.

## Impacto
Leitura das OS e dos acompanhamentos da empresa e ações de assinatura autorizadas a seus clientes. Não foi alegado acesso a chamados pessoais de outros usuários: esses endpoints usam externalUserId.

## Sugestão de correção
Vincular empresas existentes somente por convite de uso único emitido por responsável autorizado ou por aprovação interna. Resolver companyId e projectId no servidor e validar que o projeto pertence à empresa aprovada. Deixar cadastros não aprovados inativos e não executar vinculações de dados durante o cadastro público.

## Critérios de aceite
- [ ] Cadastro sem convite não adota empresa existente nem projeto externo.
- [ ] Convite é autenticado, expira, é de uso único e limita empresa/projeto.
- [ ] Conta pendente não acessa os portais antes de aprovação.
- [ ] Teste de duas empresas comprova que novos usuários não obtêm OS/acompanhamentos da empresa alheia.

Nota: não executar testes em dados reais nem publicar segredos. Usar fixtures e banco isolado.
--- FIM ISSUE 1 ---

--- ISSUE 2 ---
# [Segurança] Autocadastro apropria OS sem empresa por correspondência parcial de nome
Labels sugeridas: security, alta

Identificador: A02 | Base: f3b2727190adbf96c9d35dc57b927e79f5c85275

## Problema e explorabilidade
Depois de cadastrar um cliente, o serviço busca todas as OS sem companyId e vincula à empresa recém-selecionada/criada aquelas cujo clientName contém o nome da empresa ou é contido por ele. O solicitante controla esse nome; a semelhança textual vira autorização para alterar a posse das OS.

Existem OS com companyId nulo e clientName preenchido. Um nome curto aceito pelo schema, por exemplo SA, coincide com SALA PRIVADA na reprodução sintética. Não depende de conhecer o UUID da OS nem de reivindicar uma empresa existente (A01).

## Evidência
apps/api/src/modules/registration/registration.service.ts:103-114
```ts
103:             const companyLower = company.name.toLowerCase();
104:             const toLink = unlinked
105:                 .filter((os) => {
106:                     const nameLower = os.clientName!.toLowerCase().trim();
107:                     return companyLower.includes(nameLower) || nameLower.includes(companyLower);
108:                 })
109:                 .map((os) => os.id);
110:             if (toLink.length > 0) {
111:                 await this.prisma.maintenanceOS.updateMany({
112:                     where: { id: { in: toLink } },
113:                     data: { companyId: company.id },
114:                 });
```

Demais pontos do mesmo achado:
- apps/api/src/modules/registration/registration.service.ts:90-101
- packages/shared/src/zod/index.ts:83-86

Validação: Teste do serviço real confirmou updateMany de uma OS sintética SALA PRIVADA para uma empresa sintética SA criada no cadastro público.

## Impacto
Transferência indevida de OS legadas para empresa do atacante e posterior acesso via portal. Trata-se de escrita entre inquilinos na operação de cadastro, não apenas de uma listagem sem filtro.

## Sugestão de correção
Remover a reconciliação automática do fluxo público. Executar vinculação legada em operação interna autorizada, com relação explícita e revisão por responsável. Registrar antes/depois na auditoria e preservar os dados existentes.

## Critérios de aceite
- [ ] Cadastro público não altera companyId de nenhuma OS existente.
- [ ] Nomes curtos, parciais ou coincidentes não conferem posse.
- [ ] Reconciliação exige permissão interna, IDs aprovados e log de auditoria.
- [ ] Plano de revisão dos vínculos já efetuados não apaga nem reatribui dados sem aprovação.

Nota: não executar testes em dados reais nem publicar segredos. Usar fixtures e banco isolado.
--- FIM ISSUE 2 ---

--- ISSUE 3 ---
# [Segurança] Anexos privados acessíveis por sete rotas públicas e por /uploads
Labels sugeridas: security, alta

Identificador: A03 | Base: f3b2727190adbf96c9d35dc57b927e79f5c85275

## Problema e explorabilidade
Sete handlers de entrega de arquivos usam @Public(). Validam que o anexo pertence ao ID pai da URL, mas não autenticam o leitor nem verificam empresa/dono/permissão. Além disso, ServeStaticModule publica todo o diretório uploads sem JWT. O caminho Supabase também é afetado: um chamador anônimo pode obter uma nova URL assinada por meio do handler público.

Atacante possui os IDs opacos da URL ou o nome/caminho do arquivo. A auditoria não demonstrou enumeração de UUIDs. Para /uploads, deve haver arquivo no armazenamento local; para as rotas principais de manutenção, o problema existe também com Supabase Storage.

## Evidência
apps/api/src/modules/maintenance/maintenance.controller.ts:169-178
```ts
169:     @Get(':id/attachments/:attachmentId/file')
170:     @Public()
171:     async serveFile(
172:         @Param('id') id: string,
173:         @Param('attachmentId') attachmentId: string,
174:         @Res() res: Response,
175:     ) {
176:         const attachments = await this.maintenanceService.findAttachments(id);
177:         const att = attachments.find((a) => a.id === attachmentId);
178:         if (!att) throw new BadRequestException('Anexo não encontrado');
```

apps/api/src/app.module.ts:42-46
```ts
42:         ServeStaticModule.forRoot({
43:             rootPath: join(__dirname, '..', 'uploads'),
44:             serveRoot: '/uploads',
45:             serveStaticOptions: { index: false },
46:         }),
```

Demais pontos do mesmo achado:
- apps/api/src/modules/maintenance/maintenance.controller.ts:285-297
- apps/api/src/modules/maintenance/contractor-maintenance.controller.ts:220-229
- apps/api/src/modules/maintenance/contractor-maintenance.controller.ts:356-368
- apps/api/src/modules/maintenance/client-maintenance.controller.ts:119-128
- apps/api/src/modules/maintenance/client-maintenance.controller.ts:145-157
- apps/api/src/modules/followups/followups.controller.ts:183-196
- apps/api/src/modules/auth/jwt-auth.guard.ts:12-18
- apps/api/src/modules/maintenance/maintenance-media-storage.service.ts:97-103

Validação: Todos os sete handlers foram lidos; JwtAuthGuard libera @Public antes da autenticação. O teste de navegador confirmou a disponibilidade de um arquivo sintético no mesmo middleware estático, sem credenciais.

## Impacto
Leitura não autorizada de fotos, vídeos, assinaturas e anexos de OS, acompanhamentos e chamados. A URL externa assinada pode expirar, mas o endpoint público pode renová-la.

## Sugestão de correção
Exigir autenticação e política de leitura do recurso pai antes de servir/assinar arquivos. Cobrir interno, cliente e terceirizado sem autorizar apenas pela existência dos IDs. Retirar mídias privadas da raiz estática; se necessário, emitir links temporários vinculados à autorização, sem endpoint público que os renove indefinidamente.

## Critérios de aceite
- [ ] Leitor anônimo recebe 401/403 em todas as sete rotas e na antiga URL estática privada.
- [ ] Cliente de outra empresa e terceirizado não proprietário recebem 403/404.
- [ ] Leitores autorizados continuam recebendo mídias locais e Supabase.
- [ ] Links temporários expiram e não podem ser renovados anonimamente.
- [ ] Testes verificam anexo, bloco e objeto pai nas três audiências.

Nota: não executar testes em dados reais nem publicar segredos. Usar fixtures e banco isolado.
--- FIM ISSUE 3 ---

--- ISSUE 4 ---
# [Segurança] Terceirizado altera patrimônio alheio usando assetId ao abrir OS
Labels sugeridas: security, alta

Identificador: A04 | Base: f3b2727190adbf96c9d35dc57b927e79f5c85275

## Problema e explorabilidade
A criação de OS no portal terceirizado aceita assetId do corpo. MaintenanceService verifica somente a existência do patrimônio e o associa à OS; em seguida muda seu status para EM_MANUTENCAO. Não há vínculo de autorização entre o terceirizado e esse patrimônio.

Conta de terceirizado ativa e UUID de patrimônio existente. O patrimônio não precisa estar relacionado ao solicitante. O cadastro público de terceirizados existe, mas nenhum cadastro real foi feito.

## Evidência
apps/api/src/modules/maintenance/contractor-maintenance.controller.ts:99-103
```ts
99:         this.assertContractor(req);
100:         const data = await this.maintenanceService.openOS({
101:             assetId: body.assetId,
102:             openedByContractorId: req.user.id,
103:             notes: body.notes,
```

apps/api/src/modules/maintenance/maintenance.service.ts:109-124
```ts
109:                 include: {
110:                     asset: { include: { sku: { select: { skuCode: true, name: true } } } },
111:                     company: { select: { id: true, name: true } },
112:                     project: { select: { id: true, name: true } },
113:                     openedBy: { select: { name: true } },
114:                     openedByContractor: { select: { name: true } },
115:                 },
116:             }),
117:         );
118: 
119:         // Update asset status if asset provided
120:         if (data.assetId && asset) {
121:             await this.prisma.asset.update({
122:                 where: { id: data.assetId },
123:                 data: { status: 'EM_MANUTENCAO' },
124:             });
```

Demais pontos do mesmo achado:
- apps/api/src/modules/maintenance/contractor-maintenance.controller.ts:83-87
- apps/api/src/modules/maintenance/maintenance.service.ts:59-64

Validação: Teste do serviço real com dependências sintéticas confirmou asset.update no UUID alheio e status EM_MANUTENCAO.

## Impacto
Mudança não autorizada de estado operacional e associação de patrimônio de terceiros à OS do atacante. A resposta de criação/detalhe inclui o patrimônio relacionado, expondo informações internas desse recurso.

## Sugestão de correção
Não aceitar assetId livre no portal terceirizado. Se o negócio exigir essa associação, consultar uma atribuição explícita autorizada ao chamador antes de criar a OS e atualizar o patrimônio, dentro de uma transação coerente.

## Critérios de aceite
- [ ] UUID existente, mas não atribuído ao terceirizado, não cria relação nem altera o patrimônio.
- [ ] Objeto autorizado mantém o fluxo válido.
- [ ] Resposta não inclui detalhes de patrimônio sem autorização.
- [ ] Teste compara estado antes/depois em caso de rejeição.

Nota: não executar testes em dados reais nem publicar segredos. Usar fixtures e banco isolado.
--- FIM ISSUE 4 ---

--- ISSUE 5 ---
# [Segurança] Rota de assumir chamado contorna restrição de transferência de responsável
Labels sugeridas: security, média

Identificador: A05 | Base: f3b2727190adbf96c9d35dc57b927e79f5c85275

## Problema e explorabilidade
A UI só mostra Assumir quando não existe responsável e reserva Mover para Administrador/Gestor. O backend restringe reassign, mas assign-with-pin aceita tickets.view e sobrescreve assignedToInternalUserId sem rejeitar um chamado já atribuído. O PIN próprio comprova identidade, não autoriza retirar o chamado de outro técnico.

Usuário interno não gestor com tickets.view e PIN válido; chamado ainda não encerrado já atribuído a outra pessoa. Não precisa conhecer o PIN do responsável atual.

## Evidência
apps/api/src/modules/tickets/tickets.service.ts:229-246
```ts
229:     async assignWithPin(ticketId: string, userId: string, roleName: string, pin: string, assignedToId?: string) {
230:         const ticket = await this.findById(ticketId);
231:         if (ticket.status === TicketStatus.CLOSED) throw new BadRequestException('Chamado encerrado não pode ser alterado');
232: 
233:         // Only admin/gestor can delegate to another user
234:         const targetId = assignedToId && this.isAdminOrGestor(roleName) ? assignedToId : userId;
235: 
236:         const valid = await this.authService.validatePin(userId, pin);
237:         if (!valid) throw new ForbiddenException('PIN inválido');
238: 
239:         const user = await this.prisma.internalUser.findUnique({ where: { id: targetId } });
240:         if (!user) throw new NotFoundException('Usuário interno não encontrado');
241: 
242:         return this.prisma.ticket.update({
243:             where: { id: ticketId },
244:             data: {
245:                 assignedToInternalUserId: targetId,
246:                 status: TicketStatus.IN_PROGRESS,
```

Demais pontos do mesmo achado:
- apps/web/src/app/dashboard/chamados/page.tsx:611-625
- apps/api/src/modules/tickets/tickets.controller.ts:175-184
- apps/api/src/modules/tickets/tickets.service.ts:283-287

Validação: Reprodução de TicketsService.assignWithPin confirmou a substituição de um responsável sintético pelo chamador não gestor.

## Impacto
Apropriação de chamados em execução, alteração de responsabilidade e possibilidade de usar o fluxo de fechamento que passa a reconhecer o atacante como responsável.

## Sugestão de correção
Permitir autoatribuição apenas se o responsável estiver vazio, em atualização atômica. Qualquer troca de responsável existente deve passar pela política de transferência, inclusive por rotas alternativas. Manter validação de PIN e auditoria.

## Critérios de aceite
- [ ] Autoatribuição de chamado ocupado é negada a não gestores.
- [ ] Duas requisições concorrentes não conseguem assumir o mesmo chamado.
- [ ] Transferência exige o privilégio apropriado em todos os endpoints.
- [ ] Chamado disponível ainda pode ser assumido com PIN válido.

Nota: não executar testes em dados reais nem publicar segredos. Usar fixtures e banco isolado.
--- FIM ISSUE 5 ---

--- ISSUE 6 ---
# [Segurança] Bloqueios de assinatura podem ser contornados por exclusão ou substituição
Labels sugeridas: security, média

Identificador: A06 | Base: f3b2727190adbf96c9d35dc57b927e79f5c85275

## Problema e explorabilidade
A UI impede excluir bloco isLocked e deixa de oferecer nova assinatura quando witnessSignature já existe. A API rejeita editar um bloco bloqueado, mas removeFollowupBlock o exclui sem verificar isLocked. clientSignWitness verifica empresa e status, porém sobrescreve uma assinatura de testemunha preexistente.

Exclusão: colaborador com maintenance.execute ou terceirizado dono da OS. Substituição: cliente da empresa da OS, ainda não encerrada. Não é acesso a objeto alheio; é bypass das regras de imutabilidade em objetos acessíveis ao chamador.

## Evidência
apps/api/src/modules/maintenance/maintenance.service.ts:456-461
```ts
456:     async removeFollowupBlock(osId: string, blockId: string) {
457:         const block = await this.prisma.maintenanceOSFollowupBlock.findFirst({
458:             where: { id: blockId, maintenanceOSId: osId },
459:         });
460:         if (!block) throw new NotFoundException('Bloco não encontrado');
461:         await this.prisma.maintenanceOSFollowupBlock.delete({ where: { id: blockId } });
```

apps/api/src/modules/maintenance/maintenance.service.ts:326-340
```ts
326:     async clientSignWitness(osId: string, companyId: string, signature: string) {
327:         if (!signature || !signature.startsWith('data:image/')) {
328:             throw new BadRequestException('Assinatura inválida');
329:         }
330:         const os = await this.findById(osId);
331:         if (os.companyId !== companyId) throw new ForbiddenException('OS não pertence à sua empresa');
332:         if (os.status === MaintenanceStatus.CLOSED) throw new BadRequestException('OS já encerrada');
333: 
334:         const existingFormData = (os.formData as Record<string, unknown>) || {};
335:         const newFormData = { ...existingFormData, witnessSignature: signature };
336:         validateFormData(newFormData);
337: 
338:         return this.prisma.maintenanceOS.update({
339:             where: { id: osId },
340:             data: { formData: newFormData as Prisma.InputJsonValue },
```

Demais pontos do mesmo achado:
- apps/web/src/components/os-forms/os-followup-section.tsx:252-256
- apps/web/src/app/portal-cliente/manutencao/page.tsx:186-195
- apps/api/src/modules/maintenance/contractor-maintenance.controller.ts:306-316
- apps/api/src/modules/maintenance/client-maintenance.controller.ts:93-102
- apps/api/src/modules/maintenance/maintenance.service.ts:427-433

Validação: Dois testes do serviço real confirmaram exclusão de bloco SIGNATURE isLocked=true e sobrescrita de witnessSignature. Um teste de controle confirmou que a edição comum do bloco bloqueado é rejeitada.

## Impacto
Perda ou troca de evidência de aceite, comprometendo integridade e rastreabilidade das assinaturas confirmadas.

## Sugestão de correção
Centralizar a política de imutabilidade e aplicá-la a edição, exclusão, anexos e assinatura. Impedir sobrescrita concorrente de assinatura existente. Correções legítimas devem gerar revisão auditável, sem destruir o aceite original.

## Critérios de aceite
- [ ] Bloco confirmado não pode ser excluído ou alterado por nenhuma audiência.
- [ ] Segunda assinatura não sobrescreve witnessSignature existente.
- [ ] Duas assinaturas concorrentes preservam um único aceite original.
- [ ] Revisões autorizadas preservam histórico e registram autor/motivo.

Nota: não executar testes em dados reais nem publicar segredos. Usar fixtures e banco isolado.
--- FIM ISSUE 6 ---

--- ISSUE 7 ---
# [Segurança] Encerrar OS ignora a permissão específica maintenance.close
Labels sugeridas: security, média

Identificador: A07 | Base: f3b2727190adbf96c9d35dc57b927e79f5c85275

## Problema e explorabilidade
O contrato de permissões define maintenance.execute e maintenance.close separadamente, mas PUT /maintenance/:id/status exige somente execute. O schema aceita CLOSED e o serviço encerra a OS sem consultar close. A revogação de close não restringe essa operação.

Papel personalizado com maintenance.execute e sem maintenance.close. Os papéis operacionais padrão do seed concedem as duas em conjunto; a separação só se manifesta quando as permissões são configuradas de forma diferente. O portal terceirizado tem política própria e não foi considerado sujeito ao RBAC interno.

## Evidência
apps/api/src/modules/maintenance/maintenance.controller.ts:90-98
```ts
90:     @Put(':id/status')
91:     @RequirePermission('maintenance.execute')
92:     async updateStatus(
93:         @Param('id') id: string,
94:         @Request() req: any,
95:         @Body(new ZodValidationPipe(updateMaintenanceStatusSchema)) body: { status: string; notes?: string },
96:     ) {
97:         const data = await this.maintenanceService.updateStatus(id, body.status, req.user.id, body.notes);
98:         return { data, message: 'OS atualizada' };
```

apps/api/src/modules/maintenance/maintenance.service.ts:225-234
```ts
225:             const prevTag = os.notes?.match(/\[previousStatus:\w+\]/);
226:             updateData.notes = prevTag ? `${prevTag[0]} ${notes}` : notes;
227:         }
228:         if (status === MaintenanceStatus.CLOSED) {
229:             updateData.closedById = userId;
230:             updateData.completedAt = new Date();
231:             // Restore previous asset status from the notes field (only if asset exists)
232:             if (os.assetId) {
233:                 const previousStatusMatch = os.notes?.match(/\[previousStatus:(\w+)\]/);
234:                 const previousStatus = previousStatusMatch ? previousStatusMatch[1] : 'ATIVO';
```

Demais pontos do mesmo achado:
- apps/api/prisma/seed.ts:87-90
- packages/shared/src/zod/index.ts:424-426

Validação: Teste isolado autorizou somente maintenance.execute no guard e confirmou que MaintenanceService.updateStatus ainda persiste CLOSED.

## Impacto
Fechamento de OS e efeitos operacionais associados por usuário sem o privilégio específico de encerramento.

## Sugestão de correção
Exigir maintenance.close quando o estado desejado for CLOSED, mantendo a política adequada às outras transições. Fazer a decisão no servidor e testar combinações de permissões, não apenas os papéis padrão.

## Critérios de aceite
- [ ] Usuário com execute, mas sem close, não encerra OS.
- [ ] Revogar close tem efeito na requisição seguinte.
- [ ] Transições não finais continuam respeitando execute.
- [ ] Matriz de testes inclui papéis personalizados e as três audiências.

Nota: não executar testes em dados reais nem publicar segredos. Usar fixtures e banco isolado.
--- FIM ISSUE 7 ---

--- ISSUE 8 ---
# [Segurança] Seed e documentação publicam credenciais fixas de administrador
Labels sugeridas: security, alta

Identificador: A08 | Base: f3b2727190adbf96c9d35dc57b927e79f5c85275

## Problema e explorabilidade
O seed calcula hashes de senha e PIN literais conhecidos, cria o usuário administrador ativo e não exige substituição no bootstrap. A documentação divulga as mesmas credenciais. Hashing em repouso não protege uma senha cujo valor inicial é público. update: {} conserva uma conta preexistente, mas a criação continua insegura.

Seed executado quando a conta padrão não existe e credenciais não trocadas depois. Não foi testado login nem verificado se o administrador de produção conserva esses valores. O risco é de bootstrap/configuração, não uma afirmação de invasão atual.

## Evidência
apps/api/prisma/seed.ts:218-233
```ts
218:     const adminPasswordHash = await bcrypt.hash('[CREDENCIAL_PADRAO_REDIGIDA]', 10);
219:     const adminPinHash = await bcrypt.hash('[CREDENCIAL_PADRAO_REDIGIDA]', 10);
220: 
221:     const adminUser = await prisma.internalUser.upsert({
222:         where: { email: 'admin@zyllen.com' },
223:         update: {},
224:         create: {
225:             name: 'Administrador',
226:             email: 'admin@zyllen.com',
227:             passwordHash: adminPasswordHash,
228:             pin4Hash: adminPinHash,
229:             roleId: adminRole.id,
230:             isActive: true,
231:         },
232:     });
233:     console.log('  ✅ Admin user created:', adminUser.email, '(PIN: [PIN_REDIGIDO])');
```

Demais pontos do mesmo achado:
- PROJETO.md:887

Validação: Literais encontrados no código atual e no histórico desde o commit ae56108d26d255f6ed35746eed5d7776707cbeef (10/02/2026), seed.ts:130-131. Valores de senha/PIN foram redigidos neste relatório para não ampliar sua circulação.

## Impacto
Acesso administrativo integral às funções protegidas pelo bypass Administrador, se a conta ainda aceitar as credenciais padrão.

## Sugestão de correção
Remover senha/PIN padrão do seed, logs e documentação. Exigir bootstrap explícito com segredo aleatório de uso único e troca obrigatória. Verificar e rotacionar credenciais eventualmente derivadas desses valores; tratar o histórico como exposição permanente, sem depender de apagar commits.

## Critérios de aceite
- [ ] Sem segredo de bootstrap explícito, seed não cria administrador com credencial previsível.
- [ ] Nenhum log/documento publica senha ou PIN reais.
- [ ] Primeiro acesso exige troca de senha e criação de PIN.
- [ ] Responsável verifica a conta existente e registra a rotação sem divulgar valores.

Nota: não executar testes em dados reais nem publicar segredos. Usar fixtures e banco isolado.
--- FIM ISSUE 8 ---

--- ISSUE 9 ---
# [Segurança] Docker fornece segredo JWT público e startup aceita o valor padrão
Labels sugeridas: security, alta

Identificador: A09 | Base: f3b2727190adbf96c9d35dc57b927e79f5c85275

## Problema e explorabilidade
docker-compose.yml define JWT_SECRET com fallback público. O módulo JWT e a estratégia usam getOrThrow, que rejeita ausência, mas não rejeita um valor conhecido/fraco presente. ConfigModule não contém validador que bloqueie esse default.

Deployment recebe o fallback do Compose ou copia esse literal para sua configuração. O Compose atual também contém uma DATABASE_URL SQLite desatualizada: não se afirma que ele sobe como está; a exploração depende de corrigir a conexão PostgreSQL e conservar o JWT inseguro. A configuração real da produção não foi inspecionada.

## Evidência
docker-compose.yml:11-14
```ts
11:       - DATABASE_URL=file:./dev.db
12:       - JWT_SECRET=${JWT_SECRET:-change-me-in-production}
13:       - API_PORT=3001
14:       - NODE_ENV=production
```

apps/api/src/modules/auth/auth.module.ts:17-20
```ts
17:             useFactory: (cfg: ConfigService) => ({
18:                 secret: cfg.getOrThrow<string>('JWT_SECRET'),
19:                 signOptions: { expiresIn: '1d' },
20:             }),
```

Demais pontos do mesmo achado:
- apps/api/src/modules/auth/jwt.strategy.ts:18-23
- apps/api/src/app.module.ts:26-29

Validação: Fallback atual em docker-compose.yml:12. Histórico também contém fallback no código JWT, por exemplo blob 60b0cecf4d99db928ce8394a8542900a821940d1, auth.module.ts:14. O código atual removeu esse fallback local, mas o Compose e a falta de validação permanecem.

## Impacto
Conhecer a chave permite forjar JWTs para IDs de usuários ativos conhecidos. A estratégia reconsulta usuários no banco, portanto inventar um ID ou apenas escrever role=Administrador no token não basta; ainda assim, a assinatura deixa de provar autenticidade.

## Sugestão de correção
Exigir JWT_SECRET explicitamente no deployment e validar no startup comprimento/qualidade mínima e uma denylist dos defaults históricos. Rotacionar qualquer chave implantada derivada do literal e invalidar tokens correspondentes de forma planejada.

## Critérios de aceite
- [ ] Compose falha de forma clara se JWT_SECRET não estiver definido.
- [ ] Startup rejeita o valor histórico e demais placeholders públicos.
- [ ] Configuração válida de alta entropia permite iniciar.
- [ ] Há procedimento seguro de rotação e invalidação de sessões afetadas.

Nota: não executar testes em dados reais nem publicar segredos. Usar fixtures e banco isolado.
--- FIM ISSUE 9 ---

--- ISSUE 10 ---
# [Segurança] Upload de HTML disfarçado de imagem executa JavaScript na origem da API
Labels sugeridas: security, média

Identificador: A10 | Base: f3b2727190adbf96c9d35dc57b927e79f5c85275

## Problema e explorabilidade
Uploads locais confiam no MIME informado no multipart e preservam a extensão original do nome. Um arquivo .html com Content-Type image/png passa pelo fileFilter; o servidor estático determina text/html pela extensão. Ao abrir o link diretamente, o navegador executa o HTML persistido.

Usuário autenticado com acesso a um fluxo de upload, inclusive cliente em chamado próprio; vítima abre o arquivo como documento. Confirmado no fluxo local de chamados, independentemente de o storage principal de OS usar Supabase. Não executa simplesmente ao aparecer dentro de uma tag img.

## Evidência
apps/api/src/modules/tickets/client-tickets.controller.ts:17-23
```ts
17: const ticketStorage = diskStorage({
18:     destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
19:     filename: (_req, file, cb) => {
20:         const unique = randomUUID();
21:         const ext = extname(file.originalname) || '.bin';
22:         cb(null, `${unique}${ext}`);
23:     },
```

apps/api/src/modules/tickets/client-tickets.controller.ts:85-93
```ts
85:     @UseInterceptors(FilesInterceptor('files', 10, {
86:         storage: ticketStorage,
87:         limits: { fileSize: MAX_FILE_SIZE },
88:         fileFilter: (_req, file, cb) => {
89:             if (ALLOWED_MIME.test(file.mimetype)) {
90:                 cb(null, true);
91:             } else {
92:                 cb(new BadRequestException(`Tipo de arquivo não permitido: ${file.mimetype}`), false);
93:             }
```

apps/api/src/app.module.ts:42-46
```ts
42:         ServeStaticModule.forRoot({
43:             rootPath: join(__dirname, '..', 'uploads'),
44:             serveRoot: '/uploads',
45:             serveStaticOptions: { index: false },
46:         }),
```

Demais pontos do mesmo achado:
- apps/api/src/modules/tickets/tickets.controller.ts:26-32
- apps/api/src/modules/maintenance/maintenance.controller.ts:24-30
- apps/api/src/modules/maintenance/contractor-maintenance.controller.ts:22-28
- apps/api/src/modules/followups/followups.controller.ts:31-37
- apps/api/src/modules/catalog/catalog.controller.ts:32-37
- apps/api/src/modules/inventory/inventory.controller.ts:43-48

Validação: Teste do FilesInterceptor real aceitou MIME image/png e preservou .html. Chrome headless em servidor loopback sintético usando o mesmo express.static recebeu text/html e executou marcador JavaScript inofensivo.

## Impacto
XSS persistente na origem da API e conteúdo enganoso servido pelo domínio confiável. A API e o frontend estão em origens distintas: esse vetor, sozinho, não lê o localStorage do frontend. Não foi afirmado roubo de token do site por esse caminho.

## Sugestão de correção
Detectar formato pelos bytes, decodificar/recodificar imagens quando aplicável e derivar extensão de um tipo realmente validado. Rejeitar HTML e formatos ativos, servir anexos em origem isolada sem credenciais e aplicar Content-Disposition/CSP adequados. Fechar o acesso público conforme A03.

## Critérios de aceite
- [ ] Arquivo HTML declarado image/png é rejeitado e não fica publicamente armazenado.
- [ ] Extensão final é derivada do formato verificado, nunca do nome original.
- [ ] Arquivo rejeitado é removido e não deixa registro/arquivo órfão.
- [ ] Abertura direta de anexos não executa conteúdo ativo na origem autenticada.
- [ ] Testes cobrem todos os controladores que compartilham o padrão.

Nota: não executar testes em dados reais nem publicar segredos. Usar fixtures e banco isolado.
--- FIM ISSUE 10 ---

--- ISSUE 11 ---
# [Segurança] Template de etiqueta injeta script no HTML de impressão do frontend
Labels sugeridas: security, alta

Identificador: A11 | Base: f3b2727190adbf96c9d35dc57b927e79f5c85275

## Problema e explorabilidade
O backend persiste layout como string sem validar sua estrutura. parseTemplate apenas exige elements como array e faz spread do objeto. widthMm/heightMm não são números garantidos em runtime. openPrintWindow interpola heightMm sem escape dentro de style via document.write; uma string que fecha style e abre script executa na origem do frontend.

Atacante pode gravar template via settings.manage. Uma vítima usa esse template e chega à impressão HTML de fallback, com popup permitido. Não é vetor anônimo. O payload de prova continha apenas um marcador em window.opener, sem coleta de dados ou tráfego externo.

## Evidência
apps/web/src/lib/label-template.ts:168-175
```ts
168: export function parseTemplate(layout: string): LabelTemplate | null {
169:     try {
170:         const obj = JSON.parse(layout);
171:         if (!obj || !Array.isArray(obj.elements)) return null;
172:         return { ...blankTemplate(), ...obj, elements: obj.elements };
173:     } catch {
174:         return null;
175:     }
```

apps/web/src/app/dashboard/etiquetas/page.tsx:224-229
```ts
224: <style>
225: * { box-sizing: border-box; }
226: html, body { margin: 0; padding: 0; background: white; font-family: Arial, sans-serif; }
227: @page { size: ${pageW}mm ${labelHeight}mm; margin: 0; }
228: .sheet { display: grid; grid-template-columns: repeat(${columns}, ${labelWidth}mm); gap: 0; width: ${pageW}mm; }
229: .sheet > div { width: ${labelWidth}mm !important; height: ${labelHeight}mm !important; overflow: hidden !important; padding: 1.5mm !important; background: white !important; }
```

Demais pontos do mesmo achado:
- packages/shared/src/zod/index.ts:456-459
- apps/api/src/modules/labels/labels.controller.ts:52-63
- apps/api/src/modules/labels/labels.service.ts:170-177
- apps/web/src/app/dashboard/etiquetas/page.tsx:210-219
- apps/web/src/app/dashboard/etiquetas/page.tsx:310-315
- apps/web/next.config.ts:14
- apps/web/src/lib/auth-context.tsx:151-154

Validação: Chrome headless executou as funções reais parseTemplate e openPrintWindow extraídas do código. heightMm malicioso permaneceu string e o marcador foi escrito no opener. O CSP atual permite scripts inline, portanto não bloqueia esse caminho.

## Impacto
XSS persistente na origem do frontend. O popup herda a origem e acessa seu opener; scripts nessa origem podem acessar tokens guardados no localStorage e agir como a vítima, inclusive outra conta com mais permissões.

## Sugestão de correção
Validar o JSON do layout no backend e no parser com schema estrito: dimensões finitas e limitadas, columns inteiro, tipos/elementos permitidos. Construir a impressão com APIs DOM e propriedades tipadas, sem interpolar valores não confiáveis em document.write. Reduzir scripts inline no CSP como defesa adicional.

## Critérios de aceite
- [ ] POST/PUT de template rejeita dimensões string, NaN, infinitas e valores fora dos limites.
- [ ] Template legado inválido é recusado de forma segura, sem quebrar impressão válida.
- [ ] Payload que fecha style não executa no popup nem no opener.
- [ ] Teste de impressão cobre fallback do Browser Print e configurações persistidas.

Nota: não executar testes em dados reais nem publicar segredos. Usar fixtures e banco isolado.
--- FIM ISSUE 11 ---

--- ISSUE 12 ---
# [Segurança] Listagem de clientes devolve passwordHash sem necessidade
Labels sugeridas: security, média

Identificador: A12 | Base: f3b2727190adbf96c9d35dc57b927e79f5c85275

## Problema e explorabilidade
GET /clients/users permite settings.view e retorna o resultado integral de externalUser.findMany. include seleciona as relações, mas não exclui campos escalares do modelo, como passwordHash. O interceptor de resposta não faz remoção desses campos.

Conta interna com settings.view, como o papel Gestor do seed. Não é exposição anônima nem ausência do guard; é excesso de dados na resposta para um privilégio de consulta.

## Evidência
apps/api/src/modules/clients/clients.service.ts:192-207
```ts
192:     async findAllExternalUsers(params?: { companyId?: string; skip?: number; take?: number }) {
193:         const where = params?.companyId ? { companyId: params.companyId } : {};
194:         const [data, total] = await Promise.all([
195:             this.prisma.externalUser.findMany({
196:                 where,
197:                 include: {
198:                     company: { select: { id: true, name: true } },
199:                     project: { select: { id: true, name: true } },
200:                 },
201:                 orderBy: [{ company: { name: 'asc' } }, { name: 'asc' }],
202:                 skip: params?.skip ?? 0,
203:                 take: params?.take ?? 200,
204:             }),
205:             this.prisma.externalUser.count({ where }),
206:         ]);
207:         return { data, total };
```

Demais pontos do mesmo achado:
- apps/api/src/modules/clients/clients.controller.ts:157-168
- apps/api/prisma/schema.prisma:55-60
- apps/api/src/interceptors/response.interceptor.ts:14-24

Validação: Teste do ClientsService real confirmou consulta sem select/omit e retorno de passwordHash sintético. Este achado é adicional aos cinco temas pedidos: exposição de credencial, não segredo hardcoded.

## Impacto
Vazamento de hashes de senha de clientes e possibilidade de tentativas offline contra senhas fracas. O hash não equivale a senha em texto puro e a auditoria não tentou quebrá-lo.

## Sugestão de correção
Usar select explícito/DTO de saída com somente os campos administrativos necessários. Excluir passwordHash e quaisquer tokens/PIN de todas as respostas de cadastro e consulta; manter hashes apenas no caminho de autenticação.

## Critérios de aceite
- [ ] GET /clients/users não contém passwordHash em nenhum nível.
- [ ] Contrato de resposta é allowlist de campos necessários.
- [ ] Teste automatizado bloqueia vazamento de campos de credenciais.
- [ ] Listagens e detalhes de usuários internos/externos/terceirizados são verificados para a mesma classe de erro.

Nota: não executar testes em dados reais nem publicar segredos. Usar fixtures e banco isolado.
--- FIM ISSUE 12 ---
