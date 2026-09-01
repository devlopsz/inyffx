const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const failures = [];
const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function check(condition, message) {
  checks.push(message);
  if (!condition) failures.push(message);
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function normalizePrompt(value) {
  return String(value || "").replace(/[ \t]+$/gm, "").trim();
}

const requiredFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "registration-data.js",
  "character-data.js",
  "assets/config.js",
  "mod/pics/logo-inyffx.png",
  "mod/pics/login/inyffx-background-initial.png",
  "mod/pics/login/soccer-ball-button.svg",
  "mod/pics/favicon.ico",
  "mod/pics/icons/engrenagem.svg",
  "mod/pics/icons/profile.svg",
  "mod/pics/icons/novo dia.svg",
  "mod/pics/icons/mais.svg",
  "mod/pics/icons/partida.svg",
  "mod/pics/icons/roleta.svg",
  "mod/pics/icons/dado.svg",
  "mod/pics/fyxnews/manchete_1.jpg",
  "mod/pics/fyxnews/manchete_6.jpg",
  "mod/pics/fyxnews/sociais/iphone.png",
  "assets/fonts/fyxnews/news-701-bt.ttf",
  "assets/fonts/fyxnews/SourceSansPro-Regular.ttf",
  "assets/fonts/fyxnews/SourceSansPro-Black.ttf",
  "mod/prompt partidas para o usuario copiar.txt",
  "mod/prompt the sims para o usuario copiar.txt",
  "mod/prompt the sims EXEMPLO.txt"
];

requiredFiles.forEach((file) => check(fileExists(file), `arquivo obrigatório presente: ${file}`));

const html = read("index.html");
const manifest = JSON.parse(read("manifest.webmanifest"));
const css = read("styles.css");
const app = read("app.js");
const registrationSource = read("registration-data.js");
const characterSource = read("character-data.js");
const combinedSource = [html, css, app, registrationSource, characterSource].join("\n");

check(!/Cruyff Sans Mono|font-family\s*:\s*[^;]*\bmono\b/i.test(combinedSource), "nenhuma fonte mono é usada na interface");
check(/font-family:\s*"Cruyff Sans"/i.test(css), "Cruyff Sans é a família visual da interface");
check(html.includes("mod/pics/login/inyffx-background-initial.png") || css.includes("mod/pics/login/inyffx-background-initial.png"), "login usa o fundo fornecido");
check(html.includes("mod/pics/login/soccer-ball-button.svg"), "login usa a bola fornecida no botão");
check(html.includes('href="mod/pics/favicon.ico"'), "favicon oficial do InyffX está configurado");
check((html.match(/mod\/pics\/logo-inyffx\.png/g) || []).length >= 3, "logo do InyffX aparece no login, cadastro e hub");

