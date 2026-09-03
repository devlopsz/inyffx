const fs = require("node:fs");
const path = require("node:path");

const sourcePath = process.argv[2];
if (!sourcePath) {
  console.error("Uso: node tests/audit-save.cjs <arquivo.json>");
  process.exit(2);
}

let root;
try {
  root = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: `Save inválido: ${error.message}` }, null, 2));
  process.exit(1);
}

const careers = Array.isArray(root && root.careers) ? root.careers : [];
const errors = [];
const warnings = [];
let normalizableLegacyDates = 0;
let relativeChronologyLabels = 0;

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function validDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1])
    && date.getUTCMonth() === Number(match[2]) - 1
    && date.getUTCDate() === Number(match[3]);
}

function normalizedStoryDate(value) {
  const source = String(value || "").trim();
  const iso = source.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso && validDate(iso[1])) return iso[1];
  const brazilian = source.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (!brazilian) return "";
  const normalized = `${brazilian[3]}-${String(brazilian[2]).padStart(2, "0")}-${String(brazilian[1]).padStart(2, "0")}`;
  return validDate(normalized) ? normalized : "";
}

function storyDateWarning(value, location) {
  if (!value) return;
  const normalized = normalizedStoryDate(value);
  if (!normalized && /data exata em aberto|recente|sequ[eê]ncia|[uú]ltim|p[oó]s-|anterior|atual/i.test(String(value))) relativeChronologyLabels += 1;
  else if (!normalized) warnings.push(`${location}: data narrativa inválida`);
  else if (String(value) !== normalized) normalizableLegacyDates += 1;
}

function duplicateIds(items, location) {
  const seen = new Set();
  list(items).forEach((item) => {
    const id = String(item && item.id || "");
    if (!id) return warnings.push(`${location}: registro sem id`);
    if (seen.has(id)) errors.push(`${location}: id duplicado ${id}`);
    seen.add(id);
  });
}

if (!root || typeof root !== "object" || Array.isArray(root)) errors.push("A raiz do save precisa ser um objeto.");
if (!careers.length) errors.push("Nenhuma carreira válida foi encontrada no save.");
if (root && root.version !== 2) warnings.push(`Versão ${String(root.version)} será normalizada para a versão 2.`);

const summaries = careers.map((career, careerIndex) => {
  const location = `careers[${careerIndex}]`;
  if (!career || typeof career !== "object") {
    errors.push(`${location}: carreira inválida`);
    return null;
  }
  if (!career.id) errors.push(`${location}: id ausente`);
  if (!career.profile || typeof career.profile !== "object") warnings.push(`${location}: perfil ausente ou inválido`);
  storyDateWarning(career.currentDate, `${location}.currentDate`);
  if (career.profile && career.profile.playStyle != null && !Array.isArray(career.profile.playStyle)) {
    warnings.push(`${location}.profile.playStyle: valor legado será convertido para lista`);
  }

  const seasons = list(career.seasons);
  const matches = seasons.flatMap((season, seasonIndex) => {
    if (!season || typeof season !== "object") warnings.push(`${location}.seasons[${seasonIndex}]: temporada inválida será ignorada`);
    return list(season && season.matches);
  });
  const calendar = list(career.calendar);
  const canon = list(career.canonEvents);
  const news = list(career.news);
  const characters = list(career.characters);
  const chats = list(career.chats);

  matches.forEach((match, index) => storyDateWarning(match.date, `${location}.matches[${index}].date`));
  calendar.forEach((event, index) => storyDateWarning(event.date || String(event.start || "").slice(0, 10), `${location}.calendar[${index}].date`));
  canon.forEach((event, index) => storyDateWarning(event.occurredAt, `${location}.canonEvents[${index}].occurredAt`));
  news.forEach((item, index) => storyDateWarning(item.occurredAt, `${location}.news[${index}].occurredAt`));

  duplicateIds(seasons, `${location}.seasons`);
  duplicateIds(matches, `${location}.matches`);
  duplicateIds(calendar, `${location}.calendar`);
  duplicateIds(canon, `${location}.canonEvents`);
  duplicateIds(news, `${location}.news`);
  duplicateIds(characters, `${location}.characters`);
  duplicateIds(chats, `${location}.chats`);

  return {
    id: String(career.id || ""),
    player: String(career.profile && career.profile.playerName || career.name || "Sem nome"),
    storyDate: String(career.currentDate || "não definida"),
    seasons: seasons.length,
    matches: matches.length,
    calendarEvents: calendar.length,
    canonEvents: canon.length,
    news: news.length,
    characters: characters.length,
    chats: chats.length,
    messages: list(career.messages).length
  };
}).filter(Boolean);

console.log(JSON.stringify({
  ok: errors.length === 0,
  file: path.basename(sourcePath),
  version: root && root.version,
  careers: summaries,
  normalizableLegacyDates,
  relativeChronologyLabels,
  errors,
  warnings
}, null, 2));

if (errors.length) process.exit(1);
