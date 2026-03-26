import dotenv from "dotenv";

dotenv.config();

function parsePort(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export const config = {
  port: parsePort(process.env.PORT, 8080),
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  openRouterBaseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  openRouterHttpReferer: process.env.OPENROUTER_HTTP_REFERER || "",
  openRouterAppName: process.env.OPENROUTER_APP_NAME || "HackTues12 AI Engine",
};

export function assertConfig() {
  if (!config.openRouterApiKey) {
    throw new Error("Missing OPENROUTER_API_KEY environment variable");
  }
}
