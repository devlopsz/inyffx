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
  "assets/config.js",
  "mod/pics/logo-inyffx.png",
  "mod/pics/login/inyffx-background-initial.png",
  "mod/pics/login/soccer-ball-button.svg",
  "mod/prompt partidas para o usuario copiar.txt",
  "mod/prompt the sims para o usuario copiar.txt",
  "mod/prompt the sims EXEMPLO.txt"
];

requiredFiles.forEach((file) => check(fileExists(file), `arquivo obrigatório presente: ${file}`));

const html = read("index.html");
const css = read("styles.css");
const app = read("app.js");
const registrationSource = read("registration-data.js");
const combinedSource = [html, css, app, registrationSource].join("\n");

check(!/Cruyff Sans Mono|font-family\s*:\s*[^;]*\bmono\b/i.test(combinedSource), "nenhuma fonte mono é usada na interface");
check(/font-family:\s*"Cruyff Sans"/i.test(css), "Cruyff Sans é a família visual da interface");
check(html.includes("mod/pics/login/inyffx-background-initial.png") || css.includes("mod/pics/login/inyffx-background-initial.png"), "login usa o fundo fornecido");
check(html.includes("mod/pics/login/soccer-ball-button.svg"), "login usa a bola fornecida no botão");
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

const backgrounds = ["yamal.jpg", "santos.jpg", "relationship.jpg", "flamengo.png", "chelsea.jpg"];
backgrounds.forEach((file) => {
  check(fileExists(`mod/pics/background/${file}`), `fundo do hub presente: ${file}`);
  check(app.includes(`mod/pics/background/${file}`), `fundo do hub registrado no fade: ${file}`);
});
check(app.includes("setInterval(advanceHubBackground, 9000)"), "fundos do hub alternam automaticamente em fade");
check(!html.includes("background-upload") && !app.includes("importBackground"), "personalização manual do fundo foi removida");

const sandbox = { window: {} };
vm.runInNewContext(registrationSource, sandbox, { filename: "registration-data.js" });
const questions = sandbox.window.INYFFX_REGISTRATION_QUESTIONS;
const referenceData = sandbox.window.INYFFX_REFERENCE_DATA;
check(Array.isArray(questions) && questions.length >= 54, "cadastro possui o fluxo completo de perguntas individuais");
check(questions.slice(0, 3).map((question) => question.key).join(",") === "username,password,confirmPassword", "cadastro começa por usuário, senha e confirmação");

const questionKeys = new Set(questions.map((question) => question.key));
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

const matchPrompt = normalizePrompt(read("mod/prompt partidas para o usuario copiar.txt"));
const matchTemplate = (html.match(/<pre id="matchPromptTemplate">([\s\S]*?)<\/pre>/) || [])[1];
check(Boolean(matchTemplate) && normalizePrompt(matchTemplate) === matchPrompt, "modelo de partida usa exatamente o arquivo fornecido");
const offPitchPrompt = normalizePrompt(read("mod/prompt the sims para o usuario copiar.txt"));
const offPitchTemplate = (html.match(/<pre id="offPitchTemplate">([\s\S]*?)<\/pre>/) || [])[1];
check(Boolean(offPitchTemplate) && normalizePrompt(offPitchTemplate) === offPitchPrompt, "modelo OFF THE PITCH usa exatamente o arquivo fornecido");
check(html.includes("prompt%20the%20sims%20EXEMPLO.txt") && html.includes("BAIXAR EXEMPLO"), "exemplo OFF THE PITCH está disponível para download");

check(html.indexOf('src="registration-data.js"') < html.indexOf('src="app.js"'), "dados do cadastro carregam antes da aplicação");
check(app.includes("Cloudflare Workers AI") && html.includes("GLM-4.7-Flash"), "integração gratuita de IA continua configurada");

new Function(app);
new Function(registrationSource);
check(true, "JavaScript principal e cadastro compilam sem erro de sintaxe");

const report = {
  passed: checks.length - failures.length,
  total: checks.length,
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
