"use client";

import { useAuthStore } from "@/lib/auth-store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  Plus,
  Compass,
  Zap,
  Globe,
  Loader2,
  Lock,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
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
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

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

/**
 * Enterprise-grade KPI Card
 */
function MetricCard({ title, value, description, icon: Icon, status = "default", href, isLoading }: any) {
  const statusColors = {
    default: "text-muted-foreground",
    success: "text-emerald-500",
    warning: "text-amber-500",
    primary: "text-primary",
  };

  return (
    <Link href={href} className="group block">
      <Card className="border-border/40 bg-background/50 backdrop-blur-md transition-all duration-500 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 rounded-2xl overflow-hidden h-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
             <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
             </div>
             <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60 group-hover:text-primary transition-colors">
                {title}
             </div>
          </div>
          <div className="space-y-1">
             <div className={cn("text-3xl font-semibold tracking-tight tabular-nums", isLoading && "animate-pulse text-muted-foreground/20")}>
               {value}
             </div>
             <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
               {description}
             </p>
          </div>
          <div className="mt-6 flex items-center justify-between pt-4 border-t border-border/40">
             <div className="flex items-center gap-1.5">
                <div className={cn("h-1.5 w-1.5 rounded-full", status === 'success' ? 'bg-emerald-500 animate-pulse' : 'bg-primary/40')} />
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Live Sync</span>
             </div>
             <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
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

  const regionLabel = profile?.homeRegion || user?.home_region || user?.detected_location?.city || "Global Layer";
  const identityTier = (profile?.userType || (user?.role === "funder" ? "InvestorUser" : "User")) === "InvestorUser" ? "Capital Provider" : "Community Node";

  const kycStatusDisplay = useMemo(() => {
     if (user?.kyc_status === 'verified') return { label: 'Verified', color: 'text-emerald-500', icon: CheckCircle2 };
     if (user?.kyc_status === 'pending') return { label: 'Pending', color: 'text-amber-500', icon: Activity };
     return { label: 'Unverified', color: 'text-rose-500', icon: AlertCircle };
  }, [user?.kyc_status]);

  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-background overflow-hidden relative">
      
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto scroll-smooth">
        
        {/* HERO SECTION: WELCOME & IDENTITY */}
        <div className="border-b bg-neutral-50/50 dark:bg-neutral-950/50 relative overflow-hidden">
           {/* Abstract decor */}
           <div className="absolute top-0 right-0 p-20 opacity-[0.03] rotate-12 -z-10">
              <Globe className="h-64 w-64" />
           </div>

           <div className="max-w-screen-2xl mx-auto px-6 py-12 md:px-12">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
                 <div className="space-y-6">
                    <div className="flex flex-wrap items-center gap-3">
                       <Badge className="bg-foreground text-background border-none rounded-full px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest shadow-lg">
                          {identityTier}
                       </Badge>
                       <div className="h-8 w-px bg-border/40 mx-2" />
                       <div className={cn("flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest", kycStatusDisplay.color)}>
                          <kycStatusDisplay.icon className="h-3.5 w-3.5" />
                          Status: {kycStatusDisplay.label}
                       </div>
                    </div>

                    <div className="space-y-2">
                       <h1 className="text-3xl md:text-2xl font-semibold tracking-tight text-foreground leading-tight ">
                          Account <br />
                          <span className="text-muted-foreground/30">Overview</span>
                       </h1>
                       <p className="text-base font-medium text-muted-foreground flex items-center gap-3 pt-4 border-t border-border/40 mt-6">
                          Welcome back, <span className="text-foreground font-semibold uppercase tracking-tight">{user.display_name || "Authorized Node"}</span>
                          <span className="h-1 w-1 rounded-full bg-border" />
                          <span className="text-sm font-mono text-muted-foreground/60">@{user.id.substring(0, 10)}...</span>
                       </p>
                    </div>
                 </div>

                 <div className="flex flex-col gap-6 lg:items-end">
                    <div className="grid grid-cols-2 gap-4 w-full sm:w-auto">
                       <Button 
                         className="h-16 px-10 rounded-2xl bg-foreground text-background font-semibold text-xs uppercase tracking-widest shadow-2xl hover:scale-[1.02] active:scale-95 transition-all group shrink-0"
                         onClick={() => router.push("/dashboard/proposals/new")}
                       >
                         <Plus className="mr-2 h-5 w-5 transition-transform group-hover:rotate-90" />
                         New Proposal
                       </Button>
                       <Button 
                         variant="outline"
                         className="h-16 px-10 rounded-2xl border-2 border-border font-semibold text-xs uppercase tracking-widest hover:bg-muted/50 transition-all active:scale-95 shadow-sm shrink-0"
                         onClick={() => router.push("/dashboard/explore")}
                       >
                         <Compass className="mr-2 h-5 w-5" />
                         Impact Map
                       </Button>
                    </div>
                    <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-background border border-border/40 shadow-sm w-fit">
                       <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Mainnet Consensus Active</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="max-w-screen-2xl mx-auto px-6 py-12 md:px-12 space-y-16 pb-32">
           
           {/* SECTION 2: THE CORE LEDGER METRICS */}
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard 
                title="Voting Power"
                value={isLoading ? "—" : formatMetric(realVP)}
                description="Regional weight coefficient for consensus signing."
                icon={Zap}
                status="primary"
                href="/dashboard/governance"
                isLoading={isLoading}
              />
              <MetricCard 
                title="Reputation Score"
                value={isLoading ? "—" : formatMetric(profile?.reputation ?? Number(user.reputation))}
                description="Immutable trust record based on verified impact."
                icon={TrendingUp}
                status="success"
                href="/dashboard/verification"
                isLoading={isLoading}
              />
              <MetricCard 
                title="Governance Zone"
                value={regionLabel}
                description="Your primary regional anchoring node."
                icon={MapPin}
                status="default"
                href="/dashboard/settings"
                isLoading={isLoading}
              />
              <MetricCard 
                title="Identity Tier"
                value={user.kyc_status === "verified" ? "Tier 3" : "Tier 1"}
                description="Permission level on the OpenFairTrip network."
                icon={ShieldCheck}
                status={user.kyc_status === "verified" ? "success" : "warning"}
                href="/dashboard/verification/status"
                isLoading={isLoading}
              />
           </div>

           {/* SECTION 3: WORKSPACES (THE DATA DEEP DIVE) */}
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              
              {/* LEFT: ACTIVE CONSENSUS FEED (65%) */}
              <div className="lg:col-span-8 space-y-8">
                 <div className="flex items-center justify-between">
                    <div className="space-y-1">
                       <h3 className="text-xl font-semibold tracking-tight uppercase flex items-center gap-3">
                          <Activity className="h-6 w-6 text-primary" />
                          Consensus Ledger
                       </h3>
                       <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Initialization rounds needing regional validation</p>
                    </div>
                    <Link href="/dashboard/governance" className="group flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
                       Expand Feed <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                    </Link>
                 </div>

                 <div className="grid gap-4">
                    {isLoading ? (
                       Array(3).fill(0).map((_, i) => <div key={i} className="h-32 rounded-3xl bg-muted/20 animate-pulse border border-border/40" />)
                    ) : activeProposals.length > 0 ? (
                       activeProposals.map(p => (
                          <Link key={p.id} href={`/dashboard/proposals/detail?id=${p.id}`} className="group relative block">
                             <Card className="border-border/40 bg-background hover:border-primary/30 transition-all duration-500 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-primary/5">
                                <div className="p-8 space-y-6">
                                   <div className="flex items-start justify-between gap-8">
                                      <div className="space-y-1.5">
                                         <h4 className="font-bold text-lg leading-tight uppercase group-hover:text-primary transition-colors line-clamp-1">{p.title}</h4>
                                         <div className="flex items-center gap-3">
                                            <Badge variant="secondary" className="text-[9px] font-semibold uppercase bg-muted/50 rounded-full px-3">
                                               {p.category}
                                            </Badge>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                                               <MapPin className="h-3 w-3" /> {p.region_tag}
                                            </span>
                                         </div>
                                      </div>
                                      <div className="text-right shrink-0">
                                         <p className="text-[9px] font-semibold uppercase text-muted-foreground tracking-widest mb-1">Target</p>
                                         <p className="text-lg font-semibold tabular-nums">${p.budget_amount.toLocaleString()}</p>
                                      </div>
                                   </div>
                                   
                                   <div className="space-y-3 pt-4 border-t border-border/40">
                                      <div className="flex justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                         <span>Regional Consensus Weight</span>
                                         <span className="text-primary">{Math.round(p.yes_weight)}% Approved</span>
                                      </div>
                                      <Progress value={Math.min(100, p.yes_weight)} className="h-1.5 bg-muted/30" />
                                   </div>
                                </div>
                             </Card>
                          </Link>
                       ))
                    ) : (
                       <div className="py-24 text-center border-2 border-dashed border-border/40 rounded-[3rem] bg-muted/5 space-y-4">
                          <History className="h-10 w-10 text-muted-foreground/20 mx-auto" />
                          <p className="text-sm font-medium text-muted-foreground">No active regional consensus rounds detected.</p>
                       </div>
                    )}
                 </div>
              </div>

              {/* RIGHT: PERSONAL NODE & CONTRACTS (35%) */}
              <div className="lg:col-span-4 space-y-12">
                 <div className="space-y-8">
                    <div className="flex items-center justify-between">
                       <h3 className="text-lg font-semibold uppercase tracking-tight flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-primary" />
                          Node Activity
                       </h3>
                    </div>
                    <Card className="border-border/40 rounded-[2rem] overflow-hidden shadow-sm bg-neutral-50/50 dark:bg-neutral-900/30">
                       <div className="divide-y divide-border/40">
                          {myProposals.length > 0 ? (
                             myProposals.map(p => (
                                <Link key={p.id} href={`/dashboard/proposals/detail?id=${p.id}`} className="flex items-center justify-between p-6 hover:bg-background transition-colors group">
                                   <div className="space-y-0.5 min-w-0 pr-4">
                                      <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{p.title}</p>
                                      <p className="text-[10px] font-mono text-muted-foreground/60 uppercase">Protocol ID: {p.id}</p>
                                   </div>
                                   <Badge variant="outline" className="text-[8px] font-semibold uppercase px-2 py-0.5 rounded-full border-border/60">{p.status}</Badge>
                                </Link>
                             ))
                          ) : (
                             <div className="p-12 text-center text-muted-foreground text-xs font-medium">
                                No proposals submitted.
                             </div>
                          )}
                       </div>
                    </Card>
                 </div>

                 <div className="space-y-8">
                    <div className="flex items-center justify-between">
                       <h3 className="text-lg font-semibold uppercase tracking-tight flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          Trust Ledger
                       </h3>
                    </div>
                    <div className="grid gap-3">
                       {myContracts.length > 0 ? (
                          myContracts.map(c => (
                             <Link key={c.proposal_id} href={`/dashboard/contracts/detail?id=${c.proposal_id}`} className="p-6 rounded-2xl border border-border/40 bg-background hover:border-primary/40 hover:shadow-lg transition-all group">
                                <div className="flex items-center justify-between mb-2">
                                   <p className="text-xs font-semibold uppercase tracking-tight group-hover:text-primary transition-colors truncate pr-4">{c.company_name}</p>
                                   <Badge variant="outline" className={cn("text-[8px] font-semibold uppercase border-none px-2 py-0.5 rounded-full", c.status === 'Signed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600')}>
                                      {c.status}
                                   </Badge>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                                   <span>Prop #{c.proposal_id}</span>
                                   <span>v1.0.2</span>
                                </div>
                             </Link>
                          ))
                       ) : (
                          <div className="p-10 rounded-3xl border border-dashed border-border/60 text-center opacity-40">
                             <p className="text-[10px] font-semibold uppercase tracking-widest">Legal agreement stack empty.</p>
                          </div>
                       )}
                    </div>
                 </div>
              </div>
           </div>

           {/* SECTION 4: PLATFORM INTEGRITY (FULL WIDTH) */}
           <div className="space-y-8 pt-16 border-t border-border/40">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                 <div className="space-y-1">
                    <h3 className="text-xl font-semibold tracking-tight uppercase flex items-center gap-4">
                       <ShieldCheck className="h-6 w-6 text-primary animate-pulse" />
                       Network Integrity
                    </h3>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.3em]">Real-time immutable transparency of the OpenFairTrip global layer</p>
                 </div>
                 
                 <div className="flex items-center gap-10 px-10 py-6 bg-muted/20 border border-border/40 rounded-[2.5rem] shadow-inner">
                    <div className="space-y-0.5">
                       <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-widest opacity-60">Network Cap</p>
                       <p className="text-xl font-semibold tracking-tight">${(globalStats.budget / 1000).toFixed(1)}k</p>
                    </div>
                    <div className="h-10 w-px bg-border/40" />
                    <div className="space-y-0.5">
                       <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-widest opacity-60">Escrow Value</p>
                       <p className="text-xl font-semibold tracking-tight text-emerald-500">${(globalStats.pledged / 1000).toFixed(1)}k</p>
                    </div>
                 </div>
              </div>

              <Card className="border-border/40 bg-background/50 backdrop-blur-xl rounded-[3rem] overflow-hidden shadow-sm">
                 <CardHeader className="p-8 border-b border-border/40 bg-neutral-50/50 dark:bg-neutral-900/50">
                    <div className="flex items-center justify-between">
                       <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.3em] flex items-center gap-3">
                          <History className="h-4 w-4 text-primary" />
                          Live Transparency Stream
                       </CardTitle>
                       <Link href="/dashboard/audit" className="text-[10px] font-semibold uppercase tracking-widest text-primary hover:underline">
                          View Protocol Ledger
                       </Link>
                    </div>
                 </CardHeader>
                 <CardContent className="p-0">
                    <div className="divide-y divide-border/20">
                       {isLoading ? (
                          Array(4).fill(0).map((_, i) => <div key={i} className="h-14 bg-muted/10 animate-pulse" />)
                       ) : globalLogs.length > 0 ? (
                          globalLogs.map(log => (
                             <div key={log.id} className="p-5 px-8 flex items-center justify-between hover:bg-muted/5 transition-colors group">
                                <div className="flex items-center gap-6 min-w-0">
                                   <div className="h-2.5 w-2.5 rounded-full bg-primary/20 group-hover:bg-primary group-hover:scale-125 transition-all" />
                                   <div className="min-w-0 space-y-1">
                                      <p className="text-sm font-bold truncate text-foreground/80 leading-tight uppercase tracking-tight">{log.payload}</p>
                                      <p className="text-[10px] font-mono text-muted-foreground/60 uppercase">{log.event_type} • EVENT_ID: {log.id}</p>
                                   </div>
                                </div>
                                <div className="flex flex-col items-end shrink-0 ml-6">
                                   <span className="text-[10px] font-semibold text-foreground/40 uppercase tracking-widest whitespace-nowrap">
                                      {formatActivityTime(log.timestamp)}
                                   </span>
                                </div>
                             </div>
                          ))
                       ) : (
                          <div className="p-20 text-center text-muted-foreground text-sm">
                             Awaiting network initialization events...
                          </div>
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
