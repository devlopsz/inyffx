(function () {
  "use strict";

  var COUNTRIES = [
    "Alemanha", "Angola", "Argentina", "Austrália", "Áustria", "Bélgica", "Bolívia", "Brasil", "Cabo Verde", "Camarões",
    "Canadá", "Chile", "China", "Colômbia", "Coreia do Sul", "Costa do Marfim", "Croácia", "Dinamarca", "Equador", "Escócia",
    "Espanha", "Estados Unidos", "França", "Gana", "Holanda", "Inglaterra", "Irlanda", "Itália", "Japão", "Marrocos",
    "México", "Moçambique", "Nigéria", "Noruega", "País de Gales", "Paraguai", "Peru", "Polônia", "Portugal", "Reino Unido",
    "República Tcheca", "Senegal", "Sérvia", "Suécia", "Suíça", "Tunísia", "Turquia", "Ucrânia", "Uruguai", "Venezuela"
  ];

  var NATIONALITIES = [
    "Alemã", "Angolana", "Argentina", "Australiana", "Austríaca", "Belga", "Boliviana", "Brasileira", "Cabo-verdiana", "Camaronesa",
    "Canadense", "Chilena", "Chinesa", "Colombiana", "Costa-marfinense", "Croata", "Dinamarquesa", "Equatoriana", "Escocesa", "Espanhola",
    "Estadunidense", "Francesa", "Ganesa", "Galesa", "Holandesa", "Inglesa", "Irlandesa", "Italiana", "Japonesa", "Marroquina",
    "Mexicana", "Moçambicana", "Nigeriana", "Norueguesa", "Paraguaia", "Peruana", "Polonesa", "Portuguesa", "Senegalesa", "Sérvia",
    "Sul-coreana", "Sueca", "Suíça", "Tunisiana", "Turca", "Ucraniana", "Uruguaia", "Venezuelana"
  ];

  var CITIES = [
    "Rio de Janeiro, Rio de Janeiro — Brasil", "São Paulo, São Paulo — Brasil", "Santos, São Paulo — Brasil", "Belo Horizonte, Minas Gerais — Brasil",
    "Porto Alegre, Rio Grande do Sul — Brasil", "Salvador, Bahia — Brasil", "Recife, Pernambuco — Brasil", "Brasília, Distrito Federal — Brasil",
    "Buenos Aires — Argentina", "Rosário, Santa Fé — Argentina", "Montevidéu — Uruguai", "Santiago — Chile", "Bogotá — Colômbia",
    "Londres — Inglaterra", "Liverpool — Inglaterra", "Manchester — Inglaterra", "Birmingham — Inglaterra", "Newcastle upon Tyne — Inglaterra",
    "Madri — Espanha", "Barcelona, Catalunha — Espanha", "Sevilha, Andaluzia — Espanha", "Lisboa — Portugal", "Porto — Portugal",
    "Paris — França", "Marselha — França", "Lyon — França", "Milão, Lombardia — Itália", "Turim, Piemonte — Itália", "Roma, Lácio — Itália",
    "Munique, Baviera — Alemanha", "Dortmund, Renânia do Norte-Vestfália — Alemanha", "Berlim — Alemanha", "Amsterdã — Holanda",
    "Bruxelas — Bélgica", "Istambul — Turquia", "Tóquio — Japão", "Casablanca — Marrocos", "Dacar — Senegal", "Lagos — Nigéria",
    "Nova York, Nova York — Estados Unidos", "Los Angeles, Califórnia — Estados Unidos", "Miami, Flórida — Estados Unidos", "Toronto, Ontário — Canadá"
  ];

  var CLUBS = [
    "Flamengo — Rio de Janeiro, Brasil", "Santos FC — Santos, Brasil", "Palmeiras — São Paulo, Brasil", "Corinthians — São Paulo, Brasil",
    "São Paulo FC — São Paulo, Brasil", "Vasco da Gama — Rio de Janeiro, Brasil", "Fluminense — Rio de Janeiro, Brasil", "Botafogo — Rio de Janeiro, Brasil",
    "Grêmio — Porto Alegre, Brasil", "Internacional — Porto Alegre, Brasil", "Atlético Mineiro — Belo Horizonte, Brasil", "Cruzeiro — Belo Horizonte, Brasil",
    "Chelsea FC — Londres, Inglaterra", "Chelsea U21 — Inglaterra (base/reservas)", "Arsenal — Londres, Inglaterra", "Liverpool — Liverpool, Inglaterra",
    "Manchester City — Manchester, Inglaterra", "Manchester United — Manchester, Inglaterra", "Tottenham Hotspur — Londres, Inglaterra", "Newcastle United — Newcastle, Inglaterra",
    "Real Madrid — Madri, Espanha", "FC Barcelona — Barcelona, Espanha", "Atlético de Madrid — Madri, Espanha", "Sevilla FC — Sevilha, Espanha",
    "Paris Saint-Germain — Paris, França", "Olympique de Marseille — Marselha, França", "Bayern de Munique — Munique, Alemanha", "Borussia Dortmund — Dortmund, Alemanha",
    "Juventus — Turim, Itália", "AC Milan — Milão, Itália", "Internazionale — Milão, Itália", "Napoli — Nápoles, Itália",
    "Benfica — Lisboa, Portugal", "Sporting CP — Lisboa, Portugal", "FC Porto — Porto, Portugal", "Ajax — Amsterdã, Holanda",
    "Boca Juniors — Buenos Aires, Argentina", "River Plate — Buenos Aires, Argentina", "Inter Miami — Miami, Estados Unidos", "Al-Hilal — Riade, Arábia Saudita"
  ];

  var LEAGUES = [
    "Brasileirão Série A — Brasil (1ª divisão)", "Brasileirão Série B — Brasil (2ª divisão)", "Premier League — Inglaterra (1ª divisão)",
    "Championship — Inglaterra (2ª divisão)", "Premier League 2 — Inglaterra (categoria de base)", "LaLiga — Espanha (1ª divisão)",
    "LaLiga 2 — Espanha (2ª divisão)", "Serie A — Itália (1ª divisão)", "Serie B — Itália (2ª divisão)", "Bundesliga — Alemanha (1ª divisão)",
    "2. Bundesliga — Alemanha (2ª divisão)", "Ligue 1 — França (1ª divisão)", "Ligue 2 — França (2ª divisão)",
    "Liga Portugal — Portugal (1ª divisão)", "Eredivisie — Holanda (1ª divisão)", "Primera División — Argentina (1ª divisão)",
    "Major League Soccer — Estados Unidos/Canadá (1ª divisão)", "Saudi Pro League — Arábia Saudita (1ª divisão)"
  ];

  var POSITIONS = ["Goleiro (GK)", "Lateral-direito (RB)", "Ala-direito (RWB)", "Zagueiro (CB)", "Lateral-esquerdo (LB)", "Ala-esquerdo (LWB)", "Volante (DM)", "Meio-campista central (CM)", "Meia ofensivo (AM/CAM)", "Ponta-direita (RW)", "Ponta-esquerda (LW)", "Segundo atacante (SS)", "Centroavante/Atacante (ST/CF)"];
  var TECHNICAL = ["Finalização", "Passe curto", "Passe longo", "Visão/criação", "Drible", "Primeiro toque/domínio", "Cruzamento", "Cabeceio", "Chute de longe", "Cobrança de falta", "Pênaltis", "Escanteios", "Desarme", "Marcação", "Técnica geral", "Jogo aéreo", "Saída de bola"];
  var MENTAL = ["Tomada de decisão", "Frieza/composição", "Antecipação", "Posicionamento", "Movimentação sem bola", "Inteligência tática", "Criatividade", "Coragem", "Liderança", "Trabalho em equipe", "Determinação", "Concentração", "Disciplina", "Competitividade", "Capacidade sob pressão"];
  var PHYSICAL = ["Aceleração", "Velocidade", "Agilidade", "Equilíbrio", "Força", "Resistência/fôlego", "Impulsão", "Explosão", "Mudança de direção"];
  var ARCHETYPES = ["Finalizador", "Driblador", "Criador", "Armador", "Velocista", "Atacante de profundidade", "Pivô", "Jogador associativo", "Pressionador", "Box-to-box", "Regista", "Volante destruidor", "Meia infiltrador", "Ala ofensivo", "Lateral equilibrado", "Lateral defensivo", "Zagueiro construtor", "Zagueiro agressivo", "Líbero", "Goleiro tradicional", "Goleiro-líbero"];
  var TRAITS = ["Corta para dentro", "Vai à linha de fundo", "Tenta dribles com frequência", "Procura tabelas", "Ataca o espaço", "Joga de costas", "Finaliza colocado", "Finaliza com força", "Tenta chutes de longe", "Procura passes em profundidade", "Faz lançamentos longos", "Chega de trás na área", "Pressiona a saída de bola", "Dá carrinhos", "Evita usar o pé fraco", "Usa os dois pés", "Tenta voleios/bicicletas", "Busca cabeceios", "Segura a bola", "Faz ultrapassagens", "Inverte o jogo"];

  function q(key, section, prompt, type, config) {
    return Object.assign({ key: key, section: section, prompt: prompt, type: type, required: false }, config || {});
  }

  window.INYFFX_REFERENCE_DATA = { countries: COUNTRIES, nationalities: NATIONALITIES, cities: CITIES, clubs: CLUBS, leagues: LEAGUES };
  window.INYFFX_REGISTRATION_QUESTIONS = [
    q("username", "CONTA", "Qual será o seu nome de usuário?", "username", { required: true, hint: "Comece com @, use apenas letras, números, ponto ou underline e não use espaços.", placeholder: "@seuusuario" }),
    q("password", "CONTA", "Crie uma senha para a sua carreira.", "password", { required: true, minLength: 6, hint: "Use pelo menos 6 caracteres." }),
    q("confirmPassword", "CONTA", "Confirme a sua senha.", "password", { required: true, minLength: 6 }),
    q("playerName", "IDENTIDADE", "Qual é o nome completo do jogador?", "text", { required: true, minLength: 2, maxLength: 80, placeholder: "Caio Alexandre da Silva" }),
    q("shirtName", "IDENTIDADE", "Qual o nome na camisa?", "text", { required: true, maxLength: 24, placeholder: "CAIO" }),
    q("birthDate", "IDENTIDADE", "Qual é a data de nascimento dele?", "date", { required: true, hint: "A idade será calculada automaticamente." }),
    q("primaryNationality", "IDENTIDADE", "Qual é a nacionalidade principal dele?", "autocomplete", { required: true, source: "nationalities", manualAllowed: true }),
    q("hasSecondNationality", "IDENTIDADE", "Ele possui outra nacionalidade?", "select", { required: true, options: ["Não", "Sim"] }),
    q("secondNationality", "IDENTIDADE", "Qual é a segunda nacionalidade?", "autocomplete", { required: true, source: "nationalities", manualAllowed: true, when: { key: "hasSecondNationality", equals: "Sim" } }),
    q("hasThirdNationality", "IDENTIDADE", "Ele possui uma terceira nacionalidade?", "select", { required: true, options: ["Não", "Sim"], when: { key: "hasSecondNationality", equals: "Sim" } }),
    q("thirdNationality", "IDENTIDADE", "Qual é a terceira nacionalidade?", "autocomplete", { required: true, source: "nationalities", manualAllowed: true, when: { key: "hasThirdNationality", equals: "Sim" } }),
    q("birthCountry", "ORIGEM", "Em qual país ele nasceu?", "autocomplete", { required: true, source: "countries", manualAllowed: true }),
    q("birthCity", "ORIGEM", "Em qual cidade ele nasceu?", "autocomplete", { required: true, source: "cities", manualAllowed: true, dependsOn: "birthCountry" }),
    q("currentCountry", "ORIGEM", "Em qual país ele mora atualmente?", "autocomplete", { required: true, source: "countries", manualAllowed: true }),
    q("currentCity", "ORIGEM", "Em qual cidade ele mora atualmente?", "autocomplete", { required: true, source: "cities", manualAllowed: true, dependsOn: "currentCountry" }),
    q("languages", "ORIGEM", "Quais idiomas ele fala?", "multi", { options: ["Português", "Inglês", "Espanhol", "Francês", "Italiano", "Alemão", "Japonês", "Árabe", "Mandarim", "Holandês"], max: 8, hint: "Opcional. Selecione todos que se aplicam." }),
    q("footballStatus", "CARREIRA", "Qual é a situação atual dele no futebol?", "select", { required: true, options: ["Jogador de base", "Amador", "Semiprofissional", "Profissional"] }),
    q("season", "CARREIRA", "Qual é a temporada atual da carreira?", "text", { required: true, placeholder: "2026/27" }),
    q("currentClub", "CARREIRA", "Em qual clube ele joga atualmente?", "autocomplete", { required: true, source: "clubs", manualAllowed: true }),
    q("league", "CARREIRA", "Em qual liga ou divisão doméstica ele joga atualmente?", "autocomplete", { required: true, source: "leagues", manualAllowed: true }),
    q("isLoaned", "CARREIRA", "Ele está emprestado?", "select", { required: true, options: ["Não", "Sim"] }),
    q("rightsClub", "CARREIRA", "Qual clube possui os direitos do jogador?", "autocomplete", { required: true, source: "clubs", manualAllowed: true, when: { key: "isLoaned", equals: "Sim" } }),
    q("loanClub", "CARREIRA", "Para qual clube ele está emprestado?", "autocomplete", { required: true, source: "clubs", manualAllowed: true, when: { key: "isLoaned", equals: "Sim" } }),
    q("squadCategory", "CARREIRA", "Em qual categoria ou elenco ele está?", "select", { required: true, options: ["Time principal", "Reservas", "Sub-20", "Sub-18", "Sub-17"] }),
    q("shirtNumber", "CARREIRA", "Qual número de camisa ele usa atualmente?", "text", { required: true, placeholder: "1 a 99 ou Não definido", maxLength: 11 }),
    q("competitiveYears", "CARREIRA", "Há quantos anos ele joga futebol competitivo?", "number", { min: 0, max: 40, hint: "Opcional." }),
    q("position", "PERFIL EM CAMPO", "Qual é a posição principal dele?", "select", { required: true, options: POSITIONS }),
    q("secondaryPositions", "PERFIL EM CAMPO", "Ele joga em outras posições?", "multi", { options: POSITIONS, max: 3, hint: "Opcional. Escolha até 3." }),
    q("dominantFoot", "PERFIL EM CAMPO", "Qual é o pé dominante?", "select", { required: true, options: ["Direito", "Esquerdo", "Ambos / ambidestro"] }),
    q("height", "PERFIL EM CAMPO", "Qual é a altura dele?", "number", { required: true, min: 120, max: 230, suffix: "cm" }),
    q("weight", "PERFIL EM CAMPO", "Qual é o peso dele?", "number", { required: true, min: 35, max: 180, suffix: "kg" }),
    q("preferredNumber", "PERFIL EM CAMPO", "Qual é o número de camisa preferido dele?", "number", { min: 1, max: 99, hint: "Opcional. Pode ser diferente do número atual." }),
    q("playStyle", "ESTILO", "Como você descreveria o estilo de jogo dele?", "multi", { required: true, options: ARCHETYPES, max: 3, hint: "Escolha até 3 arquétipos." }),
    q("technicalStrengths", "ESTILO", "Quais são os maiores pontos fortes técnicos dele?", "multi", { required: true, options: TECHNICAL, max: 4, hint: "Escolha até 4." }),
    q("mentalStrengths", "ESTILO", "Quais são os maiores pontos fortes mentais dele?", "multi", { required: true, options: MENTAL, max: 4, hint: "Escolha até 4." }),
    q("physicalStrengths", "ESTILO", "Quais são os maiores pontos fortes físicos dele?", "multi", { required: true, options: PHYSICAL, max: 3, hint: "Escolha até 3." }),
    q("weaknesses", "ESTILO", "Quais são as principais fraquezas dele?", "multi", { required: true, options: TECHNICAL.concat(MENTAL).concat(PHYSICAL), max: 6, excludeKeys: ["technicalStrengths", "mentalStrengths", "physicalStrengths"], hint: "Escolha até 6. Um ponto forte não pode ser também uma fraqueza." }),
    q("specialTraits", "ESTILO", "Quais jogadas ou características especiais combinam com ele?", "multi", { required: true, options: TRAITS, max: 5, hint: "Escolha até 5." }),
    q("setPieces", "ESTILO", "Ele costuma cobrar bolas paradas?", "multi", { required: true, options: ["Pênaltis", "Faltas diretas", "Faltas indiretas", "Escanteio pela direita", "Escanteio pela esquerda", "Não"], max: 5 }),
    q("footballStart", "HISTÓRIA", "Onde ele começou no futebol?", "select", { required: true, options: ["Clube de base", "Academia", "Time escolar", "Time amador", "Projeto social", "Outro"] }),
    q("formativeClub", "HISTÓRIA", "Qual foi o clube formador principal dele?", "autocomplete", { required: true, source: "clubs", manualAllowed: true }),
    q("professionalDebutYear", "HISTÓRIA", "Em que ano ele fez a estreia profissional?", "text", { required: true, placeholder: "2025 ou Ainda não estreou profissionalmente" }),
    q("nationalTeamStatus", "HISTÓRIA", "Ele já representa alguma seleção?", "select", { required: true, options: ["Não", "Seleção principal", "Seleção de base"] }),
    q("nationalTeam", "HISTÓRIA", "Qual seleção ele representa?", "autocomplete", { required: true, source: "countries", manualAllowed: true, when: { key: "nationalTeamStatus", notEquals: "Não" } }),
    q("titles", "HISTÓRIA", "Ele possui títulos importantes?", "textarea", { required: true, placeholder: "Se não possui, escreva “Ainda não”. Se possui, informe título, clube ou seleção e ano." }),
    q("awards", "HISTÓRIA", "Ele possui prêmios individuais importantes?", "textarea", { placeholder: "Opcional: prêmio, temporada e contexto." }),
    q("injuryHistory", "HISTÓRIA", "Existe alguma lesão importante no histórico dele?", "select", { options: ["Não", "Sim"] }),
    q("injuryDetails", "HISTÓRIA", "Qual lesão marcou o histórico dele?", "textarea", { required: true, placeholder: "Descrição narrativa curta e temporada ou ano.", when: { key: "injuryHistory", equals: "Sim" } }),
    q("personality", "NARRATIVA", "Como é a personalidade dele?", "textarea", { required: true, placeholder: "Traços, valores, limites e maneira de falar." }),
    q("careerAmbition", "NARRATIVA", "Qual é a maior ambição da carreira dele?", "select", { required: true, options: ["Ser o melhor jogador do mundo", "Ganhar a Bola de Ouro", "Ganhar a Copa do Mundo", "Ganhar a Champions League", "Virar ídolo de um clube", "Quebrar recordes", "Ser artilheiro histórico", "Representar seu país no mais alto nível", "Jogar em uma grande liga", "Fazer uma carreira longa e vitoriosa", "Outra"] }),
    q("nextSeasonGoal", "NARRATIVA", "Qual é o objetivo dele para a próxima temporada?", "textarea", { placeholder: "Opcional." }),
    q("dreamClub", "NARRATIVA", "Existe algum clube dos sonhos?", "autocomplete", { source: "clubs", manualAllowed: true, placeholder: "Digite Nenhum se não houver" }),
    q("inspirations", "NARRATIVA", "Existe algum jogador que o inspira?", "text", { placeholder: "Opcional. Separe mais de um nome por vírgulas." }),
    q("rival", "NARRATIVA", "Ele tem algum rival ou adversário que queira superar?", "text", { placeholder: "Opcional. Você pode responder Ainda não." }),
    q("backstory", "NARRATIVA", "Conte resumidamente a história dele antes desta etapa da carreira.", "textarea", { required: true, maxLength: 3000, placeholder: "Origem, dificuldades, momentos marcantes, motivação e relação com o futebol." }),
    q("goalCelebration", "NARRATIVA", "Ele tem uma comemoração de gol característica?", "select", { required: true, options: ["Não", "Sim"] }),
    q("goalCelebrationDetails", "NARRATIVA", "Como é a comemoração característica dele?", "textarea", { required: true, when: { key: "goalCelebration", equals: "Sim" } }),
    q("avatarData", "FOTO", "Deseja adicionar uma foto do jogador agora?", "file", { accept: "image/*", hint: "Opcional. Esta imagem também será usada como foto do perfil." }),
    q("confirmed", "REVISÃO", "Revise seu jogador", "review", { required: true, hint: "Confirme os dados antes de criar o universo." })
  ];
})();
