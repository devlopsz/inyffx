export const DEFAULT_MODEL = "@cf/zai-org/glm-4.7-flash";

function positiveInteger(value, fallback, maximum) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, maximum);
}

function isJsonModeFailure(error) {
  const message = String(error && error.message ? error.message : error || "");
  return /json|schema|response[_ -]?format|structured/i.test(message);
}

export async function generateRoleplay(env, messages) {
  if (!env || !env.AI || typeof env.AI.run !== "function") {
    const error = new Error("Workers AI binding is unavailable");
    error.code = "AI_BINDING_MISSING";
    throw error;
  }

  const model = String(env.AI_MODEL || DEFAULT_MODEL);
  const options = {
    messages,
    max_tokens: positiveInteger(env.MAX_OUTPUT_TOKENS, 1100, 2000),
    temperature: 0.78,
    top_p: 0.92,
    repetition_penalty: 1.04,
    response_format: { type: "json_object" }
  };

  try {
    return await env.AI.run(model, options);
  } catch (error) {
    if (!isJsonModeFailure(error)) throw error;
    const fallbackOptions = { ...options };
    delete fallbackOptions.response_format;
    return env.AI.run(model, fallbackOptions);
  }
}
