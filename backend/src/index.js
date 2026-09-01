import { generateNarrative, generateMemoryUpdates, DEFAULT_MODEL } from "./provider.js";
import { buildModelMessages, buildMemoryMessages, buildRepairMessages, inferTurnContract } from "./prompt.js";

const ROLEPLAY_PATH = "/v1/roleplay/message";
const MAX_BODY_CHARACTERS = 100000;
const MAX_REPLY_CHARACTERS = 16000;
const NEWS_TYPES = new Set(["headline", "social", "analysis", "gossip", "comment", "fanclub"]);
const CHARACTER_CATEGORIES = new Set(["friends", "romance", "professional", "team"]);
const BLOCKED_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function numberFromEnv(value, fallback, maximum) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, maximum);
}

function cleanText(value, maximum = 1200) {
  return String(value == null ? "" : value).trim().slice(0, maximum);
}

function cleanNarrative(value) {
  return cleanText(value, MAX_REPLY_CHARACTERS)
    .replace(/&#x20;|&nbsp;/gi, " ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*_]{3,}\s*$/gm, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{4,}/g, "\n\n\n");
}

function cleanId(value) {
  const result = cleanText(value, 160);
  return /^[a-zA-Z0-9._:-]+$/.test(result) ? result : "";
}

function stableHash(value) {
  let hash = 2166136261;
  const source = String(value || "");
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function itemId(item, prefix, identity) {
  const existing = cleanId(item && item.id);
  return existing || `${prefix}-${stableHash(identity)}`;
}

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || "https://devlopsz.github.io,http://127.0.0.1:4173,http://localhost:4173")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function requestOrigin(request, env) {
  const origin = cleanText(request.headers.get("Origin"), 300).replace(/\/$/, "");
  if (!origin) return env.ALLOW_NO_ORIGIN === "true" ? "*" : "";
  return allowedOrigins(env).includes(origin) ? origin : "";
}

function responseHeaders(origin) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Vary": "Origin"
  });
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

function jsonResponse(body, status, origin) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(origin) });
}

function parseJsonLoose(value) {
  if (value && typeof value === "object") return value;
  const source = cleanText(value, 50000).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch (_) {
    const start = source.indexOf("{");
    const end = source.lastIndexOf("}");
    const reply = extractJsonStringField(source, "reply");
    if (start < 0 || end <= start) return reply ? { reply } : null;
    try {
      return JSON.parse(source.slice(start, end + 1));
    } catch (_) {
      return reply ? { reply } : null;
    }
  }
}

function extractJsonStringField(source, fieldName) {
  const marker = new RegExp(`"${fieldName}"\\s*:\\s*"`, "i").exec(source);
  if (!marker) return "";
  const start = marker.index + marker[0].length - 1;
  let escaped = false;
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character !== '"') continue;
    try {
      return JSON.parse(source.slice(start, index + 1));
    } catch (_) {
      return "";
    }
  }
  return "";
}

function parseTextPayload(value) {
  const parsed = parseJsonLoose(value);
  if (parsed) return parsed;
  const source = cleanText(value, 50000);
  if (!source || /^[\[{]/.test(source)) return null;
  return { reply: source };
}

export function parseModelPayload(raw) {
  if (raw && raw.response && typeof raw.response === "object") return parseModelPayload(raw.response);
  if (raw && typeof raw.response === "string") return parseTextPayload(raw.response);
  const choiceContent = raw && raw.choices && raw.choices[0] && raw.choices[0].message && raw.choices[0].message.content;
  if (choiceContent) return parseTextPayload(choiceContent);
  if (typeof raw === "string") return parseTextPayload(raw);
  return raw && typeof raw === "object" ? raw : null;
}

function stringArray(value, maximumItems = 20, maximumCharacters = 500) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maximumItems).map((item) => cleanText(item, maximumCharacters)).filter(Boolean);
}

function cleanList(value, limit, mapper) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, limit).map(mapper).filter(Boolean);
}

function cleanCharacterDetails(value, depth = 0) {
  if (value == null || depth > 4) return null;
  if (typeof value === "string") return cleanText(value, 2400);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 40).map((item) => cleanCharacterDetails(item, depth + 1)).filter((item) => item != null);
  if (typeof value !== "object") return null;
  const result = {};
  Object.entries(value).slice(0, 120).forEach(([key, item]) => {
    if (BLOCKED_OBJECT_KEYS.has(key) || !/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(key)) return;
    const cleaned = cleanCharacterDetails(item, depth + 1);
    if (cleaned != null) result[key] = cleaned;
  });
  return result;
}

function cleanCanon(item, index, careerId, now) {
  if (!item || typeof item !== "object") return null;
  const title = cleanText(item.title || item.name, 240);
  const description = cleanText(item.description || item.summary, 1600);
  if (!title && !description) return null;
  const identity = `${careerId}|canon|${item.sourceMessageId || ""}|${title}|${item.occurredAt || ""}`;
  return {
    id: itemId(item, "canon", identity),
    title: title || "Acontecimento da carreira",
    description,
    type: cleanText(item.type || item.category || "rp_fact", 60),
    certainty: cleanText(item.certainty || "FATO_DO_RP", 40),
    occurredAt: cleanText(item.occurredAt || item.createdAt || now, 40),
    participants: stringArray(item.participants, 20, 120),
    sourceMessageId: cleanId(item.sourceMessageId)
  };
}

function cleanNews(item, index, careerId, now) {
  if (!item || typeof item !== "object") return null;
  const title = cleanText(item.title, 260);
  const summary = cleanText(item.summary || item.description, 1800);
  if (!title && !summary) return null;
  const requestedType = cleanText(item.type, 30).toLowerCase();
  const type = NEWS_TYPES.has(requestedType) ? requestedType : "headline";
  const identity = `${careerId}|news|${item.sourceMessageId || ""}|${type}|${title}`;
  return {
    id: itemId(item, "news", identity),
    type,
    title: title || "Atualização da carreira",
    summary,
    source: cleanText(item.source || "FYX NEWS", 120),
    handle: cleanText(item.handle, 100),
    postCount: cleanText(item.postCount, 40),
    trend: cleanText(item.trend || item.subject, 180),
    subject: cleanText(item.subject, 180),
    secondaryTitle: cleanText(item.secondaryTitle, 260),
    imageCaption: cleanText(item.imageCaption, 600),
    kicker: cleanText(item.kicker, 320),
    image: cleanText(item.image, 220),
    sentiment: cleanText(item.sentiment, 40),
    occurredAt: cleanText(item.occurredAt || item.createdAt || now, 40),
    createdAt: cleanText(item.createdAt || now, 40),
    sourceMessageId: cleanId(item.sourceMessageId)
  };
}

