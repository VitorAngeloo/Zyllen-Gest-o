/**
 * Zyllen Systems — Brand Voice & Microcopy
 * ─────────────────────────────────────────
 * Plataforma de Branding (brandmachine + Mau Xavier)
 *
 * Propósito: "Promover conexões de valor para escalar negócios inteligentes"
 * Arquétipo: Mago — transforma, cria o inesperado, empodera
 *
 * A marca é: Autoconfiante · Sofisticada · Inteligente · Transformadora · Moderna
 *
 * Tom de Voz:
 *   Parceira (não invasiva)  · Moderna (não efêmera)
 *   Autoconfiante (não arrogante) · Sofisticada (não fria)
 *
 * Palavras proibidas:
 *   "automático/robótico" (impessoalidade)
 *   "genérico/comum" (sem identidade)
 *   "complicado/complexo" (difícil)
 *   "luxuoso" no sentido de ostentação
 */

// ─── Taglines & Território de Palavras ───────────────────────────

export const BRAND_TAGLINES = [
  "Experiências que transformam",
  "Preparando o mundo para o futuro",
  "Excelência mora nos detalhes",
  "O poder da automação inteligente",
  "Confiança nos faz ir além",
  "Alto padrão requer liberdade",
  "Inove hoje para inovar amanhã",
] as const;

export const BRAND_VALUES = [
  "Provocadores da inovação",
  "O alto padrão requer liberdade",
  "Incentivamos o desenvolvimento contínuo",
  "A confiança nos faz ir além",
  "Temos paixão por pessoas que apreciam experiências",
  "Evoluir faz parte do ciclo da vida",
] as const;

// ─── Micro-copy por contexto ──────────────────────────────────────

/** Saudações para o dashboard principal */
export const GREETINGS = {
  morning: "Bom dia",
  afternoon: "Boa tarde",
  evening: "Boa noite",
} as const;

/** Retorna saudação contextual por horário */
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return GREETINGS.morning;
  if (h < 18) return GREETINGS.afternoon;
  return GREETINGS.evening;
}

/** Subtítulo do dashboard — tom parceiro e moderno */
export const DASHBOARD_SUBTITLE = "Prioridades, atendimento e operação reunidos para orientar o próximo passo.";

/** Chamados acompanhados no dashboard, sem sair da operação. */
export const TICKET_DASHBOARD_COPY = {
  attentionLabel: "Atenção: tempo limite excedido",
  attentionDescription: "O tempo conta desde a abertura: internos entram em atenção após 5 horas e clientes após 1 hora.",
  attentionList: "Chamados mais antigos que precisam de atenção",
  requesterUnavailable: "Solicitante não informado",
  viewDetails: "Ver detalhes do chamado",
  detailDescription: "Consulte as informações completas sem sair do dashboard.",
  emptyOpen: "Nenhum chamado aguardando atendimento.",
  emptyInProgress: "Nenhum chamado em atendimento.",
  loadError: "Não foi possível atualizar os chamados. Tente novamente.",
  detailError: "Não foi possível atualizar os detalhes deste chamado.",
} as const;

// ─── Login ────────────────────────────────────────────────────────

export const LOGIN_COPY = {
  heading: "Bem-vindo",
  subtitle: "Selecione seu acesso e entre com suas credenciais",
  tabs: {
    internal: { label: "Colaborador", description: "Equipe interna Skyline" },
    external: { label: "Cliente", description: "Acompanhe chamados e serviços da sua empresa" },
    contractor: { label: "Parceiro", description: "Registre e acompanhe ordens de serviço" },
  },
  hero: {
    tagline: "Tudo no lugar para o trabalho seguir",
    description:
      "Atendimento, estoque, patrimônio e operação reunidos em um ambiente claro e confiável.",
  },
  successToast: "Acesso realizado — bem-vindo de volta!",
  errorToast: "Credenciais inválidas — tente novamente",
  loading: "Entrando…",
  button: "Entrar",
  register: "Ainda não tem conta?",
  registerLink: "Criar acesso",
} as const;

// ─── Empty States ─────────────────────────────────────────────────
// Tom: parceiro e encorajador, nunca frio ou genérico.

export const EMPTY_STATES = {
  // Dashboard
  tickets: "Nenhum chamado por aqui — tudo em ordem.",
  maintenance: "Nenhuma OS em aberto — operação fluindo.",

  // Estoque
  balances: "Seu estoque começa aqui — registre a primeira entrada.",
  movements: "Ainda sem movimentações — cada registro conta.",
  noItemFound: "Nenhum item corresponde à busca.",

  // Patrimônio
  assets: "Nenhum patrimônio cadastrado ainda.",
  assetTimeline: "Sem eventos registrados para este patrimônio.",

  // Compras
  purchases: "Nenhum pedido de compra — crie o primeiro.",
  purchaseDetail: "Selecione um pedido para explorar os detalhes.",

  // Chamados
  ticketsList: "Nenhum chamado registrado — quando precisar, estamos aqui.",
  ticketDetail: "Selecione um chamado para acompanhar.",

  // Manutenção
  maintenanceList: "Nenhuma OS registrada — equipamentos em dia.",

  // Etiquetas
  printHistory: "Nenhuma impressão registrada ainda.",
  templates: "Nenhum template — crie o primeiro e padronize.",

  // Clientes
  companies: "Nenhuma empresa cadastrada — adicione seu primeiro parceiro.",
  externalUsers: "Nenhum usuário externo registrado.",

  // Colaboradores
  collaborators: "Nenhum colaborador encontrado.",
  noCollaborators: "Nenhum colaborador cadastrado — comece a montar seu time.",

  // Cadastros
  categories: "Nenhuma categoria — organize seus itens.",
  skus: "Nenhum item cadastrado.",
  locations: "Nenhum local — defina seus pontos de operação.",
  suppliers: "Nenhum fornecedor cadastrado.",
  movementTypes: "Nenhum tipo de movimentação.",

  // Permissões
  permissions: "Nenhuma permissão cadastrada.",
  selectCollaborator: "Selecione um colaborador para gerenciar seus acessos.",

  // Acesso
  roles: "Nenhum perfil de acesso definido.",
  users: "Nenhum usuário cadastrado.",

  // Perfil
  profileTickets: "Nenhum chamado atribuído a você.",
  profileMaintenance: "Nenhuma OS vinculada.",
  profileActivities: "Nenhuma atividade registrada.",

  // Equipamentos
  equipment: "Nenhum equipamento cadastrado — use o formulário para começar.",
  equipmentCategories: "Nenhuma categoria criada.",
  equipmentLocations: "Nenhum local definido.",
  equipmentStock: "Nenhum saldo em estoque.",

  // Saídas
  exits: "Nenhuma saída registrada.",
  exitsFiltered: "Nenhuma saída para os filtros selecionados.",
  exitsReport: "Nenhuma saída no período selecionado.",

  // Colaborador [id]
  collabTickets: "Nenhum chamado atribuído.",
  collabMaintenanceOpen: "Nenhuma OS aberta.",
  collabMaintenanceClosed: "Nenhuma OS encerrada.",
  collabActivities: "Nenhuma atividade registrada.",
} as const;

