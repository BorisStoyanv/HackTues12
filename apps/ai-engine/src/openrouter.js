import { config } from "./config.js";

function normalizeContent(content) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item.text === "string") {
          return item.text;
        }

        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

export async function callOpenRouter({
  model,
  systemPrompt,
  userPrompt,
  temperature = 0.2,
  maxTokens = 700,
  includeReasoning,
  reasoning,
}) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.openRouterApiKey}`,
    "X-Title": config.openRouterAppName,
  };

  if (config.openRouterHttpReferer) {
    headers["HTTP-Referer"] = config.openRouterHttpReferer;
  }

  const payload = {
    model,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };

  if (typeof temperature === "number") {
    payload.temperature = temperature;
  }

  if (typeof includeReasoning === "boolean") {
    payload.include_reasoning = includeReasoning;
  }

  if (reasoning) {
    payload.reasoning = reasoning;
  }

  const response = await fetch(`${config.openRouterBaseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  const text = normalizeContent(content);

  if (!text) {
    throw new Error(`OpenRouter returned empty content for model ${model}`);
  }

  return text;
}