const htmlIds = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = htmlIds.filter((id, index) => htmlIds.indexOf(id) !== index);
check(duplicateIds.length === 0, "o HTML não contém IDs duplicados");
const cacheBlock = (app.match(/function cacheElements\(\) \{([\s\S]*?)\.forEach\(function \(id\)/) || [])[1] || "";
const cachedIds = [...cacheBlock.matchAll(/"([A-Za-z][A-Za-z0-9]+)"/g)].map((match) => match[1]);
const missingCachedIds = cachedIds.filter((id) => !htmlIds.includes(id));
check(cachedIds.length > 70 && missingCachedIds.length === 0, "todos os elementos usados pela aplicação existem no HTML");
const elementReferences = [...app.matchAll(/\bel\.([A-Za-z][A-Za-z0-9]*)/g)].map((match) => match[1]);
const uncachedReferences = [...new Set(elementReferences.filter((id) => !cachedIds.includes(id)))];
check(uncachedReferences.length === 0, "todas as referências de interface são inicializadas no cache");

const routes = ["home", "kick-off", "fyx-news", "relationships", "seasons", "player-career", "off-the-pitch"];
routes.forEach((route) => check(app.includes(`"${route}"`), `rota registrada: ${route}`));
["kick-off", "fyx-news", "relationships", "seasons", "player-career", "off-the-pitch"].forEach((route) => {
  check(html.includes(`data-route="${route}"`) && html.includes(`data-page="${route}"`), `menu e página disponíveis: ${route}`);
});
check(css.includes(".app-shell.is-page-open .hub-sidebar") && css.includes("visibility: hidden"), "páginas internas ocultam o menu e ocupam a tela");
check(html.includes('id="pageBack"') && html.includes('aria-label="Voltar para a página inicial"'), "páginas internas têm seta de voltar");
check(html.includes('id="openSettings"') && html.includes('id="openProfile"'), "engrenagem e perfil ficam disponíveis no hub");
check(html.includes('id="profilePage"') && html.includes('id="profileContent"'), "perfil abre em uma página dedicada");
check(app.includes("profileRevision") && app.includes("profileChangeHistory") && app.includes("buildBackendContext"), "edições do jogador entram no histórico e no contexto da IA");

const backgrounds = {
  "kick-off": "kick-off.jpg",
  "fyx-news": "fyx-news.jpeg",
  relationships: "relationships.jpg",
  seasons: "seasons.jpg",
  "player-career": "player-career.jpg",
  "off-the-pitch": "off-the-pitch.webp"
};
Object.entries(backgrounds).forEach(([route, file]) => {
  check(fileExists(`mod/pics/background/${file}`), `fundo do hub presente: ${file}`);
  check(app.includes(`mod/pics/background/${file}`) && html.includes(`data-hub-preview="${route}"`), `fundo do hub ligado ao hover de ${route}`);
});
check(!app.includes("advanceHubBackground") && !app.includes("backgroundTimer"), "slideshow automático dos fundos foi removido");
check(!html.includes("background-upload") && !app.includes("importBackground"), "personalização manual do fundo foi removida");

const sandbox = { window: {} };
vm.runInNewContext(registrationSource, sandbox, { filename: "registration-data.js" });
const questions = sandbox.window.INYFFX_REGISTRATION_QUESTIONS;
const referenceData = sandbox.window.INYFFX_REFERENCE_DATA;
check(Array.isArray(questions) && questions.length >= 52, "cadastro possui o fluxo completo de perguntas individuais");
check(questions.slice(0, 3).map((question) => question.key).join(",") === "username,password,confirmPassword", "cadastro começa por usuário, senha e confirmação");

const questionKeys = new Set(questions.map((question) => question.key));
check(!questionKeys.has("gameTitle") && !questionKeys.has("platform"), "cadastro não pergunta jogo ou plataforma");
check(!app.includes("profile.gameTitle") && !app.includes("profile.platform"), "perfil também não expõe jogo ou plataforma antigos");
[
  "playerName", "shirtName", "birthDate", "primaryNationality", "secondNationality", "thirdNationality",
  "birthCountry", "birthCity", "currentCountry", "currentCity", "languages", "footballStatus", "currentClub",
  "league", "isLoaned", "rightsClub", "loanClub", "squadCategory", "shirtNumber", "competitiveYears", "position",
  "secondaryPositions", "dominantFoot", "height", "weight", "preferredNumber", "playStyle", "technicalStrengths",
  "mentalStrengths", "physicalStrengths", "weaknesses", "specialTraits", "setPieces", "footballStart", "formativeClub",
  "professionalDebutYear", "nationalTeamStatus", "nationalTeam", "titles", "awards", "injuryHistory", "injuryDetails",
  "personality", "careerAmbition", "nextSeasonGoal", "dreamClub", "inspirations", "rival", "backstory",
  "goalCelebration", "goalCelebrationDetails", "avatarData", "confirmed"
].forEach((key) => check(questionKeys.has(key), `pergunta implementada: ${key}`));

const autocompleteQuestions = questions.filter((question) => question.type === "autocomplete");
check(autocompleteQuestions.length >= 10 && autocompleteQuestions.every((question) => question.manualAllowed), "campos reais usam autocomplete com fallback manual explícito");
check(referenceData.countries.length >= 40 && referenceData.cities.length >= 35 && referenceData.clubs.length >= 35 && referenceData.leagues.length >= 15, "cadastro inclui sugestões reais iniciais de países, cidades, clubes e ligas");
check(app.includes("Essa opção não foi encontrada ou não existe."), "aviso obrigatório para opção não encontrada foi implementado");
check(app.includes("Seguir mesmo assim"), "fallback Seguir mesmo assim foi implementado");
check(app.includes("calculateAge"), "idade é calculada automaticamente pela data de nascimento");
check(app.includes("is-ultra-dense") && css.includes("overflow: hidden"), "cadastro adapta alternativas densas sem rolagem da página");

vm.runInNewContext(characterSource, sandbox, { filename: "character-data.js" });
const characterSchema = sandbox.window.INYFFX_CHARACTER_SCHEMA;
const characterFields = [
  ...characterSchema.commonSections.flatMap((section) => section.fields),
  ...Object.values(characterSchema.categorySections).flatMap((sections) => sections.flatMap((section) => section.fields))
];
const characterFieldKeys = new Set(characterFields.map((field) => field.key));
check(characterSchema.categories.map((category) => category.key).join(",") === "friends,romance,professional,team", "Relationships separa AMIGOS, NAMORADAS, PROFISSIONAL e TIME");
[
  "displayName", "birthDate", "noExactBirthDate", "approximateAge", "nationality", "birthCountry", "birthCity", "currentCountry", "currentCity", "gender", "languages",
  "personalityTraits", "personalityDescription", "greatestQuality", "greatestFlaw", "likes", "dislikes", "angerTriggers", "happinessTriggers", "insecurities", "fears", "angerReaction", "affectionStyle", "concernReaction",
  "speechStyle", "accentSlang", "samplePhrases", "frequentExpressions", "speechNoGos", "howMet", "knownDuration", "relationshipCurrent", "viewOfPlayer", "admiresPlayer", "botheredByPlayer", "wantsPlayerToChange", "neverDoToPlayer",
  "knowledgeLevel", "knownFacts", "unknownFacts", "hasSecret", "secret", "secretKnownBy", "playerSecretKnowledge", "currentGoal", "longTermGoal", "independentLife", "importantPeople", "characterLinks",
  "importantEvents", "bestRelationshipMoment", "worstRelationshipMoment", "hasUnresolvedConflict", "unresolvedConflictDescription", "appearanceDescription", "height", "build", "hair", "eyes", "clothingStyle", "tattoos", "accessories", "distinctiveFeatures",
  "immutableFacts", "currentState", "secrets", "individualKnowledge", "characterRules", "openInformation", "freeDescription", "finalAISummary",
  "friendshipType", "initiatesContact", "supportMethods", "confrontationFrequency", "competitionLevel", "envyLevel", "envyDescription", "successReaction", "badPhaseReaction", "traditions", "conversationTopics",
  "romanceStatus", "firstInterest", "romanceBeginning", "loveExpression", "jealousyLevel", "jealousyTriggers", "jealousyBehavior", "reassuranceNeed", "ignoredReaction", "footballScheduleReaction", "fameHandling", "publicRelationship", "publicBehavior", "privateBehavior", "relationshipConflicts", "breakupCause", "unforgivable", "futureTogether", "futureDescription", "relationshipThreat", "relationshipSecret",
  "professionRole", "organization", "careerFunction", "workingDuration", "professionalBeginning", "trustLevel", "decisionAuthority", "adviceTopics", "ignoredAdviceReaction", "playerVsResults", "honestyFrequency", "conflictOfInterest", "conflictOfInterestDescription", "confidentialProfessionalInfo", "professionalGoal",
  "teamClub", "position", "shirtNumber", "squadRole", "onFieldRelationship", "offFieldRelationship", "competePosition", "spotlightCompetition", "mediaAttentionReaction", "poorPerformanceReaction", "decisivePerformanceReaction", "onFieldCombination", "decisiveTrust", "lockerRoomBehavior", "closeTeammates", "teamConflicts", "seasonGoal"
].forEach((key) => check(characterFieldKeys.has(key), `campo completo de personagem: ${key}`));
check(characterSchema.quickKeys.length === 10 && characterSchema.quickKeys.every((key) => characterFieldKeys.has(key)), "cadastro rápido cobre as 12 informações essenciais com nome e categoria");
check(html.includes('id="relationshipTabs"') && (html.match(/data-relationship-category=/g) || []).length === 4, "Relationships usa quatro abas no padrão visual do FYX NEWS");
check(html.includes('id="characterAvatarInput"') && html.includes('id="characterBannerInput"') && html.includes('id="characterModeTabs"'), "fichas permitem avatar, banner e cadastro rápido ou completo");
check(html.includes('id="characterImageEditor"') && html.includes('id="characterCropCanvas"') && html.includes('id="characterCropZoom"'), "avatar e banner abrem editor de enquadramento com zoom");
check(!html.includes("ENQUADRAMENTO") && !html.includes("AJUSTAR FOTO DE PERFIL") && !html.includes("characterImageEditorDescription"), "ajuste de imagem não exibe cabeçalho ou descrição");
check(html.includes('id="resetCharacterCrop"') && html.includes('id="cancelCharacterCrop"') && html.includes('id="applyCharacterCrop"'), "ações de centralizar, cancelar e aplicar permanecem disponíveis");
check(app.includes("openCharacterImageEditor") && app.includes("beginCharacterCropDrag") && app.includes("applyCharacterCrop"), "editor permite reposicionar e aplicar o recorte antes de salvar");
check(app.includes('el.characterCropCanvas.width = isAvatar ? 640 : 1440') && app.includes('el.characterCropCanvas.height = isAvatar ? 640 : 630'), "recortes preservam formatos próprios de perfil e banner");
check(css.includes(".character-image-editor.is-avatar .character-crop-stage") && css.includes("touch-action: none"), "enquadramento funciona em formato circular e por toque");
check(app.includes("importTeamFromLineup") && app.includes('category: "team"') && characterSource.includes("positionLabels"), "elenco do modelo de partida alimenta automaticamente a categoria TIME");
const parsedLineup = characterSchema.parseLineup("Formação: GO - Robert Sánchez\nLD - Reece James, ZC - Colwill, ZC - Fofana, LE - Cucurella\nVOL - Moisés Caicedo\nMAT - Palmer\nPD - Pedro Neto, CA - Caio QA, PE - Estêvão");
check(parsedLineup.length === 10 && parsedLineup[0].position === "Goleiro" && parsedLineup.at(-1).name === "Estêvão", "parser do elenco reconhece nomes, posições e linhas agrupadas do modelo de partida");
check(app.includes("characterContextRecord") && !/characterContextRecord[\s\S]{0,900}avatarData/.test(app), "memória envia a ficha para a IA sem incluir imagens em base64");
check(css.includes(".relationship-tabs") && css.includes(".character-editor") && css.includes(".character-card") === false, "Relationships possui layout clean próprio e editor em tela inteira");

check(html.includes('id="chatHistoryList"') && app.includes("createCareerChat") && app.includes("selectChatFromHistory"), "KICK OFF mantém conversas separadas por Novo Dia");
check(html.includes('id="kickToolsMenu"') && html.includes('data-open-tool="match"') && html.includes('data-open-tool="wheel"') && html.includes('data-open-tool="dice"'), "menu de ferramentas do KICK OFF contém os três cards");
check(app.includes("data-expand-message") && app.includes("isLongUserMessage"), "mensagens longas do usuário oferecem Mostrar Mais");
check(!app.includes("chat-message__meta"), "mensagens do KICK OFF não exibem nomes de autor");
check(html.includes('id="hubBackgroundB"') && app.includes("hubBackgroundVisible") && /transition:\s*opacity\s+520ms/i.test(css), "fundos do hub usam duas camadas com transição fade");
check(app.includes("--composer-radius") && app.includes("is-multiline") && css.includes(".kick-composer-dock::before"), "composer reduz a curvatura e cria fade antes da área de digitação");
check(css.includes(".chat-messages::-webkit-scrollbar") && css.includes("overflow-x: hidden"), "KICK OFF usa rolagem minimalista sem barra horizontal");
check(css.includes("width: 100vw") && css.includes("--composer-clearance: 280px"), "rolagem fica no canto da tela e preserva espaço antes do composer");
check(css.includes(".kick-composer-dock::after") && /height:\s*clamp\(170px,\s*25vh,\s*280px\)/i.test(css), "área sob o composer fica opaca e o fade de leitura é gradual");
check(css.includes("@keyframes kick-new-day-shine"), "Novo Dia recebe animação de brilho no hover");
check(html.includes('class="tool-icon-action"') && html.includes('data-tooltip="Copiar modelo"') && html.includes('data-tooltip="Rolar dado"'), "ferramentas usam ações circulares com tooltips");
check(html.includes('<h2 id="toolTitle">Prompt de Partida</h2>') && !html.includes("<span>FERRAMENTA</span>"), "drawer exibe somente o nome da ferramenta no topo");
check(app.includes("data-wheel-weight-index") && app.includes("formatWheelPercentage") && app.includes("totalWeight"), "roleta aceita ponderação e calcula percentuais");
check(!html.includes('id="useWheelResult"') && !html.includes('id="useDiceResult"'), "roleta e dados não oferecem envio automático do resultado ao chat");
check(/--accent:\s*#ffffff/i.test(css) && !/216\s*,\s*255\s*,\s*79|#d8ff4f|#65e6a8/i.test(css), "destaques verdes foram removidos da interface");
check(html.includes('data-news-filter="headline">FYX NEWS') && html.includes('data-news-filter="social">REDES SOCIAIS') && html.includes('data-news-filter="gossip">FOFOCAS'), "FYX NEWS usa as três seções do layout de referência");
check(app.includes("renderNewsFrontPage") && app.includes("renderNewsSocialBoard") && app.includes("FYX_NEWS_IMAGES"), "FYX NEWS possui capa editorial, redes sociais, fofocas e imagens alternadas");
check(css.includes('"FYX News 701"') && css.includes('"FYX Source Sans"') && css.includes(".fyx-paper__masthead") && css.includes(".fyx-social-board"), "fontes e estruturas visuais exclusivas do FYX NEWS foram aplicadas");
check(/\.fyx-paper,\s*\.fyx-paper \*\s*\{[^}]*FYX Source Sans/s.test(css) && !/\.page--fyx-news,\s*\.page--fyx-news \*\s*\{[^}]*FYX Source Sans/s.test(css), "fontes editoriais ficam restritas ao jornal; redes sociais e fofocas mantêm Cruyff Sans");
check(html.includes("<title>InyffX</title>") && manifest.name === "InyffX" && manifest.short_name === "InyffX", "nome público do site é somente InyffX");
check(/\.fyx-social-phone\s*\{[^}]*margin:\s*-14px 22px -14px 0;/s.test(css) && !css.includes("margin: -18px -13% -18px 0"), "celular possui espaço próprio e não invade o feed social");
check(css.includes("@media (max-width: 1040px) and (min-width: 821px)") && /\.fyx-today article strong\s*\{[^}]*-webkit-line-clamp:\s*2;/s.test(css), "painel social preserva largura e leitura em telas menores");

const matchPrompt = normalizePrompt(read("mod/prompt partidas para o usuario copiar.txt"));
const matchTemplate = (html.match(/<pre id="matchPromptTemplate">([\s\S]*?)<\/pre>/) || [])[1];
check(Boolean(matchTemplate) && normalizePrompt(matchTemplate) === matchPrompt, "modelo de partida usa exatamente o arquivo fornecido");
const offPitchPrompt = normalizePrompt(read("mod/prompt the sims para o usuario copiar.txt"));
const offPitchTemplate = (html.match(/<pre id="offPitchTemplate">([\s\S]*?)<\/pre>/) || [])[1];
check(Boolean(offPitchTemplate) && normalizePrompt(offPitchTemplate) === offPitchPrompt, "modelo OFF THE PITCH usa exatamente o arquivo fornecido");
check(html.includes("prompt%20the%20sims%20EXEMPLO.txt") && html.includes("BAIXAR EXEMPLO"), "exemplo OFF THE PITCH está disponível para download");

check(html.indexOf('src="registration-data.js"') < html.indexOf('src="app.js'), "dados do cadastro carregam antes da aplicação");
check(html.indexOf('src="character-data.js"') < html.indexOf('src="app.js'), "ficha completa de personagens carrega antes da aplicação");
check(app.includes("Cloudflare Workers AI") && html.includes("Qwen3 30B A3B"), "integração gratuita de IA continua configurada");

new Function(app);
new Function(registrationSource);
new Function(characterSource);
check(true, "JavaScript principal, cadastro e fichas de personagem compilam sem erro de sintaxe");

const report = {
  passed: checks.length - failures.length,
  total: checks.length,
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
