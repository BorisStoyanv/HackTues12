const DEFAULT_VERIFF_BACKEND_URL = "https://ai.open-ft.app/kyc";

export function getVeriffBackendUrl() {
  return (process.env.NEXT_PUBLIC_VERIFF_BACKEND_URL || DEFAULT_VERIFF_BACKEND_URL).replace(/\/$/, "");
}

export function getVeriffApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getVeriffBackendUrl()}${normalizedPath}`;
}
