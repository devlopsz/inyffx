import test from "node:test";
import assert from "node:assert/strict";
import worker, { parseModelPayload, sanitizeMemoryUpdates } from "../src/index.js";

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

test("responde ao contrato do KICK OFF e normaliza memória", async () => {
  const calls = [];
  const env = {
    AI_MODEL: "@cf/zai-org/glm-4.7-flash",
    ALLOWED_ORIGINS: origin,
    RATE_LIMITER: { limit: async ({ key }) => ({ success: Boolean(key) }) },
    AI: {
      run: async (model, options) => {
        calls.push({ model, options });
        return {
          response: JSON.stringify({
            reply: "O **treinador** fecha o tablet e levanta os olhos. — Chegou cedo. Precisamos conversar sobre o próximo jogo.",
            memoryUpdates: {
              characters: [{ name: "Rui Costa", role: "Treinador", relationship: "Profissional", relationshipLevel: 55 }],
              news: [{ type: "social", title: "Torcida comenta o treino", summary: "A expectativa aumentou.", source: "FYX Social" }]
            }
          })
        };
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
  assert.equal(calls.length, 1);
  assert.equal(calls[0].model, "@cf/zai-org/glm-4.7-flash");
  assert.equal("reasoning_effort" in calls[0].options, false);
  assert.equal(calls[0].options.chat_template_kwargs.enable_thinking, false);
  assert.equal(calls[0].options.max_completion_tokens, 1100);
  assert.equal("max_tokens" in calls[0].options, false);
  assert.equal(calls[0].options.response_format.type, "json_object");
  assert.equal(calls[0].options.messages.at(-1).role, "user");
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