function cleanCharacter(item, index, careerId, now) {
  if (!item || typeof item !== "object") return null;
  const name = cleanText(item.name, 160);
  if (!name) return null;
  const numericLevel = Number(item.relationshipLevel);
  const identity = `${careerId}|character|${name.toLocaleLowerCase("pt-BR")}`;
  const requestedCategory = cleanText(item.category, 30).toLowerCase();
  const categorySource = comparableText(`${item.role || ""} ${item.relationship || ""}`);
  const category = CHARACTER_CATEGORIES.has(requestedCategory) ? requestedCategory
    : /namor|romance|esposa|marido|noiv|ficante|amor/.test(categorySource) ? "romance"
      : /companheir|elenco|jogador|goleiro|zagueiro|lateral|atacante|meio-campista/.test(categorySource) ? "team"
        : /empres|agente|tecnico|treinador|medico|fisioter|assessor|diretor|jornalista|advog|contador|preparador|psicolog|nutricionista/.test(categorySource) ? "professional"
          : "friends";
  const result = {
    id: itemId(item, "character", identity),
    name,
    category,
    lastUpdated: cleanText(item.lastUpdated || now, 40)
  };
  if (cleanText(item.displayName, 160)) result.displayName = cleanText(item.displayName, 160);
  if (cleanText(item.role, 140)) result.role = cleanText(item.role, 140);
  if (cleanText(item.relationship, 120)) result.relationship = cleanText(item.relationship, 120);
  if (Number.isFinite(numericLevel)) result.relationshipLevel = Math.min(100, Math.max(0, Math.round(numericLevel)));
  if (cleanText(item.summary, 1800)) result.summary = cleanText(item.summary, 1800);
  if (Object.prototype.hasOwnProperty.call(item, "knownFacts")) result.knownFacts = stringArray(item.knownFacts, 30, 500);
  if (Object.prototype.hasOwnProperty.call(item, "unknownFacts")) result.unknownFacts = stringArray(item.unknownFacts, 30, 500);
  if (Object.prototype.hasOwnProperty.call(item, "secretsKnown")) result.secretsKnown = stringArray(item.secretsKnown, 20, 500);
  if (Object.prototype.hasOwnProperty.call(item, "immutableFacts")) result.immutableFacts = stringArray(item.immutableFacts, 30, 500);
  if (Object.prototype.hasOwnProperty.call(item, "currentState")) result.currentState = stringArray(item.currentState, 30, 500);
  if (cleanText(item.characterRules, 2400)) result.characterRules = cleanText(item.characterRules, 2400);
  if (cleanText(item.openInformation, 2400)) result.openInformation = cleanText(item.openInformation, 2400);
  if (cleanText(item.currentGoal, 1200)) result.currentGoal = cleanText(item.currentGoal, 1200);
  const details = cleanCharacterDetails(item.details);
  if (details && Object.keys(details).length) result.details = details;
  return result;
}

