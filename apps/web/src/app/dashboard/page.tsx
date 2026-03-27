"use client";

import { useAuthStore } from "@/lib/auth-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  ShieldCheck, 
  MapPin,
  TrendingUp,
  Activity,
  AlertCircle,
  Clock,
  CheckCircle2
} from "lucide-react";

import { useState, useEffect } from "react";
import { fetchMyVP, fetchMyProfile, SerializedUserProfile } from "@/lib/actions/users";
import { fetchAllProposals, SerializedProposal } from "@/lib/actions/proposals";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { clearPendingVeriffSession, readPendingVeriffSession } from "@/lib/veriff-browser";
import { getVeriffApiUrl } from "@/lib/veriff-api";
import { isApprovedVeriffStatus, isRejectedVeriffStatus, VeriffSessionRecord } from "@/lib/veriff";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const setKycStatus = useAuthStore((state) => state.setKycStatus);
  const router = useRouter();
  const [realVP, setRealVP] = useState<number | null>(null);
  const [profile, setProfile] = useState<SerializedUserProfile | null>(null);
  const [proposals, setProposals] = useState<SerializedProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [veriffSession, setVeriffSession] = useState<VeriffSessionRecord | null>(null);
  const [isCheckingVeriff, setIsCheckingVeriff] = useState(false);
  const [hasPendingVeriffSession, setHasPendingVeriffSession] = useState(false);

  useEffect(() => {
    async function loadBackendData() {
      setIsLoading(true);
      try {
        const [vpRes, profileRes, proposalsRes] = await Promise.all([
          fetchMyVP(),
          fetchMyProfile(),
          fetchAllProposals()
        ]);

        if (vpRes.success && typeof vpRes.vp === "number") setRealVP(vpRes.vp);
        if (profileRes.success && profileRes.profile) setProfile(profileRes.profile);
        if (proposalsRes.success && proposalsRes.proposals) {
          // Filter to active proposals, prioritize current user's region
          const region = profileRes.profile?.home_region || "global";
          const sorted = proposalsRes.proposals
            .filter(p => p.status === "Active" || p.status === "AwaitingFunding")
            .sort((a, b) => (a.region_tag === region ? -1 : 1));
          setProposals(sorted.slice(0, 5));
        }
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (user?.id) {
      loadBackendData();
    } else {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    const pendingSession = readPendingVeriffSession();
    setHasPendingVeriffSession(pendingSession !== null);

    if (!pendingSession) {
      return;
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const checkStatus = async () => {
      setIsCheckingVeriff(true);

      try {
        const response = await fetch(`${getVeriffApiUrl("/api/veriff/status")}?sessionId=${pendingSession.sessionId}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (cancelled) {
          return;
        }

        const session = (data.session ?? null) as VeriffSessionRecord | null;
        setVeriffSession(session);

        if (!session?.status) {
          return;
        }

        if (isApprovedVeriffStatus(session.status)) {
          clearPendingVeriffSession();
          setHasPendingVeriffSession(false);
          setKycStatus("verified");
          setProfile((currentProfile) =>
            currentProfile
              ? { ...currentProfile, is_verified: true, kyc_status: "verified" }
              : currentProfile
          );

          if (intervalId) {
            clearInterval(intervalId);
          }
        }

        if (isRejectedVeriffStatus(session.status)) {
          clearPendingVeriffSession();
          setHasPendingVeriffSession(false);
          setKycStatus("unverified");

          if (intervalId) {
            clearInterval(intervalId);
          }
        }
      } catch (error) {
        console.error("Failed to check Veriff status:", error);
      } finally {
        if (!cancelled) {
          setIsCheckingVeriff(false);
        }
      }
    };

    void checkStatus();
    intervalId = setInterval(() => {
      void checkStatus();
    }, 5000);

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [setKycStatus]);

  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4 bg-background">
        <ShieldCheck className="h-12 w-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-medium tracking-tight">Authentication Required</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Please sign in to access your governance dashboard and view regional analytics.
        </p>
      </div>
    );
  }

  const effectiveKycStatus =
    profile?.kyc_status === "verified" || user.kyc_status === "verified"
      ? "verified"
      : user.kyc_status === "pending"
        ? "pending"
        : profile?.kyc_status ?? user.kyc_status;

  const statCards = [
    {
      title: "Voting Power (VP)",
      value: realVP !== null ? realVP.toLocaleString() : (isLoading ? "—" : "0"),
      description: "Cryptographic influence weight",
      icon: Activity,
      trend: realVP && realVP > 0 ? "Active Participant" : "Needs Engagement",
      trendPositive: realVP && realVP > 0,
    },
    {
      title: "Reputation Score",
      value: profile ? profile.reputation.toLocaleString() : (isLoading ? "—" : "100"),
      description: "Based on historical accuracy",
      icon: TrendingUp,
      trend: "Top 15% in region",
      trendPositive: true,
    },
    {
      title: "Regional Anchor",
      value: profile?.home_region || user.detected_location?.city || "Unassigned",
      description: "Primary governance zone",
      icon: MapPin,
      trend: "Verified Status",
      trendPositive: profile?.is_verified || user.geo_verified,
    },
    {
      title: "Identity Tier",
      value: profile?.user_type === "InvestorUser" ? "Capital Provider" : "Citizen",
      description: "Platform clearance level",
      icon: ShieldCheck,
      trend: effectiveKycStatus === "verified" ? "KYC Completed" : effectiveKycStatus === "pending" ? "KYC Pending" : "Standard Tier",
      trendPositive: effectiveKycStatus === "verified",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-10">
        {(hasPendingVeriffSession || veriffSession) && (
          <Card className={cn(
            "border shadow-sm",
            isApprovedVeriffStatus(veriffSession?.status)
              ? "border-green-200 bg-green-50/60 dark:border-green-900/40 dark:bg-green-950/10"
              : isRejectedVeriffStatus(veriffSession?.status)
                ? "border-red-200 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/10"
                : "border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/10"
          )}>
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Veriff KYC
                </p>
                <p className="text-sm font-medium text-foreground">
                  {isApprovedVeriffStatus(veriffSession?.status)
                    ? "Your Veriff decision is approved. Verified access is now unlocked."
                    : isRejectedVeriffStatus(veriffSession?.status)
                      ? `Your Veriff decision came back as ${veriffSession?.status}.`
                      : isCheckingVeriff
                        ? "Checking Veriff for the latest KYC decision..."
                        : "Your verification was started. We're waiting for Veriff's decision webhook."}
                </p>
                {veriffSession?.reason && (
                  <p className="text-xs text-muted-foreground">
                    Reason: {veriffSession.reason}
                  </p>
                )}
              </div>

              {!isApprovedVeriffStatus(veriffSession?.status) && (
                <Button onClick={() => router.push("/onboarding/kyc")}>
                  Review KYC Flow
                </Button>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-200 dark:border-neutral-800">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Connected to OpenFairTrip Ledger
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
               <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Principal ID</p>
               <p className="text-xs font-mono bg-neutral-100 dark:bg-neutral-900 px-2 py-1 rounded border border-neutral-200 dark:border-neutral-800">
                 {user.id.substring(0, 15)}...
               </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, i) => (
            <Card key={i} className="border-neutral-200 dark:border-neutral-800 shadow-sm transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground opacity-50" />
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-3xl font-bold tracking-tight mb-1",
                  stat.value === "—" && "text-muted-foreground/30 animate-pulse"
                )}>
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mb-4 h-4">
                  {stat.description}
                </p>
                <div className={cn(
                  "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm",
                  stat.trendPositive 
                    ? "bg-green-500/10 text-green-700 dark:text-green-400" 
                    : "bg-neutral-100 dark:bg-neutral-800 text-muted-foreground"
                )}>
                   {stat.trendPositive ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                   {stat.trend}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Areas */}
        <div className="grid gap-6 md:grid-cols-3">
           
           {/* Governance Activity */}
           <Card className="col-span-2 border-neutral-200 dark:border-neutral-800 shadow-sm">
              <CardHeader className="border-b border-neutral-100 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-900/20 pb-4">
                 <div className="flex items-center justify-between">
                   <CardTitle className="text-base font-semibold">Governance Activity</CardTitle>
                   <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded">Past 30 Days</span>
                 </div>
              </CardHeader>
              <CardContent className="p-0">
                 <div className="h-[300px] flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-4">
                    <BarChart3 className="h-10 w-10 opacity-20" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">No recent voting activity</p>
                      <p className="text-xs">Participate in regional proposals to build your reputation graph.</p>
                    </div>
                 </div>
              </CardContent>
           </Card>

           {/* Regional Alerts */}
           <Card className="col-span-1 border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col">
              <CardHeader className="border-b border-neutral-100 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-900/20 pb-4">
                 <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Action Required
                 </CardTitle>
                 <CardDescription className="text-xs">
                    Active proposals in your region
                 </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                 <div className="divide-y divide-neutral-100 dark:divide-neutral-900 h-full overflow-y-auto">
                    {isLoading ? (
                      <div className="p-6 flex flex-col gap-4">
                         {[1, 2, 3].map(i => (
                           <div key={i} className="flex gap-3 items-start animate-pulse">
                              <div className="w-2 h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 mt-1.5" />
                              <div className="space-y-2 flex-1">
                                <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-full" />
                                <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded w-2/3" />
                              </div>
                           </div>
                         ))}
                      </div>
                    ) : proposals.length > 0 ? (
                      proposals.map((p) => (
                        <div 
                          key={p.id} 
                          onClick={() => router.push(`/dashboard/proposals/${p.id}`)}
                          className="flex items-start gap-3 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors cursor-pointer group"
                        >
                           <div className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-primary ring-4 ring-primary/10" />
                           <div className="flex-1 min-w-0 space-y-1">
                              <p className="text-sm font-medium leading-snug truncate group-hover:text-primary transition-colors">
                                {p.title}
                              </p>
                              <div className="flex items-center justify-between">
                                 <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                                   {p.status}
                                 </span>
                                 <span className="text-[10px] font-bold text-foreground font-mono">
                                   {p.budget_amount ? `$${p.budget_amount.toLocaleString()}` : 'TBD'}
                                 </span>
                              </div>
                           </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-2 min-h-[250px]">
                         <CheckCircle2 className="h-8 w-8 opacity-20" />
                         <p className="text-xs">All caught up! No active proposals require your attention right now.</p>
                      </div>
                    )}
                 </div>
              </CardContent>
           </Card>
        </div>

      </div>
    </div>
  );
}
