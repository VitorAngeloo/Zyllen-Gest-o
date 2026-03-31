// ============================================
// Estados e Cidades do Brasil
// Fonte: IBGE — Principais municípios por UF
// ============================================

export const ESTADOS_BR: { uf: string; nome: string }[] = [
    { uf: "AC", nome: "Acre" },
    { uf: "AL", nome: "Alagoas" },
    { uf: "AP", nome: "Amapá" },
    { uf: "AM", nome: "Amazonas" },
    { uf: "BA", nome: "Bahia" },
    { uf: "CE", nome: "Ceará" },
    { uf: "DF", nome: "Distrito Federal" },
    { uf: "ES", nome: "Espírito Santo" },
    { uf: "GO", nome: "Goiás" },
    { uf: "MA", nome: "Maranhão" },
    { uf: "MT", nome: "Mato Grosso" },
    { uf: "MS", nome: "Mato Grosso do Sul" },
    { uf: "MG", nome: "Minas Gerais" },
    { uf: "PA", nome: "Pará" },
    { uf: "PB", nome: "Paraíba" },
    { uf: "PR", nome: "Paraná" },
    { uf: "PE", nome: "Pernambuco" },
    { uf: "PI", nome: "Piauí" },
    { uf: "RJ", nome: "Rio de Janeiro" },
    { uf: "RN", nome: "Rio Grande do Norte" },
    { uf: "RS", nome: "Rio Grande do Sul" },
    { uf: "RO", nome: "Rondônia" },
    { uf: "RR", nome: "Roraima" },
    { uf: "SC", nome: "Santa Catarina" },
    { uf: "SP", nome: "São Paulo" },
    { uf: "SE", nome: "Sergipe" },
    { uf: "TO", nome: "Tocantins" },
];

