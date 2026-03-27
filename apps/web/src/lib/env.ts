const DEFAULT_BACKEND_CANISTER_ID = "sk6yb-aqaaa-aaaad-qljxa-cai";
const DEFAULT_FRONTEND_CANISTER_ID = "htkot-kiaaa-aaaaa-qgtsa-cai";
const DEFAULT_II_URL = "https://identity.ic0.app";
const DEFAULT_AI_WORKER_URL = "https://ai.open-ft.app";
const DEFAULT_VERIFF_BACKEND_URL = "http://127.0.0.1:8787";

export const DFX_NETWORK =
  process.env.NEXT_PUBLIC_DFX_NETWORK ??
  process.env.DFX_NETWORK ??
  "ic";
export const IS_LOCAL = DFX_NETWORK !== "ic";

export const BACKEND_CANISTER_ID =
  process.env.NEXT_PUBLIC_BACKEND_CANISTER_ID ??
  process.env.CANISTER_ID_ICP_PROPOSALS_MVP ??
  DEFAULT_BACKEND_CANISTER_ID;

export const FRONTEND_CANISTER_ID =
  process.env.NEXT_PUBLIC_FRONTEND_CANISTER_ID ??
  process.env.CANISTER_ID_ICP_PROPOSALS_MVP_FRONTEND ??
  DEFAULT_FRONTEND_CANISTER_ID;

export const INTERNET_IDENTITY_CANISTER_ID =
  process.env.CANISTER_ID_INTERNET_IDENTITY ?? "";

export const INTERNET_IDENTITY_URL =
  process.env.NEXT_PUBLIC_II_URL ?? DEFAULT_II_URL;

export const MAPBOX_API_KEY =
  process.env.NEXT_PUBLIC_MAPBOX_API_KEY ?? "";

export const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

export const VERIFF_BACKEND_URL =
  process.env.NEXT_PUBLIC_VERIFF_BACKEND_URL?.replace(/\/$/, "") ??
  DEFAULT_VERIFF_BACKEND_URL;

export const VERIFF_PUBLIC_API_KEY =
  process.env.NEXT_PUBLIC_VERIFF_API_KEY ?? "";

export const VERIFF_CALLBACK_URL =
  process.env.NEXT_PUBLIC_VERIFF_CALLBACK_URL ??
  (APP_URL ? `${APP_URL}/dashboard/verification` : "");

const RAW_AI_WORKER_URL =
  process.env.AI_WORKER_URL ??
  process.env.NEXT_PUBLIC_AI_WORKER_URL ??
  DEFAULT_AI_WORKER_URL;

export const AI_WORKER_URL =
  typeof window !== "undefined" &&
  window.location.protocol === "https:" &&
  RAW_AI_WORKER_URL.startsWith("http://")
    ? process.env.NEXT_PUBLIC_AI_WORKER_URL ??
      RAW_AI_WORKER_URL.replace(/^http:\/\//, "https://").replace(/:8080$/, "")
    : RAW_AI_WORKER_URL;

export const REPLICA_HOST = IS_LOCAL
  ? "http://127.0.0.1:4943"
  : "https://icp-api.io";

export const FRONTEND_CANISTER_ORIGIN =
  IS_LOCAL || !FRONTEND_CANISTER_ID
    ? ""
    : `https://${FRONTEND_CANISTER_ID}.icp0.io`;

function isSafariBrowser() {
  if (typeof window === "undefined") {
    return false;
  }

  return /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);
}

export function getIdentityProviderUrl() {
  if (typeof window === "undefined") {
    return INTERNET_IDENTITY_URL;
  }

  if (!IS_LOCAL || !INTERNET_IDENTITY_CANISTER_ID) {
    return INTERNET_IDENTITY_URL;
  }

  const port = window.location.port || "4943";

  if (isSafariBrowser()) {
    return `http://localhost:${port}/?canisterId=${INTERNET_IDENTITY_CANISTER_ID}`;
  }

  return `http://${INTERNET_IDENTITY_CANISTER_ID}.localhost:${port}`;
}

export function getDerivationOrigin() {
  if (typeof window === "undefined") {
    return undefined;
  }

  if (IS_LOCAL || !FRONTEND_CANISTER_ORIGIN) {
    return undefined;
  }

  return window.location.origin === FRONTEND_CANISTER_ORIGIN
    ? undefined
    : FRONTEND_CANISTER_ORIGIN;
}
