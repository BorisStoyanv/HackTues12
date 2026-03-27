export const VERIFF_PENDING_SESSION_KEY = "openfairtrip.veriff.pending-session";

export type PendingVeriffSession = {
  sessionId: string;
  role: "funder" | "regional";
  startedAt: string;
};

export type VeriffSessionRecord = {
  sessionId: string;
  vendorData: string | null;
  endUserId: string | null;
  status: string;
  code: number | null;
  reason: string | null;
  reasonCode: string | null;
  decisionTime: string | null;
  updatedAt: string;
};

export function isApprovedVeriffStatus(status?: string | null) {
  return status?.toLowerCase() === "approved";
}

export function isRejectedVeriffStatus(status?: string | null) {
  const normalized = status?.toLowerCase();

  return normalized === "declined" ||
    normalized === "abandoned" ||
    normalized === "expired" ||
    normalized === "resubmission_requested";
}
