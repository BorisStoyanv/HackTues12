import {
  VERIFF_BACKEND_URL,
  VERIFF_CALLBACK_URL,
} from "@/lib/env";
import { VeriffSessionRecord } from "@/lib/veriff";

type CreateVeriffSessionInput = {
  callback?: string;
  firstName: string;
  lastName: string;
  vendorData: string;
};

type CreateVeriffSessionResponse = {
  sessionId: string;
  url: string;
};

function parseErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  return fallback;
}

function describeVeriffNetworkError(error: unknown) {
  const backendUrl = getVeriffBackendUrl();
  let hostname = backendUrl;

  try {
    hostname = new URL(backendUrl).hostname;
  } catch {
    // Keep the raw backend URL if parsing fails.
  }

  const baseMessage =
    error instanceof Error && error.message
      ? error.message
      : "The Veriff backend could not be reached.";

  return `Could not reach the Veriff backend at ${backendUrl}. ${baseMessage}. If this is a temporary tunnel host, it likely expired or DNS is not resolving for ${hostname}.`;
}

export function getVeriffBackendUrl() {
  return VERIFF_BACKEND_URL.replace(/\/$/, "");
}

export function getVeriffApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getVeriffBackendUrl()}${normalizedPath}`;
}

function normalizeVeriffCallbackUrl(callbackUrl: string) {
  if (!callbackUrl) {
    return "";
  }

  try {
    const parsed = new URL(callbackUrl);
    const normalizedPath = parsed.hash.startsWith("#/")
      ? parsed.hash.slice(1)
      : parsed.pathname && parsed.pathname !== "/"
        ? parsed.pathname
        : "/dashboard/verification";

    const canonicalPath =
      normalizedPath === "/dashboard" || normalizedPath === "/"
        ? "/dashboard/verification"
        : normalizedPath;

    return `${parsed.origin}${canonicalPath}`;
  } catch {
    return callbackUrl;
  }
}

export function getVeriffCallbackUrl() {
  return normalizeVeriffCallbackUrl(VERIFF_CALLBACK_URL);
}

export async function createVeriffSession(
  input: CreateVeriffSessionInput,
): Promise<CreateVeriffSessionResponse> {
  let response: Response;
  try {
    response = await fetch(getVeriffApiUrl("/api/veriff/sessions"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        callback: input.callback ?? getVeriffCallbackUrl(),
        firstName: input.firstName,
        lastName: input.lastName,
        vendorData: input.vendorData,
      }),
    });
  } catch (error) {
    throw new Error(describeVeriffNetworkError(error));
  }

  const payload = await response
    .json()
    .catch(() => null);

  if (!response.ok || !payload?.sessionId || !payload?.url) {
    throw new Error(
      parseErrorMessage(payload, "Failed to start Veriff session."),
    );
  }

  return payload as CreateVeriffSessionResponse;
}

export async function fetchVeriffSessionStatus(sessionId: string) {
  let response: Response;
  try {
    response = await fetch(
      `${getVeriffApiUrl("/api/veriff/status")}?sessionId=${encodeURIComponent(sessionId)}`,
      {
        cache: "no-store",
      },
    );
  } catch (error) {
    throw new Error(describeVeriffNetworkError(error));
  }

  const payload = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    throw new Error(
      parseErrorMessage(payload, "Failed to fetch Veriff session status."),
    );
  }

  return (payload?.session ?? null) as VeriffSessionRecord | null;
}