// ─── Toast Messages ───────────────────────────────────────────────
// Tom: autoconfiante e conciso — sem exageros, sem frieza.

export const TOASTS = {
  // CRUD genérico
  created: (item: string) => `${item} criado(a) com sucesso`,
  updated: (item: string) => `${item} atualizado(a)`,
  deleted: (item: string) => `${item} removido(a)`,

  // Estoque
  entryRegistered: "Entrada registrada — estoque atualizado",
  exitRegistered: "Saída registrada com sucesso",
  transferDone: "Transferência realizada",

  // Compras
  orderCreated: "Pedido de compra criado",
  receiptConfirmed: "Recebimento confirmado — itens no estoque",

  // Chamados
  ticketCreated: "Chamado aberto — acompanhe pela fila",
  ticketAssigned: "Chamado atribuído — mãos à obra",
  ticketStatusUpdated: "Status do chamado atualizado",

  // Manutenção
  osOpened: "OS aberta — diagnóstico em andamento",
  osStatusUpdated: "Status da OS atualizado",

  // Patrimônio / Equipamento
  equipmentRegistered: (count: number) =>
    `Equipamento cadastrado — ${count} patrimônio${count > 1 ? "s" : ""} criado${count > 1 ? "s" : ""}`,
  printRegistered: "Impressão de etiqueta registrada",

  // Auth
  loginSuccess: "Acesso realizado — bem-vindo de volta",
  profileUpdated: "Perfil atualizado",

  // Permissões
  roleUpdated: "Perfil de acesso atualizado",
  permissionsUpdated: "Permissões atualizadas",

  // Aprovações
  approved: "Aprovado com sucesso",
  rejected: "Rejeitado",

  // Genérico erro
  genericError: "Algo deu errado — tente novamente",
} as const;

// ─── Access Denied ────────────────────────────────────────────────

export const ACCESS_DENIED = {
  title: "Acesso restrito",
  description: "Você não tem permissão para acessar esta área. Fale com um administrador.",
} as const;

// ─── Section Descriptions ─────────────────────────────────────────
// Subtítulos das páginas — tom parceiro e moderno.

export const PAGE_DESCRIPTIONS = {
  estoque: "Controle entradas, saídas e saldos do seu inventário.",
  patrimonio: "Rastreie cada item pelo código de patrimônio.",
  compras: "Gerencie pedidos e acompanhe recebimentos.",
  chamados: "Crie, acompanhe e resolva chamados de forma ágil.",
  manutencao: "Abra e gerencie ordens de serviço de equipamentos.",
  etiquetas: "Imprima etiquetas e padronize a identificação.",
  clientes: "Gerencie empresas clientes, projetos e usuários externos.",
  colaboradores: "Monte sua equipe e defina responsabilidades.",
  permissoes: "Associe cada colaborador ao perfil de acesso adequado.",
  cadastros: "Configure categorias, itens, locais e fornecedores.",
  acesso: "Gerencie perfis de acesso, usuários e permissões do sistema.",
  equipamentos: "Cadastre equipamentos e gere patrimônios.",
  saidas: "Registre e acompanhe saídas de itens.",
  perfil: "Seus dados e atividades recentes.",
} as const;

// ─── Forbidden Words Check (dev helper) ──────────────────────────

const FORBIDDEN_PATTERNS = [
  /\bautomátic[oa]s?\b/i,
  /\brobótic[oa]s?\b/i,
  /\bgenéric[oa]s?\b/i,
  /\bcomuns?\b/i,
  /\bcomplicad[oa]s?\b/i,
  /\bcomplex[oa]s?\b/i,
  /\bluxuos[oa]s?\b/i,
];

/** Dev-only: checks if a string contains forbidden brand words */
export function hasForbiddenWords(text: string): string[] {
  return FORBIDDEN_PATTERNS.filter((re) => re.test(text)).map((re) => re.source);
}

export const PROJECTS_AGENDA_COPY = {
  title: 'Projetos e Agenda', description: 'Organize projetos, agenda, viagens e equipe em um só lugar.',
  navigation: 'Projetos e Agenda', sections: { 'visao-geral': 'Visão geral', projetos: 'Projetos', agenda: 'Agenda', viagens: 'Viagens', equipe: 'Equipe' },
  tabsLabel: 'Seções de projetos e agenda', calendar: 'Calendário', list: 'Lista',
  newSchedule: '+ Novo Agendamento',
  agendaTitle: 'Agenda operacional', teamDescription: 'Consulte os instaladores e configure sua participação na agenda conforme suas permissões.',
  calendarDescription: 'Projetos agendados, viagens e compromissos avulsos. Projetos sem data permanecem na aba Projetos.',
  searchSchedule: 'Buscar agendamento', searchInstaller: 'Buscar técnico', statusFilter: 'Status dos agendamentos', typeFilter: 'Tipo dos agendamentos',
  loadingProject: 'Carregando projeto...', projectError: 'Não foi possível carregar o projeto ou as opções de cadastro.',
  teamError: 'Não foi possível carregar a equipe. Tente novamente.',
  loading: 'Carregando projetos e agenda...',
  overviewPeriod: 'Período dos indicadores', overviewProjects: 'Indicadores dos projetos', overviewTrips: 'Instalações e viagens',
  overviewScope: 'Situação atual dos projetos e realizações pelas datas reais no período. Viagens compartilham a mesma agenda.',
  installationHistory: 'Histórico de instalações', hideInstallationHistory: 'Fechar histórico de instalações',
  noClients: 'Nenhum cliente cadastrado para vincular o projeto.',
} as const;

