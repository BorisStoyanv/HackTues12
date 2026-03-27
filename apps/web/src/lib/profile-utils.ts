export function getDefaultDisplayName(principal: string | null | undefined) {
  if (!principal) {
    return "OpenFT User";
  }

  return `OpenFT ${principal.slice(0, 5)}`;
}

export function normalizeRegionTag(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/\s+/g, "_");
}
