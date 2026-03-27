import {
  PendingVeriffSession,
  VERIFF_PENDING_SESSION_KEY,
} from "@/lib/veriff";

export function readPendingVeriffSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(VERIFF_PENDING_SESSION_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as PendingVeriffSession;
  } catch {
    window.localStorage.removeItem(VERIFF_PENDING_SESSION_KEY);
    return null;
  }
}

export function writePendingVeriffSession(session: PendingVeriffSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    VERIFF_PENDING_SESSION_KEY,
    JSON.stringify(session),
  );
}

export function clearPendingVeriffSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(VERIFF_PENDING_SESSION_KEY);
}