export const PROJECT_SERVICE_COPY = {
  bookedTravel: 'Viagem vinculada', manageTravel: 'Gerenciar viagens', bookedTravelContext: 'Para retirar o vínculo, edite a viagem. A necessidade de viagem permanece indicada no serviço.',
  dashboard: 'Dashboard de projetos',
  title: 'Projetos de instalação e desinstalação',
  description: 'Um serviço por projeto, com responsáveis, prioridade e agendamento na mesma agenda.',
  oneService: 'Cada projeto possui um serviço. Você pode cadastrar agora e agendar depois.',
  create: 'Novo projeto', edit: 'Editar projeto', details: 'Ver projeto', save: 'Salvar projeto', saving: 'Salvando...', cancel: 'Fechar',
  company: 'Cliente', chooseCompany: 'Selecione o cliente', existingProject: 'Projeto existente (opcional)', newProject: 'Criar novo projeto',
  name: 'Nome do projeto', marker: 'Marcador de modelo', noMarker: 'Sem marcador',
  type: 'Serviço', types: { INSTALLATION: 'Instalação', REMOVAL: 'Desinstalação' },
  urgency: 'Urgência', urgencies: ['Normal', 'Alta', 'Urgente'], color: 'Cor do projeto',
  status: 'Status', statuses: { PENDING: 'Pendente de agendamento', SCHEDULED: 'Agendado / preparação', IN_PROGRESS: 'Em andamento', DONE: 'Finalizado', CANCELLED: 'Cancelado' },
  address: 'Endereço', maps: 'Link do Google Maps', openMaps: 'Abrir localização', city: 'Cidade', state: 'UF',
  start: 'Início previsto', end: 'Término previsto', optionalDate: 'As datas são opcionais no cadastro. Para agendar, preencha o intervalo e selecione pelo menos um responsável.',
  internal: 'Responsáveis internos', contractors: 'Responsáveis terceirizados', contractor: 'Terceirizado', inactive: 'Inativo: remova ou substitua', noPeople: 'Nenhum responsável cadastrado.',
  sectors: 'Setores dos responsáveis', travel: 'Terá viagem?', relevant: 'Destaque para acompanhamento', notes: 'Observações',
  responsibles: 'Responsáveis', notAssigned: 'A definir', planned: 'Previsão', noDate: 'Sem agendamento', completed: 'Concluído em', actions: 'Ações',
  search: 'Buscar projeto pelo nome', statusFilter: 'Filtrar por status', typeFilter: 'Filtrar por serviço', allStatuses: 'Todos os status', allTypes: 'Todos os serviços',
  total: (count: number) => `${count} projeto${count === 1 ? '' : 's'}`, urgentFirst: 'Mais urgentes primeiro', previous: 'Anterior', next: 'Próxima', page: (page: number) => `Página ${page}`,
  readOnly: 'Somente leitura', noAccess: 'Você não tem permissão para visualizar a agenda de projetos.', empty: 'Nenhum projeto encontrado. Cadastre um projeto ou ajuste os filtros.',
  loadError: 'Não foi possível carregar os projetos ou as opções de cadastro.', retry: 'Tentar novamente',
  allowConflicts: 'Conferi a disponibilidade e quero agendar mesmo com conflito de horário.',
  linkedAgenda: 'Este agendamento pertence a um projeto. Tipo, nome e responsáveis são compartilhados entre as duas visualizações.',
  manageProject: 'Abrir gestão dos projetos',
} as const;

export const PROJECT_DASHBOARD_COPY = {
  title: 'Dashboard de projetos',
  description: 'Acompanhe instalações e desinstalações, do cadastro sem data à conclusão.',
  manage: 'Abrir gestão de projetos',
  type: 'Serviço dos indicadores',
  allTypes: 'Instalações e desinstalações',
  period: 'Período dos projetos',
  presets: { TODAY: 'Hoje', '7_DAYS': 'Últimos 7 dias', '30_DAYS': 'Últimos 30 dias', CUSTOM: 'Personalizado' },
  from: 'Data inicial', to: 'Data final',
  invalidPeriod: 'Informe datas válidas, em ordem, com intervalo de até 366 dias.',
  range: (from: string, to: string) => `Período: ${from} a ${to}. Finalizados e cancelados usam datas reais.`,
  scope: 'Projetos da gestão operacional. Pendentes, agendados e em andamento incluem todos os períodos.',
  active: 'Projetos ativos', inProgress: 'Em andamento', pending: 'Pendentes de agendamento', scheduled: 'Agendados / preparação',
  completed: 'Finalizados no período', cancelled: 'Cancelados no período',
  currentTitle: 'Situação atual', currentDescription: 'O que precisa de atenção agora, independentemente do período selecionado.',
  periodTitle: 'Resultados do período', periodDescription: 'Conclusões e cancelamentos confirmados no intervalo acima.',
  currentContext: 'Situação atual', pendingContext: 'Sem data prevista', periodContext: 'No período selecionado',
  activeContext: 'Pendentes + agendados + em andamento',
  total: 'Total de projetos', doneNow: 'Finalizados atualmente', cancelledNow: 'Cancelados atualmente',
  updated: (date: string) => `Última atualização: ${date}`,
  refresh: 'Atualizar indicadores', refreshing: 'Atualizando...', retry: 'Tentar novamente',
  loadError: 'Não foi possível atualizar os indicadores de projetos.',
  stale: 'Os dados exibidos são da última consulta bem-sucedida e podem estar desatualizados.',
  missingDates: (done: number, cancelled: number) => {
    const groups = [
      done ? `${done} projeto${done === 1 ? '' : 's'} finalizado${done === 1 ? '' : 's'}` : '',
      cancelled ? `${cancelled} projeto${cancelled === 1 ? '' : 's'} cancelado${cancelled === 1 ? '' : 's'}` : '',
    ].filter(Boolean);
    return `${groups.join(' e ')} sem data real. Fora dos totais do período.`;
  },
  unclassified: (count: number) => `${count} projeto${count === 1 ? '' : 's'} com status não reconhecido. Consulte a gestão para conferir.`,
  qualityTitle: 'Histórico com informações pendentes',
  highlights: 'Projetos para acompanhar',
  highlightsContext: 'Até cinco projetos ativos: urgência primeiro, depois destaque e cadastro mais antigo.',
  relevant: 'Destaque',
  noActive: 'Nenhum projeto ativo para acompanhar neste serviço.',
  empty: 'Nenhum projeto cadastrado na gestão operacional para este serviço.',
  planned: 'Início previsto', noDate: 'Sem agendamento',
} as const;