function comparableText(value) {
  return cleanText(value, 200).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function isProtagonistCharacter(character, protagonistName) {
  if (!character) return false;
  const name = comparableText(character.name);
  const exactProtagonistName = comparableText(protagonistName);
  const role = comparableText(character.role);
  return Boolean(exactProtagonistName && name === exactProtagonistName)
    || /protagonista|personagem principal|jogador do usuario|user player/.test(role);
}

function cleanMatch(item, index, careerId, now) {
  if (!item || typeof item !== "object") return null;
  const homeTeam = cleanText(item.homeTeam, 120);
  const awayTeam = cleanText(item.awayTeam, 120);
  if (!homeTeam || !awayTeam) return null;
  const identity = `${careerId}|match|${item.date || ""}|${homeTeam}|${awayTeam}`;
  const numeric = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  return {
    id: itemId(item, "match", identity),
    date: cleanText(item.date || item.createdAt || now, 40),
    time: cleanText(item.time, 20),
    status: cleanText(item.status, 30),
    competition: cleanText(item.competition, 160),
    phase: cleanText(item.phase, 160),
    stadium: cleanText(item.stadium, 220),
    homeTeam,
    awayTeam,
    homeScore: numeric(item.homeScore),
    awayScore: numeric(item.awayScore),
    minutes: numeric(item.minutes),
    goals: numeric(item.goals),
    assists: numeric(item.assists),
    rating: numeric(item.rating),
    formation: cleanText(item.formation, 1800),
    goalDetails: cleanText(item.goalDetails, 1800),
    highlights: cleanText(item.highlights, 1600),
    sourceMessageId: cleanId(item.sourceMessageId)
  };
}

function cleanSeasons(value, careerId, now) {
  return cleanList(value, 4, (season, seasonIndex) => {
    if (!season || typeof season !== "object") return null;
    const label = cleanText(season.label, 80);
    if (!label) return null;
    return {
      id: cleanId(season.id) || `season-${stableHash(`${careerId}|${label}`)}`,
      label,
      matches: cleanList(season.matches, 12, (match, index) => cleanMatch(match, index + seasonIndex * 100, careerId, now))
    };
  });
}

function cleanFinance(value, careerId, now) {
  if (!value || typeof value !== "object") return {};
  const result = {};
  if (cleanText(value.currency, 8)) result.currency = cleanText(value.currency, 8).toUpperCase();
  if (Number.isFinite(Number(value.balance))) result.balance = Number(value.balance);
  result.transactions = cleanList(value.transactions, 20, (item, index) => {
    if (!item || typeof item !== "object") return null;
    const description = cleanText(item.description, 240);
    if (!description || !Number.isFinite(Number(item.amount))) return null;
    return {
      id: itemId(item, "transaction", `${careerId}|${item.date || now}|${description}|${index}`),
      date: cleanText(item.date || item.createdAt || now, 40),
      description,
      category: cleanText(item.category, 100),
      amount: Number(item.amount),
      createdAt: cleanText(item.createdAt || now, 40)
    };
  });
  result.pockets = cleanList(value.pockets, 12, (item, index) => {
    if (!item || typeof item !== "object") return null;
    const name = cleanText(item.name, 180);
    if (!name) return null;
    return {
      id: itemId(item, "pocket", `${careerId}|${name}|${index}`),
      name,
      amount: Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0
    };
  });
  return result;
}

function cleanHall(value, careerId) {
  const source = value && typeof value === "object" ? value : {};
  const list = (items, prefix) => cleanList(items, 20, (item, index) => {
    if (!item || typeof item !== "object") return null;
    const title = cleanText(item.title || item.name, 240);
    if (!title) return null;
    return {
      id: itemId(item, prefix, `${careerId}|${prefix}|${title}|${item.season || item.date || ""}|${index}`),
      title,
      season: cleanText(item.season, 80),
      date: cleanText(item.date, 40),
      description: cleanText(item.description, 1200)
    };
  });
  return {
    trophies: list(source.trophies, "trophy"),
    records: list(source.records, "record"),
    awards: list(source.awards, "award")
  };
}

function cleanCalendar(value, careerId, now) {
  return cleanList(value, 20, (item, index) => {
    if (!item || typeof item !== "object") return null;
    const title = cleanText(item.title, 240);
    if (!title) return null;
    const start = cleanText(item.start || item.date || item.time, 50);
    return {
      id: itemId(item, "calendar", `${careerId}|${start}|${title}|${index}`),
      title,
      start: start || now,
      date: cleanText(item.date, 40),
      time: cleanText(item.time, 20),
      location: cleanText(item.location, 220),
      type: cleanText(item.type, 100),
      description: cleanText(item.description, 1000),
      status: cleanText(item.status, 30),
      homeTeam: cleanText(item.homeTeam, 120),
      awayTeam: cleanText(item.awayTeam, 120),
      homeScore: Number.isFinite(Number(item.homeScore)) ? Number(item.homeScore) : "",
      awayScore: Number.isFinite(Number(item.awayScore)) ? Number(item.awayScore) : "",
      competition: cleanText(item.competition, 160),
      phase: cleanText(item.phase, 160),
      stadium: cleanText(item.stadium, 220),
      sourceMatchId: cleanId(item.sourceMatchId),
      sourceMessageId: cleanId(item.sourceMessageId)
    };
  });
}

function cleanOffPitch(value, careerId) {
  if (!value || typeof value !== "object") return {};
  const result = {};
  const currentCity = cleanText(value.currentCity, 160);
  const currentResidence = cleanText(value.currentResidence, 240);
  if (currentCity) result.currentCity = currentCity;
  if (currentResidence) result.currentResidence = currentResidence;
  const houses = cleanList(value.houses, 12, (item, index) => {
      if (!item || typeof item !== "object") return null;
      const name = cleanText(item.name || item.type, 220);
      if (!name) return null;
      return {
        id: itemId(item, "house", `${careerId}|${name}|${item.city || ""}|${index}`),
        name,
        type: cleanText(item.type, 100),
        city: cleanText(item.city, 160),
        status: cleanText(item.status, 100),
        description: cleanText(item.description, 1000)
      };
    });
  if (houses.length) result.houses = houses;
  return result;
}

export function sanitizeMemoryUpdates(value, careerId, now = new Date().toISOString(), protagonistName = "") {
  const source = value && typeof value === "object" ? value : {};
  const characters = cleanList(source.characters, 24, (item, index) => cleanCharacter(item, index, careerId, now))
    .filter((character) => !isProtagonistCharacter(character, protagonistName));
  return {
    canonEvents: cleanList(source.canonEvents, 20, (item, index) => cleanCanon(item, index, careerId, now)),
    news: cleanList(source.news, 20, (item, index) => cleanNews(item, index, careerId, now)),
    characters,
    seasons: cleanSeasons(source.seasons, careerId, now),
    finance: cleanFinance(source.finance, careerId, now),
    hall: cleanHall(source.hall, careerId),
    calendar: cleanCalendar(source.calendar, careerId, now),
    offPitch: cleanOffPitch(source.offPitch, careerId)
  };
}

function normalizeRequest(body, env) {
  if (!body || typeof body !== "object") throw new ApiError(400, "INVALID_JSON", "Envie um objeto JSON válido.");
  const careerId = cleanId(body.careerId);
  if (!careerId) throw new ApiError(400, "INVALID_CAREER", "A carreira informada é inválida.");
  const maximumInput = numberFromEnv(env.MAX_INPUT_CHARS, 12000, 20000);
  const content = cleanText(body.message && body.message.content, maximumInput);
  if (!content) throw new ApiError(400, "EMPTY_MESSAGE", "Escreva uma mensagem antes de enviar.");
  return {
    schemaVersion: cleanText(body.schemaVersion || "1.0", 20),
    careerId,
    turnId: cleanId(body.turnId) || cleanId(body.message && body.message.id) || `turn-${crypto.randomUUID()}`,
    message: {
      id: cleanId(body.message && body.message.id) || `message-${crypto.randomUUID()}`,
      content,
      scene: Math.max(1, Number(body.message && body.message.scene) || 1),
      createdAt: cleanText(body.message && body.message.createdAt, 40) || new Date().toISOString()
    },
    context: body.context && typeof body.context === "object" ? body.context : {}
  };
}

async function enforceRateLimit(request, env, careerId) {
  if (!env.RATE_LIMITER || typeof env.RATE_LIMITER.limit !== "function") return;
  const ip = cleanText(request.headers.get("CF-Connecting-IP") || "unknown", 80);
  const keys = [`ip:${ip}`, `career:${careerId}`];
  for (const key of keys) {
    const result = await env.RATE_LIMITER.limit({ key });
    if (!result || result.success !== true) {
      throw new ApiError(429, "RATE_LIMITED", "Muitas mensagens em pouco tempo. Aguarde um minuto e tente novamente.");
    }
  }
}

function providerFailure(error) {
  const message = String(error && error.message ? error.message : error || "");
  if (/quota|limit|neurons|capacity|429|3040|exceed/i.test(message)) {
    return new ApiError(503, "FREE_TIER_UNAVAILABLE", "A franquia gratuita da IA está temporariamente indisponível. Tente novamente mais tarde.");
  }
  if (error && error.code === "AI_BINDING_MISSING") {
    return new ApiError(503, "AI_NOT_CONFIGURED", "O backend ainda não recebeu a conexão do Workers AI.");
  }
  return new ApiError(502, "AI_PROVIDER_ERROR", "A IA não conseguiu concluir esta cena. Tente novamente.");
}

function openingNeedsDirection(payload) {
  const recentMessages = payload.context && Array.isArray(payload.context.recentMessages) ? payload.context.recentMessages : [];
  if (recentMessages.length) return false;
  const content = comparableText(payload.message && payload.message.content);
  if (!content || content.length > 90) return false;
  return /^(oi|ola|opa|hey|e ai|bom dia|boa tarde|boa noite)\b/.test(content)
    || /\b(por onde comecamos|como comecamos|vamos comecar|quero comecar|podemos comecar|comecamos por onde)\b/.test(content);
}

function openingDirectionReply(payload) {
  const protagonistName = cleanText(payload.context && payload.context.profile && payload.context.profile.playerName, 160);
  const vocative = protagonistName ? `, ${protagonistName}` : "";
  return `Por onde começamos${vocative}? Diga onde você está agora, quem está com você e qual momento quer viver primeiro. Nada acontece até você escolher o ponto de partida.`;
}

function fallbackMatchNews(payload, now) {
  const content = String(payload.message && payload.message.content || "");
  const game = content.match(/^Jogo\s*:\s*(.+?)\s+(?:x|×|vs\.?|versus)\s+(.+)$/im);
  const score = content.match(/^Placar final\s*:\s*(\d+)\s*(?:x|×|[-–])\s*(\d+)/im);
  if (!game || !score) return [];
  const homeTeam = cleanText(game[1], 120);
  const awayTeam = cleanText(game[2], 120);
  const homeScore = Number(score[1]);
  const awayScore = Number(score[2]);
  const goalsLine = content.match(/^Gols do [^:]+\s*:\s*(\d+)/im);
  const goals = goalsLine ? Number(goalsLine[1]) : 0;
  const protagonistName = cleanText(payload.context && payload.context.profile && payload.context.profile.playerName, 160);
  const scoreTitle = `${homeTeam} ${homeScore} x ${awayScore} ${awayTeam}`;
  const performance = goals > 0 && protagonistName
    ? ` ${protagonistName} marcou ${goals} ${goals === 1 ? "gol" : "gols"}.`
    : "";
  return [{
    id: `news-${stableHash(`${payload.careerId}|${payload.turnId}|${scoreTitle}`)}`,
    type: "headline",
    title: scoreTitle,
    summary: `O resultado informado pelo protagonista foi confirmado como fato da carreira.${performance}`,
    source: "FYX NEWS",
    occurredAt: cleanText(payload.message && payload.message.createdAt, 40) || now,
    createdAt: now,
    sourceMessageId: cleanId(payload.message && payload.message.id)
  }];
}

function matchSourceText(payload) {
  const current = String(payload.message && payload.message.content || "");
  const isMatch = (/^\s*Jogo\s*:/im.test(current) && /^\s*Placar final\s*:/im.test(current))
    || (/\[PARTIDA OFICIAL\]/i.test(current) && /^\s*Mandante\s*:/im.test(current) && /^\s*Visitante\s*:/im.test(current));
  if (isMatch) return current;
  const recent = payload.context && Array.isArray(payload.context.recentMessages)
    ? payload.context.recentMessages
    : [];
  const previous = [...recent].reverse().find((message) => {
    const content = String(message && message.content || "");
    return (/^\s*Jogo\s*:/im.test(content) && /^\s*Placar final\s*:/im.test(content))
      || (/\[PARTIDA OFICIAL\]/i.test(content) && /^\s*Mandante\s*:/im.test(content) && /^\s*Visitante\s*:/im.test(content));
  });
  return [previous && previous.content, current].filter(Boolean).join("\n");
}

function matchLabel(source, label, maximum = 1600) {
  const escaped = label.replace(/[.*+?^$(){}|[\]\\]/g, "\\$&");
  const match = new RegExp("^\\s*" + escaped + "\\s*:\\s*(.*?)\\s*$", "im").exec(source);
  return cleanText(match && match[1], maximum);
}

function matchBlockLabel(source, label, maximum = 2400) {
  const normalizedLabel = comparableText(label);
  const lines = String(source || "").split(/\r?\n/);
  const start = lines.findIndex((line) => {
    const separator = line.indexOf(":");
    return separator >= 0 && comparableText(line.slice(0, separator)) === normalizedLabel;
  });
  if (start < 0) return "";
  const firstSeparator = lines[start].indexOf(":");
  const values = [lines[start].slice(firstSeparator + 1).trim()];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*\[\/[^\]]+\]\s*$/.test(line)) break;
    if (/^\s*[A-Za-zÀ-ÿ][^:\r\n]{0,89}\s*:\s*/.test(line)) break;
    if (line.trim()) values.push(line.trim());
  }
  return cleanText(values.filter(Boolean).join("\n"), maximum);
}

