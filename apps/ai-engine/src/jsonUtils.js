export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function extractJsonObject(text) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // no-op; will attempt balanced object extraction below.
  }

  const start = trimmed.indexOf("{");
  if (start < 0) {
    throw new Error("Model output does not contain a JSON object");
  }

  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let i = start; i < trimmed.length; i += 1) {
    const char = trimmed[i];

    if (inString) {
      if (escaping) {
        escaping = false;
        continue;
      }

      if (char === "\\") {
        escaping = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        const candidate = trimmed.slice(start, i + 1);
        return JSON.parse(candidate);
      }
    }
  }

  throw new Error("Failed to parse JSON object from model output");
}
