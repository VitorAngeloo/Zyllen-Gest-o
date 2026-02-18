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
export const DASHBOARD_SUBTITLE = "Visão geral da sua operação — tudo sob controle.";

// ─── Login ────────────────────────────────────────────────────────

export const LOGIN_COPY = {
  heading: "Bem-vindo",
  subtitle: "Selecione seu acesso e entre com suas credenciais",
  tabs: {
    internal: { label: "Colaborador", description: "Equipe interna Zyllen" },
    external: { label: "Cliente", description: "Portal exclusivo para parceiros" },
    contractor: { label: "Terceirizado", description: "Acesse suas demandas" },
  },
  hero: {
    tagline: "Experiências que transformam",
    description:
      "Gestão inteligente de estoque, patrimônio e chamados. Preparando o mundo para o futuro.",
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
  skus: "Nenhum SKU cadastrado.",
  locations: "Nenhum local — defina seus pontos de operação.",
  suppliers: "Nenhum fornecedor cadastrado.",
  movementTypes: "Nenhum tipo de movimentação.",

  // Permissões
  permissions: "Nenhuma permissão cadastrada.",
  selectCollaborator: "Selecione um colaborador para gerenciar seus acessos.",

  // Acesso
  roles: "Nenhuma role definida.",
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
  roleUpdated: "Role atualizada",
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
  clientes: "Gerencie empresas parceiras e seus usuários.",
  colaboradores: "Monte sua equipe e defina responsabilidades.",
  permissoes: "Defina níveis de acesso por colaborador.",
  cadastros: "Configure categorias, SKUs, locais e fornecedores.",
  acesso: "Gerencie roles, usuários e permissões do sistema.",
  equipamentos: "Cadastre equipamentos e gere patrimônios.",
  saidas: "Registre e acompanhe saídas de produtos.",
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