function eventSentence(event) {
  const match = /^(\d{1,3}(?::\d{2}|(?:\+\d+)?))\s*[-–—]\s*(.+)$/i.exec(event);
  if (!match) return /[.!?]$/.test(event) ? event : event + ".";
  const moment = match[1];
  const detail = cleanText(match[2], 1000).replace(/[.!?]+$/, "");
  const genericGoal = /^gol d[oa]\s+(.+)$/i.exec(detail);
  if (genericGoal) return "Aos " + moment + ", " + genericGoal[1] + " marcou.";
  return "Aos " + moment + ", " + detail + ".";
}

function goalPhrase(count) {
  if (count === 1) return "1 gol";
  return String(count) + " gols";
}

function canonicalClubName(value) {
  return comparableText(value)
    .replace(/\b(?:football club|futebol clube|association football club|fc|f c|cf|sc|afc)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseMatchReport(payload) {
  const source = matchSourceText(payload);
  const game = /^(.+?)\s+(?:x|×|vs\.?|versus)\s+(.+)$/i.exec(matchLabel(source, "Jogo", 300));
  const score = /(\d+)\s*(?:x|×|[-–])\s*(\d+)/i.exec(matchLabel(source, "Placar final", 180));
  const homeTeam = cleanText(game && game[1] || matchLabel(source, "Mandante", 120), 120);
  const awayTeam = cleanText(game && game[2] || matchLabel(source, "Visitante", 120), 120);
  const taggedHomeScore = matchLabel(source, "Gols do mandante", 20).match(/\d+/);
  const taggedAwayScore = matchLabel(source, "Gols do visitante", 20).match(/\d+/);
  const homeScore = score ? Number(score[1]) : taggedHomeScore ? Number(taggedHomeScore[0]) : null;
  const awayScore = score ? Number(score[2]) : taggedAwayScore ? Number(taggedAwayScore[0]) : null;
  if (!homeTeam || !awayTeam || homeScore == null || awayScore == null) return null;
  const profile = payload.context && payload.context.profile && typeof payload.context.profile === "object"
    ? payload.context.profile
    : {};
  const shortcutGoalLine = /^\s*Gols do meu jogador(?:\s*\(([^)]+)\))?\s*:\s*(\d+)/im.exec(source);
  const legacyGoalLine = [...source.matchAll(/^\s*Gols do\s+([^:]+)\s*:\s*(\d+)/gim)].find((entry) => {
    const label = comparableText(entry[1]);
    return label && !/^(?:mandante|visitante|meu jogador)/.test(label);
  });
  const protagonistName = cleanText(profile.playerName || (shortcutGoalLine && shortcutGoalLine[1]) || (legacyGoalLine && legacyGoalLine[1]) || "Protagonista", 160);
  const goals = shortcutGoalLine ? Number(shortcutGoalLine[2]) : legacyGoalLine ? Number(legacyGoalLine[2]) : 0;
  const assistsMatch = matchLabel(source, "Assistências", 30).match(/\d+/);
  const minutesMatch = matchLabel(source, "Minutos jogados", 30).match(/\d+/);
  const ratingText = matchLabel(source, "Nota", 40);
  const ratingMatch = /(?:^|\s)(\d+(?:[.,]\d+)?)(?:\s|$)/.exec(ratingText);

  const timelineStart = /^\s*Partida\s*:\s*/im.exec(source);
  let timelineText = "";
  if (timelineStart) {
    const start = timelineStart.index + timelineStart[0].length;
    const rest = source.slice(start);
    const timelineEnd = /^\s*Placar final\s*:/im.exec(rest);
    timelineText = rest.slice(0, timelineEnd ? timelineEnd.index : rest.length);
  }
  const events = timelineText
    .split(/\r?\n/)
    .map((line) => cleanText(line, 1200))
    .filter((line) => line && !/^00:00\s*[-–—]?\s*$/.test(line));
  if (!events.length) {
    [matchBlockLabel(source, "Como os gols aconteceram", 2400), matchBlockLabel(source, "Acontecimentos importantes", 2400)]
      .filter(Boolean)
      .forEach((block) => block.split(/\r?\n/).map((line) => cleanText(line, 1200)).filter(Boolean).forEach((line) => events.push(line)));
  }

  const currentClub = cleanText(profile.currentClub || profile.club, 160);
  const normalizedClub = canonicalClubName(currentClub);
  const protagonistTeam = normalizedClub === canonicalClubName(homeTeam)
    ? homeTeam
    : normalizedClub === canonicalClubName(awayTeam) ? awayTeam : "";
  const winner = homeScore === awayScore ? "" : homeScore > awayScore ? homeTeam : awayTeam;
  const loser = !winner ? "" : winner === homeTeam ? awayTeam : homeTeam;
  const scoreTitle = homeTeam + " " + homeScore + " x " + awayScore + " " + awayTeam;
  const resultSentence = winner
    ? winner + " venceu " + loser + " por " + (winner === homeTeam ? homeScore : awayScore) + " a " + (winner === homeTeam ? awayScore : homeScore)
    : homeTeam + " e " + awayTeam + " empataram por " + homeScore + " a " + awayScore;

  return {
    source,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    competition: matchLabel(source, "Competição", 180),
    phase: matchLabel(source, "Fase", 180),
    stadium: matchLabel(source, "Estádio", 180),
    date: matchLabel(source, "Data", 40),
    uniform: matchLabel(source, "Uniforme", 120),
    formation: matchBlockLabel(source, "Formação", 2400) || matchBlockLabel(source, "Formação / escalação", 2400),
    protagonistName,
    protagonistTeam,
    goals,
    assists: assistsMatch ? Number(assistsMatch[0]) : 0,
    minutes: minutesMatch ? Number(minutesMatch[0]) : 0,
    rating: ratingMatch ? Number(ratingMatch[1].replace(",", ".")) : null,
    ratingText: ratingMatch ? ratingMatch[1] : "",
    events,
    winner,
    loser,
    scoreTitle,
    resultSentence
  };
}

export function buildVerifiedMatchPackage(payload) {
  const match = parseMatchReport(payload);
  if (!match) return "";

  const phaseText = match.phase ? match.phase.charAt(0).toLocaleLowerCase("pt-BR") + match.phase.slice(1) : "";
  const setting = [match.stadium ? "Em " + match.stadium : "", match.competition ? "pela " + match.competition : "", phaseText ? "na fase " + phaseText : ""]
    .filter(Boolean)
    .join(", ");
  const eventNarrative = match.events.length
    ? match.events.map(eventSentence).join(" ")
    : "O relato enviado não detalhou os lances em ordem cronológica.";
  const performance = match.goals > 0
    ? match.protagonistName + " marcou " + goalPhrase(match.goals) + "."
    : "O relato não registrou gols de " + match.protagonistName + ".";
  const impact = match.goals > 0
    ? "Os lances registrados mostram " + match.protagonistName + " como figura decisiva do confronto."
    : "A leitura permanece limitada aos acontecimentos registrados no relato.";
  const clubWon = Boolean(match.protagonistTeam && match.winner === match.protagonistTeam);
  const collectiveContext = clubWon
    ? "na vitória do " + match.protagonistTeam
    : "no confronto entre " + match.homeTeam + " e " + match.awayTeam;
  const collectiveQuestion = match.goals > 0
    ? match.protagonistName + ", você marcou " + goalPhrase(match.goals) + " " + collectiveContext + ". Qual foi a sua leitura dos lances decisivos?"
    : match.protagonistName + ", o jogo terminou em " + match.homeScore + " a " + match.awayScore + ". Qual foi a sua leitura dos momentos decisivos?";
  const headlinePerformance = match.goals > 0
    ? match.protagonistName + " marca " + goalPhrase(match.goals) + " em " + match.scoreTitle
    : match.scoreTitle + ": resultado confirmado";
  const socialPerformance = match.goals > 0
    ? goalPhrase(match.goals) + " de " + match.protagonistName + " no placar de " + match.homeScore + " a " + match.awayScore + "."
    : "Placar confirmado: " + match.scoreTitle + ".";

  const dataLines = [
    "- Placar final: " + match.scoreTitle,
    match.competition ? "- Competição: " + match.competition : "",
    match.phase ? "- Fase: " + match.phase : "",
    match.stadium ? "- Estádio: " + match.stadium : "",
    "- Gols de " + match.protagonistName + ": " + match.goals,
    match.ratingText ? "- Nota informada: " + match.ratingText : ""
  ].filter(Boolean);

  return [
    "Narração",
    (setting ? setting + ", " : "") + match.homeTeam + " e " + match.awayTeam + " entraram em campo para um jogo que terminou em " + match.homeScore + " a " + match.awayScore + ". " + eventNarrative + " No apito final, " + match.resultSentence + ". " + performance,
    "",
    "Dados confirmados",
    dataLines.join("\n"),
    "",
    "Análise da partida",
    impact + (match.events.length ? " A sequência decisiva registrada foi: " + match.events.map(eventSentence).join(" ") : ""),
    "",
    "Manchetes",
    "- " + headlinePerformance,
    "- " + match.resultSentence + " em " + (match.stadium || "uma noite de futebol"),
    "- " + match.scoreTitle + ": os lances que definiram a partida",
    "",
    "Comentários e redes sociais",
    "- FYX Sports: \"" + socialPerformance + "\"",
    "- @CentralDaTorcida: \"" + match.resultSentence + ". Noite de muita repercussão entre os torcedores.\"",
    "- @AnaliseFYX: \"" + impact + "\"",
    "",
    "Primeira pergunta da coletiva",
    "Jornalista: \"" + collectiveQuestion + "\""
  ].join("\n");
}

function verifiedMatchNews(payload, match, now) {
  if (!match) return [];
  const occurredAt = cleanText(match.date || payload.message && payload.message.createdAt, 40) || now;
  const sourceMessageId = cleanId(payload.message && payload.message.id);
  const baseIdentity = payload.careerId + "|" + payload.turnId + "|" + match.scoreTitle;
  const performance = match.goals > 0
    ? match.protagonistName + " marcou " + goalPhrase(match.goals) + "."
    : "O placar foi incorporado ao cânone da carreira.";
  const playerHighlight = [...match.events].reverse().find((event) => comparableText(event).includes(comparableText(match.protagonistName)))
    || match.events[match.events.length - 1]
    || "";
  const leadTitle = match.goals > 0
    ? match.protagonistName + " decide em " + match.scoreTitle
    : match.scoreTitle;
  const reactionBase = match.resultSentence + ". " + performance;
  const items = [
    {
      type: "headline",
      title: leadTitle,
      summary: match.resultSentence + ". " + performance,
      source: "FYX NEWS",
      kicker: match.scoreTitle + " · " + match.protagonistName,
      secondaryTitle: "Os lances que decidiram " + match.homeTeam + " x " + match.awayTeam,
      imageCaption: playerHighlight ? eventSentence(playerHighlight) : reactionBase,
      trend: match.protagonistName
    },
    {
      type: "analysis",
      title: "Os lances que decidiram " + match.homeTeam + " x " + match.awayTeam,
      summary: match.events.length ? match.events.map(eventSentence).join(" ") : "A análise considera apenas o resultado informado.",
      source: "FYX Análise",
      secondaryTitle: "A história completa da partida",
      imageCaption: playerHighlight ? eventSentence(playerHighlight) : reactionBase
    },
    {
      type: "social",
      title: "Torcedores repercutem " + match.scoreTitle,
      summary: reactionBase,
      source: "FYX Social",
      handle: "@CentralDaTorcida",
      trend: match.scoreTitle,
      sentiment: "repercussão"
    },
    {
      type: "social",
      title: match.protagonistName + " vira assunto após a partida",
      summary: match.goals > 0
        ? "Que noite de " + match.protagonistName + ": " + goalPhrase(match.goals) + " em um jogo que terminou " + match.homeScore + " a " + match.awayScore + "."
        : "A atuação de " + match.protagonistName + " movimenta as discussões depois de " + match.scoreTitle + ".",
      source: "FYX Matchday",
      handle: "@FYXMatchday",
      trend: match.protagonistName,
      sentiment: "elogio"
    },
    {
      type: "social",
      title: "A noite em " + (match.stadium || match.competition || "campo"),
      summary: "O apito final confirmou " + match.scoreTitle + ", e a repercussão segue crescendo entre os torcedores.",
      source: "Bola em Jogo",
      handle: "@BolaEmJogo",
      trend: match.competition || match.scoreTitle,
      sentiment: "comentário"
    },
    {
      type: "social",
      title: "Leitura rápida de " + match.scoreTitle,
      summary: match.events.length
        ? "Os lances registrados colocaram " + match.protagonistName + " no centro das conversas do pós-jogo."
        : reactionBase,
      source: "Análise FYX",
      handle: "@AnaliseFYX",
      trend: match.winner || match.scoreTitle,
      sentiment: "análise"
    },
    {
      type: "comment",
      title: "Pós-jogo",
      summary: match.resultSentence + ". O resultado e os lances passam a integrar o registro oficial desta carreira.",
      source: "FYX Sports"
    }
  ];
  return items.map((item, index) => ({
    id: "news-" + stableHash(baseIdentity + "|" + item.type + "|" + index),
    ...item,
    occurredAt,
    createdAt: now,
    sourceMessageId
  }));
}

function applyVerifiedMatchMemory(memoryUpdates, payload, match, now) {
  if (!match) return memoryUpdates;
  const occurredAt = cleanText(match.date || payload.message && payload.message.createdAt, 40) || now;
  const sourceMessageId = cleanId(payload.message && payload.message.id);
  const seasonLabel = cleanText(
    payload.context && payload.context.profile && payload.context.profile.season
      || payload.context && payload.context.memory && payload.context.memory.currentSeason && payload.context.memory.currentSeason.label
      || "Temporada atual",
    80
  );
  memoryUpdates.news = verifiedMatchNews(payload, match, now);
  memoryUpdates.canonEvents = [{
    id: "canon-" + stableHash(payload.careerId + "|" + payload.turnId + "|" + match.scoreTitle),
    title: match.scoreTitle,
    description: match.resultSentence + ". " + (match.goals > 0 ? match.protagonistName + " marcou " + goalPhrase(match.goals) + "." : ""),
    type: "partida",
    certainty: "FATO_DO_JOGO",
    occurredAt,
    participants: [match.homeTeam, match.awayTeam, match.protagonistName].filter(Boolean),
    sourceMessageId
  }];
  memoryUpdates.seasons = [{
    id: "season-" + stableHash(payload.careerId + "|" + seasonLabel),
    label: seasonLabel,
    matches: [{
      id: "match-" + stableHash(payload.careerId + "|" + occurredAt + "|" + match.scoreTitle),
      date: cleanText(match.date || occurredAt, 40),
      status: "completed",
      competition: match.competition,
      phase: match.phase,
      stadium: match.stadium,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      minutes: match.minutes || 0,
      goals: match.goals,
      assists: match.assists || 0,
      rating: match.rating || 0,
      formation: match.formation,
      goalDetails: match.events.join("\n"),
      highlights: match.events.join("\n"),
      sourceMessageId
    }]
  }];
  return memoryUpdates;
}

function shortcutFactContext(payload) {
  const memory = payload.context && payload.context.memory || {};
  const season = memory.currentSeason && typeof memory.currentSeason === "object" ? memory.currentSeason : {};
  const matches = Array.isArray(season.matches) ? season.matches : [];
  const match = matches[matches.length - 1] || null;
  const canon = Array.isArray(memory.canonEvents) ? memory.canonEvents : [];
  const event = canon[canon.length - 1] || null;
  const playerName = cleanText(payload.context && payload.context.profile && payload.context.profile.playerName || "O jogador", 160);
  const matchTitle = match && match.homeTeam && match.awayTeam
    ? `${match.homeTeam} ${Number(match.homeScore) || 0} x ${Number(match.awayScore) || 0} ${match.awayTeam}`
    : "";
  return {
    playerName,
    match,
    title: matchTitle || cleanText(event && (event.title || event.description), 260) || `momento atual de ${playerName}`,
    occurredAt: cleanText(match && match.date || event && event.occurredAt || payload.context && payload.context.currentDate || now, 40)
  };
}

function shortcutNewsItem(payload, now, index, item) {
  return {
    id: `news-${stableHash(`${payload.careerId}|${payload.turnId}|shortcut|${item.type}|${index}`)}`,
    title: cleanText(item.title, 260),
    summary: cleanText(item.summary, 1800),
    source: cleanText(item.source || "FYX NEWS", 120),
    type: item.type,
    handle: cleanText(item.handle, 100),
    trend: cleanText(item.trend, 180),
    sentiment: cleanText(item.sentiment, 40),
    postCount: cleanText(item.postCount, 40),
    occurredAt: cleanText(item.occurredAt || now, 40),
    createdAt: now,
    sourceMessageId: cleanId(payload.message && payload.message.id)
  };
}

function ensureShortcutMemory(memoryUpdates, payload, contract, now) {
  const action = contract && contract.action;
  if (!action) return memoryUpdates;
  const fact = shortcutFactContext(payload);
  const existing = Array.isArray(memoryUpdates.news) ? memoryUpdates.news : [];
  const additions = [];
  if (action === "FYX_HEADLINES" && !existing.some((item) => item.type === "headline")) {
    additions.push(
      { type: "headline", title: fact.title, summary: `A edição atual da FYX NEWS acompanha ${fact.title}, usando apenas os fatos registrados.`, source: "FYX NEWS" },
      { type: "analysis", title: "A leitura esportiva do acontecimento", summary: `A análise parte do registro de ${fact.title} e separa desempenho confirmado de interpretação jornalística.`, source: "FYX Análise" },
      { type: "comment", title: "O assunto que domina a imprensa", summary: `${fact.playerName} permanece no centro da cobertura relacionada a ${fact.title}.`, source: "FYX Sports" },
      { type: "analysis", title: "O que pode mudar a partir de agora", summary: "Consequências futuras permanecem em aberto e dependerão dos próximos fatos da carreira.", source: "FYX NEWS" }
    );
  }
  if (action === "SOCIAL_MEDIA") {
    const socialSeeds = [
      ["@FYXMatchday", "Torcedores repercutem " + fact.title, "repercussão", "análise"],
      ["@BancadaFYX", "Debate cresce depois de " + fact.title, fact.playerName, "debate"],
      ["@CentralDaTorcida", "A torcida comenta o momento", fact.title, "torcida"],
      ["@OlharTatico", "Leituras diferentes movimentam o feed", "AnáliseFYX", "análise"],
      ["@FanClubFYX", "Fãs organizam novas postagens", fact.playerName, "elogio"],
      ["@RivalEmCampo", "Rivais também entram na conversa", "Futebol", "crítica"]
    ];
    const socialCount = existing.filter((item) => item.type === "social").length;
    socialSeeds.slice(0, Math.max(0, 6 - socialCount)).forEach(([handle, title, trend, sentiment], index) => additions.push({ type: "social", title, summary: `${handle} comenta ${fact.title} sem acrescentar fatos não confirmados.`, source: "FYX Social", handle, trend, sentiment, postCount: `${12 + index * 7},${index}k posts` }));
  }
  if (action === "GOSSIP") {
    const gossipSeeds = [
      ["gossip", "Rumor: fãs discutem o momento pessoal", "Rumores"],
      ["fanclub", "Fan clubs acompanham cada aparição pública", fact.playerName],
      ["gossip", "Especulação: o que o público acredita ter visto", "Especulação"],
      ["fanclub", "Comunidades de fãs defendem privacidade", "FanClubs"],
      ["gossip", "Rumor sem confirmação ganha comentários", "VidaPessoal"],
      ["gossip", "Debate público cresce sem revelar segredos", "FofocasFYX"]
    ];
    const gossipCount = existing.filter((item) => item.type === "gossip" || item.type === "fanclub").length;
    gossipSeeds.slice(0, Math.max(0, 6 - gossipCount)).forEach(([type, title, trend], index) => additions.push({ type, title, summary: `Conteúdo tratado como ${type === "gossip" ? "rumor ou especulação" : "reação de fãs"}; nenhum segredo privado foi convertido em fato.`, source: type === "gossip" ? "FYX Fofocas" : "FYX Fan Club", handle: `@FYX${type === "gossip" ? "Fofocas" : "Fans"}${index + 1}`, trend, sentiment: "especulação", postCount: `${8 + index * 6},${index}k posts` }));
  }
  const isPressAnswer = action === "PRESS_CONFERENCE" && !/\[INYFFX_ACTION:PRESS_CONFERENCE\]/i.test(payload.message && payload.message.content || "");
  if (isPressAnswer && !existing.some((item) => item.type === "comment" || item.type === "headline")) {
    const answer = cleanText(payload.message && payload.message.content, 900);
    if (answer) additions.push({ type: "comment", title: `${fact.playerName} responde à imprensa`, summary: `Declaração registrada na coletiva: “${answer}”`, source: "Sala de Imprensa FYX", trend: fact.playerName, sentiment: "declaração" });
  }
  additions.forEach((item, index) => existing.push(shortcutNewsItem(payload, now, index, { ...item, occurredAt: fact.occurredAt })));
  memoryUpdates.news = existing;
  return memoryUpdates;
}

function normalizedLanguage(value, maximum = 16000) {
  return cleanText(value, maximum).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

const CONTROLLED_PLAYER_ACTIONS = [
  { reply: "liga", declared: /\b(?:ligo|liguei|telefon(?:o|ei)|faco uma ligacao)\b/ },
  { reply: "desliga", declared: /\b(?:desligo|desliguei|encerro a ligacao)\b/ },
  { reply: "entra", declared: /\b(?:entro|entrei)\b/ },
  { reply: "sai", declared: /\b(?:saio|sai|deixo|deixei|vou embora)\b/ },
  { reply: "vai", declared: /\b(?:vou|fui)\b/ },
  { reply: "pega", declared: /\b(?:pego|peguei)\b/ },
  { reply: "coloca", declared: /\b(?:coloco|coloquei)\b/ },
  { reply: "manda", declared: /\b(?:mando|mandei|envio|enviei)\b/ },
  { reply: "responde", declared: /\b(?:respondo|respondi)\b/ },
  { reply: "diz", declared: /\b(?:digo|disse|falo|falei)\b/ },
  { reply: "pergunta", declared: /\b(?:pergunto|perguntei)\b/ },
  { reply: "sente", declared: /\b(?:sinto|senti|me sinto)\b/ },
  { reply: "pensa", declared: /\b(?:penso|pensei)\b/ },
  { reply: "decide", declared: /\b(?:decido|decidi)\b/ },
  { reply: "sorri", declared: /\b(?:sorrio|sorri)\b/ },
  { reply: "ri", declared: /\b(?:rio|ri)\b/ },
  { reply: "abraca", declared: /\b(?:abraco|abracei)\b/ },
  { reply: "beija", declared: /\b(?:beijo|beijei)\b/ },
  { reply: "aceita", declared: /\b(?:aceito|aceitei)\b/ },
  { reply: "recusa", declared: /\b(?:recuso|recusei)\b/ },
  { reply: "comeca", declared: /\b(?:comeco|comecei)\b/ }
];

export function narrativeNeedsRepair(reply, payload, mode) {
  if (mode !== "LIVE_DIALOGUE") return false;
  const narrative = normalizedLanguage(reply);
  const current = normalizedLanguage(payload.message && payload.message.content, 12000);
  const dialogueLines = String(reply || "").split(/\r?\n/).filter((line) => /^\s*[—-]\s*\S/.test(line));
  if (dialogueLines.length > 1) return true;
  if (/\bvoce\s+(?:tem|tera)\s+\d+\s+minutos?\b/.test(narrative)) return true;
  if (/\b(?:e hora de sair|a ligacao termina|a chamada termina)\b/.test(narrative)) return true;
  return CONTROLLED_PLAYER_ACTIONS.some((action) => {
    const used = new RegExp(`\\bvoce\\s+${action.reply}\\b`).test(narrative);
    return used && !action.declared.test(current);
  });
}

export function trimLiveDialogue(reply) {
  const lines = String(reply || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const kept = [];
  let dialogueSeen = false;
  for (const line of lines) {
    const isDialogue = /^[—-]\s*\S/.test(line);
    if (isDialogue && dialogueSeen) break;
    if (!isDialogue && dialogueSeen) break;
    kept.push(line);
    if (isDialogue) dialogueSeen = true;
  }
  return cleanNarrative(kept.join("\n"));
}

function strictLiveFallback(reply) {
  const trimmed = trimLiveDialogue(reply);
  const dialogue = String(trimmed || reply || "").split(/\r?\n/).find((line) => /^\s*[—-]\s*\S/.test(line));
  return cleanNarrative(dialogue || trimmed || reply);
}

async function handleRoleplay(request, env, origin) {
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_CHARACTERS) throw new ApiError(413, "PAYLOAD_TOO_LARGE", "A memória enviada ficou grande demais para o MVP.");
  let body;
  try {
    body = JSON.parse(rawBody);
  } catch (_) {
    throw new ApiError(400, "INVALID_JSON", "O corpo da requisição não contém JSON válido.");
  }

  const payload = normalizeRequest(body, env);
  await enforceRateLimit(request, env, payload.careerId);
  if (openingNeedsDirection(payload)) {
    const now = new Date().toISOString();
    const reply = openingDirectionReply(payload);
    return jsonResponse({
      schemaVersion: "1.1",
      turnId: payload.turnId,
      reply,
      message: { id: `message-${crypto.randomUUID()}`, content: reply, createdAt: now },
      memoryUpdates: sanitizeMemoryUpdates({}, payload.careerId, now),
      meta: {
        provider: String(env.AI_PROVIDER || "cloudflare-workers-ai"),
        model: String(env.AI_MODEL || DEFAULT_MODEL),
        mode: "LIVE_DIALOGUE",
        freeTier: true,
        guardedOpening: true
      }
    }, 200, origin);
  }
  const maximumContext = numberFromEnv(env.MAX_CONTEXT_CHARS, 32000, 60000);
  const recentMessages = payload.context && Array.isArray(payload.context.recentMessages) ? payload.context.recentMessages : [];
  const turnContract = inferTurnContract(payload.message.content, recentMessages);
  const verifiedMatch = turnContract.mode === "MATCH_REPORT" ? parseMatchReport(payload) : null;
  let rawModelResponse = null;
  let reply = verifiedMatch ? cleanNarrative(buildVerifiedMatchPackage(payload)) : "";
  let narrativeRepaired = false;
  let matchFactChecked = Boolean(verifiedMatch && reply);

  if (!reply) {
    const messages = buildModelMessages(payload, maximumContext);
    try {
      rawModelResponse = await generateNarrative(env, messages, { mode: turnContract.mode });
    } catch (error) {
      console.error("Workers AI request failed", error && error.message ? error.message : error);
      throw providerFailure(error);
    }

    const modelPayload = parseModelPayload(rawModelResponse);
    reply = cleanNarrative(modelPayload && (modelPayload.reply || (modelPayload.message && modelPayload.message.content)));
    if (!reply) throw new ApiError(502, "INVALID_AI_RESPONSE", "A IA respondeu sem uma cena utilizável. Tente novamente.");

    if (narrativeNeedsRepair(reply, payload, turnContract.mode)) {
      narrativeRepaired = true;
      try {
        const repairResponse = await generateNarrative(env, buildRepairMessages(payload, reply), { mode: "LIVE_DIALOGUE", maxTokens: 600 });
        const repairPayload = parseModelPayload(repairResponse);
        const repairedReply = cleanNarrative(repairPayload && (repairPayload.reply || (repairPayload.message && repairPayload.message.content)));
        if (repairedReply) reply = repairedReply;
      } catch (error) {
        console.error("Workers AI narrative repair failed", error && error.message ? error.message : error);
      }
      reply = trimLiveDialogue(reply);
      if (narrativeNeedsRepair(reply, payload, turnContract.mode)) reply = strictLiveFallback(reply);
    }
  }

  const now = new Date().toISOString();
  let rawMemoryResponse = null;
  let memorySource = {};
  try {
    const memoryMessages = buildMemoryMessages(payload, reply, maximumContext);
    rawMemoryResponse = await generateMemoryUpdates(env, memoryMessages);
    const parsedMemory = parseModelPayload(rawMemoryResponse);
    memorySource = parsedMemory && (parsedMemory.memoryUpdates || parsedMemory.updates || parsedMemory) || {};
  } catch (error) {
    console.error("Workers AI memory extraction failed", error && error.message ? error.message : error);
  }
  let memoryUpdates = sanitizeMemoryUpdates(
    memorySource,
    payload.careerId,
    now,
    payload.context && payload.context.profile && payload.context.profile.playerName
  );
  if (verifiedMatch) {
    memoryUpdates = applyVerifiedMatchMemory(memoryUpdates, payload, verifiedMatch, now);
  } else if (!memoryUpdates.news.length) {
    memoryUpdates.news.push(...fallbackMatchNews(payload, now));
  }
  memoryUpdates = ensureShortcutMemory(memoryUpdates, payload, turnContract, now);

  return jsonResponse({
    schemaVersion: "1.1",
    turnId: payload.turnId,
    reply,
    message: {
      id: `message-${crypto.randomUUID()}`,
      content: reply,
      createdAt: now
    },
    memoryUpdates,
    meta: {
      provider: String(env.AI_PROVIDER || "cloudflare-workers-ai"),
      model: String(env.AI_MODEL || DEFAULT_MODEL),
      memoryModel: String(env.AI_MEMORY_MODEL || env.AI_MODEL || DEFAULT_MODEL),
      mode: turnContract.mode,
      narrativeRepaired,
      matchFactChecked,
      memoryUpdated: Boolean(rawMemoryResponse),
      freeTier: true
    }
  }, 200, origin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return jsonResponse({
        status: "ok",
        service: "inyffx-api",
        schemaVersion: "1.0",
        provider: String(env.AI_PROVIDER || "cloudflare-workers-ai"),
        model: String(env.AI_MODEL || DEFAULT_MODEL),
        freeTier: true
      }, 200, "");
    }

    const origin = requestOrigin(request, env);
    if (!origin) return jsonResponse({ error: { code: "ORIGIN_NOT_ALLOWED", message: "Origem não autorizada." } }, 403, "");

    if (request.method === "OPTIONS") {
      const headers = responseHeaders(origin);
      headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      headers.set("Access-Control-Allow-Headers", "Content-Type");
      headers.set("Access-Control-Max-Age", "86400");
      return new Response(null, { status: 204, headers });
    }

    if (url.pathname !== ROLEPLAY_PATH || request.method !== "POST") {
      return jsonResponse({ error: { code: "NOT_FOUND", message: "Endpoint não encontrado." } }, 404, origin);
    }

    try {
      return await handleRoleplay(request, env, origin);
    } catch (error) {
      const known = error instanceof ApiError ? error : new ApiError(500, "INTERNAL_ERROR", "O backend encontrou um erro inesperado.");
      if (!(error instanceof ApiError)) console.error("Unhandled API error", error);
      return jsonResponse({ error: { code: known.code, message: known.message } }, known.status, origin);
    }
  }
};
