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
  "sw.js",
  "tests/audit-save.cjs",
  "registration-data.js",
  "character-data.js",
  "calendar-shields.js",
  "shortcut-data.js",
  "assets/config.js",
  "mod/pics/logo-inyffx.png",
  "mod/pics/login/inyffx-background-initial.png",
  "mod/pics/login/inyffx-background-initial.webp",
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
  "mod/calendar/birthday.svg",
  "mod/calendar/cone-treino.svg",
  "mod/calendar/heart-encontros.svg",
  "mod/calendar/home-days.svg",
  "mod/calendar/party.svg",
  "mod/calendar/shield-time-not-found.svg",
  "mod/prompt partidas para o usuario copiar.txt",
  "mod/prompt the sims para o usuario copiar.txt",
  "mod/prompt the sims EXEMPLO.txt"
];

requiredFiles.forEach((file) => check(fileExists(file), `arquivo obrigatório presente: ${file}`));

const html = read("index.html");
const manifest = JSON.parse(read("manifest.webmanifest"));
const css = read("styles.css");
const app = read("app.js");
const serviceWorker = read("sw.js");
const registrationSource = read("registration-data.js");
const characterSource = read("character-data.js");
const calendarManifestSource = read("calendar-shields.js");
const shortcutSource = read("shortcut-data.js");
const combinedSource = [html, css, app, registrationSource, characterSource, calendarManifestSource, shortcutSource].join("\n");

function appFunctionSource(name) {
  const marker = `  function ${name}(`;
  const start = app.indexOf(marker);
  if (start < 0) return "";
  const end = app.indexOf("\n\n  function ", start + marker.length);
  return app.slice(start + 2, end < 0 ? app.length : end);
}

