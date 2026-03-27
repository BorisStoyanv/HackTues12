"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { createBackendActor } from "@/lib/api/icp";
import { requestVerificationClient } from "@/lib/api/client-mutations";
import {
  clearPendingVeriffSession,
  readPendingVeriffSession,
} from "@/lib/veriff-browser";
import { fetchVeriffSessionStatus } from "@/lib/veriff-api";
import {
  isApprovedVeriffStatus,
  isRejectedVeriffStatus,
  PendingVeriffSession,
  VeriffSessionRecord,
} from "@/lib/veriff";

type RejectedVeriffSession = {
  role: PendingVeriffSession["role"];
  status: string;
  reason: string | null;
};

export function useVeriffSessionStatus() {
  const initialize = useAuthStore((state) => state.initialize);
  const identity = useAuthStore((state) => state.identity);
  const setKycStatus = useAuthStore((state) => state.setKycStatus);
  const user = useAuthStore((state) => state.user);

  const [pendingSession, setPendingSession] =
    useState<PendingVeriffSession | null>(null);
  const [veriffSession, setVeriffSession] =
    useState<VeriffSessionRecord | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [rejection, setRejection] = useState<RejectedVeriffSession | null>(
    null,
  );

  useEffect(() => {
    setPendingSession(readPendingVeriffSession());
  }, [user?.id]);

  useEffect(() => {
    const currentPending = readPendingVeriffSession();

    if (!currentPending || !user?.id) {
      setPendingSession(currentPending);
      if (!currentPending) {
        setVeriffSession(null);
        setIsFinalizing(false);
        setIsChecking(false);
      }
      return;
    }

    let cancelled = false;
    let intervalId: number | null = null;

    const resolveFromVerifiedProfile = async () => {
      if (!identity) {
        return false;
      }

      const actor = await createBackendActor(identity);
      const profileResult = await actor.get_my_profile();

      if (cancelled) {
        return true;
      }

      const isVerifiedOnChain =
        profileResult.length > 0 &&
        profileResult[0]!.is_verified.length > 0 &&
        Boolean(profileResult[0]!.is_verified[0]);

      if (!isVerifiedOnChain) {
        return false;
      }

      clearPendingVeriffSession();
      setPendingSession(null);
      setVeriffSession((current) =>
        current
          ? {
              ...current,
              status: "approved",
            }
          : current,
      );
      setIsChecking(false);
      setIsFinalizing(false);
      setKycStatus("verified");
      void initialize();

      if (intervalId) {
        window.clearInterval(intervalId);
      }

      return true;
    };

    const poll = async () => {
      const livePending = readPendingVeriffSession();

      if (!livePending) {
        if (!cancelled) {
          setPendingSession(null);
          setVeriffSession(null);
          setIsChecking(false);
          setIsFinalizing(false);
        }
        if (intervalId) {
          window.clearInterval(intervalId);
        }
        return;
      }

      if (!cancelled) {
        setPendingSession(livePending);
      }

      setIsChecking(true);

      try {
        if (await resolveFromVerifiedProfile()) {
          return;
        }

        const session = await fetchVeriffSessionStatus(livePending.sessionId);

        if (cancelled) {
          return;
        }

        setVeriffSession(session);

        if (!session?.status) {
          return;
        }

        if (isApprovedVeriffStatus(session.status)) {
          setKycStatus("pending");
          setIsFinalizing(true);
          const resolvedFromChain = await resolveFromVerifiedProfile();
          if (!resolvedFromChain && identity) {
            try {
              await requestVerificationClient(identity);
            } catch (error) {
              const message =
                error instanceof Error ? error.message : "Verification update failed";
              if (!message.toLowerCase().includes("already verified")) {
                throw error;
              }
            }

            await resolveFromVerifiedProfile();
          }
          return;
        }

        if (isRejectedVeriffStatus(session.status)) {
          setRejection({
            role: livePending.role,
            status: session.status,
            reason: session.reason,
          });
          setIsFinalizing(false);

          if (intervalId) {
            window.clearInterval(intervalId);
          }
        }
      } catch (error) {
        console.error("Failed to fetch Veriff status:", error);
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    };

    void poll();
    intervalId = window.setInterval(() => {
      void poll();
    }, 5000);

    return () => {
      cancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [identity, initialize, setKycStatus, user?.id]);

  const acknowledgeRejection = useCallback(() => {
    const role = rejection?.role ?? pendingSession?.role ?? null;
    clearPendingVeriffSession();
    setPendingSession(null);
    setVeriffSession(null);
    setIsChecking(false);
    setIsFinalizing(false);
    setRejection(null);
    setKycStatus("unverified");
    return role;
  }, [pendingSession?.role, rejection?.role, setKycStatus]);

  return {
    pendingSession,
    hasPendingSession: Boolean(pendingSession),
    veriffSession,
    isChecking,
    isFinalizing,
    rejection,
    acknowledgeRejection,
  };
}