export const TICKET_INSIGHTS_COPY = {
  title: 'Visão dos atendimentos',
  description: 'Acompanhe as aberturas e os encerramentos no período, junto das pendências atuais.',
  source: 'Origem dos chamados',
  sources: { ALL: 'Todas as origens', INTERNAL: 'Internos', CLIENT: 'Clientes' },
  period: 'Período dos indicadores',
  presets: { TODAY: 'Hoje', '7_DAYS': 'Últimos 7 dias', '30_DAYS': 'Últimos 30 dias', CUSTOM: 'Personalizado' },
  from: 'Data inicial', to: 'Data final',
  invalidPeriod: 'Informe datas válidas, em ordem, com intervalo de até 366 dias.',
  range: (from: string, to: string) => `Período: ${from} a ${to}. Pendências e atendimentos mostram a situação atual, incluindo chamados anteriores.`,
  opened: 'Abertos no período', closed: 'Encerrados no período', pending: 'Aguardando técnico',
  inProgress: 'Em atendimento', wait: 'Espera média', attention: 'Precisam de atenção',
  periodContext: 'No período selecionado', currentContext: 'Situação atual',
  pendingContext: 'Abertos sem técnico atribuído', waitContext: 'Dos que aguardam técnico agora',
  attentionContext: 'Internos ≥ 5h · clientes ≥ 1h',
  waitingClient: 'Aguardando resposta', resolved: 'Resolvidos, ainda não encerrados',
  breakdowns: {
    INTERNAL: { title: 'Aberturas por setor', context: 'Setor do solicitante interno.' },
    CLIENT: { title: 'Aberturas por cliente', context: 'Empresa vinculada ao chamado do cliente.' },
    ALL: { title: 'Aberturas por setor e cliente', context: 'Setores identificam a equipe; empresas identificam os clientes.' },
  },
  emptySectors: 'Nenhum chamado aberto no período selecionado.',
  allScope: 'Visão geral dos chamados', ownScope: 'Abertos para todos e atendimentos atribuídos a você',
  updated: (time: string) => `Atualizado às ${time}`,
  loadError: 'Não foi possível atualizar os indicadores de atendimentos.', retry: 'Tentar novamente',
} as const;

export const TRIP_COPY = {
  calendarError: 'Não foi possível carregar todos os agendamentos.',
  title: 'Viagens', navigation: 'Viagens', description: 'Acompanhe os deslocamentos criados pelos projetos.',
  create: 'Nova viagem', edit: 'Editar viagem', details: 'Detalhes da viagem', agenda: 'Abrir agenda', dashboard: 'Instalações e viagens',
  name: 'Nome da viagem', originCity: 'Cidade de origem', originState: 'UF de origem', destinationCity: 'Cidade de destino', destinationState: 'UF de destino', chooseState: 'Selecione a UF',
  departure: 'Saída prevista', return: 'Retorno previsto', notes: 'Observações da viagem', internal: 'Colaboradores', contractors: 'Terceirizados', noPeople: 'Nenhum responsável disponível.', inactive: 'Inativo',
  services: 'Serviços atendidos', servicesContext: 'Selecione os projetos atendidos neste deslocamento. Cada projeto continua com seu único serviço.', noServices: 'Nenhum serviço cadastrado.', anotherTrip: 'Vinculado a outra viagem',
  periodContext: 'A previsão reserva o período na Agenda. As datas reais são registradas ao iniciar e finalizar a viagem.',
  interstate: 'Interestadual', sameState: 'Dentro do estado', allRoutes: 'Todos os trajetos', routeFilter: 'Tipo de trajeto', search: 'Buscar viagem ou destino', status: 'Status da viagem', allStatuses: 'Todos os status',
  statuses: { SCHEDULED: 'Planejada', IN_PROGRESS: 'Em viagem', DONE: 'Realizada', CANCELLED: 'Cancelada' },
  view: 'Ver viagem', save: 'Salvar viagem', saving: 'Salvando…', close: 'Fechar', retry: 'Tentar novamente', previous: 'Anterior', next: 'Próxima',
  page: (page: number, total: number) => `Página ${page} · ${total} viagem(ns)`, count: (count: number) => `${count} serviço(s) vinculado(s)`,
  loadError: 'Não foi possível carregar as viagens.', detailError: 'Não foi possível carregar a viagem ou as opções do cadastro.', empty: 'Nenhuma viagem encontrada. Marque “Terá viagem?” em um projeto ou ajuste os filtros.',
  noAccess: 'Você não tem permissão para visualizar viagens.', noActualDate: 'Ainda não registrada', started: 'Saída real', completed: 'Retorno real', cancelled: 'Cancelamento',
  start: 'Iniciar viagem', finish: 'Finalizar viagem', cancel: 'Cancelar viagem', reopen: 'Reabrir como planejada',
  confirm: 'Confirmar ação', abort: 'Voltar',
  confirmation: { IN_PROGRESS: 'Confirmar a saída agora? Este momento será registrado como saída real.', DONE: 'Confirmar o retorno agora? Este momento será registrado como retorno real.', CANCELLED: 'Confirmar o cancelamento desta viagem? Os serviços vinculados continuarão cadastrados.', SCHEDULED: 'Reabrir o planejamento? As datas reais anteriores ficarão no histórico de auditoria e uma nova saída precisará ser confirmada.' },
  routeLocked: 'A origem e o destino ficam preservados durante a viagem.', terminal: 'Reabra a viagem para alterar o planejamento.',
  allowConflicts: 'Conferi a agenda e confirmo este deslocamento mesmo com conflito de horário.', calendarLabel: 'Viagem',
} as const;

