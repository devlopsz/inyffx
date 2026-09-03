export const DEFAULT_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";

function positiveInteger(value, fallback, maximum) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, maximum);
}

function isJsonModeFailure(error) {
  const message = String(error && error.message ? error.message : error || "");
  return /json|schema|response[_ -]?format|structured/i.test(message);
}

function requireBinding(env) {
  if (env && env.AI && typeof env.AI.run === "function") return;
  const error = new Error("Workers AI binding is unavailable");
  error.code = "AI_BINDING_MISSING";
  throw error;
}

function qwenMessages(messages, isQwen3) {
  if (!isQwen3) return messages;
  let guardIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "system") { guardIndex = index; break; }
  }
  return messages.map((message, index) => index === guardIndex
    ? { ...message, content: `${message.content}\n/no_think` }
    : message);
}

function outputLimit(options, isQwen3, tokens) {
  if (isQwen3) options.max_tokens = tokens;
  else {
    options.max_completion_tokens = tokens;
    options.chat_template_kwargs = { enable_thinking: false };
  }
  return options;
}

export async function generateNarrative(env, messages, generation = {}) {
  requireBinding(env);
  const model = String(env.AI_MODEL || DEFAULT_MODEL);
  const isQwen3 = /\/qwen\/qwen3(?:-|\.)/i.test(model);
  const maximumOutput = positiveInteger(generation.maxTokens || env.MAX_OUTPUT_TOKENS, 1800, 2000);
  const options = outputLimit({
    messages: qwenMessages(messages, isQwen3),
    temperature: generation.mode === "MATCH_REPORT" ? 0.66 : 0.74,
    top_p: generation.mode === "MATCH_REPORT" ? 0.94 : 0.88,
    repetition_penalty: 1.04
  }, isQwen3, maximumOutput);
  return env.AI.run(model, options);
}

export async function generateStructuredTurn(env, messages, generation = {}) {
  requireBinding(env);
  const model = String(env.AI_MODEL || DEFAULT_MODEL);
  const isQwen3 = /\/qwen\/qwen3(?:-|\.)/i.test(model);
  const maximumOutput = positiveInteger(generation.maxTokens || env.MAX_OUTPUT_TOKENS, 2000, 2000);
  const options = outputLimit({
    messages: qwenMessages(messages, isQwen3),
    temperature: generation.mode === "MATCH_REPORT" ? 0.58 : 0.68,
    top_p: generation.mode === "MATCH_REPORT" ? 0.9 : 0.86,
    repetition_penalty: 1.04,
    response_format: { type: "json_object" }
  }, isQwen3, maximumOutput);

  try {
    return await env.AI.run(model, options);
  } catch (error) {
    if (!isJsonModeFailure(error)) throw error;
    const fallbackOptions = { ...options };
    delete fallbackOptions.response_format;
    return env.AI.run(model, fallbackOptions);
  }
}

export async function generateMemoryUpdates(env, messages) {
  requireBinding(env);
  const model = String(env.AI_MEMORY_MODEL || env.AI_MODEL || DEFAULT_MODEL);
  const isQwen3 = /\/qwen\/qwen3(?:-|\.)/i.test(model);
  const maximumOutput = positiveInteger(env.MAX_MEMORY_TOKENS, 900, 1400);
  const options = outputLimit({
    messages: qwenMessages(messages, isQwen3),
    temperature: 0.18,
    top_p: 0.8,
    repetition_penalty: 1.02,
    response_format: { type: "json_object" }
  }, isQwen3, maximumOutput);

  try {
    return await env.AI.run(model, options);
  } catch (error) {
    if (!isJsonModeFailure(error)) throw error;
    const fallbackOptions = { ...options };
    delete fallbackOptions.response_format;
    return env.AI.run(model, fallbackOptions);
  }
}

export const generateRoleplay = generateNarrative;
