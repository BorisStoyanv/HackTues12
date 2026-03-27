"use client";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  BarChart3,
  AlertTriangle,
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  Globe,
  TrendingUp,
  History,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { SerializedProposal, SerializedVote } from "@/lib/actions/proposals";
import { cn } from "@/lib/utils";
import { AIDebateLive } from "./ai-debate-live";
import { ProposalGovernancePanel } from "./proposal-governance-panel";

interface ProposalViewProps {
  id: string;
  mode: "public" | "authenticated";
  initialData?: SerializedProposal;
  votes?: SerializedVote[];
}

export function ProposalView({
  id,
  mode,
  initialData,
  votes = [],
}: ProposalViewProps) {
  if (!initialData) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center animate-pulse">
          <BarChart3 className="h-6 w-6 text-neutral-400" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">
          Proposal Not Found
        </h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          This proposal may have been pruned from the ledger or the ID is
          incorrect.
        </p>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const proposal = initialData;
  const statusFormatted = proposal.status.replace(/([A-Z])/g, " $1").trim();
  const creatorId = proposal.submitter;
  const locationLabel =
    proposal.location.city && proposal.location.country
      ? `${proposal.location.city}, ${proposal.location.country}`
      : proposal.location.city || proposal.region_tag;
  const hasConstraints = proposal.risk_flags && proposal.risk_flags.length > 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header - Dense, Informative, Vercel-like */}
      <div className="border-b bg-neutral-50/50 dark:bg-neutral-950/50 px-6 py-6 md:px-8 shrink-0">
        <div className="w-full flex flex-col lg:flex-row gap-6 justify-between lg:items-start">
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary text-primary-foreground border-transparent px-2.5 py-0.5 rounded text-[10px] uppercase font-black tracking-widest shadow-sm">
                {statusFormatted}
              </Badge>
              <Badge variant="outline" className="border-neutral-200 dark:border-neutral-800 bg-background px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <Globe className="h-3 w-3 mr-1.5 inline -mt-0.5" />
                {locationLabel}
              </Badge>
              <span className="text-[10px] font-mono font-medium text-muted-foreground flex items-center gap-1.5 ml-1">
                <Clock className="h-3 w-3" /> 
                {new Date(proposal.created_at / 1000000).toLocaleDateString()}
              </span>
              {hasConstraints && (
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">
                  <AlertTriangle className="h-3 w-3 mr-1.5 inline -mt-0.5" />
                  {proposal.risk_flags.length} AI Flags
                </Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-snug">
              {proposal.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-6 shrink-0 lg:pt-1">
            <div className="flex flex-col text-left lg:text-right">
               <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Submitter</span>
               <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded border border-border">@{creatorId.substring(0, 10)}...</span>
            </div>
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div className="flex flex-col text-left lg:text-right">
               <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Capital Req.</span>
               <span className="text-lg font-black tracking-tighter text-primary leading-none">
                 ${proposal.budget_amount.toLocaleString()} <span className="text-[10px] font-bold uppercase text-foreground/50 tracking-widest">{proposal.budget_currency}</span>
               </span>
            </div>
          </div>
        </div>
      </div>

      {/* Body - Full Width Scrollable Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-8 md:px-8 bg-neutral-50/30 dark:bg-neutral-950/30">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Side: Continuous Data Feed */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-10 md:space-y-14">
             
             {/* 1. Executive Summary */}
             <section className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4" /> Overview & Scope
                </h3>
                <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl overflow-hidden bg-background">
                   <CardContent className="p-6 md:p-8 space-y-6">
                      <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{proposal.description}</p>
                      <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-900">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-2">Domain Tags:</span>
                         <Badge variant="secondary" className="text-[10px] font-bold rounded-md px-2.5 py-0.5 uppercase tracking-wider">{proposal.category}</Badge>
                      </div>
                   </CardContent>
                </Card>
             </section>

             {/* 2. Execution & Financials */}
             <div className="grid md:grid-cols-2 gap-6">
                <section className="space-y-4">
                   <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                     <Calendar className="h-4 w-4" /> Execution Strategy
                   </h3>
                   <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl overflow-hidden h-full bg-background">
                      <CardContent className="p-6 md:p-8 space-y-5">
                         <div className="flex flex-col gap-3">
                           <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900 pb-3">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Target Timeline</span>
                              <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded">{proposal.timeline}</span>
                           </div>
                           <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900 pb-3">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lead Executor</span>
                              <span className="text-xs font-bold truncate max-w-[150px]">{proposal.executor_name}</span>
                           </div>
                         </div>
                         <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">{proposal.execution_plan}</p>
                      </CardContent>
                   </Card>
                </section>
                <section className="space-y-4">
                   <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                     <DollarSign className="h-4 w-4" /> Capital Allocation
                   </h3>
                   <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl overflow-hidden h-full bg-background flex flex-col">
                      <CardContent className="p-6 md:p-8 space-y-5 flex-1 flex flex-col">
                         <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap font-mono flex-1 bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800">
                           {proposal.budget_breakdown}
                         </p>
                         <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                            <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-1">Escrow Policy</p>
                            <p className="text-[10px] text-foreground/80 leading-relaxed font-medium">Funds are cryptographically pinned to verifiable milestones. 66% regional consensus required for release.</p>
                         </div>
                      </CardContent>
                   </Card>
                </section>
             </div>

             {/* 3. AI Debate & Risk */}
             <section className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> AI Vetting & Consensus
                </h3>
                <div className="grid lg:grid-cols-12 gap-6">
                   <div className="lg:col-span-8 bg-background rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                     <AIDebateLive proposal={proposal} />
                   </div>
                   
                   <div className="lg:col-span-4 flex flex-col gap-6">
                      <Card className="border border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl overflow-hidden bg-background relative group min-h-[160px] flex flex-col justify-center">
                         <CardContent className="p-6 relative z-10 space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fairness Score</p>
                            <div className="flex items-baseline gap-2">
                               <span className="text-5xl font-black tracking-tighter text-foreground">{proposal.fairness_score}%</span>
                               <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Protocol Verified</span>
                            </div>
                            <p className="text-[10px] leading-relaxed text-muted-foreground font-medium pt-2">Equitable distribution mathematically verified by the OpenFairTrip protocol.</p>
                         </CardContent>
                      </Card>

                      {hasConstraints && (
                         <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 shadow-sm rounded-2xl overflow-hidden">
                            <CardContent className="p-6 space-y-3">
                               <div className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Risk Flags</span>
                               </div>
                               <ul className="space-y-2">
                                 {proposal.risk_flags.map((flag, i) => (
                                   <li key={i} className="text-xs text-amber-800 dark:text-amber-400 font-medium leading-relaxed">• {flag}</li>
                                 ))}
                               </ul>
                            </CardContent>
                         </Card>
                      )}
                   </div>
                </div>
             </section>
             
             {/* 4. Impact Details */}
             <section className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Expected Impact
                </h3>
                <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl overflow-hidden bg-background">
                   <CardContent className="p-6 md:p-8">
                      <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{proposal.expected_impact}</p>
                   </CardContent>
                </Card>
             </section>

             {/* 5. Audit Trail */}
             <section className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <History className="h-4 w-4" /> Voting Ledger
                </h3>
                <div className="border border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl overflow-hidden bg-background">
                   <div className="overflow-x-auto">
                     <table className="w-full text-sm">
                        <thead className="bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800">
                          <tr>
                            <th className="text-left px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Voter Principal</th>
                            <th className="text-center px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Stance</th>
                            <th className="text-right px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Weight (VP)</th>
                            <th className="text-right px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
                          {votes.length > 0 ? votes.map((vote, i) => (
                             <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                                <td className="px-6 py-4 font-mono text-xs font-semibold text-muted-foreground">@{vote.voter.substring(0, 16)}...</td>
                                <td className="px-6 py-4 text-center">
                                   {vote.in_favor ? (
                                      <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-500 font-bold text-[9px] uppercase tracking-widest px-2 py-0.5 rounded">
                                        <CheckCircle2 className="h-3 w-3 mr-1.5 inline -mt-0.5"/> Approve
                                      </Badge>
                                   ) : (
                                      <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-500 font-bold text-[9px] uppercase tracking-widest px-2 py-0.5 rounded">
                                        <XCircle className="h-3 w-3 mr-1.5 inline -mt-0.5"/> Reject
                                      </Badge>
                                   )}
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-xs font-bold text-primary">{vote.weight.toFixed(1)}</td>
                                <td className="px-6 py-4 text-right text-muted-foreground text-[10px] uppercase tracking-widest font-medium">
                                  {new Date(Number(vote.timestamp) / 1000000).toLocaleString()}
                                </td>
                             </tr>
                          )) : (
                             <tr>
                                <td colSpan={4} className="px-6 py-16 text-center">
                                   <div className="flex flex-col items-center justify-center space-y-2">
                                     <History className="h-8 w-8 text-muted-foreground opacity-20" />
                                     <p className="text-sm text-muted-foreground">No consensus data committed to the ledger yet.</p>
                                   </div>
                                </td>
                             </tr>
                          )}
                        </tbody>
                     </table>
                   </div>
                </div>
             </section>
          </div>

          {/* Right Side: Governance Panel - Sticky */}
          <div className="lg:col-span-4 xl:col-span-3 sticky top-0 space-y-6 self-start">
             <ProposalGovernancePanel id={id} mode={mode} proposal={proposal} />
          </div>
        </div>
      </div>
    </div>
  );
}