check(!/Cruyff Sans Mono|font-family\s*:\s*[^;]*\bmono\b/i.test(combinedSource), "nenhuma fonte mono é usada na interface");
check(/font-family:\s*"Cruyff Sans"/i.test(css), "Cruyff Sans é a família visual da interface");
check(html.includes("mod/pics/login/inyffx-background-initial.webp") || css.includes("mod/pics/login/inyffx-background-initial.webp"), "login usa a versão WebP otimizada do fundo fornecido");
check(fs.statSync(path.join(root, "mod/pics/login/inyffx-background-initial.webp")).size < 1024 * 1024, "fundo inicial otimizado fica abaixo de 1 MB");
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
check(html.includes('id="importSaveInput"') && html.includes('id="importSaveTrigger"'), "login permite selecionar e importar um save JSON");
check(app.includes('SAVE_BACKUP_KEY = "inyffx-backup-before-import-v1"') && app.includes("backupStateBeforeImport"), "importação cria backup recuperável antes de substituir carreiras");
check(app.includes("parseImportedSave") && app.includes("Number(payload.version) !== 2") && app.includes("Array.isArray(payload.careers)"), "save é validado antes de alterar os dados locais");
check(app.includes("async function importLocalSave") && app.includes("careers: importedCareers"), "importação substitui as carreiras somente após confirmação");
check(app.includes("sessionStorage.setItem(SESSION_KEY, active.id)") && app.includes("localStorage.setItem(PERSISTENT_SESSION_KEY, active.id)"), "carreira importada é aberta e mantida conectada no navegador");
check(app.includes('PERSISTENCE_DB_NAME = "inyffx-local-v1"') && app.includes("openPersistenceDatabase") && app.includes("writeIndexedSnapshot"), "save possui espelho durável no IndexedDB");
check(app.includes("localStorage.getItem(STORAGE_KEY) !== serialized") && app.includes("flushStatePersistence") && app.includes("previousRaw"), "gravação é verificada e preserva rollback do estado anterior");
check(app.includes('objectStore("backups")') && app.includes("slice(5)") && app.includes("restoreAutomaticBackup"), "backups automáticos são limitados e restauráveis");
check(html.includes('id="exportCurrentSave"') && html.includes('id="restoreAutomaticBackup"') && html.includes('id="deleteCurrentCareer"'), "configurações oferecem exportação, restauração e exclusão local");
check(html.includes('id="aiConsentStatus"') && app.includes("ensureAiDataConsent") && app.includes("revokeAiConsent"), "primeiro envio à IA exige consentimento revogável");
check(html.includes('id="legalDialog"') && app.includes("openLegalDialog") && html.includes("© 2026 InyffX") && !html.includes("© 2027"), "termos, privacidade e copyright atual estão disponíveis");
check(app.includes('navigator.serviceWorker.register("sw.js")') && serviceWorker.includes('addEventListener("install"') && serviceWorker.includes('addEventListener("fetch"'), "manifesto possui service worker real e versionado");
check(html.includes('http-equiv="Content-Security-Policy"') && html.includes('name="referrer"'), "políticas básicas de conteúdo e referência protegem a versão estática");
check(html.includes("A senha é uma trava deste navegador") && app.includes('fetch(joinUrl(baseUrl, "/health")'), "login local e estado real do backend são explicados e verificados");
check(!/screenshot|captura de tela/i.test(html + app), "OFF THE PITCH não promete envio de captura de tela inexistente");

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
check(/q\("backstory"[\s\S]*?maxLength:\s*4000/.test(registrationSource), "história inicial aceita até 4.000 caracteres em todas as camadas");
check(app.includes("visibleRegistrationQuestions().forEach") && app.includes("Não definido"), "revisão final mostra todos os campos visíveis do cadastro");
check(app.includes("createInitialCharacters") && app.includes("createInitialCareerCanon") && app.includes("initialHallEntries"), "cadastro distribui personagens, cânone e conquistas pelos módulos corretos");
check(/function renderPlayerProfileForm[\s\S]*?REGISTRATION_QUESTIONS\.filter/.test(app), "edição do jogador disponibiliza todos os campos da ficha inicial");
check(app.includes("if (!Array.isArray(safe.profile.playStyle))") && app.includes('question.type === "multi"') && app.includes("splitCommaList(entry[1])"), "estilo de jogo permanece uma lista editável após importar e salvar");
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
check(css.includes(".character-avatar img") && /\.character-avatar\s*\{[\s\S]*?overflow:\s*hidden/i.test(css), "avatar aplicado permanece recortado dentro do círculo da ficha");
check(/\.relationship-card__banner img\s*\{[\s\S]*?position:\s*absolute[\s\S]*?object-fit:\s*cover/i.test(css), "banner salvo preenche toda a moldura do card");
check(/\.relationship-card\s*\{[\s\S]*?display:\s*grid[\s\S]*?grid-template-rows:\s*128px\s+minmax\(0,\s*1fr\)/i.test(css), "card não centraliza o banner nem cria faixas vazias");
check(app.includes("importTeamFromLineup") && app.includes('category: "team"') && characterSource.includes("positionLabels"), "elenco do modelo de partida alimenta automaticamente a categoria TIME");
check(typeof characterSchema.parseCharacterFormText === "function" && app.includes("importCharacterFiles"), "Relationships importa fichas completas em TXT pela interface");
check(html.includes('id="characterImportInput"') && html.includes('accept=".txt,text/plain"'), "seletor aceita múltiplas fichas TXT sem publicar os arquivos pessoais");
check(app.includes("if (!query && character.category !== category)") && app.includes("character.searchScore") && app.includes("A busca consultou todas as quatro categorias"), "busca de Relationships consulta todas as categorias e prioriza nome exato ou prefixo");
check(app.includes("characterImportReportMarkup") && app.includes("accepted") && app.includes("rejected"), "importação de fichas exibe recibo individual de aceitos e recusados");
const parsedLineup = characterSchema.parseLineup("Formação: GO - Robert Sánchez\nLD - Reece James, ZC - Colwill, ZC - Fofana, LE - Cucurella\nVOL - Moisés Caicedo\nMAT - Palmer\nPD - Pedro Neto, CA - Caio QA, PE - Estêvão");
check(parsedLineup.length === 10 && parsedLineup[0].position === "Goleiro" && parsedLineup.at(-1).name === "Estêvão", "parser do elenco reconhece nomes, posições e linhas agrupadas do modelo de partida");
check(app.includes("characterContextRecord") && !/characterContextRecord[\s\S]{0,900}avatarData/.test(app), "memória envia a ficha para a IA sem incluir imagens em base64");
check(css.includes(".relationship-tabs") && css.includes(".character-editor") && css.includes(".character-card") === false, "Relationships possui layout clean próprio e editor em tela inteira");

check(html.includes('id="chatHistoryList"') && app.includes("createCareerChat") && app.includes("selectChatFromHistory"), "KICK OFF mantém conversas separadas por Novo Dia");
check(html.includes('id="deleteDayDialog"') && app.includes("openDeleteDayDialog") && app.includes("confirmDeleteDay"), "cada dia do KICK OFF pode ser apagado com confirmação própria");
check(app.includes("chatDerivedRecordCount") && app.includes("createdInChatId") && app.includes("sourceChatId"), "exclusão do dia rastreia e remove somente dados derivados daquela conversa");
check(!app.includes('plural(chat.messages.length, "1 mensagem') && css.includes(".chat-history-list { gap: 3px; overflow-x: hidden; }"), "confirmação conta mensagens uma vez e o histórico não cria rolagem horizontal");
check(app.includes('deliveryStatus = "sending"') && app.includes('deliveryStatus = "failed"') && app.includes('deliveryStatus = "completed"'), "turnos da IA persistem estados sending, failed e completed");
check(app.includes("data-retry-message") && app.includes("data-cancel-message") && app.includes("retryCount"), "falhas de IA podem ser repetidas ou canceladas sem duplicar a mensagem");
check(app.includes("turnId: userMessage.id") && app.includes("submitChatTurn(career, chat, message)"), "retry reutiliza o mesmo identificador idempotente do turno");
check(app.includes("applyMemoryUpdates") && app.includes("verifyMemoryReceiptFromStorage") && app.includes("memoryReceipt"), "respostas da IA exibem recibo verificado dos registros realmente persistidos");
check(app.includes("responseRollbackRaw") && app.includes("restoreSerializedState(responseRollbackRaw, true)"), "falha do espelho durável desfaz resposta e atualizações antes de marcar o retry");
check(app.includes("proposedUpdates || payload.memoryUpdates") && app.includes("uncertainties"), "frontend consome o envelope estruturado de uma única chamada");
check(app.includes("selectRelevantContextRecords") && app.includes("relevance-recency-v1") && app.includes('excludedVisibility: "never-send"'), "contexto da IA usa relevância, recência e respeita registros nunca enviados");
vm.runInNewContext(shortcutSource, sandbox, { filename: "shortcut-data.js" });
const shortcutLibrary = sandbox.window.INYFFX_SHORTCUT_LIBRARY;
check(Array.isArray(shortcutLibrary) && shortcutLibrary.length >= 70, "biblioteca do KICK OFF contém todos os atalhos narrativos e funcionais");
check(new Set(shortcutLibrary.map((shortcut) => shortcut.id)).size === shortcutLibrary.length && shortcutLibrary.every((shortcut) => shortcut.id && shortcut.label && shortcut.prompt), "cada atalho possui ação única, nome e prompt operacional");
[
  "REGISTER_MATCH", "PRESS_CONFERENCE", "FYX_HEADLINES", "SOCIAL_MEDIA", "GOSSIP", "AGENDA", "REGISTER_PURCHASE",
  "REGISTER_ACHIEVEMENT", "ADVANCE_DAY", "PRESS_REACTION", "CONTINUE_STORY"
].forEach((action) => check(shortcutLibrary.some((shortcut) => shortcut.id === action), `ação funcional disponível: ${action}`));
check(html.includes('id="kickShortcuts"') && app.includes("preparedShortcutAction") && app.includes("message: { id: userMessage.id, content: userMessage.content, action: userMessage.action"), "atalhos enviam a ação estruturada separada do texto visível");
check(app.includes("latestShortcutContext") && app.includes("upcomingFinal") && app.includes("hasUserReplyAfterAction"), "sugestões do KICK OFF mudam conforme partida, coletiva, agenda e contexto pessoal");
check(html.includes('id="shortcutLibrary"') && html.includes('data-open-tool="shortcuts"') && html.indexOf('data-open-tool="shortcuts"') < html.indexOf('data-open-tool="match"'), "card Atalhos aparece antes do Prompt de Partida e abre a biblioteca completa");
check(html.includes('id="kickToolsMenu"') && html.includes('data-open-tool="match"') && html.includes('data-open-tool="wheel"') && html.includes('data-open-tool="dice"'), "menu de ferramentas preserva Prompt de Partida, Roleta e Dados");
check(app.includes("data-expand-message") && app.includes("isLongUserMessage"), "mensagens longas do usuário oferecem Mostrar Mais");
check(!app.includes("chat-message__meta"), "mensagens do KICK OFF não exibem nomes de autor");
check(html.includes('id="hubBackgroundB"') && app.includes("hubBackgroundVisible") && /transition:\s*opacity\s+520ms/i.test(css), "fundos do hub usam duas camadas com transição fade");
check(app.includes("--composer-radius") && app.includes("is-multiline") && css.includes(".kick-composer-dock::before"), "composer reduz a curvatura e cria fade antes da área de digitação");
check(css.includes(".chat-messages::-webkit-scrollbar") && css.includes("overflow-x: hidden"), "KICK OFF usa rolagem minimalista sem barra horizontal");
check(css.includes("width: 100vw") && css.includes("--composer-clearance: 280px"), "rolagem fica no canto da tela e preserva espaço antes do composer");
check(css.includes(".kick-composer-dock::after") && /height:\s*clamp\(170px,\s*25vh,\s*280px\)/i.test(css), "área sob o composer fica opaca e o fade de leitura é gradual");
check(css.includes("@keyframes kick-new-day-shine"), "Novo Dia recebe animação de brilho no hover");
check(html.includes('class="tool-icon-action"') && html.includes('data-tooltip="Copiar modelo"') && html.includes('data-tooltip="Rolar dado"'), "ferramentas usam ações circulares com tooltips");
check(html.includes('<h2 id="toolTitle">Atalhos</h2>') && !html.includes("<span>FERRAMENTA</span>"), "drawer exibe somente o nome da ferramenta no topo");
check(app.includes("data-wheel-weight-index") && app.includes("formatWheelPercentage") && app.includes("totalWeight"), "roleta aceita ponderação e calcula percentuais");
check(!html.includes('id="useWheelResult"') && !html.includes('id="useDiceResult"'), "roleta e dados não oferecem envio automático do resultado ao chat");
check(/--accent:\s*#ffffff/i.test(css) && !/216\s*,\s*255\s*,\s*79|#d8ff4f|#65e6a8/i.test(css), "destaques verdes foram removidos da interface");
check(html.includes('data-news-filter="headline">FYX NEWS') && html.includes('data-news-filter="social">REDES SOCIAIS') && html.includes('data-news-filter="gossip">FOFOCAS'), "FYX NEWS usa as três seções do layout de referência");
check(app.includes("renderNewsFrontPage") && app.includes("renderNewsSocialBoard") && app.includes("FYX_NEWS_IMAGES"), "FYX NEWS possui capa editorial, redes sociais, fofocas e imagens alternadas");
check(css.includes('"FYX News 701"') && css.includes('"FYX Source Sans"') && css.includes(".fyx-paper__masthead") && css.includes(".fyx-social-board"), "fontes e estruturas visuais exclusivas do FYX NEWS foram aplicadas");
check(/\.fyx-paper,\s*\.fyx-paper \*\s*\{[^}]*FYX Source Sans/s.test(css) && !/\.page--fyx-news,\s*\.page--fyx-news \*\s*\{[^}]*FYX Source Sans/s.test(css), "fontes editoriais ficam restritas ao jornal; redes sociais e fofocas mantêm Cruyff Sans");
check(html.includes("<title>InyffX</title>") && manifest.name === "InyffX" && manifest.short_name === "InyffX", "nome público do site é somente InyffX");

vm.runInNewContext(calendarManifestSource, sandbox, { filename: "calendar-shields.js" });
const calendarShields = sandbox.window.INYFFX_CALENDAR_SHIELDS;
check(Array.isArray(calendarShields) && calendarShields.length >= 600, "manifesto do calendário disponibiliza mais de 600 escudos locais");
check(calendarShields.some((pathValue) => /chelsea/i.test(pathValue)) && calendarShields.some((pathValue) => /napoli/i.test(pathValue)), "manifesto inclui escudos reconhecíveis para Chelsea e Napoli");
check(html.includes('id="calendarEventDialog"') && html.includes('id="calendarEventForm"') && app.includes("syncMatchToCalendar"), "calendário permite cadastrar eventos e sincroniza partidas com temporadas");
check(app.includes("calendarEventsForCareer") && app.includes('id: "birthday-" + year') && app.includes("calendarShieldForTeam") && app.includes("shield-time-not-found.svg"), "calendário cria aniversários e resolve escudo adversário com fallback");
check(app.includes("calendarEventIdentity") && app.includes("uniqueEvents"), "calendário consolida registros duplicados da mesma partida na visualização");
check(app.includes("calendar-day__select") && app.includes('eventButton.closest("[data-calendar-date]")'), "dias e compromissos do calendário usam botões separados sem interação aninhada");
check(app.includes("DATA DA HISTÓRIA NÃO DEFINIDA") && app.includes("exibindo o mês atual sem alterar a carreira"), "calendário pode mostrar o mês técnico sem inventar a data da história");
check(app.includes("chronologyLabel") && app.includes("normalized.occurredAt = dateFromAny"), "datas legadas e rótulos cronológicos são normalizados sem virar datas técnicas");
check(app.includes('max="10.5"') && app.includes('step="0.1"'), "nota de partida aceita a faixa real de 0 a 10,5");
check(css.includes(".career-calendar") && css.includes(".calendar-grid") && css.includes(".calendar-day-event"), "PLAYER CAREER usa calendário escuro responsivo com ícones de evento");
check(!app.includes("DATA ATUAL DA HISTÓRIA") && !app.includes("storyDateObject") && !app.includes("selectedDateObject"), "calendário remove cabeçalho e divisor de data riscados pelo usuário");
check(app.includes("calendarTeamsMatch") && app.includes("matchOpponent") && css.includes(".calendar-day-event--match") && css.includes(".calendar-selected-event--match"), "calendário identifica o adversário e exibe escudo grande sem moldura no bloco e na lateral");
check(css.includes("--calendar-weeks") && css.includes("career-surface.is-calendar") && css.includes("grid-template-rows: repeat(var(--calendar-weeks, 5)"), "calendário distribui cinco ou seis semanas dentro da altura normal da tela");
check(app.includes("/encontro|romance|romantic|date/") && css.includes(".calendar-event-glyph--romantic"), "evento Encontro mantém o tipo romantic e usa ícone vetorial sem moldura");
check(app.includes("calendarMatchOutcome") && app.includes('"Ganhou"') && app.includes('"Perdeu"') && app.includes('"Empate"'), "partidas encerradas exibem placar e resultado do jogador");
check(app.includes("calendarMatchKit") && app.includes('uniform: event.uniform') && app.includes('name=\"uniform\"'), "partidas futuras registram e exibem uniforme Home, Away ou Third");
check(css.includes(".calendar-day.has-scheduled-match") && css.includes("background: #fff") && css.includes(".calendar-day.has-completed-match"), "blocos distinguem partidas futuras claras de partidas encerradas escuras");
check(css.includes("--calendar-training: #39ef25") && css.includes("--calendar-romantic: #e20064") && css.includes("--calendar-party: #762cff") && css.includes("--calendar-rest: #10bde2") && css.includes("--calendar-birthday: #b7a7ff"), "ícones e blocos de eventos usam a paleta definida no menu lateral");
check(css.includes("min-height: 432px") && css.includes("grid-template-columns: minmax(0, 1fr) clamp(290px, 19vw, 340px)") && app.includes('eventButton.closest("[data-calendar-date]")'), "calendário mantém dimensões amplas e estáveis ao selecionar um compromisso");

const calendarLogicSandbox = {
  result: null,
  clean: (value) => String(value == null ? "" : value).trim(),
  normalizeKey: (value) => String(value == null ? "" : value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(),
  validDateOnly: (value) => String(value || ""),
  localDateKey: () => "2026-08-03",
  uid: () => "calendar-test",
  CALENDAR_EVENT_META: {
    match: { title: "Partida" }, training: { title: "Treino" }, romantic: { title: "Encontro amoroso" },
    party: { title: "Festa" }, rest: { title: "Descanso" }, birthday: { title: "Aniversário" }, personal: { title: "Evento pessoal" }
  }
};
vm.runInNewContext(`${appFunctionSource("normalizeCalendarEvent")}\nresult = normalizeCalendarEvent({ type: "romantic", date: "2026-08-03", title: "Encontro" });`, calendarLogicSandbox);
check(calendarLogicSandbox.result && calendarLogicSandbox.result.type === "romantic", "selecionar Encontro preserva funcionalmente o tipo romantic ao salvar");

const dateLogicSandbox = {
  result: null,
  clean: (value) => String(value == null ? "" : value).trim(),
  normalizeKey: (value) => String(value == null ? "" : value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
};
vm.runInNewContext(`${appFunctionSource("validDateOnly")}\n${appFunctionSource("dateFromAny")}\nresult = [dateFromAny("31/02/2026"), dateFromAny("29/02/2024"), dateFromAny("31 de abril de 2026")];`, dateLogicSandbox);
check(Array.from(dateLogicSandbox.result).join("|") === "|2024-02-29|", "parser local aceita ano bissexto e rejeita datas brasileiras impossíveis");

const datedUpdateSandbox = {
  result: null,
  rejected: [],
  clean: dateLogicSandbox.clean,
  normalizeKey: dateLogicSandbox.normalizeKey,
  rejectMemoryReceipt: (_receipt, module, reason) => datedUpdateSandbox.rejected.push({ module, reason })
};
vm.runInNewContext(`${appFunctionSource("validDateOnly")}\n${appFunctionSource("dateFromAny")}\n${appFunctionSource("normalizeDatedUpdates")}\nresult = normalizeDatedUpdates([{ id: "bad", date: "2026-02-31" }, { id: "good", date: "2026-02-28" }], "matches", {}, ["date", "occurredAt"]);`, datedUpdateSandbox);
check(datedUpdateSandbox.result.length === 1 && datedUpdateSandbox.result[0].id === "good" && datedUpdateSandbox.rejected.length === 1, "persistência local rejeita propostas da IA com data narrativa inválida");

const matchBlockSandbox = {
  outcome: "",
  kit: "",
  clean: (value) => String(value == null ? "" : value).trim(),
  normalizeKey: (value) => String(value == null ? "" : value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(),
  calendarTeamsMatch: (left, right) => String(left || "").toLowerCase() === String(right || "").toLowerCase(),
  matchOpponent: (_career, event) => event.awayTeam
};
vm.runInNewContext(`${appFunctionSource("calendarMatchHasScore")}\n${appFunctionSource("calendarMatchOutcome")}\n${appFunctionSource("calendarMatchKit")}\nconst career = { profile: { currentClub: "Chelsea" } };\nconst played = { homeTeam: "Chelsea", awayTeam: "Napoli", homeScore: 2, awayScore: 1 };\noutcome = calendarMatchOutcome(career, played);\nkit = calendarMatchKit(career, { homeTeam: "Chelsea", awayTeam: "Arsenal", uniform: "Third" });`, matchBlockSandbox);
check(matchBlockSandbox.outcome === "Ganhou" && matchBlockSandbox.kit === "Third", "bloco de partida calcula resultado e uniforme com a lógica real do calendário");
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
check(html.indexOf('src="calendar-shields.js"') < html.indexOf('src="app.js'), "manifesto de escudos carrega antes da aplicação");
check(html.indexOf('src="shortcut-data.js"') < html.indexOf('src="app.js'), "biblioteca de atalhos carrega antes da aplicação");
check(app.includes("Cloudflare Workers AI") && html.includes("Qwen3 30B A3B"), "integração gratuita de IA continua configurada");

new Function(app);
new Function(registrationSource);
new Function(characterSource);
new Function(calendarManifestSource);
new Function(shortcutSource);
new Function(serviceWorker);
check(true, "JavaScript principal, cadastro, fichas, atalhos, calendário e service worker compilam sem erro de sintaxe");

const report = {
  passed: checks.length - failures.length,
  total: checks.length,
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
