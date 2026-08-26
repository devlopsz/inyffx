import { generateRoleplay, DEFAULT_MODEL } from "./provider.js";
import { buildModelMessages } from "./prompt.js";

const ROLEPLAY_PATH = "/v1/roleplay/message";
const MAX_BODY_CHARACTERS = 100000;
const MAX_REPLY_CHARACTERS = 16000;
const NEWS_TYPES = new Set(["headline", "social", "analysis", "gossip", "comment", "fanclub"]);

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
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1");
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
  return {
    id: itemId(item, "character", identity),
    name,
    role: cleanText(item.role || "Personagem", 140),
    relationship: cleanText(item.relationship || "Não avaliada", 120),
    relationshipLevel: Number.isFinite(numericLevel) ? Math.min(100, Math.max(0, Math.round(numericLevel))) : null,
    summary: cleanText(item.summary, 1800),
    knownFacts: stringArray(item.knownFacts, 30, 500),
    secretsKnown: stringArray(item.secretsKnown, 20, 500),
    lastUpdated: cleanText(item.lastUpdated || now, 40)
  };
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
    competition: cleanText(item.competition, 160),
    homeTeam,
    awayTeam,
    homeScore: numeric(item.homeScore),
    awayScore: numeric(item.awayScore),
    minutes: numeric(item.minutes),
    goals: numeric(item.goals),
    assists: numeric(item.assists),
    rating: numeric(item.rating),
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
      description: cleanText(item.description, 1000)
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
  const messages = buildModelMessages(payload, numberFromEnv(env.MAX_CONTEXT_CHARS, 32000, 60000));

  let rawModelResponse;
  try {
    rawModelResponse = await generateRoleplay(env, messages);
  } catch (error) {
    console.error("Workers AI request failed", error && error.message ? error.message : error);
    throw providerFailure(error);
  }

  const modelPayload = parseModelPayload(rawModelResponse);
  const reply = cleanNarrative(modelPayload && (modelPayload.reply || (modelPayload.message && modelPayload.message.content)));
  if (!reply) throw new ApiError(502, "INVALID_AI_RESPONSE", "A IA respondeu sem uma cena utilizável. Tente novamente.");

  const now = new Date().toISOString();
  return jsonResponse({
    schemaVersion: "1.0",
    reply,
    message: {
      id: `message-${crypto.randomUUID()}`,
      content: reply,
      createdAt: now
    },
    memoryUpdates: sanitizeMemoryUpdates(
      modelPayload.memoryUpdates || modelPayload.updates || {},
      payload.careerId,
      now,
      payload.context && payload.context.profile && payload.context.profile.playerName
    ),
    meta: {
      provider: String(env.AI_PROVIDER || "cloudflare-workers-ai"),
      model: String(env.AI_MODEL || DEFAULT_MODEL),
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
