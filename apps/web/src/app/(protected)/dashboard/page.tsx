"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Users,
  Briefcase,
  TrendingUp,
  MapPin,
  Clock,
  ArrowUpRight,
  Plus,
  ArrowRight,
  ShieldCheck,
  Globe,
  Loader2,
  ExternalLink,
  MessageSquare,
  History,
  FileText,
  DollarSign,
  Landmark,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuthStore } from "@/lib/auth-store";
import {
  fetchAllProposals,
  fetchProposalVotes,
  SerializedProposal,
  SerializedVote,
} from "@/lib/actions/proposals";
import { formatPercent } from "@/lib/proposals/voting";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Integration with Veriff types if they exist or mock them
interface VeriffSession {
  status: "approved" | "declined" | "resubmission_requested" | "started" | "expired" | "abandoned";
  reason?: string;
}

const isApprovedVeriffStatus = (status?: string) => status === "approved";
const isRejectedVeriffStatus = (status?: string) => 
  status === "declined" || status === "expired" || status === "abandoned";

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);

  const [proposals, setProposals] = useState<SerializedProposal[]>([]);
  const [recentVotes, setRecentVotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Veriff state mock for now
  const [veriffSession, setVeriffSession] = useState<VeriffSession | null>(null);
  const [hasPendingVeriffSession, setHasPendingVeriffSession] = useState(false);
  const [isCheckingVeriff, setIsCheckingVeriff] = useState(false);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (isAuthenticated && user) {
      setIsLoading(true);
      fetchAllProposals().then((res) => {
        if (res.success) {
          setProposals(res.proposals.slice(0, 5));
          
          // Mock some recent votes activity for the dashboard UI
          setRecentVotes([
            { id: "1", proposalId: "1", proposalTitle: "Solar Grid Alpha", status: "Approved", vp: 12.5, time: "2h ago" },
            { id: "2", proposalId: "2", proposalTitle: "Sofia Water Project", status: "Rejected", vp: 8.0, time: "5h ago" },
          ]);
        }
        setIsLoading(false);
      });
    }
  }, [isAuthenticated, isInitializing, router, user]);

  if (isInitializing || (isAuthenticated && !user)) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Loading your governance profile...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const stats = [
    {
      title: "Reputation Score",
      value: user.reputation.toString(),
      description: "Based on consensus contributions",
      icon: TrendingUp,
      trend: "+12% this month",
      trendPositive: true,
    },
    {
      title: "Active Proposals",
      value: proposals.length.toString(),
      description: "Projects currently in consensus",
      icon: Briefcase,
      trend: "3 needing action",
      trendPositive: false,
    },
    {
      title: "Voting Power ($V_p$)",
      value: (user.reputation * 1.5).toFixed(1),
      description: "Regional weight coefficient",
      icon: Users,
      trend: "Level 2 Tier",
      trendPositive: true,
    },
    {
      title: "Identity Status",
      value: user.kyc_status === "verified" ? "Verified" : "Citizen",
      description: "Access level on the governance network",
      icon: ShieldCheck,
      trend:
        user.kyc_status === "verified"
          ? "KYC Completed"
          : user.kyc_status === "pending"
            ? "KYC Pending"
            : "Standard Tier",
      trendPositive: user.kyc_status === "verified",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-10">
        {(hasPendingVeriffSession || veriffSession) && (
          <Card
            className={cn(
              "border shadow-sm",
              isApprovedVeriffStatus(veriffSession?.status)
                ? "border-green-200 bg-green-50/60 dark:border-green-900/40 dark:bg-green-950/10"
                : isRejectedVeriffStatus(veriffSession?.status)
                  ? "border-red-200 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/10"
                  : "border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/10",
            )}
          >
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
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-200 dark:border-neutral-800">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Overview
            </h1>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Connected to OpenFairTrip Ledger
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Principal ID
              </p>
              <p className="text-xs font-mono bg-neutral-100 dark:bg-neutral-900 px-2 py-1 rounded border border-neutral-200 dark:border-neutral-800">
                {user.id.substring(0, 15)}...
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <Card
              key={stat.title}
              className="border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tabular-nums tracking-tighter">
                  {stat.value}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-sm",
                      stat.trendPositive
                        ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                        : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
                    )}
                  >
                    {stat.trend}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-10 lg:grid-cols-7">
          {/* Main Feed */}
          <div className="lg:col-span-4 space-y-10">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Active Consenus Rounds
                </h2>
                <Button variant="ghost" size="sm" className="text-primary font-bold hover:bg-primary/5" onClick={() => router.push('/dashboard/explore')}>
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4">
                {isLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="h-32 rounded-2xl bg-neutral-50 dark:bg-neutral-900 animate-pulse border border-neutral-100 dark:border-neutral-800" />
                  ))
                ) : proposals.length > 0 ? (
                  proposals.map((p) => (
                    <Card
                      key={p.id}
                      className="group overflow-hidden border-neutral-200 dark:border-neutral-800 transition-all hover:shadow-lg hover:border-primary/30 cursor-pointer"
                      onClick={() => router.push(`/dashboard/proposals/detail?id=${p.id}`)}
                    >
                      <CardContent className="p-0">
                        <div className="flex flex-col sm:flex-row">
                          <div className="p-6 flex-1 space-y-4">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest rounded-sm border-neutral-200 dark:border-neutral-800">
                                {p.status}
                              </Badge>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {p.region_tag}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-1 mb-1">
                                {p.title}
                              </h3>
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {p.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-4 pt-2">
                               <div className="flex-1 space-y-1">
                                  <div className="flex justify-between text-[9px] font-black uppercase text-muted-foreground">
                                     <span>Consensus Progress</span>
                                     <span>{Math.round(p.yes_weight)}%</span>
                                  </div>
                                  <Progress value={Math.min(100, p.yes_weight)} className="h-1" />
                               </div>
                               <Button size="icon" variant="ghost" className="rounded-full bg-neutral-100 dark:bg-neutral-800 group-hover:bg-primary group-hover:text-white transition-all">
                                  <ArrowUpRight className="h-4 w-4" />
                               </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="py-20 text-center border-2 border-dashed rounded-3xl border-neutral-200 dark:border-neutral-800">
                    <p className="text-muted-foreground italic">No active proposals in your region.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-3 space-y-10">
            {/* Quick Actions */}
            <Card className="border-neutral-200 dark:border-neutral-800 shadow-xl rounded-3xl overflow-hidden bg-neutral-900 text-white border-none">
               <CardHeader className="p-8 pb-4">
                  <CardTitle className="text-xl font-bold italic tracking-tighter uppercase">Protocol Core</CardTitle>
                  <CardDescription className="text-white/60 font-medium">System actions and governance tools.</CardDescription>
               </CardHeader>
               <CardContent className="p-8 pt-0 space-y-4">
                  <Button 
                    className="w-full h-14 rounded-2xl bg-white text-black hover:bg-neutral-100 font-bold text-base shadow-2xl shadow-white/10 group"
                    onClick={() => router.push("/dashboard/proposals/new")}
                  >
                    <Plus className="mr-2 h-5 w-5 transition-transform group-hover:rotate-90" />
                    Submit Proposal
                  </Button>
                  <div className="grid grid-cols-2 gap-3">
                     <Button variant="outline" className="h-12 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-xs font-bold uppercase tracking-widest" onClick={() => router.push('/dashboard/audit')}>
                        Audit Log
                     </Button>
                     <Button variant="outline" className="h-12 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-xs font-bold uppercase tracking-widest" onClick={() => router.push('/dashboard/ledger')}>
                        Ledger
                     </Button>
                  </div>
               </CardContent>
            </Card>

            {/* Voting Activity */}
            <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm rounded-3xl">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
                  {recentVotes.map((vote) => (
                    <button
                      key={vote.id}
                      type="button"
                      onClick={() => router.push(`/dashboard/proposals/detail?id=${vote.proposalId}`)}
                      className="w-full text-left flex items-start gap-4 p-5 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          vote.status === "Approved"
                            ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
                        )}
                      >
                        {vote.status === "Approved" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <TrendingUp className="h-4 w-4 rotate-180" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-xs font-bold leading-none">
                          {vote.status} {vote.proposalTitle}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center justify-between">
                          <span>{vote.vp.toFixed(1)} $V_p$ Cast</span>
                          <span className="font-mono">{vote.time}</span>
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
