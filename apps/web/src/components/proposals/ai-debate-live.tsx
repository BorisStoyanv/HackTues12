"use client";

import { useEffect, useMemo } from "react";
import { useAIDebate } from "@/hooks/useAIDebate";
import { SerializedProposal } from "@/lib/actions/proposals";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  ShieldCheck, 
  Loader2, 
  Activity, 
  Search, 
  AlertCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AIDebateLiveProps {
  proposal: SerializedProposal;
  onComplete?: (result: any) => void;
}

export function AIDebateLive({ proposal, onComplete }: AIDebateLiveProps) {
  const { startDebate, isStreaming, events, error, result } = useAIDebate();

  useEffect(() => {
    startDebate(proposal);
  }, [proposal, startDebate]);

  useEffect(() => {
    if (result && onComplete) {
      onComplete(result);
    }
  }, [result, onComplete]);

  // Derived states from events
  const currentStatus = useMemo(() => {
    const lastEvent = events[events.length - 1];
    if (!lastEvent) return "Initializing...";
    
    switch (lastEvent.event) {
      case "connected": return "Connecting to AI Agents...";
      case "debate_started": return "Protocol Started";
      case "internet_evidence": return "Researching Internet Evidence...";
      case "round_started": return `Starting Round ${lastEvent.data.round}`;
      case "round_statements": return `Analyzing Agent Arguments (Round ${lastEvent.data.round})`;
      case "round_completed": return `Consensus Reached for Round ${lastEvent.data.round}`;
      case "debate_completed": return "Debate Finalized";
      default: return lastEvent.event.replace("_", " ");
    }
  }, [events]);

  const statements = useMemo(() => {
    return events
      .filter(e => e.event === "round_statements")
      .flatMap(e => [
        { agent: "Advocate", text: e.data.advocate, round: e.data.round, color: "bg-blue-500" },
        { agent: "Skeptic", text: e.data.skeptic, round: e.data.round, color: "bg-red-500" }
      ]);
  }, [events]);

  const judgeDecision = useMemo(() => {
    const lastDecision = events.filter(e => e.event === "round_completed").pop();
    return lastDecision ? lastDecision.data.judge_decision : null;
  }, [events]);

  if (error) {
    return (
      <div className="p-8 text-center border-2 border-dashed border-destructive/20 rounded-3xl bg-destructive/5">
        <AlertCircle className="h-10 w-10 mx-auto text-destructive mb-4" />
        <h4 className="text-xl font-bold text-destructive">AI Protocol Failed</h4>
        <p className="text-muted-foreground mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
             {isStreaming ? (
               <Loader2 className="h-6 w-6 text-primary animate-spin" />
             ) : (
               <ShieldCheck className="h-6 w-6 text-primary" />
             )}
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter">Live AI Vetting</h3>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
               Status: {currentStatus}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-2 px-4 py-2 border-primary/20 bg-primary/5">
           <Activity className="h-4 w-4 text-primary" />
           <span className="font-mono text-xs">Real-time Stream</span>
        </Badge>
      </div>

      {/* Progress Timeline */}
      <div className="relative pl-12 border-l-2 border-neutral-200 dark:border-neutral-800 space-y-16 py-4">
        {/* Research Step */}
        {events.some(e => e.event === "internet_evidence") && (
          <div className="relative">
            <div className="absolute -left-[65px] top-0 h-12 w-12 rounded-full bg-neutral-200 dark:bg-neutral-800 border-4 border-background flex items-center justify-center shadow-lg">
               <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-4">
               <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Phase 0: External Validation</span>
               <div className="p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
                  <p className="text-base leading-relaxed text-muted-foreground italic">
                    AI Agents are currently cross-referencing Wikipedia, OpenStreetMap, and tourism databases to validate the historical and geographic context of "{proposal.title}".
                  </p>
               </div>
            </div>
          </div>
        )}

        {/* Dynamic Statements */}
        {statements.map((stmt, i) => (
          <div key={i} className="relative animate-in slide-in-from-left-4 duration-500">
            <div className={cn(
              "absolute -left-[65px] top-0 h-12 w-12 rounded-full border-4 border-background flex items-center justify-center shadow-xl",
              stmt.color
            )}>
               <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className={cn(
                  "text-base font-bold uppercase tracking-widest",
                  stmt.agent === "Advocate" ? "text-blue-500" : "text-red-500"
                )}>
                  Agent: {stmt.agent}
                </span>
                <Badge variant="secondary" className="text-[10px] h-5 px-2">Round {stmt.round}</Badge>
              </div>
              <div className="p-8 rounded-[2.5rem] bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <p className="text-xl leading-relaxed italic text-muted-foreground leading-relaxed">
                  "{stmt.text}"
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Current Round Loader */}
        {isStreaming && (
          <div className="relative">
            <div className="absolute -left-[65px] top-0 h-12 w-12 rounded-full bg-background border-4 border-primary flex items-center justify-center shadow-xl">
               <Loader2 className="h-5 w-5 text-primary animate-spin" />
            </div>
            <div className="pt-3">
               <p className="text-lg font-black italic text-primary animate-pulse uppercase tracking-tighter">
                  Generating Consensus...
               </p>
            </div>
          </div>
        )}

        {/* Final Synthesis */}
        {result && (
          <div className="relative animate-in zoom-in duration-700">
            <div className="absolute -left-[65px] top-0 h-12 w-12 rounded-full bg-green-500 border-4 border-background flex items-center justify-center shadow-2xl">
               <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-6">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-green-500">Final Protocol Result</span>
              <div className="p-10 rounded-[3rem] bg-green-500 text-white shadow-2xl shadow-green-500/20">
                <div className="flex items-center justify-between mb-6">
                   <h4 className="text-3xl font-black italic tracking-tighter uppercase">Integrity Score: {result.aggregate_score * 100}%</h4>
                   <Badge className="bg-white text-green-600 font-black border-none px-4 py-1">PASSED</Badge>
                </div>
                <p className="text-xl leading-relaxed font-medium mb-8">
                  {result.final_summary}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/20 pt-8">
                   <div>
                      <p className="text-[10px] font-bold uppercase opacity-60 mb-1">Priority</p>
                      <p className="text-xl font-black">{(result.funding_priority_score * 100).toFixed(0)}/100</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-bold uppercase opacity-60 mb-1">Recommendation</p>
                      <p className="text-xl font-black uppercase tracking-tighter">{result.funding_recommendation}</p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
