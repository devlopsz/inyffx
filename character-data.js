(function () {
  "use strict";

  function field(key, label, type, extra) {
    return Object.assign({ key: key, label: label, type: type || "text" }, extra || {});
  }

  var personality = [
    "Calmo", "Extrovertido", "Introvertido", "Engraçado", "Sarcástico", "Carinhoso", "Frio", "Reservado",
    "Ciumento", "Possessivo", "Protetor", "Impulsivo", "Racional", "Emocional", "Competitivo", "Ambicioso",
    "Orgulhoso", "Arrogante", "Humilde", "Leal", "Desconfiado", "Manipulador", "Inteligente", "Observador",
    "Ingênuo", "Maduro", "Imaturo", "Responsável", "Irresponsável", "Corajoso", "Medroso", "Dramático",
    "Provocador", "Paciente", "Impaciente", "Disciplinado", "Teimoso", "Independente", "Dependente emocionalmente",
    "Perfeccionista", "Controlador", "Espontâneo", "Misterioso"
  ];
  var speech = ["Formal", "Informal", "Educado", "Direto", "Carinhoso", "Sarcástico", "Provocador", "Frio", "Técnico", "Engraçado", "Dramático", "Tímido", "Falante", "Fala pouco", "Usa muitas gírias", "Evita gírias"];
  var positions = ["Goleiro", "Lateral-direito", "Zagueiro", "Lateral-esquerdo", "Volante", "Meio-campista", "Meia-atacante", "Ponta-direita", "Ponta-esquerda", "Centroavante", "Atacante"];
  var positionLabels = {
    GO: "Goleiro", GK: "Goleiro", LD: "Lateral-direito", RB: "Lateral-direito", ZC: "Zagueiro", CB: "Zagueiro",
    LE: "Lateral-esquerdo", LB: "Lateral-esquerdo", VOL: "Volante", CDM: "Volante", MC: "Meio-campista", CM: "Meio-campista",
    MAT: "Meia-atacante", CAM: "Meia-atacante", PD: "Ponta-direita", RW: "Ponta-direita", PE: "Ponta-esquerda", LW: "Ponta-esquerda",
    CA: "Centroavante", ST: "Centroavante", ATA: "Atacante", FW: "Atacante"
  };

  function parseLineup(source) {
    var pattern = /(?:^|[:\n,;])\s*(GO|GK|LD|RB|ZC|CB|LE|LB|VOL|CDM|MC|CM|MAT|CAM|PD|RW|PE|LW|CA|ST|ATA|FW)\s*[-–—]\s*([^\n,;]*)/gi;
    var result = [];
    var seen = {};
    var match;
    while ((match = pattern.exec(String(source || "")))) {
      var abbreviation = String(match[1] || "").toUpperCase();
      var name = String(match[2] || "").replace(/^\s+|\s+$/g, "").replace(/^\d{1,2}\s*[-.)]?\s*/, "");
      var key = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
      if (!key || /^(nome|jogador|preencher|nao informado|n a|-)$/.test(key) || seen[key]) continue;
      seen[key] = true;
      result.push({ name: name, abbreviation: abbreviation, position: positionLabels[abbreviation] || abbreviation });
    }
    return result;
  }

  var commonSections = [
    {
      id: "basic",
      title: "Informações básicas",
      description: "Identidade, origem e vida atual.",
      fields: [
        field("displayName", "Como as pessoas normalmente chamam esse personagem?", "text", { placeholder: "Primeiro nome, sobrenome, apelido ou nome artístico" }),
        field("birthDate", "Qual é a data de nascimento do personagem?", "date"),
        field("noExactBirthDate", "Não quero definir uma data exata", "checkbox"),
        field("approximateAge", "Qual é a idade do personagem no início da história?", "number", { min: 0, max: 120, quick: true, required: true }),
        field("nationality", "Qual é a nacionalidade do personagem?", "combo", { source: "nationalities" }),
        field("birthCountry", "Em qual país esse personagem nasceu?", "combo", { source: "countries" }),
        field("birthCity", "Em qual cidade esse personagem nasceu?", "combo", { source: "cities" }),
        field("currentCountry", "Em qual país esse personagem mora atualmente?", "combo", { source: "countries" }),
        field("currentCity", "Em qual cidade esse personagem mora atualmente?", "combo", { source: "cities" }),
        field("gender", "Qual é o gênero do personagem?", "combo", { options: ["Feminino", "Masculino", "Não binário", "Prefiro não definir"] }),
        field("languages", "Quais idiomas ele fala e qual é o nível de fluência?", "tags", { placeholder: "Um por linha. Ex.: Português — nativo" })
      ]
    },
    {
      id: "personality",
      title: "Personalidade",
      description: "Como essa pessoa pensa, reage e se comporta.",
      fields: [
        field("personalityTraits", "Como você descreveria a personalidade desse personagem?", "multi", { options: personality, max: 6, custom: true, quick: true, required: true }),
        field("personalityDescription", "Descreva a personalidade dele com suas próprias palavras.", "textarea", { large: true, placeholder: "Explique como essa pessoa normalmente pensa, reage e se comporta." }),
        field("greatestQuality", "Qual é a maior qualidade desse personagem?", "text"),
        field("greatestFlaw", "Qual é o maior defeito desse personagem?", "text"),
        field("likes", "Do que esse personagem mais gosta?", "tags"),
        field("dislikes", "O que esse personagem não suporta?", "textarea"),
        field("angerTriggers", "O que normalmente deixa esse personagem irritado?", "textarea"),
        field("happinessTriggers", "O que normalmente deixa esse personagem feliz?", "textarea"),
        field("insecurities", "Existe alguma insegurança importante desse personagem?", "textarea"),
        field("fears", "Existe algum medo importante desse personagem?", "textarea"),
        field("angerReaction", "Como ele reage quando está com raiva?", "textarea", { placeholder: "Silêncio, confronto, sarcasmo, afastamento, impulsividade..." }),
        field("affectionStyle", "Como ele demonstra carinho?", "textarea", { placeholder: "Palavras, abraços, presentes, proteção, humor, tempo de qualidade..." }),
        field("concernReaction", "Como ele age quando está preocupado com o jogador?", "textarea")
      ]
    },
    {
      id: "voice",
      title: "Maneira de falar",
      description: "Referências para a IA manter uma voz consistente.",
      fields: [
        field("speechStyle", "Como esse personagem costuma falar?", "multi", { options: speech, custom: true, quick: true, required: true }),
        field("accentSlang", "Ele possui algum sotaque, gíria ou maneira específica de falar?", "textarea"),
        field("samplePhrases", "Dê alguns exemplos de frases que esse personagem falaria.", "tags", { max: 10, placeholder: "De 1 a 10 frases, uma por linha" }),
        field("frequentExpressions", "Quais palavras ou expressões ele usa frequentemente?", "tags"),
        field("speechNoGos", "Quais palavras, assuntos ou maneiras de falar NÃO combinam com ele?", "textarea")
      ]
    },
    {
      id: "player-relationship",
      title: "Relação com o jogador",
      description: "História, proximidade e limites entre os dois.",
      fields: [
        field("howMet", "Como esse personagem conheceu o jogador?", "textarea", { quick: true, required: true }),
        field("knownDuration", "Há quanto tempo eles se conhecem?", "combo", { options: ["Acabaram de se conhecer", "Dias", "Semanas", "Meses", "1–2 anos", "Vários anos", "Desde a infância", "Outro"] }),
        field("relationshipCurrent", "Como está a relação entre eles atualmente?", "range", { min: 1, max: 7, quick: true, required: true, labels: ["Péssima", "Ruim", "Distante", "Neutra", "Boa", "Muito próxima", "Extremamente próxima"] }),
        field("viewOfPlayer", "Como esse personagem enxerga o jogador atualmente?", "textarea", { quick: true, required: true }),
        field("admiresPlayer", "O que esse personagem mais admira no jogador?", "textarea"),
        field("botheredByPlayer", "O que mais incomoda esse personagem no jogador?", "textarea"),
        field("wantsPlayerToChange", "Existe alguma coisa que ele gostaria que o jogador mudasse?", "textarea"),
        field("neverDoToPlayer", "Existe algo que esse personagem NUNCA faria com o jogador?", "textarea", { help: "Este campo funciona como limite comportamental da IA." })
      ]
    },
    {
      id: "knowledge",
      title: "Conhecimento e segredos",
      description: "Define o que este personagem sabe — e o que não pode saber ainda.",
      fields: [
        field("knowledgeLevel", "Quanto esse personagem sabe sobre a vida do jogador?", "select", { options: ["Quase nada", "Apenas informações públicas", "Sabe algumas coisas pessoais", "É muito próximo e sabe bastante", "Conhece praticamente toda a vida dele"] }),
        field("knownFacts", "Quais informações importantes sobre o jogador esse personagem SABE?", "tags", { quick: true, required: true }),
        field("unknownFacts", "Quais informações importantes sobre o jogador esse personagem NÃO SABE?", "tags", { quick: true, required: true, help: "A IA não poderá usar essas informações com este personagem até que ele as descubra no RP." }),
        field("hasSecret", "Esse personagem possui algum segredo?", "select", { options: ["Não", "Sim"] }),
        field("secret", "Qual é o segredo?", "textarea", { when: { key: "hasSecret", equals: "Sim" } }),
        field("secretKnownBy", "Quem sabe desse segredo?", "tags", { when: { key: "hasSecret", equals: "Sim" }, placeholder: "Um personagem por linha" }),
        field("playerSecretKnowledge", "O jogador sabe desse segredo?", "select", { when: { key: "hasSecret", equals: "Sim" }, options: ["Sim", "Não", "Suspeita", "Sabia, mas não conhece todos os detalhes"] })
      ]
    },
    {
      id: "own-life",
      title: "Vida própria",
      description: "Objetivos e conflitos que existem mesmo sem o protagonista por perto.",
      fields: [
        field("currentGoal", "Qual é o principal objetivo atual desse personagem?", "textarea", { quick: true, required: true }),
        field("longTermGoal", "Ele possui algum objetivo de longo prazo?", "textarea"),
        field("independentLife", "O que está acontecendo atualmente na vida dele além da relação com o jogador?", "textarea", { large: true }),
        field("importantPeople", "Quais pessoas são importantes para esse personagem além do jogador?", "tags"),
        field("characterLinks", "Ele possui algum relacionamento importante com outro personagem cadastrado?", "tags", { placeholder: "Ex.: Ana — irmã; Rui — chefe; Maya — rival" })
      ]
    },
    {
      id: "history",
      title: "Histórico",
      description: "Momentos que explicam o estado atual da relação.",
      fields: [
        field("importantEvents", "Quais foram os acontecimentos mais importantes entre este personagem e o jogador?", "events"),
        field("bestRelationshipMoment", "Qual foi o melhor momento da relação dos dois?", "textarea"),
        field("worstRelationshipMoment", "Qual foi o pior momento da relação dos dois?", "textarea"),
        field("hasUnresolvedConflict", "Existe algum conflito ainda não resolvido entre eles?", "select", { options: ["Não", "Sim"] }),
        field("unresolvedConflictDescription", "Descreva o conflito ainda não resolvido.", "textarea", { when: { key: "hasUnresolvedConflict", equals: "Sim" } })
      ]
    },
    {
      id: "appearance",
      title: "Aparência",
      description: "Referências físicas e visuais do personagem.",
      fields: [
        field("appearanceDescription", "Como é a aparência desse personagem?", "textarea", { large: true }),
        field("height", "Qual é a altura dele?", "text"),
        field("build", "Como é o porte físico?", "text"),
        field("hair", "Como é o cabelo?", "text"),
        field("eyes", "Como são os olhos?", "text"),
        field("clothingStyle", "Qual é o estilo de roupa?", "text"),
        field("tattoos", "Ele possui tatuagens?", "textarea"),
        field("accessories", "Quais acessórios costuma usar?", "textarea"),
        field("distinctiveFeatures", "Quais são as características marcantes?", "textarea")
      ]
    },
    {
      id: "memory",
      title: "Memória e regras da IA",
      description: "Campos de alta prioridade para impedir contradições e metagaming.",
      fields: [
        field("immutableFacts", "Quais fatos são imutáveis sem um evento explícito?", "tags", { placeholder: "Nome, parentesco, nacionalidade, profissão, história anterior..." }),
        field("currentState", "Qual é o estado atual que pode evoluir?", "tags", { placeholder: "Sentimento, confiança, ciúmes, conflito, emprego, clube..." }),
        field("secrets", "Quais segredos verdadeiros pertencem a este personagem?", "tags"),
        field("individualKnowledge", "Qual é o conhecimento individual adicional deste personagem?", "tags"),
        field("characterRules", "Existe alguma regra sobre esse personagem que a IA nunca deve contradizer?", "textarea", { large: true, help: "Este campo recebe prioridade alta no contexto da IA." }),
        field("openInformation", "Existe alguma informação que você prefere NÃO definir ainda?", "textarea", { large: true, help: "Será tratada como NÃO DEFINIDO / EM ABERTO. A IA não deve inventar uma resposta definitiva." })
      ]
    },
    {
      id: "free",
      title: "Descrição livre final",
      description: "Qualquer detalhe que ainda não apareceu nas perguntas.",
      fields: [
        field("freeDescription", "Existe mais alguma coisa que a IA precisa saber para interpretar esse personagem corretamente?", "textarea", { large: true, quick: true, required: true, help: "Personalidade, comportamento, acontecimentos, relações, segredos, limites ou qualquer outro detalhe." }),
        field("finalAISummary", "Resumo objetivo usado pela IA", "summary")
      ]
    }
  ];

  var categorySections = {
    friends: [{
      id: "friends",
      title: "Amizade",
      description: "Dinâmica específica entre amigos.",
      fields: [
        field("friendshipType", "Que tipo de amizade eles possuem?", "combo", { options: ["Melhores amigos", "Amigos próximos", "Amigos de infância", "Amigos recentes", "Amigos do futebol", "Amigos fora do futebol", "Relação quase de irmãos", "Amizade complicada", "Amigos com rivalidade", "Outro"] }),
        field("initiatesContact", "Quem normalmente procura quem primeiro?", "select", { options: ["O jogador", "O amigo", "Os dois igualmente", "Depende"] }),
        field("supportMethods", "Como esse amigo costuma apoiar o jogador?", "multi", { custom: true, options: ["Conversando", "Dando conselhos", "Fazendo piadas", "Defendendo publicamente", "Ajudando profissionalmente", "Ajudando emocionalmente", "Fazendo companhia", "Sendo brutalmente sincero"] }),
        field("confrontationFrequency", "Ele confronta o jogador quando acha que ele está errado?", "select", { options: ["Sempre", "Frequentemente", "Às vezes", "Quase nunca", "Nunca"] }),
        field("competitionLevel", "Existe competição entre eles?", "select", { options: ["Não", "Competição saudável", "Competição forte", "Rivalidade escondida", "Rivalidade aberta"] }),
        field("envyLevel", "Esse amigo sente inveja do jogador em alguma área?", "select", { options: ["Não", "Talvez", "Sim"] }),
        field("envyDescription", "Em qual área existe inveja?", "textarea", { when: { key: "envyLevel", oneOf: ["Talvez", "Sim"] } }),
        field("successReaction", "Como esse amigo reage ao sucesso do jogador?", "textarea"),
        field("badPhaseReaction", "Como reage quando o jogador está em uma fase ruim?", "textarea"),
        field("traditions", "Eles possuem alguma piada interna, costume ou tradição?", "textarea"),
        field("conversationTopics", "Sobre quais assuntos eles costumam conversar?", "multi", { custom: true, options: ["Futebol", "Relacionamentos", "Dinheiro", "Vida pessoal", "Jogos", "Música", "Festas", "Família", "Trabalho", "Fofocas", "Sonhos", "Problemas pessoais"] })
      ]
    }],
    romance: [{
      id: "romance",
      title: "Relacionamento / romance",
      description: "Afeto, exposição, ciúmes, conflitos e futuro.",
      fields: [
        field("romanceStatus", "Qual é o status atual da relação?", "combo", { options: ["Interesse amoroso", "Ficando", "Namorando", "Noivos", "Casados", "Relação secreta", "Relacionamento aberto", "Separados temporariamente", "Ex", "Relação indefinida", "Outro"] }),
        field("firstInterest", "Quem se interessou primeiro?", "select", { options: ["O jogador", "O personagem", "Os dois", "Não está claro"] }),
        field("romanceBeginning", "Como eles começaram a se envolver romanticamente?", "textarea"),
        field("loveExpression", "Como esse personagem demonstra amor pelo jogador?", "textarea"),
        field("jealousyLevel", "Quanto esse personagem é ciumento?", "range", { min: 0, max: 5, labels: ["Nada", "Muito pouco", "Pouco", "Moderado", "Bastante", "Extremamente"] }),
        field("jealousyTriggers", "O que costuma provocar ciúmes nesse personagem?", "textarea"),
        field("jealousyBehavior", "Como ele demonstra ciúmes?", "textarea"),
        field("reassuranceNeed", "Quanto ele precisa de carinho ou reafirmação?", "range", { min: 0, max: 5, labels: ["Nada", "Muito pouco", "Pouco", "Moderado", "Bastante", "Extremamente"] }),
        field("ignoredReaction", "Como ele reage quando sente que está sendo ignorado?", "textarea"),
        field("footballScheduleReaction", "Como ele reage quando o jogador está ocupado com futebol?", "textarea"),
        field("fameHandling", "Como ele lida com a fama do jogador?", "select", { options: ["Adora", "Lida bem", "É indiferente", "Às vezes se incomoda", "Tem dificuldades", "Odeia a exposição", "Tem medo da atenção pública"] }),
        field("publicRelationship", "A relação é pública?", "select", { options: ["Sim", "Não", "Parcialmente", "Apenas pessoas próximas sabem", "Existem rumores"] }),
        field("publicBehavior", "Como ele se comporta em público com o jogador?", "textarea"),
        field("privateBehavior", "Como ele se comporta quando estão sozinhos?", "textarea"),
        field("relationshipConflicts", "Quais são os maiores conflitos do relacionamento?", "textarea"),
        field("breakupCause", "O que faria esse personagem terminar a relação?", "textarea"),
        field("unforgivable", "O que esse personagem jamais perdoaria?", "textarea"),
        field("futureTogether", "Esse personagem pensa em um futuro com o jogador?", "select", { options: ["Não", "Ainda não", "Talvez", "Sim", "Definitivamente"] }),
        field("futureDescription", "Como seria esse futuro?", "textarea"),
        field("relationshipThreat", "Existe alguma pessoa que ele considera uma ameaça ao relacionamento?", "text"),
        field("relationshipSecret", "Existe alguma informação sobre a relação que precisa permanecer em segredo?", "textarea")
      ]
    }],
    professional: [{
      id: "professional",
      title: "Relação profissional",
      description: "Função, autoridade, confiança e interesses próprios.",
      fields: [
        field("professionRole", "Qual é a profissão/função desse personagem?", "combo", { options: ["Empresário/agente", "Técnico", "Auxiliar técnico", "Preparador físico", "Fisioterapeuta", "Médico", "Psicólogo esportivo", "Nutricionista", "Analista de desempenho", "Scout/olheiro", "Diretor esportivo", "Presidente", "Assessor de imprensa", "Relações públicas", "Advogado", "Contador", "Segurança", "Motorista", "Personal trainer", "Executivo de patrocinador", "Jornalista", "Outro"] }),
        field("organization", "Para qual organização ele trabalha?", "text"),
        field("careerFunction", "Qual é exatamente a função dele na carreira do jogador?", "textarea"),
        field("workingDuration", "Há quanto tempo trabalham juntos?", "text"),
        field("professionalBeginning", "Como começou essa relação profissional?", "textarea"),
        field("trustLevel", "Qual é o nível de confiança entre eles?", "range", { min: 1, max: 5, labels: ["Muito baixo", "Baixo", "Médio", "Alto", "Muito alto"] }),
        field("decisionAuthority", "Ele possui autoridade para tomar decisões pelo jogador?", "select", { options: ["Não", "Apenas aconselha", "Algumas decisões", "Muitas decisões", "Sim, dentro da área profissional dele"] }),
        field("adviceTopics", "Em quais assuntos ele costuma aconselhar o jogador?", "multi", { custom: true, options: ["Futebol", "Transferências", "Contratos", "Dinheiro", "Patrocínios", "Imagem pública", "Imprensa", "Treinamento", "Saúde", "Recuperação", "Vida pessoal", "Segurança", "Redes sociais"] }),
        field("ignoredAdviceReaction", "Como ele reage quando o jogador ignora seus conselhos?", "textarea"),
        field("playerVsResults", "Ele prioriza mais o jogador ou os resultados profissionais?", "range", { min: 1, max: 5, labels: ["Totalmente resultados", "Mais resultados", "Equilibrado", "Mais o jogador", "Totalmente jogador"] }),
        field("honestyFrequency", "Ele é sincero mesmo quando a verdade vai incomodar?", "select", { options: ["Sempre", "Frequentemente", "Às vezes", "Raramente", "Nunca"] }),
        field("conflictOfInterest", "Existe algum conflito de interesse?", "select", { options: ["Não", "Sim", "Possivelmente"] }),
        field("conflictOfInterestDescription", "Descreva o possível conflito de interesse.", "textarea", { when: { key: "conflictOfInterest", oneOf: ["Sim", "Possivelmente"] } }),
        field("confidentialProfessionalInfo", "Existe alguma informação profissional confidencial que ele conhece?", "textarea"),
        field("professionalGoal", "Qual é o principal objetivo profissional desse personagem?", "textarea")
      ]
    }],
    team: [{
      id: "team",
      title: "Companheiro de time",
      description: "Papel no elenco e dinâmica dentro e fora de campo.",
      fields: [
        field("teamClub", "Em qual time esse personagem joga com o seu jogador?", "combo", { source: "clubs" }),
        field("position", "Qual é a posição dele?", "combo", { options: positions }),
        field("shirtNumber", "Qual número de camisa ele usa?", "number", { min: 1, max: 99 }),
        field("squadRole", "Qual é o papel dele dentro do elenco?", "combo", { options: ["Capitão", "Vice-capitão", "Líder do elenco", "Titular importante", "Titular", "Rotação", "Reserva", "Jovem promessa", "Veterano", "Recém-chegado", "Outro"] }),
        field("onFieldRelationship", "Como é a relação dele com o jogador dentro de campo?", "select", { options: ["Excelente entrosamento", "Boa", "Normal", "Competitiva", "Rivalidade saudável", "Rivalidade forte", "Conflituosa", "Ruim"] }),
        field("offFieldRelationship", "Como é a relação fora de campo?", "select", { options: ["Excelente entrosamento", "Boa", "Normal", "Competitiva", "Rivalidade saudável", "Rivalidade forte", "Conflituosa", "Ruim"] }),
        field("competePosition", "Eles disputam posição?", "select", { options: ["Não", "Sim", "Às vezes, dependendo da formação"] }),
        field("spotlightCompetition", "Existe competição por protagonismo?", "select", { options: ["Não", "Pouca", "Moderada", "Forte", "É uma rivalidade importante"] }),
        field("mediaAttentionReaction", "Como ele reage quando o protagonista recebe mais atenção da imprensa?", "textarea"),
        field("poorPerformanceReaction", "Como ele reage quando o protagonista joga mal?", "textarea"),
        field("decisivePerformanceReaction", "Como ele reage quando o protagonista decide uma partida?", "textarea"),
        field("onFieldCombination", "Eles possuem alguma combinação ou característica especial dentro de campo?", "textarea"),
        field("decisiveTrust", "Ele confia no jogador durante partidas decisivas?", "range", { min: 1, max: 5, labels: ["Não confia", "Confia pouco", "Confiança média", "Confia bastante", "Confia totalmente"] }),
        field("lockerRoomBehavior", "Como esse personagem se comporta no vestiário?", "combo", { options: ["Líder", "Motivador", "Engraçado", "Quieto", "Provocador", "Conciliador", "Competitivo", "Reclama bastante", "Observador", "Mentor dos jovens", "Outro"] }),
        field("closeTeammates", "Com quais outros jogadores do elenco ele é mais próximo?", "tags"),
        field("teamConflicts", "Existe alguém no elenco com quem ele não se dá bem?", "tags", { placeholder: "Um nome por linha ou Ninguém" }),
        field("seasonGoal", "Qual é o principal objetivo dele nesta temporada?", "textarea")
      ]
    }]
  };

  window.INYFFX_CHARACTER_SCHEMA = {
    categories: [
      { key: "friends", label: "AMIGOS", singular: "Amigo(a)" },
      { key: "romance", label: "NAMORADAS", singular: "Relacionamento" },
      { key: "professional", label: "PROFISSIONAL", singular: "Profissional" },
      { key: "team", label: "TIME", singular: "Companheiro(a) de time" }
    ],
    commonSections: commonSections,
    categorySections: categorySections,
    quickKeys: ["approximateAge", "relationshipCurrent", "personalityTraits", "speechStyle", "howMet", "viewOfPlayer", "knownFacts", "unknownFacts", "currentGoal", "freeDescription"],
    parseLineup: parseLineup
  };
}());
