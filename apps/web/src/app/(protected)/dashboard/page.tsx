"use client";

import { useAuthStore } from "@/lib/auth-store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ShieldCheck,
  MapPin,
  TrendingUp,
  Activity,
  Clock,
  ArrowRight,
  FileText,
  Briefcase,
  History,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  fetchAllProposals,
  fetchAuditLogs,
  fetchMyProposals,
  fetchAllContracts,
  SerializedProposal,
  SerializedContract,
  SerializedAuditLog
} from "@/lib/actions/proposals";
import { createBackendActor } from "@/lib/api/icp";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type DashboardProfile = {
  reputation: number;
  homeRegion: string | null;
  isLocalVerified: boolean;
  isVerified: boolean;
  userType: "User" | "InvestorUser";
};

function formatMetric(value: number | null, digits = 1) {
  if (value === null || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: value % 1 === 0 ? 0 : digits,
    maximumFractionDigits: digits,
  });
}

function formatActivityTime(timestamp: number) {
  return new Date(timestamp / 1_000_000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const identity = useAuthStore((state) => state.identity);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();
  
  const [realVP, setRealVP] = useState<number | null>(null);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [activeProposals, setActiveProposals] = useState<SerializedProposal[]>([]);
  const [myProposals, setMyProposals] = useState<SerializedProposal[]>([]);
  const [myContracts, setMyContracts] = useState<SerializedContract[]>([]);
  const [globalLogs, setGlobalLogs] = useState<SerializedAuditLog[]>([]);
  const [globalStats, setGlobalStats] = useState({ budget: 0, pledged: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadBackendData() {
      if (!identity) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const actor = await createBackendActor(identity);
        const profileResult = await actor.get_my_profile();

        const resolvedProfile =
          profileResult.length > 0
            ? {
                reputation: Number(profileResult[0]!.reputation),
                homeRegion:
                  profileResult[0]!.home_region.length > 0
                    ? profileResult[0]!.home_region[0]!
                    : null,
                isLocalVerified: profileResult[0]!.is_local_verified,
                isVerified:
                  profileResult[0]!.is_verified.length > 0
                    ? Boolean(profileResult[0]!.is_verified[0])
                    : false,
                userType:
                  "InvestorUser" in profileResult[0]!.user_type
                    ? ("InvestorUser" as const)
                    : ("User" as const),
              }
            : null;

        setProfile(resolvedProfile);

        const vpRegion = resolvedProfile?.homeRegion || user?.home_region || "global";
        const currentPrincipal = user?.id || identity.getPrincipal().toString();

        const [vpRes, allPropsRes, auditRes, myPropsRes, allContractsRes] = await Promise.all([
          actor.get_my_vp(vpRegion),
          fetchAllProposals(),
          fetchAuditLogs(50, 0),
          fetchMyProposals(currentPrincipal),
          fetchAllContracts()
        ]);

        setRealVP("Ok" in vpRes ? Number(vpRes.Ok) : null);

        if (allPropsRes.success && allPropsRes.proposals) {
          const region = resolvedProfile?.homeRegion || user?.home_region || "global";
          const sortedActive = allPropsRes.proposals
            .filter((p) => p.status === "Active" || p.status === "AwaitingFunding")
            .sort((a, b) => (a.region_tag === region ? -1 : b.region_tag === region ? 1 : 0));
          setActiveProposals(sortedActive.slice(0, 4));

          const totalBudget = allPropsRes.proposals.reduce((acc, p) => acc + (p.budget_amount || 0), 0);
          const totalPledged = allPropsRes.proposals.reduce((acc, p) => acc + (p.yes_weight || 0), 0);
          setGlobalStats({ budget: totalBudget, pledged: totalPledged });
        }

        if (myPropsRes.success) {
          setMyProposals(myPropsRes.proposals.slice(0, 4));
        }

        if (allContractsRes.success) {
          const relevantContracts = allContractsRes.contracts.filter(c => c.investor === currentPrincipal || c.status === "PendingSignatures");
          setMyContracts(relevantContracts.slice(0, 4));
        }

        if (auditRes.success) {
          setGlobalLogs(auditRes.logs.slice(0, 8));
        }

      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (user?.id && identity && isAuthenticated) {
      void loadBackendData();
    } else {
      setIsLoading(false);
    }
  }, [identity, isAuthenticated, user?.home_region, user?.id]);

  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4 bg-background">
        <ShieldCheck className="h-12 w-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-medium tracking-tight">Authentication Required</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Please sign in to access your governance overview.
        </p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Voting Power",
      value: isLoading ? "—" : formatMetric(realVP),
      description: "Effective weight for decisions",
      icon: Activity,
      href: "/dashboard/governance",
      actionText: "Vote",
    },
    {
      title: "Reputation",
      value: isLoading ? "—" : formatMetric(profile?.reputation ?? Number(user.reputation)),
      description: "Base trust score on-chain",
      icon: TrendingUp,
      href: "/dashboard/verification",
      actionText: "Verify",
    },
    {
      title: "Regional Anchor",
      value: profile?.homeRegion || user.home_region || user.detected_location?.city || "Global",
      description: "Primary governance zone",
      icon: MapPin,
      href: "/dashboard/settings",
      actionText: "Settings",
    },
    {
      title: "Identity Tier",
      value: (profile?.userType || (user.role === "funder" ? "InvestorUser" : "User")) === "InvestorUser" ? "Capital Provider" : "Community",
      description: "Access level on network",
      icon: ShieldCheck,
      href: "/dashboard/verification/status",
      actionText: "Check Status",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="border-b bg-neutral-50/30 dark:bg-neutral-950/30 px-6 py-6 md:px-12 shrink-0">
        <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Overview</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Live Sync Active
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:block text-right">
               <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Principal ID</p>
               <p className="text-xs font-mono bg-neutral-100 dark:bg-neutral-900 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-800 text-foreground">
                 {user.id.substring(0, 16)}...
               </p>
             </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-8 md:px-12">
        <div className="max-w-screen-2xl mx-auto space-y-8">
          
          {/* Row 1: Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {statCards.map((stat, i) => (
              <Link key={i} href={stat.href} className="block group">
                <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm transition-all hover:border-neutral-300 dark:hover:border-neutral-700 h-full flex flex-col justify-between hover:shadow-md">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 p-5">
                    <div className="space-y-1">
                      <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                        {stat.title}
                      </CardTitle>
                      <div className={cn("text-2xl font-black tracking-tight mt-1", stat.value === "—" && "text-muted-foreground/30 animate-pulse")}>
                        {stat.value}
                      </div>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                      <stat.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-0 mt-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-neutral-100 dark:border-neutral-900 pt-4 mt-2 gap-2">
                       <p className="text-[10px] text-muted-foreground">{stat.description}</p>
                       <span className="text-[10px] font-bold text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1 shrink-0">
                         {stat.actionText} <ArrowRight className="h-3 w-3" />
                       </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Row 2: Action Center */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Active Proposals */}
            <Card className="flex flex-col border-neutral-200 dark:border-neutral-800 shadow-sm">
              <CardHeader className="border-b border-neutral-100 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-900/20 p-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Action Required
                  </CardTitle>
                  <Link href="/dashboard/governance" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                    View all <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <div className="divide-y divide-neutral-100 dark:divide-neutral-900 h-full">
                  {isLoading ? (
                    <div className="p-4 space-y-4">
                      {[1, 2].map((i) => <div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-900 rounded-md animate-pulse" />)}
                    </div>
                  ) : activeProposals.length > 0 ? (
                    activeProposals.map((p) => (
                      <Link key={p.id} href={`/dashboard/proposals/detail?id=${p.id}`} className="flex flex-col gap-1.5 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors group">
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors line-clamp-1">{p.title}</p>
                          <Badge variant="outline" className="text-[10px] font-mono shrink-0">{p.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {p.region_tag}</p>
                      </Link>
                    ))
                  ) : (
                    <div className="p-8 text-center text-sm text-muted-foreground">No active proposals in your region.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* My Submissions */}
            <Card className="flex flex-col border-neutral-200 dark:border-neutral-800 shadow-sm">
              <CardHeader className="border-b border-neutral-100 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-900/20 p-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    My Submissions
                  </CardTitle>
                  <Link href="/dashboard/proposals/mine" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                    View all <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <div className="divide-y divide-neutral-100 dark:divide-neutral-900 h-full">
                  {isLoading ? (
                    <div className="p-4 space-y-4">
                      {[1, 2].map((i) => <div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-900 rounded-md animate-pulse" />)}
                    </div>
                  ) : myProposals.length > 0 ? (
                    myProposals.map((p) => (
                      <Link key={p.id} href={`/dashboard/proposals/detail?id=${p.id}`} className="flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors group">
                        <div className="min-w-0 pr-4">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{p.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">${p.budget_amount.toLocaleString()} Budget</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">{p.status}</Badge>
                      </Link>
                    ))
                  ) : (
                    <div className="p-8 flex flex-col items-center justify-center text-center space-y-3">
                      <p className="text-sm text-muted-foreground">You haven't submitted any proposals.</p>
                      <Link href="/dashboard/proposals/new" className="text-xs font-medium text-foreground hover:underline">Create New Draft</Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contracts */}
            <Card className="flex flex-col border-neutral-200 dark:border-neutral-800 shadow-sm">
              <CardHeader className="border-b border-neutral-100 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-900/20 p-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Trust Contracts
                  </CardTitle>
                  <Link href="/dashboard/contracts" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                    View all <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <div className="divide-y divide-neutral-100 dark:divide-neutral-900 h-full">
                  {isLoading ? (
                    <div className="p-4 space-y-4">
                      {[1, 2].map((i) => <div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-900 rounded-md animate-pulse" />)}
                    </div>
                  ) : myContracts.length > 0 ? (
                    myContracts.map((c) => (
                      <Link key={c.proposal_id} href={`/dashboard/contracts/detail?id=${c.proposal_id}`} className="flex flex-col gap-1.5 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors group">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors pr-2">{c.company_name}</p>
                          <Badge variant="outline" className={cn("text-[10px] shrink-0", c.status === 'Signed' ? 'border-green-500/50 text-green-600' : '')}>
                            {c.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">ID: {c.proposal_id}</p>
                      </Link>
                    ))
                  ) : (
                    <div className="p-8 text-center text-sm text-muted-foreground">No active contracts found.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Platform Pulse */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Global Capital (Stacked to match feed height) */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm flex-1 flex flex-col justify-center group">
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between text-muted-foreground group-hover:text-foreground transition-colors">
                    Total Network Budget
                    <Link href="/dashboard/ledger"><ArrowRight className="h-4 w-4" /></Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                   <p className="text-3xl font-black tracking-tighter">${globalStats.budget.toLocaleString()}</p>
                   <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-3">Aggregate capital required</p>
                </CardContent>
              </Card>

              <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm flex-1 flex flex-col justify-center group">
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between text-muted-foreground group-hover:text-foreground transition-colors">
                    Locked in Escrow
                    <Link href="/dashboard/ledger"><ArrowRight className="h-4 w-4" /></Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                   <p className="text-3xl font-black tracking-tighter">${globalStats.pledged.toLocaleString()}</p>
                   <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-3">Cryptographically locked</p>
                </CardContent>
              </Card>
            </div>

            {/* Audit Feed */}
            <Card className="lg:col-span-2 flex flex-col border-neutral-200 dark:border-neutral-800 shadow-sm">
              <CardHeader className="border-b border-neutral-100 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-900/20 p-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Live Platform Audit
                  </CardTitle>
                  <Link href="/dashboard/audit" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                    View Ledger <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                 <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
                    {isLoading ? (
                      <div className="p-4 space-y-4">
                        {[1, 2, 3].map((i) => <div key={i} className="h-6 bg-neutral-100 dark:bg-neutral-900 rounded-md animate-pulse" />)}
                      </div>
                    ) : globalLogs.length > 0 ? (
                      globalLogs.map((log) => (
                        <div key={log.id} className="p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                           <div className="flex items-start gap-3 min-w-0">
                              <div className="mt-0.5 h-2 w-2 rounded-full bg-neutral-300 dark:bg-neutral-700 shrink-0" />
                              <div className="min-w-0">
                                 <p className="text-xs font-medium text-foreground truncate" title={log.payload}>{log.payload}</p>
                                 <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{log.event_type} • ID: {log.id}</p>
                              </div>
                           </div>
                           <span className="text-[10px] text-muted-foreground whitespace-nowrap sm:text-right shrink-0">
                             {formatActivityTime(log.timestamp)}
                           </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-sm text-muted-foreground">No recent platform activity.</div>
                    )}
                 </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
