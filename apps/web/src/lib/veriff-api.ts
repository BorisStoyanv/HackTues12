const DEFAULT_VERIFF_BACKEND_URL = "http://127.0.0.1:8787";

export function getVeriffBackendUrl() {
  return (process.env.NEXT_PUBLIC_VERIFF_BACKEND_URL || DEFAULT_VERIFF_BACKEND_URL).replace(/\/$/, "");
}

export function getVeriffApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getVeriffBackendUrl()}${normalizedPath}`;
}
