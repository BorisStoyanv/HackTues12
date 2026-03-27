"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  buildKycRetryUrl,
  getKycRetryRoute,
} from "@/lib/kyc-routing";
import { useVeriffSessionStatus } from "@/hooks/use-veriff-session-status";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Globe,
  Loader2,
  MapPin,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

export default function VerificationPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const {
    pendingSession,
    hasPendingSession,
    veriffSession,
    isChecking,
    isFinalizing,
    rejection,
    acknowledgeRejection,
  } = useVeriffSessionStatus();

  useEffect(() => {
    if (!rejection) {
      return;
    }

    const role = acknowledgeRejection();
    router.replace(buildKycRetryUrl(role, rejection.status, rejection.reason));
  }, [acknowledgeRejection, rejection, router]);

  useEffect(() => {
    if (user?.kyc_status === "verified" && !hasPendingSession) {
      router.replace("/dashboard");
    }
  }, [hasPendingSession, router, user?.kyc_status]);

  const effectiveKycStatus =
    user?.kyc_status === "verified"
      ? "verified"
      : hasPendingSession || user?.kyc_status === "pending"
        ? "pending"
        : "unverified";

  const retryRoute = getKycRetryRoute(
    pendingSession?.role === "funder" ? "funder" : user?.role,
  );

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="shrink-0 border-b bg-neutral-50/30 px-6 py-8 dark:bg-neutral-950/30 md:px-12">
        <div className="mx-auto max-w-4xl space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <UserCheck className="h-5 w-5 text-primary" />
            Identity & Verification
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Track the Veriff decision, the canister verification flag, and the
            current regional anchor used by OpenFairTrip.
          </p>
        </div>
      </div>

      <div className="px-6 py-10 md:px-12">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="overflow-hidden rounded-2xl border-neutral-200 shadow-sm dark:border-neutral-800">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest">
                  Protocol Status
                </CardDescription>
                <CardTitle className="flex items-center justify-between text-xl font-bold">
                  {effectiveKycStatus === "verified"
                    ? "Verified Participant"
                    : effectiveKycStatus === "pending"
                      ? "Verification Pending"
                      : "Verification Required"}
                  <Badge
                    className={cn(
                      "rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-widest",
                      effectiveKycStatus === "verified"
                        ? "bg-green-500 text-white"
                        : effectiveKycStatus === "pending"
                          ? "bg-blue-500 text-white"
                          : "bg-amber-500 text-white",
                    )}
                  >
                    {effectiveKycStatus}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mt-4 flex items-center gap-4 border-t border-neutral-100 pt-4 dark:border-neutral-900">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold tracking-tight">
                      {isFinalizing
                        ? "Canister sync in progress"
                        : veriffSession?.status
                          ? `Veriff: ${veriffSession.status}`
                          : "Awaiting KYC start"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isFinalizing
                        ? "Veriff approved the session. Waiting for the on-chain verified flag."
                        : effectiveKycStatus === "pending"
                          ? "The app is polling Veriff for the latest decision."
                          : "You must complete Veriff before dashboard access unlocks."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-2xl border-none bg-primary text-primary-foreground shadow-xl shadow-primary/20">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/70">
                  Current Session
                </CardDescription>
                <CardTitle className="text-4xl font-black tracking-tighter">
                  {hasPendingSession ? "Open" : "Idle"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="pt-2 text-xs font-medium leading-relaxed opacity-80">
                  {pendingSession
                    ? `Active Veriff flow for ${pendingSession.role}.`
                    : "No pending Veriff session is stored in this browser."}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden rounded-2xl border-dashed border-neutral-200 shadow-none dark:border-neutral-800">
            <CardHeader className="p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-xl font-bold">
                    <MapPin className="h-5 w-5 text-primary" />
                    Regional Anchor
                  </CardTitle>
                  <CardDescription className="max-w-2xl text-base leading-relaxed">
                    Community users still need a saved region in addition to the
                    Veriff identity decision.
                  </CardDescription>
                </div>
                {user?.geo_verified && (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6 px-8 pb-8">
              <div className="flex flex-col justify-between gap-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900 md:flex-row md:items-center">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-background shadow-sm dark:border-neutral-800">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Current Anchor
                    </p>
                    <p className="text-lg font-bold tracking-tight">
                      {user?.detected_location?.city ||
                        user?.home_region ||
                        "Not Anchored"}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest"
                >
                  {user?.geo_verified ? "Location Saved" : "Needs Region"}
                </Badge>
              </div>

              {veriffSession?.reason ? (
                <div className="flex gap-4 rounded-xl border border-blue-100 bg-blue-50/30 p-4 dark:border-blue-900/30 dark:bg-blue-950/10">
                  <AlertCircle className="h-5 w-5 shrink-0 text-blue-500" />
                  <p className="text-xs font-medium leading-relaxed text-blue-800 dark:text-blue-300">
                    Latest Veriff reason: {veriffSession.reason}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-2xl border-neutral-200 shadow-sm dark:border-neutral-800">
            <CardHeader>
              <CardTitle className="text-xl font-bold">KYC Actions</CardTitle>
              <CardDescription>
                Resume the current Veriff flow or restart the correct onboarding
                path for this account type.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button onClick={() => router.push(retryRoute)}>
                {effectiveKycStatus === "verified"
                  ? "Review Verification Flow"
                  : "Continue KYC"}
              </Button>
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Return to Dashboard
              </Button>
              {isChecking ? (
                <div className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-muted-foreground dark:border-neutral-800">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking Veriff status...
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
