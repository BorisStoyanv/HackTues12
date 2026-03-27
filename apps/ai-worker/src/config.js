import dotenv from "dotenv";

dotenv.config();

function parsePort(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

export const config = {
  port: parsePort(process.env.PORT, 8080),
  httpsPort: parsePort(process.env.HTTPS_PORT, 443),
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  openRouterBaseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  openRouterHttpReferer: process.env.OPENROUTER_HTTP_REFERER || "",
  openRouterAppName: process.env.OPENROUTER_APP_NAME || "HackTues12 AI Engine",
  tlsKeyPath: process.env.TLS_KEY_PATH || "",
  tlsCertPath: process.env.TLS_CERT_PATH || "",
  tlsCaPath: process.env.TLS_CA_PATH || "",
  httpsOnly: parseBoolean(process.env.HTTPS_ONLY, false),
};

export function assertConfig() {
  if (!config.openRouterApiKey) {
    throw new Error("Missing OPENROUTER_API_KEY environment variable");
  }

  const hasTlsKey = Boolean(config.tlsKeyPath);
  const hasTlsCert = Boolean(config.tlsCertPath);

  if (hasTlsKey !== hasTlsCert) {
    throw new Error(
      "TLS_KEY_PATH and TLS_CERT_PATH must both be set to enable HTTPS",
    );
  }
}

export function hasTlsConfig() {
  return Boolean(config.tlsKeyPath && config.tlsCertPath);
}
