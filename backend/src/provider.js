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

export async function generateRoleplay(env, messages) {
  if (!env || !env.AI || typeof env.AI.run !== "function") {
    const error = new Error("Workers AI binding is unavailable");
    error.code = "AI_BINDING_MISSING";
    throw error;
  }

  const model = String(env.AI_MODEL || DEFAULT_MODEL);
  const isQwen3 = /\/qwen\/qwen3(?:-|\.)/i.test(model);
  const preparedMessages = isQwen3 ? messages.map((message, index) => {
    if (index !== messages.length - 2 || message.role !== "system") return message;
    return { ...message, content: `${message.content}\n/no_think` };
  }) : messages;
  const maximumOutput = positiveInteger(env.MAX_OUTPUT_TOKENS, 1100, 2000);
  const options = {
    messages: preparedMessages,
    temperature: 0.62,
    top_p: 0.92,
    repetition_penalty: 1.04,
    response_format: { type: "json_object" }
  };
  if (isQwen3) options.max_tokens = maximumOutput;
  else {
    options.max_completion_tokens = maximumOutput;
    options.chat_template_kwargs = { enable_thinking: false };
  }

  try {
    return await env.AI.run(model, options);
  } catch (error) {
    if (!isJsonModeFailure(error)) throw error;
    const fallbackOptions = { ...options };
    delete fallbackOptions.response_format;
    return env.AI.run(model, fallbackOptions);
  }
}
