"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useAIDebate } from "@/hooks/useAIDebate";
import { SerializedProposal } from "@/lib/actions/proposals";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  ShieldCheck, 
  Loader2, 
  Activity, 
  Search, 
  AlertCircle,
  Cpu,
  ArrowRight,
  TrendingUp,
  Scale,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

interface TypewriterProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
}

function Typewriter({ text, speed = 10, onComplete, className }: TypewriterProps) {
  const [displayedText, setDisplayedText] = useState("");
  const index = useRef(0);

  useEffect(() => {
    setDisplayedText("");
    index.current = 0;
  }, [text]);

  useEffect(() => {
    if (index.current < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[index.current]);
        index.current++;
      }, speed);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [displayedText, text, speed, onComplete]);

  return <p className={className}>{displayedText}<span className="inline-block w-1 h-3 ml-0.5 bg-primary animate-pulse" /></p>;
}

interface AIDebateLiveProps {
  proposal: SerializedProposal;
  onComplete?: (result: any) => void;
}

export function AIDebateLive({ proposal, onComplete }: AIDebateLiveProps) {
  const { startDebate, isStreaming, events, error, result } = useAIDebate();
  const [started, setStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!started) {
      startDebate(proposal);
      setStarted(true);
    }
  }, [proposal, startDebate, started]);

  useEffect(() => {
    if (result && onComplete) {
      onComplete(result);
    }
  }, [result, onComplete]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [events]);

  const currentStatus = useMemo(() => {
    const lastEvent = events[events.length - 1];
    if (!lastEvent) return "Initializing Connection...";
    
    switch (lastEvent.event) {
      case "connected": return "Node Connection Active";
      case "debate_started": return "Protocol Initialized";
      case "internet_evidence": return "Evidence Mining...";
      case "round_started": return `Round ${lastEvent.data.round} Started`;
      case "round_statements": return `Streaming Arguments...`;
      case "round_completed": return `Round ${lastEvent.data.round} Consensus`;
      case "debate_completed": return "Protocol Concluded";
      default: return lastEvent.event.replace("_", " ");
    }
  }, [events]);

  const statements = useMemo(() => {
    return events
      .filter(e => e.event === "round_statements")
      .flatMap(e => [
        { agent: "Advocate", text: e.data.advocate, round: e.data.round, color: "text-blue-500", bgColor: "bg-blue-500" },
        { agent: "Skeptic", text: e.data.skeptic, round: e.data.round, color: "text-red-500", bgColor: "bg-red-500" }
      ]);
  }, [events]);

  if (error) {
    return (
      <div className="p-8 text-center border border-dashed border-destructive/20 rounded-2xl bg-destructive/5 animate-in fade-in duration-500">
        <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-3" />
        <h4 className="text-lg font-bold text-destructive">Connection Interrupted</h4>
        <p className="text-muted-foreground mt-2 text-sm max-w-xs mx-auto">{error}</p>
        <Button 
          variant="outline" 
          size="sm"
          className="mt-6 rounded-lg"
          onClick={() => {
            setStarted(false);
            startDebate(proposal);
          }}
        >
          Retry Protocol
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Status - More subtle */}
      <div className="flex items-center justify-between p-4 md:p-6 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-4">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-500",
            isStreaming ? "bg-primary text-primary-foreground" : "bg-green-500 text-white"
          )}>
             {isStreaming ? (
               <Cpu className="h-5 w-5 animate-spin" />
             ) : (
               <ShieldCheck className="h-5 w-5" />
             )}
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold uppercase tracking-tight">Autonomous Consensus Engine</h3>
            <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
               <Activity className="h-2.5 w-2.5" />
               {currentStatus}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4">
           <div className="flex gap-1">
              {[1, 2, 3].map((r) => {
                 const isCompleted = events.some(e => e.event === "round_completed" && e.data.round === r);
                 const isActive = events.some(e => e.event === "round_started" && e.data.round === r);
                 return (
                   <div 
                     key={r} 
                     className={cn(
                       "h-1 w-6 rounded-full transition-all duration-500",
                       isCompleted ? "bg-green-500" : isActive ? "bg-primary animate-pulse" : "bg-neutral-200 dark:bg-neutral-800"
                     )} 
                   />
                 );
              })}
           </div>
        </div>
      </div>

      {/* Main Stream Area */}
      <div className="relative pl-10 border-l border-neutral-100 dark:border-neutral-800 space-y-12 py-2 ml-4">
        
        {/* Research Step */}
        {events.some(e => e.event === "internet_evidence") && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
            <div className="absolute -left-[51px] top-0 h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center shadow-sm">
               <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-4">
               <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ph-0: Neural Search</span>
               <div className="p-5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
                  <p className="text-sm leading-relaxed text-muted-foreground italic">
                    Cross-referencing global data packs to validate socio-economic claims for <span className="text-foreground font-semibold">{proposal.title}</span>.
                  </p>
               </div>
            </div>
          </motion.div>
        )}

        {/* Dynamic Statements */}
        {statements.map((stmt, i) => (
          <motion.div 
            key={`${stmt.agent}-${stmt.round}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative"
          >
            <div className={cn(
              "absolute -left-[51px] top-0 h-10 w-10 rounded-full border-2 border-background flex items-center justify-center shadow-md",
              stmt.bgColor
            )}>
               <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={cn("text-xs font-bold uppercase tracking-widest", stmt.color)}>
                  Agent: {stmt.agent}
                </span>
                <Badge variant="outline" className="text-[9px] font-black h-4 px-2 rounded-sm bg-background">Round {stmt.round}</Badge>
              </div>
              <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow">
                <Typewriter 
                  text={stmt.text} 
                  speed={8}
                  className="text-base leading-relaxed text-foreground/80 font-medium"
                />
              </div>
            </div>
          </motion.div>
        ))}

        {/* Final Synthesis */}
        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative pt-6"
          >
            <div className="absolute -left-[51px] top-6 h-10 w-10 rounded-full bg-green-500 border border-background flex items-center justify-center shadow-lg z-20">
               <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-green-500">Final Verification Log</span>
                 <div className="h-px flex-1 bg-green-500/20" />
              </div>
              
              <div className="p-8 rounded-3xl bg-neutral-900 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <ShieldCheck className="h-32 w-32" />
                </div>
                
                <div className="relative z-10 space-y-8">
                   <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                      <div className="space-y-2">
                         <p className="text-[9px] font-black uppercase tracking-widest text-green-400">Integrity Metric</p>
                         <h4 className="text-5xl font-black italic tracking-tighter">
                            {Math.round((result.aggregate_score ?? result.aggregateScore ?? 0) * 100)}%
                         </h4>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                         <Badge className="bg-green-500 text-white font-bold border-none px-4 py-1 text-[10px] rounded-lg tracking-widest uppercase">
                            Status: PASSED
                         </Badge>
                         <p className="text-[10px] font-bold uppercase opacity-50 tracking-widest">
                            Priority: {((result.funding_priority_score ?? result.fundingPriorityScore ?? 0) * 100).toFixed(0)}/100
                         </p>
                      </div>
                   </div>

                   <div className="space-y-4 pt-4 border-t border-white/10">
                      <p className="text-lg leading-relaxed font-medium text-white/90 italic">
                        "{result.final_summary}"
                      </p>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                         <p className="text-[9px] font-bold uppercase tracking-widest text-green-400 mb-2">Strategy</p>
                         <p className="text-sm font-bold uppercase">{result.funding_recommendation}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-center">
                         <Link href="/audit" className="text-xs font-bold flex items-center gap-2 hover:text-green-400">
                            Cryptographic Audit Hash <ArrowRight className="h-3 w-3" />
                         </Link>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={scrollRef} className="h-4" />
      </div>
    </div>
  );
}
