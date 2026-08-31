import test from "node:test";
import assert from "node:assert/strict";
import worker, { buildVerifiedMatchPackage, narrativeNeedsRepair, parseMatchReport, parseModelPayload, sanitizeMemoryUpdates, trimLiveDialogue } from "../src/index.js";
import {
  ROLEPLAY_SYSTEM_PROMPT,
  MEMORY_EXTRACTION_SYSTEM_PROMPT,
  buildModelMessages,
  buildMemoryMessages,
  inferTurnContract,
  sanitizeContext
} from "../src/prompt.js";

const origin = "https://devlopsz.github.io";

function request(body, headers = {}) {
  return new Request("https://inyffx-api.example/v1/roleplay/message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": origin,
      "CF-Connecting-IP": "203.0.113.5",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

function validBody() {
  return {
    schemaVersion: "1.0",
    careerId: "career-qa-001",
    message: {
      id: "message-qa-001",
      content: "Entro na sala e cumprimento o treinador.",
      scene: 2,
      createdAt: "2026-08-26T18:00:00.000Z"
    },
    context: {
      profile: { playerName: "Jogador QA", currentClub: "Clube QA", storyTone: "Realista" },
      recentMessages: [],
      memory: { canonEvents: [], characters: [], calendar: [] }
    }
  };
}

test("separa a narrativa da extração de memória e normaliza as duas", async () => {
  const calls = [];
  const env = {
    AI_MODEL: "@cf/zai-org/glm-4.7-flash",
    ALLOWED_ORIGINS: origin,
    RATE_LIMITER: { limit: async ({ key }) => ({ success: Boolean(key) }) },
    AI: {
      run: async (model, options) => {
        calls.push({ model, options });
        if (!options.response_format) return { response: "O **treinador** fecha o tablet e levanta os olhos. — Chegou cedo. Precisamos conversar sobre o próximo jogo." };
        return { response: JSON.stringify({
          characters: [{ name: "Rui Costa", role: "Treinador", relationship: "Profissional", relationshipLevel: 55 }],
          news: [{ type: "social", title: "Torcida comenta o treino", summary: "A expectativa aumentou.", source: "FYX Social" }]
        }) };
      }
    }
  };

  const response = await worker.fetch(request(validBody()), env);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
  assert.match(payload.reply, /treinador fecha o tablet/i);
  assert.equal(payload.reply.includes("**"), false);
  assert.equal(payload.meta.freeTier, true);
  assert.equal(payload.memoryUpdates.characters[0].name, "Rui Costa");
  assert.match(payload.memoryUpdates.characters[0].id, /^character-/);
  assert.equal(payload.memoryUpdates.news[0].type, "social");
  assert.equal(payload.meta.memoryUpdated, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].model, "@cf/zai-org/glm-4.7-flash");
  assert.equal("reasoning_effort" in calls[0].options, false);
  assert.equal(calls[0].options.chat_template_kwargs.enable_thinking, false);
  assert.equal(calls[0].options.max_completion_tokens, 1800);
  assert.equal("max_tokens" in calls[0].options, false);
  assert.equal("response_format" in calls[0].options, false);
  assert.equal(calls[0].options.messages.at(-1).role, "user");
  assert.equal(calls[1].options.max_completion_tokens, 900);
  assert.equal(calls[1].options.response_format.type, "json_object");
  assert.match(calls[1].options.messages[0].content, /registrador objetivo de memória/i);
});

test("gera pacote pós-jogo e memória somente com os fatos enviados", async () => {
  const body = validBody();
  body.context.profile.currentClub = "Chelsea";
  body.context.profile.season = "2026/27";
  body.message.content = "Jogo: Chelsea x Napoli\nCompetição: UEFA Champions League\nFase: Oitavas de final, ida\nEstádio: Stamford Bridge\nGols do Jogador QA: 2\nPartida: 22:27 - gol do Napoli\n35:46 - Jogador QA empata após passe de Palmer\n61:09 - Jogador QA finaliza de primeira e vira\nPlacar final: 2x1 Chelsea\nNota: 9.0";
  let calls = 0;
  const response = await worker.fetch(request(body), {
    ALLOWED_ORIGINS: origin,
    RATE_LIMITER: { limit: async () => ({ success: true }) },
    AI: {
      run: async (_model, options) => {
        calls += 1;
        assert.equal(options.response_format.type, "json_object");
        return { response: '{"canonEvents":[],"news":[],"characters":[]}' };
      }
    }
  });
  const payload = await response.json();
  const parsed = parseMatchReport(body);
  const generated = buildVerifiedMatchPackage(body);

  assert.equal(response.status, 200);
  assert.equal(calls, 1);
  assert.equal(payload.meta.mode, "MATCH_REPORT");
  assert.equal(payload.meta.matchFactChecked, true);
  assert.equal(parsed.scoreTitle, "Chelsea 2 x 1 Napoli");
  assert.equal(parsed.events.length, 3);
  assert.equal(payload.reply, generated);
  assert.match(payload.reply, /Aos 22:27, Napoli marcou\./);
  assert.match(payload.reply, /Primeira pergunta da coletiva/);
  assert.doesNotMatch(payload.reply, /58%|posse de bola|chutes ao gol|Luis Alberto|Ospina|Potter|goleiro/i);
  assert.equal(payload.memoryUpdates.news.length, 7);
  assert.match(payload.memoryUpdates.news[0].title, /Jogador QA decide/);
  assert.match(payload.memoryUpdates.news[0].summary, /Jogador QA marcou 2 gols/);
  assert.equal(payload.memoryUpdates.news.filter((item) => item.type === "social").length, 4);
  assert.equal(payload.memoryUpdates.news.find((item) => item.type === "social").handle, "@CentralDaTorcida");
  assert.match(payload.memoryUpdates.news[0].imageCaption, /61:09/);
  assert.equal(payload.memoryUpdates.seasons[0].label, "2026/27");
  assert.equal(payload.memoryUpdates.seasons[0].matches[0].homeScore, 2);
  assert.equal(payload.memoryUpdates.seasons[0].matches[0].goals, 2);
  assert.equal(payload.memoryUpdates.canonEvents[0].certainty, "FATO_DO_JOGO");
});

test("detecta controle do protagonista e repara um diálogo antes de salvar a memória", async () => {
  const body = validBody();
  body.message.content = "Ligo para Iris Eva. Ainda falta uma hora para o jogo.";
  const calls = [];
  const response = await worker.fetch(request(body), {
    ALLOWED_ORIGINS: origin,
    RATE_LIMITER: { limit: async () => ({ success: true }) },
    AI: {
      run: async (_model, options) => {
        calls.push(options);
        if (calls.length === 1) return { response: "Você liga e Iris atende.\n— Oi, amor.\n— Estou bem.\nVocê desliga e sai de casa." };
        if (calls.length === 2) return { response: "Iris atende após dois toques.\n— Oi, amor. Como você está antes do jogo?" };
        return { response: '{"characters":[{"name":"Iris Eva","role":"Namorada"}],"news":[]}' };
      }
    }
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(calls.length, 3);
  assert.equal(payload.meta.narrativeRepaired, true);
  assert.equal(payload.reply, "Iris atende após dois toques.\n— Oi, amor. Como você está antes do jogo?");
  assert.doesNotMatch(payload.reply, /você desliga|você sai/i);
  assert.equal(payload.memoryUpdates.characters[0].name, "Iris Eva");

  assert.equal(narrativeNeedsRepair("Você liga.\n— Oi.", body, "LIVE_DIALOGUE"), false);
  assert.equal(narrativeNeedsRepair("— Oi.\n— Estou bem.", body, "LIVE_DIALOGUE"), true);
  assert.equal(trimLiveDialogue("A chamada conecta.\n— Oi.\n— Estou bem."), "A chamada conecta.\n— Oi.");
});

test("recusa origens não autorizadas antes de consumir IA", async () => {
  let called = false;
  const response = await worker.fetch(request(validBody(), { Origin: "https://example.com" }), {
    ALLOWED_ORIGINS: origin,
    AI: { run: async () => { called = true; } }
  });
  const payload = await response.json();
  assert.equal(response.status, 403);
  assert.equal(payload.error.code, "ORIGIN_NOT_ALLOWED");
  assert.equal(called, false);
});

test("aplica limite antes de chamar o modelo", async () => {
  let called = false;
  const response = await worker.fetch(request(validBody()), {
    ALLOWED_ORIGINS: origin,
    RATE_LIMITER: { limit: async () => ({ success: false }) },
    AI: { run: async () => { called = true; } }
  });
  const payload = await response.json();
  assert.equal(response.status, 429);
  assert.equal(payload.error.code, "RATE_LIMITED");
  assert.equal(called, false);
});

test("aceita JSON cercado por markdown e produz ids estáveis", () => {
  const parsed = parseModelPayload({ response: "```json\n{\"reply\":\"Cena\",\"memoryUpdates\":{}}\n```" });
  assert.equal(parsed.reply, "Cena");

  const first = sanitizeMemoryUpdates({ characters: [{ name: "Ana", role: "Amiga" }] }, "career-1", "2026-08-26T00:00:00.000Z");
  const second = sanitizeMemoryUpdates({ characters: [{ name: "Ana", role: "Amiga" }] }, "career-1", "2026-08-26T00:00:01.000Z");
  assert.equal(first.characters[0].id, second.characters[0].id);

  const filtered = sanitizeMemoryUpdates({
    characters: [
      { name: "Jogador QA", role: "Atacante" },
      { name: "Nome inventado", role: "Protagonista" },
      { name: "Ana", role: "Amiga" }
    ]
  }, "career-1", "2026-08-26T00:00:02.000Z", "Jogador QA");
  assert.deepEqual(filtered.characters.map((character) => character.name), ["Ana"]);

  const media = sanitizeMemoryUpdates({
    news: [{
      type: "gossip",
      title: "Rumor nos bastidores",
      summary: "Torcedores especulam sem confirmação.",
      source: "FYX Bastidores",
      handle: "@arquibancada",
      trend: "Bastidores",
      sentiment: "especulação",
      postCount: "8,4k posts",
      secondaryTitle: "O assunto do dia",
      imageCaption: "Registro público da chegada ao estádio."
    }]
  }, "career-1", "2026-08-26T00:00:03.000Z", "Jogador QA");
  assert.equal(media.news[0].handle, "@arquibancada");
  assert.equal(media.news[0].trend, "Bastidores");
  assert.equal(media.news[0].postCount, "8,4k posts");
  assert.equal(media.news[0].secondaryTitle, "O assunto do dia");

  const detailed = sanitizeMemoryUpdates({
    characters: [{
      name: "Maya Patel",
      category: "romance",
      role: "Namorada",
      unknownFacts: ["A proposta secreta"],
      characterRules: "Nunca revela um segredo espontaneamente.",
      details: {
        currentGoal: "Concluir a faculdade.",
        openInformation: "Identidade dos pais",
        importantEvents: [{ title: "Primeiro encontro", importance: "Alta" }]
      }
    }]
  }, "career-1", "2026-08-26T00:00:04.000Z", "Jogador QA");
  assert.equal(detailed.characters[0].category, "romance");
  assert.deepEqual(detailed.characters[0].unknownFacts, ["A proposta secreta"]);
  assert.equal(detailed.characters[0].details.currentGoal, "Concluir a faculdade.");
  assert.equal(detailed.characters[0].details.importantEvents[0].importance, "Alta");
  const sparse = sanitizeMemoryUpdates({ characters: [{ name: "Maya Patel", role: "Namorada" }] }, "career-1", "2026-08-26T00:00:05.000Z", "Jogador QA");
  assert.equal(Object.prototype.hasOwnProperty.call(sparse.characters[0], "knownFacts"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(sparse.characters[0], "details"), false);
});

test("recupera a cena quando o JSON do modelo termina depois do campo reply", () => {
  const truncated = '{"reply":"O treinador fecha o tablet. — Bom dia. Vamos conversar.","memoryUpdates":{"canonEvents":[{"title":"';
  const parsed = parseModelPayload({
    choices: [{ message: { content: truncated, reasoning: "raciocínio interno não deve aparecer" } }]
  });
  assert.equal(parsed.reply, "O treinador fecha o tablet. — Bom dia. Vamos conversar.");
  assert.equal(parseModelPayload({ choices: [{ message: { content: '{"reply":"sem fechamento' } }] }), null);
});

test("expõe health check sem liberar o endpoint de escrita", async () => {
  const response = await worker.fetch(new Request("https://inyffx-api.example/health"), {});
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.status, "ok");
  assert.equal(payload.service, "inyffx-api");
});

test("mantém o protagonista dentro do universo e ignora metadados de videogame", () => {
  assert.match(ROLEPLAY_SYSTEM_PROMPT, /protagonista registrado na ficha é uma pessoa real/i);
  assert.match(ROLEPLAY_SYSTEM_PROMPT, /nunca trate o protagonista como alguém controlando um personagem/i);
  assert.match(ROLEPLAY_SYSTEM_PROMPT, /nunca abra uma cena com menu, tela azul/i);
  assert.match(ROLEPLAY_SYSTEM_PROMPT, /partida de futebol que realmente aconteceu/i);
  assert.match(ROLEPLAY_SYSTEM_PROMPT, /o tempo permanece no mesmo momento narrativo/i);
  assert.match(ROLEPLAY_SYSTEM_PROMPT, /nunca dê ao NPC um knownFact que esteja em unknownFacts/i);
  assert.match(MEMORY_EXTRACTION_SYSTEM_PROMPT, /notícias existem apenas para acontecimentos públicos/i);
  assert.match(MEMORY_EXTRACTION_SYSTEM_PROMPT, /fichas manuais em details são cânone de alta prioridade/i);
  assert.match(MEMORY_EXTRACTION_SYSTEM_PROMPT, /gere de 4 a 8 itens news\.type social/i);
  assert.match(MEMORY_EXTRACTION_SYSTEM_PROMPT, /gere de 4 a 8 itens news\.type gossip/i);

  const context = sanitizeContext({
    profile: {
      playerName: "Caio Alexandre",
      currentClub: "Chelsea FC",
      gameTitle: "EA Sports FC",
      platform: "PC"
    }
  });
  assert.equal(context.profile.playerName, "Caio Alexandre");
  assert.equal(context.profile.currentClub, "Chelsea FC");
  assert.equal("gameTitle" in context.profile, false);
  assert.equal("platform" in context.profile, false);

  const messages = buildModelMessages({
    message: { content: "Oi, por onde começamos?" },
    context: { profile: context.profile, recentMessages: [], memory: {} }
  });
  assert.match(messages[2].content, /Caio Alexandre/);
  assert.match(messages.at(-2).content, /Modo: LIVE_DIALOGUE/);
  assert.match(messages.at(-2).content, /O tempo pode avançar: não/);
  assert.match(messages.at(-2).content, /O usuário controla o protagonista: sim/);
  assert.equal(messages.at(-1).content, "Oi, por onde começamos?");

  assert.equal(inferTurnContract("Quero olhar as fofocas e os rumores de hoje.", []).mode, "SOCIAL_MEDIA");

  const memoryMessages = buildMemoryMessages({
    turnId: "turn-1",
    message: { id: "message-1", content: "Conversei com o treinador." },
    context: { profile: context.profile, recentMessages: [], memory: {} }
  }, "O treinador fecha a pasta.");
  assert.match(memoryMessages[0].content, /retorne somente JSON válido/i);
  assert.equal(JSON.parse(memoryMessages.at(-1).content).turnId, "turn-1");
});

test("detecta pacote pós-jogo composto e conserva a partida anterior no contexto", () => {
  const previousMatch = `Jogo: Chelsea x Napoli\nCompetição: Champions League\nPartida: 35:46 - gol de Cacá\nPlacar final: 2x1 Chelsea\nNota: 9.0`;
  const requestText = "Mande a narração, manchetes, análises, redes sociais e siga com a coletiva.";
  const contract = inferTurnContract(requestText, [{ role: "user", content: previousMatch }]);
  assert.equal(contract.mode, "MATCH_REPORT");
  assert.equal(contract.requestedOutputs.length, 9);
  ["narração completa", "análise tática", "manchetes", "repercussão em redes sociais", "primeira pergunta da coletiva"]
    .forEach((item) => assert.equal(contract.requestedOutputs.includes(item), true));

  const messages = buildModelMessages({
    message: { content: requestText },
    context: { profile: { playerName: "Cacá" }, recentMessages: [{ role: "user", content: previousMatch }], memory: {} }
  });
  assert.equal(messages.some((message) => message.content.includes("35:46 - gol de Cacá")), true);
  assert.match(messages.at(-2).content, /não substitua o pacote pedido por um resumo/i);
});

test("saudação inicial pede o ponto de partida sem inventar cena ou ação", async () => {
  const body = validBody();
  body.message.content = "Oi. Por onde começamos?";
  body.context.profile.playerName = "Caio QA";
  body.context.recentMessages = [];
  let called = false;
  const response = await worker.fetch(request(body), {
    ALLOWED_ORIGINS: origin,
    RATE_LIMITER: { limit: async () => ({ success: true }) },
    AI: { run: async () => { called = true; throw new Error("não deveria chamar o modelo"); } }
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(called, false);
  assert.equal(payload.meta.guardedOpening, true);
  assert.match(payload.reply, /^Por onde começamos, Caio QA\?/);
  assert.match(payload.reply, /Nada acontece até você escolher o ponto de partida\.$/);
  assert.doesNotMatch(payload.reply, /Stamford Bridge|treino|vestiário|menu|videogame/i);
});

test("configura Qwen sem raciocínio exposto e com o limite de saída compatível", async () => {
  const calls = [];
  const response = await worker.fetch(request(validBody()), {
    AI_MODEL: "@cf/qwen/qwen3-30b-a3b-fp8",
    ALLOWED_ORIGINS: origin,
    RATE_LIMITER: { limit: async () => ({ success: true }) },
    AI: {
      run: async (model, options) => {
        calls.push({ model, options });
        return options.response_format
          ? { choices: [{ message: { content: '{"canonEvents":[],"news":[],"characters":[]}' } }] }
          : { choices: [{ message: { content: "O treinador fecha a pasta. — Pode falar." } }] };
      }
    }
  });
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].model, "@cf/qwen/qwen3-30b-a3b-fp8");
  assert.equal(calls[0].options.max_tokens, 1800);
  assert.equal("max_completion_tokens" in calls[0].options, false);
  assert.equal("chat_template_kwargs" in calls[0].options, false);
  assert.match(calls[0].options.messages.at(-2).content, /\/no_think$/);
  assert.equal("response_format" in calls[0].options, false);
  assert.equal(calls[1].options.max_tokens, 900);
  assert.equal(calls[1].options.response_format.type, "json_object");
  assert.match(calls[1].options.messages.at(-2).content, /\/no_think$/);
});