export const OPERATIONS_DASHBOARD_COPY = {
  title: 'Instalações, desinstalações e viagens', description: 'Acompanhe as próximas execuções, os destaques e as conclusões reais.',
  manage: 'Gerenciar viagens', projects: 'Gerenciar projetos', period: 'Período operacional', from: 'Data inicial', to: 'Data final',
  presets: { TODAY: 'Hoje', '7_DAYS': 'Últimos 7 dias', '30_DAYS': 'Últimos 30 dias', CUSTOM: 'Personalizado' },
  scope: 'Conclusões usam a data real. Viagens previstas contam as planejadas ou em andamento com saída prevista no período. As próximas execuções e os destaques mostram a situação atual.',
  invalidPeriod: 'Informe um período válido de até 366 dias.', range: (from: string, to: string) => `Período: ${from} a ${to}`,
  installations: 'Instalações concluídas', removals: 'Desinstalações concluídas', plannedTrips: 'Viagens agendadas', plannedTripsInPeriod: 'Saídas previstas no período', completedTrips: 'Viagens realizadas',
  actualContext: 'Conclusão real no período', plannedContext: 'Saída prevista no período · ainda abertas',
  currentPlanned: 'Planejadas atualmente', inProgress: 'Em viagem atualmente', currentTitle: 'Operação atual', currentDescription: 'Viagens abertas agora, inclusive as programadas para datas futuras.',
  periodTitle: 'Resultados do período', periodDescription: 'Execuções confirmadas e saídas previstas dentro do intervalo selecionado.',
  upcomingTitle: 'Próximas ações', upcomingDescription: 'Itens futuros ou destacados para acompanhamento da equipe.', historyTitle: 'Histórico do período', historyDescription: 'Últimas conclusões confirmadas no intervalo selecionado.',
  nextInstallations: 'Próximas instalações', relevantInstallations: 'Instalações relevantes', latestInstallations: 'Últimas instalações concluídas', latestRemovals: 'Últimas desinstalações concluídas', nextTrips: 'Próximas viagens interestaduais',
  upcomingContext: 'Até cinco agendamentos futuros, por data de início.', relevantContext: 'Até cinco instalações ativas em destaque, priorizando a urgência.', latestContext: 'Até cinco conclusões no período, da mais recente para a mais antiga.',
  empty: 'Nenhum registro para esta seção.', noDate: 'Sem agendamento', planned: 'Previsão', completed: 'Concluído em',
  loadError: 'Não foi possível atualizar o painel operacional.', stale: 'Exibindo a última consulta bem-sucedida deste período.', retry: 'Tentar novamente', refresh: 'Atualizar painel', refreshing: 'Atualizando…',
  updated: (date: string) => `Última consulta: ${date} · atualização a cada 30 segundos`,
  missingDates: (services: number, trips: number) => `${services} serviço(s) e ${trips} viagem(ns) finalizados sem data real. Fora dos totais e das últimas conclusões.`,
  withoutBooking: (count: number) => `${count} serviço(s) ativo(s) precisam de viagem e ainda não têm uma viagem válida vinculada.`,
  unclassified: (count: number) => `${count} registro(s) com tipo ou status não reconhecido.`,
} as const;

