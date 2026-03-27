export function getDefaultDisplayName(principal: string | null | undefined) {
  if (!principal) {
    return "OpenFT User";
  }

  return `OpenFT ${principal.slice(0, 5)}`;
}

export function normalizeRegionTag(value: string) {
  const trimmed = value.trim().toLowerCase();

  if (!trimmed) {
    return "";
  }

  const normalized = trimmed.normalize("NFKD");
  const asciiSlug = normalized
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (asciiSlug) {
    return asciiSlug;
  }

  return trimmed
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}