export const CIDADES_POR_ESTADO: Record<string, string[]> = {
    AC: [
        "Acrelândia", "Assis Brasil", "Brasiléia", "Bujari", "Capixaba",
        "Cruzeiro do Sul", "Epitaciolândia", "Feijó", "Jordão", "Mâncio Lima",
        "Manoel Urbano", "Marechal Thaumaturgo", "Plácido de Castro", "Porto Acre",
        "Porto Walter", "Rio Branco", "Rodrigues Alves", "Santa Rosa do Purus",
        "Sena Madureira", "Senador Guiomard", "Tarauacá", "Xapuri",
    ],
    AL: [
        "Arapiraca", "Barra de Santo Antônio", "Barra de São Miguel", "Campo Alegre",
        "Coruripe", "Delmiro Gouveia", "Maceió", "Marechal Deodoro", "Palmeira dos Índios",
        "Penedo", "Pilar", "Rio Largo", "Santa Luzia do Norte", "Santana do Ipanema",
        "São Miguel dos Campos", "Teotônio Vilela", "União dos Palmares", "Viçosa",
    ],
    AP: [
        "Amapá", "Calçoene", "Cutias", "Ferreira Gomes", "Itaubal", "Laranjal do Jari",
        "Macapá", "Mazagão", "Oiapoque", "Pedra Branca do Amapari", "Porto Grande",
        "Pracuúba", "Santana", "Serra do Navio", "Tartarugalzinho", "Vitória do Jari",
    ],
    AM: [
        "Autazes", "Barcelos", "Benjamin Constant", "Borba", "Carauari", "Coari",
        "Eirunepé", "Humaitá", "Iranduba", "Itacoatiara", "Lábrea", "Manacapuru",
        "Manaus", "Manicoré", "Maués", "Novo Airão", "Parintins", "Presidente Figueiredo",
        "São Gabriel da Cachoeira", "Tabatinga", "Tefé",
    ],
    BA: [
        "Alagoinhas", "Barreiras", "Camaçari", "Candeias", "Casa Nova", "Eunápolis",
        "Feira de Santana", "Ilhéus", "Itabuna", "Itamaraju", "Jequié", "Juazeiro",
        "Lauro de Freitas", "Luís Eduardo Magalhães", "Paulo Afonso", "Porto Seguro",
        "Salvador", "Santo Antônio de Jesus", "Simões Filho", "Teixeira de Freitas",
        "Valença", "Vitória da Conquista",
    ],
    CE: [
        "Aquiraz", "Barbalha", "Canindé", "Cascavel", "Caucaia", "Crato",
        "Eusébio", "Fortaleza", "Horizonte", "Itaitinga", "Iguatu", "Juazeiro do Norte",
        "Maracanaú", "Maranguape", "Pacajus", "Pacatuba", "Quixadá", "Quixeramobim",
        "Sobral", "Tianguá",
    ],
    DF: [
        "Brasília", "Ceilândia", "Taguatinga", "Samambaia", "Plano Piloto",
        "Águas Claras", "Gama", "Sobradinho", "Recanto das Emas", "Santa Maria",
        "São Sebastião", "Vicente Pires", "Guará", "Planaltina", "Núcleo Bandeirante",
        "Lago Sul", "Lago Norte", "Riacho Fundo", "Itapoã", "Jardim Botânico",
        "Paranoá", "Brazlândia", "Cruzeiro", "Fercal", "Estrutural", "Varjão",
    ],
    ES: [
        "Aracruz", "Cachoeiro de Itapemirim", "Cariacica", "Colatina", "Guarapari",
        "Linhares", "Nova Venécia", "São Mateus", "Serra", "Vila Velha", "Vitória",
        "Viana", "Fundão", "Domingos Martins", "Marataízes", "Piúma",
    ],
    GO: [
        "Águas Lindas de Goiás", "Anápolis", "Aparecida de Goiânia", "Caldas Novas",
        "Catalão", "Cristalina", "Formosa", "Goianésia", "Goiânia", "Itumbiara",
        "Jataí", "Luziânia", "Novo Gama", "Planaltina", "Rio Verde", "Senador Canedo",
        "Trindade", "Valparaíso de Goiás",
    ],
    MA: [
        "Açailândia", "Bacabal", "Balsas", "Caxias", "Codó", "Coroatá",
        "Imperatriz", "Itapecuru Mirim", "Paço do Lumiar", "Pinheiro",
        "Raposa", "Santa Inês", "São José de Ribamar", "São Luís", "Timon",
    ],
    MT: [
        "Alta Floresta", "Barra do Garças", "Cáceres", "Colíder", "Cuiabá",
        "Lucas do Rio Verde", "Nova Mutum", "Primavera do Leste", "Rondonópolis",
        "Sinop", "Sorriso", "Tangará da Serra", "Várzea Grande",
    ],
    MS: [
        "Amambai", "Aquidauana", "Campo Grande", "Corumbá", "Coxim",
        "Dourados", "Maracaju", "Naviraí", "Nova Andradina", "Paranaíba",
        "Ponta Porã", "Três Lagoas", "Sidrolândia",
    ],
    MG: [
        "Araguari", "Barbacena", "Belo Horizonte", "Betim", "Contagem",
        "Divinópolis", "Governador Valadares", "Ipatinga", "Itabira", "Juiz de Fora",
        "Lavras", "Montes Claros", "Muriaé", "Nova Lima", "Ouro Preto",
        "Patos de Minas", "Poços de Caldas", "Pouso Alegre", "Ribeirão das Neves",
        "Sabará", "Santa Luzia", "Sete Lagoas", "Teófilo Otoni", "Uberaba",
        "Uberlândia", "Varginha", "Vespasiano",
    ],
    PA: [
        "Abaetetuba", "Altamira", "Ananindeua", "Barcarena", "Belém",
        "Bragança", "Breves", "Cametá", "Castanhal", "Itaituba",
        "Marabá", "Marituba", "Paragominas", "Parauapebas", "Redenção",
        "Santarém", "São Félix do Xingu", "Tailândia", "Tucuruí",
    ],
    PB: [
        "Bayeux", "Cabedelo", "Cajazeiras", "Campina Grande", "Guarabira",
        "João Pessoa", "Monteiro", "Patos", "Santa Rita", "Sapé", "Sousa",
    ],
    PR: [
        "Apucarana", "Arapongas", "Araucária", "Campo Largo", "Campo Mourão",
        "Cascavel", "Colombo", "Curitiba", "Foz do Iguaçu", "Francisco Beltrão",
        "Guarapuava", "Londrina", "Maringá", "Paranaguá", "Pato Branco",
        "Pinhais", "Ponta Grossa", "São José dos Pinhais", "Toledo", "Umuarama",
    ],
    PE: [
        "Cabo de Santo Agostinho", "Camaragibe", "Caruaru", "Garanhuns", "Goiana",
        "Igarassu", "Ipojuca", "Jaboatão dos Guararapes", "Olinda", "Paulista",
        "Petrolina", "Recife", "Santa Cruz do Capibaribe", "Serra Talhada", "Vitória de Santo Antão",
    ],
    PI: [
        "Barras", "Campo Maior", "Floriano", "Oeiras", "Parnaíba",
        "Piripiri", "Picos", "São Raimundo Nonato", "Teresina", "União",
    ],
    RJ: [
        "Angra dos Reis", "Araruama", "Belford Roxo", "Cabo Frio", "Campos dos Goytacazes",
        "Duque de Caxias", "Itaboraí", "Itaguaí", "Macaé", "Magé",
        "Maricá", "Mesquita", "Niterói", "Nova Friburgo", "Nova Iguaçu",
        "Petrópolis", "Queimados", "Resende", "Rio de Janeiro", "São Gonçalo",
        "São João de Meriti", "Teresópolis", "Volta Redonda",
    ],
    RN: [
        "Açu", "Caicó", "Ceará-Mirim", "Currais Novos", "Macaíba",
        "Mossoró", "Natal", "Parnamirim", "Pau dos Ferros", "São Gonçalo do Amarante",
        "São José de Mipibu",
    ],
    RS: [
        "Alvorada", "Bagé", "Bento Gonçalves", "Cachoeirinha", "Canoas",
        "Caxias do Sul", "Erechim", "Gravataí", "Guaíba", "Ijuí",
        "Lajeado", "Novo Hamburgo", "Passo Fundo", "Pelotas", "Porto Alegre",
        "Rio Grande", "Santa Cruz do Sul", "Santa Maria", "São Leopoldo",
        "Sapucaia do Sul", "Uruguaiana", "Viamão",
    ],
    RO: [
        "Ariquemes", "Cacoal", "Guajará-Mirim", "Jaru", "Ji-Paraná",
        "Ouro Preto do Oeste", "Porto Velho", "Rolim de Moura", "Vilhena",
    ],
    RR: [
        "Alto Alegre", "Boa Vista", "Bonfim", "Caracaraí", "Pacaraima",
        "Rorainópolis", "São João da Baliza",
    ],
    SC: [
        "Balneário Camboriú", "Blumenau", "Brusque", "Caçador", "Chapecó",
        "Concórdia", "Criciúma", "Florianópolis", "Itajaí", "Jaraguá do Sul",
        "Joinville", "Lages", "Palhoça", "São José", "Tubarão", "Xanxerê",
    ],
    SP: [
        "Americana", "Araraquara", "Araras", "Atibaia", "Barueri",
        "Bauru", "Botucatu", "Campinas", "Carapicuíba", "Cotia",
        "Diadema", "Franca", "Guarujá", "Guarulhos", "Indaiatuba",
        "Itaquaquecetuba", "Itu", "Jacareí", "Jundiaí", "Limeira",
        "Marília", "Mauá", "Mogi das Cruzes", "Mogi Guaçu", "Osasco",
        "Piracicaba", "Praia Grande", "Presidente Prudente", "Ribeirão Preto",
        "Rio Claro", "Santa Bárbara d'Oeste", "Santo André", "Santos",
        "São Bernardo do Campo", "São Caetano do Sul", "São Carlos",
        "São José do Rio Preto", "São José dos Campos", "São Paulo",
        "São Vicente", "Sorocaba", "Sumaré", "Suzano", "Taboão da Serra",
        "Taubaté", "Valinhos", "Vinhedo",
    ],
    SE: [
        "Aracaju", "Barra dos Coqueiros", "Estância", "Itabaiana",
        "Lagarto", "Laranjeiras", "Nossa Senhora do Socorro", "São Cristóvão", "Tobias Barreto",
    ],
    TO: [
        "Araguaína", "Colinas do Tocantins", "Dianópolis", "Guaraí",
        "Gurupi", "Palmas", "Paraíso do Tocantins", "Porto Nacional", "Tocantinópolis",
    ],
};

/**
 * Retorna as cidades de um estado, ordenadas alfabeticamente
 */
export function getCidadesPorEstado(uf: string): string[] {
    return (CIDADES_POR_ESTADO[uf] || []).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