export const SECURITY_COPY = {
  registrationPending: 'Solicitação enviada! Aguarde a aprovação de um Administrador ou Gestor para acessar.',
  registrationSentTitle: 'Solicitação enviada',
  registrationSentStatus: 'Aguardando aprovação',
  registrationSentDescription: 'Seu cadastro de cliente será analisado por um Administrador ou Gestor.',
  registrationSentNextStep: 'O acesso só será liberado após a aprovação. Depois disso, entre com o email e a senha informados no cadastro.',
  registrationSentContact: 'Para acompanhar a solicitação, entre em contato com a equipe Skyline. Não é necessário enviar o mesmo cadastro novamente.',
  registrationSessionPreserved: 'Sua conta atual continua conectada. Esta solicitação não alterou sua sessão nem liberou o acesso do novo cliente.',
  registrationSessionLoading: 'Verificando sessão...',
  registrationBackToAccount: 'Voltar para minha conta',
  registrationGoToLogin: 'Ir para o login',
  registrationAnotherRequest: 'Enviar outra solicitação',
  registrationTitle: 'Aprovação de clientes',
  registrationDescription: 'Confira o vínculo com a empresa e o projeto antes de liberar o acesso.',
  managerOnly: 'Esta área é restrita a Administrador e Gestor.',
  approved: 'Cliente aprovado. O acesso já está liberado.',
  rejected: 'Solicitação rejeitada.',
  noPending: 'Nenhuma solicitação encontrada nesta situação.',
  shareCreated: 'Link criado. Válido por 24 horas. Qualquer pessoa com o link poderá abrir este anexo.',
  shareRevoked: 'Link revogado.',
} as const;
export const CUSTODY_COPY = {
    title: 'Estoque por cliente', description: 'Acompanhe onde cada patrimônio está e registre envios e devoluções sem perder o histórico.',
    assets: 'Patrimônios', history: 'Envios e devoluções', locations: 'Identificação dos locais',
    shipment: 'Enviar ao cliente', return: 'Devolver ao estoque', internal: 'Transferir entre locais internos',
    error: 'Não foi possível consultar o estoque. Tente novamente.', retry: 'Tentar novamente', noAccess: 'Você não tem permissão para consultar o estoque.',
    unclassified: 'Não classificado', internalLocation: 'Interno', clientLocation: 'Cliente', main: 'Estoque principal Skyline',
    diagnostics: 'Locais e patrimônios antigos precisam de identificação explícita. Motivos escritos nas saídas não comprovam o destino.',
    loading: 'Carregando estoque…', openInventory: 'Voltar ao estoque', openIndicators: 'Ver indicadores de estoque',
    noLocations: 'Nenhum local cadastrado. Cadastre um local para identificar o depósito ou o destino do cliente.',
    available: 'Disponível', inUse: 'Em uso', maintenance: 'Em manutenção', noLocation: 'Local não identificado', unknownDate: 'Envio não comprovado no histórico',
    empty: 'Nenhum patrimônio encontrado para os filtros selecionados.', select: 'Selecionar patrimônios', origin: 'Origem', destination: 'Destino',
    type: 'Tipo de movimentação', reason: 'Motivo', pin: 'PIN de quatro dígitos', returnCondition: 'Condição das unidades devolvidas',
    confirm: 'Registrar operação', close: 'Fechar', cancel: 'Cancelar', save: 'Salvar identificação', previous: 'Anterior', next: 'Próxima',
    selected: 'Selecionados', pending: 'Aguardando aprovação', completed: 'Concluído', rejected: 'Rejeitado',
    pendingNotice: 'Solicitação enviada para aprovação. A custódia permanece na origem até a aprovação; a disponibilidade será conferida novamente.',
    doneNotice: 'Operação registrada. Apenas os patrimônios selecionados foram movimentados.',
    identify: 'Identificar local', company: 'Empresa', unit: 'Unidade/projeto (opcional)', none: 'Sem unidade específica',
    explicitMapping: 'Ao identificar um local antigo, os patrimônios já vinculados a ele passam a usar essa classificação. Confira o vínculo antes de salvar.',
    noHistory: 'Nenhum envio ou devolução registrado.', noSelection: 'Selecione ao menos um patrimônio disponível na origem.',
} as const;
export const INVENTORY_DASHBOARD_COPY = {
    title: 'Painel de estoque', description: 'Disponibilidade, movimentação e prioridades de reposição com base nos últimos 30 dias.',
    warehouse: 'Depósito', client: 'Clientes', all: 'Visão geral', minimums: 'Configurar reservas', noWarehouse: 'Identifique o depósito existente como estoque principal para consultar sua disponibilidade e reposição.',
    noMinimum: 'As reservas ainda não foram configuradas neste depósito. Giro e saldo não definem um mínimo automaticamente.',
    setupTitle: 'Identifique o depósito para acompanhar o estoque',
    setupSteps: 'Selecione o local existente em Identificação dos locais, classifique como Interno e marque Estoque principal Skyline. Depois, configure a reserva mínima de cada item.',
    identifyLocations: 'Identificar locais', openInventory: 'Voltar ao estoque',
    availableIdentified: 'Disponíveis em locais internos identificados',
    classificationNotice: 'A disponibilidade considera apenas os locais internos identificados. Os patrimônios abaixo ainda precisam de conferência e não entram nesse saldo.',
    unclassified: (count: number) => `${count.toLocaleString('pt-BR')} patrimônio${count === 1 ? '' : 's'} em locais sem classificação.`,
    unlocated: (count: number) => `${count.toLocaleString('pt-BR')} patrimônio${count === 1 ? '' : 's'} sem local atual.`,
    error: 'Não foi possível consultar os indicadores de estoque.', stale: 'A atualização falhou. Os dados anteriores estão sendo exibidos.', retry: 'Tentar novamente', refresh: 'Atualizar',
    loading: 'Carregando indicadores…',
    available: 'Disponíveis no depósito', scopeAssets: 'Patrimônios neste contexto', maintenance: 'Em manutenção neste contexto', totalAssets: 'Total de patrimônios da empresa', totalSkus: 'Itens cadastrados',
    availableInContext: 'Disponíveis neste contexto',
    priorities: 'Prioridades de reposição', critical: 'Crítico', attention: 'Atenção complementar', healthy: 'Nenhuma prioridade encontrada neste depósito.',
    minimum: 'Reserva mínima', highOutput: 'Alta saída em 30 dias (opcional)', minimumUnset: 'Reserva não configurada',
    below: 'Saldo abaixo da reserva', zero: 'Saldo zerado com saída recente', high: 'Saída atingiu o limite configurado',
    entries: 'Itens com mais entradas e devoluções', exits: 'Itens com mais envios, saídas e baixas', quantities: 'Quantidades movimentadas por natureza',
    explanatory: 'Envio ao cliente reduz disponibilidade no depósito e preserva o patrimônio da empresa. Reposição pode vir de compra, retorno ou remanejamento.',
    emptyRanking: 'Nenhuma movimentação nesta categoria e período.', noAccess: 'Você não tem permissão para consultar o estoque.',
    contextOnly: 'A prioridade de reposição é calculada por depósito interno. Use a visão do depósito para consultar as reservas.',
    nature: { ENTRY: 'Entrada', SHIPMENT: 'Envio ao cliente', RETURN: 'Devolução do cliente', TRANSFER: 'Transferência', EXIT: 'Saída sem destino identificado', WRITE_OFF: 'Baixa definitiva', REVERSAL: 'Reversão', REVERTED: 'Movimento revertido', UNCLASSIFIED: 'Não classificado' },
} as const;
export const DASHBOARD_OPERATIONAL_COPY = {
    title: 'Visão operacional', description: 'Planejamento, compromissos e recursos apresentados na ordem em que a equipe acompanha o trabalho.',
    operationEyebrow: 'Operação',
    planningTitle: 'Planejamento e execução', planningDescription: 'Projetos, deslocamentos e próximos compromissos reunidos em uma mesma sequência de leitura.',
    resourcesTitle: 'Recursos', resourcesDescription: 'Disponibilidade de estoque e carros para sustentar as próximas atividades.',
    refresh: 'Atualização automática a cada 30 segundos',
    stock: 'Estoque', projects: 'Projetos', trips: 'Viagens', agenda: 'Próximos projetos e compromissos',
    totalAssets: 'Patrimônios', products: 'Itens cadastrados', available: 'Disponíveis no depósito', maintenance: 'Em manutenção',
    availabilityContext: 'Disponibilidade considera somente locais classificados como depósito interno.',
    unclassified: (count: number) => `${count.toLocaleString('pt-BR')} patrimônio${count === 1 ? '' : 's'} em locais sem classificação.`,
    unlocated: (count: number) => `${count.toLocaleString('pt-BR')} patrimônio${count === 1 ? '' : 's'} sem local atual.`,
    minimumMissing: 'Configure os mínimos para acompanhar a reposição.', critical: 'Itens críticos para reposição',
    stockEmpty: 'Nenhum patrimônio cadastrado.',
    active: 'Ativos', pending: 'Sem agendamento', scheduled: 'Agendados', inProgress: 'Em execução',
    priorities: 'Projetos em atenção', projectsEmpty: 'Nenhum projeto operacional cadastrado.', projectsInactive: 'Nenhum projeto ativo no momento.',
    projectsNoHighlights: 'Nenhum projeto destacado.',
    plannedTrips: 'Agendadas', runningTrips: 'Em andamento', travelWithoutBooking: 'Projetos sem viagem vinculada',
    nextInterstateTrips: 'Próximas viagens interestaduais', tripsEmpty: 'Nenhuma viagem agendada no momento.',
    agendaDescription: 'Próximos cinco compromissos agendados, a partir de agora.',
    agendaEmpty: 'Nenhum compromisso futuro agendado.', openAgenda: 'Abrir agenda',
    openStock: 'Abrir estoque', openProjects: 'Abrir projetos', openTrips: 'Abrir viagens',
    stockDashboard: 'Ver indicadores de estoque', projectDashboard: 'Ver indicadores de projetos',
    loading: 'Carregando informações…', failed: 'Não foi possível carregar estas informações.',
    stale: 'A atualização falhou. Exibindo os últimos dados recebidos.', retry: 'Tentar novamente',
    noDate: 'Sem data definida', noAssignees: 'Responsáveis ainda não definidos',
} as const;
export const VEHICLES_COPY = {
    title: 'Carros', description: 'Cadastre os carros e organize suas reservas em uma agenda própria.',
    fleet: 'Cadastro dos carros', reservations: 'Agenda dos carros', create: 'Cadastrar carro', reserve: 'Reservar carro',
    name: 'Nome do carro', plate: 'Placa (opcional)', active: 'Carro ativo', edit: 'Editar', save: 'Salvar', saving: 'Salvando…',
    vehicle: 'Carro', chooseVehicle: 'Selecione o carro', purpose: 'Finalidade da reserva', responsible: 'Responsável', chooseResponsible: 'Selecione o responsável',
    start: 'Início', end: 'Término', notes: 'Observações', cancel: 'Cancelar', cancelReservation: 'Cancelar reserva',
    startDate: 'Data de início', pickupTime: 'Horário de retirada', endDate: 'Data de término', returnTime: 'Horário de devolução',
    datePlaceholder: 'DD/MM/AAAA', timePlaceholder: 'HH:MM', invalidDateTime: 'Informe datas válidas em DD/MM/AAAA e horários válidos em HH:MM (00:00 a 23:59).',
    calendarMonth: 'Mês', calendarYear: 'Ano', previousMonth: 'Mês anterior', nextMonth: 'Próximo mês', today: 'Hoje',
    months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'], weekdays: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    hours: 'Horas', minutes: 'Minutos', selectedTime: 'Horário selecionado', confirmTime: 'Confirmar horário', clearTime: 'Limpar horário', timeHelp: 'Role as colunas para escolher horas e minutos.',
    reservation: 'Reserva', reservationDescription: 'Escolha o carro, o responsável e o período. Informe a finalidade e, se precisar, observações.', reservationSubmit: 'Reservar agora', editReservation: 'Editar reserva', stopEditing: 'Cancelar edição',
    filterReservations: 'Filtrar reservas', filterFrom: 'De', filterTo: 'Até', filterVehicle: 'Carro do filtro', allVehicles: 'Todos os carros', filterResponsible: 'Responsável do filtro', allResponsible: 'Todos os responsáveis', searchResponsible: 'Digite para buscar uma pessoa…', noResponsible: 'Nenhuma pessoa encontrada.',
    confirmCancel: 'Cancelar esta reserva? O registro permanecerá no histórico.',
    emptyFleet: 'Nenhum carro cadastrado.', emptyReservations: 'Nenhuma reserva neste período.',
    noAccess: 'Você não tem permissão para consultar os carros.', invalidPeriod: 'Informe um período válido, com término depois do início.',
    error: 'Não foi possível carregar os carros ou suas reservas.', retry: 'Tentar novamente',
    unavailable: 'A área de carros ainda não está disponível para uso.',
    saved: 'Carro salvo.', reserved: 'Reserva salva.', cancelled: 'Reserva cancelada.',
    scheduled: 'Agendada', ongoing: 'Em uso', finished: 'Concluída', cancelledStatus: 'Cancelada', inactive: 'Inativo',
    summary: 'Agenda dos carros', open: 'Abrir carros', available: 'Disponíveis agora', occupied: 'Em uso agora',
    summaryContext: 'Em uso após a retirada registrada; disponível novamente após a devolução registrada. Reservas futuras não ocupam o carro agora.',
    upcoming: 'Reservas atuais e futuras', current: 'Em uso', noUpcoming: 'Nenhuma reserva atual ou futura.',
    previous: 'Anterior', next: 'Próxima', total: (count: number) => `${count} reserva${count === 1 ? '' : 's'} no período`,
} as const;

