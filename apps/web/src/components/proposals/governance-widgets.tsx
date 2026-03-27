"use client";

import { CheckCircle2, Circle, Info, ShieldCheck, Users } from "lucide-react";
import { formatPercent, QUORUM_PERCENT_OF_TOTAL, ABSOLUTE_MAJORITY_PERCENT_OF_TOTAL, ProposalVotingMetrics } from "@/lib/proposals/voting";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function VotingProgress({ metrics }: { metrics: ProposalVotingMetrics }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Support</span>
          <span className="text-2xl font-semibold tracking-tight">{formatPercent(metrics.supportPercent, 1)}</span>
        </div>
        <div className="flex flex-col items-end text-right">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-rose-600 dark:text-rose-400">Opposition</span>
          <span className="text-2xl font-semibold tracking-tight">{formatPercent(metrics.oppositionPercent, 1)}</span>
        </div>
      </div>
      
      <div className="relative pt-2">
        <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500" 
            style={{ width: `${metrics.supportPercent}%` }} 
          />
          <div 
            className="h-full bg-rose-500 transition-all duration-500" 
            style={{ width: `${metrics.oppositionPercent}%` }} 
          />
        </div>
        
        {/* Markers */}
        <div className="absolute top-0 left-[5%] -translate-x-1/2 flex flex-col items-center gap-1">
          <div className="h-6 border-l border-dashed border-muted-foreground/40" />
          <span className="text-[8px] font-bold text-muted-foreground">QUORUM</span>
        </div>
        <div className="absolute top-0 left-[51%] -translate-x-1/2 flex flex-col items-center gap-1">
          <div className="h-6 border-l border-dashed border-muted-foreground/40" />
          <span className="text-[8px] font-bold text-muted-foreground">PASS</span>
        </div>
      </div>
    </div>
  );
}

export function TurnoutWidget({ metrics, voterCount }: { metrics: ProposalVotingMetrics, voterCount: number }) {
  const quorumReached = metrics.turnoutPercent >= QUORUM_PERCENT_OF_TOTAL;
  
  return (
    <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center border shadow-sm",
          quorumReached ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-neutral-100 border-neutral-200 text-muted-foreground"
        )}>
          <Users className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Turnout</p>
          <p className="text-lg font-semibold">{formatPercent(metrics.turnoutPercent, 1)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Participants</p>
        <p className="text-lg font-semibold">{voterCount}</p>
      </div>
    </div>
  );
}

export function VoterInsight({ votingPower, isLocal, userType }: { votingPower: number | null, isLocal: boolean, userType?: string }) {
  return (
    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">Your Stance Power</span>
        <ShieldCheck className="h-4 w-4 text-primary" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight text-primary">
          {votingPower !== null ? votingPower.toFixed(1) : "0.0"}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">VP</span>
      </div>
      <div className="flex gap-2">
        {isLocal && (
          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[8px] font-semibold uppercase tracking-widest">
            Local Verified 2.5x
          </span>
        )}
        <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-[8px] font-semibold uppercase tracking-widest">
          {userType === "InvestorUser" ? "Capital Provider" : "Community Voter"}
        </span>
      </div>
    </div>
  );
}

export function ProtocolRules({ metrics, status }: { metrics: ProposalVotingMetrics, status: string }) {
  const quorumReached = metrics.turnoutPercent >= QUORUM_PERCENT_OF_TOTAL;
  const majorityReached = metrics.supportPercent >= ABSOLUTE_MAJORITY_PERCENT_OF_TOTAL;
  const isPassed = status === "AwaitingFunding" || status === "Backed";

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Protocol Rules</p>
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-colors",
        quorumReached || isPassed ? "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/30" : "bg-neutral-50/50 border-neutral-100 dark:bg-neutral-900/10 dark:border-neutral-800"
      )}>
        {quorumReached || isPassed ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-tight">Quorum ({QUORUM_PERCENT_OF_TOTAL}%)</p>
          <p className="text-[9px] text-muted-foreground">Required for valid consensus</p>
        </div>
      </div>
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-colors",
        majorityReached || isPassed ? "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/30" : "bg-neutral-50/50 border-neutral-100 dark:bg-neutral-900/10 dark:border-neutral-800"
      )}>
        {majorityReached || isPassed ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-tight">Majority ({ABSOLUTE_MAJORITY_PERCENT_OF_TOTAL}%)</p>
          <p className="text-[9px] text-muted-foreground">Required for immediate approval</p>
        </div>
      </div>
    </div>
  );
}