export const MONITORING_PANEL_COPY = {
    title: 'Painel de acompanhamento', navigation: 'Visões do painel de acompanhamento',
    overview: 'Visão operacional', overviewDescription: 'Indicadores da operação, com acesso direto à gestão.', overviewNavigation: 'Indicadores operacionais da dashboard',
    manage: { estoque: 'Abrir estoque', projetos: 'Abrir projetos e agenda', operacoes: 'Abrir projetos e agenda' },
    operationalPeriod: 'Projetos e operações: últimos 30 dias do calendário local. Estoque: 30 dias corridos.',
    loading: 'Carregando painel…', mirror: 'Espelho por link', mirrorDescription: 'Acompanhamento de leitura. Troca automática a cada minuto.',
    mirrorContext: 'Quem receber o link poderá ler as visões selecionadas, incluindo detalhes de chamados, sem login. Atualizar mantém o endereço atual; gerar outro endereço substitui o anterior.',
    mirrorViews: 'Visões disponíveis no espelho', mirrorUrl: 'Link do espelho', copyMirror: 'Copiar link do espelho', openMirror: 'Abrir espelho',
    activeLink: 'Existe um link ativo. As marcações abaixo mostram exatamente as visões disponíveis nele.', noLink: 'Nenhum link ativo.', generate: 'Gerar link', update: 'Atualizar link atual', updated: 'Visões atualizadas. O endereço atual foi preservado.', regenerate: 'Gerar novo endereço', revoke: 'Revogar link', revoked: 'Link revogado.',
    close: 'Fechar', saving: 'Aguarde…', mirrorFailure: 'Não foi possível consultar o acesso do espelho.', mirrorUnavailable: 'Este espelho está indisponível. Verifique o link ou solicite um novo.',
    panels: { atendimentos: 'Atendimentos internos', 'atendimentos-clientes': 'Atendimentos de clientes', 'clientes-atencao': 'Clientes de atenção', projetos: 'Projetos', operacoes: 'Instalações e viagens', estoque: 'Estoque', carros: 'Carros' },
    pause: 'Pausar rotação', resume: 'Retomar rotação', paused: 'Rotação pausada', rotating: 'Troca automática ativa', held: 'Rotação suspensa enquanto os detalhes estão abertos',
    copied: 'Link copiado',
    copyError: 'Não foi possível copiar o link. Use o endereço do navegador.',
    failure: 'Não foi possível carregar esta visão. As outras continuam disponíveis.', retry: 'Tentar novamente', stale: 'A atualização falhou. Os dados anteriores estão sendo exibidos.',
    period: 'Projetos e operações: últimos 30 dias do calendário local. Estoque: 30 dias corridos. Cada visão de chamados permite ajustar o período.',
} as const;
export const STRUCTURES_COPY = {
    title: 'Histórico de instalações', description: 'Consulte instalações e desinstalações das salas ou totens atendidos pelos projetos.',
    name: 'Nome do local atendido', company: 'Cliente', kind: 'Tipo do local atendido', kinds: { ROOM: 'Sala', TOTEM: 'Totem', OTHER: 'Outro' },
    create: 'Cadastrar sala ou totem', save: 'Salvar local atendido', saving: 'Salvando…', cancel: 'Cancelar', chooseCompany: 'Selecione o cliente',
    search: 'Buscar sala ou totem', allCompanies: 'Todos os clientes', empty: 'Nenhum local atendido cadastrado para este filtro.',
    failed: 'Não foi possível carregar o histórico de instalações.', retry: 'Tentar novamente', loading: 'Carregando histórico de instalações…',
    history: 'Ver histórico de instalações', closeHistory: 'Fechar histórico', noCycles: 'Este local atendido ainda não possui instalações vinculadas.', historyFailed: 'Não foi possível carregar o histórico de instalações.',
    installation: 'Instalação', removal: 'Desinstalação', installed: 'Instalada em', removed: 'Desinstalada em', duration: 'Dias instalada',
    missingDate: 'Sem data real', notRemoved: 'Ainda instalada', planned: 'Aguardando conclusão', noRemoval: 'Sem desinstalação vinculada',
    states: { PLANNED: 'Planejado', INSTALLED: 'Instalada', REMOVED: 'Desinstalada', CANCELLED: 'Cancelado', UNCLASSIFIED: 'Dados incompletos' },
    previous: 'Anterior', next: 'Próxima', page: (page: number, total: number) => `Página ${page} de ${Math.max(1, total)}`,
    noAccess: 'Você não tem permissão para consultar o histórico de instalações.', projects: 'Projetos e agenda',
    select: 'Sala ou totem atendido (opcional)', noStructure: 'Sem histórico de instalações vinculado', selectCycle: 'Instalação correspondente', chooseCycle: 'Selecione a instalação',
    noAvailableCycle: 'Nenhuma instalação concluída disponível para desinstalação neste local atendido.',
    selectionFailed: 'Não foi possível carregar os locais atendidos. Tente novamente antes de associar.',
    newCycle: 'Esta instalação iniciará um novo histórico para o local atendido selecionado.', immutable: 'O local atendido e a instalação vinculados são permanentes. Outro serviço deve ser registrado em outro projeto.',
    cycles: 'Histórico de instalações', cycle: 'Instalação', daysContext: 'Calculado pelas datas reais de conclusão; para locais ainda instalados, até agora.',
    inlineSave: 'Salvar e selecionar', inlineDescription: 'Vincule uma sala ou totem deste cliente para acompanhar suas instalações e desinstalações.',
} as const;
