"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  BadgeAlert,
  BrainCircuit,
  CheckCircle2,
  Globe,
  LoaderCircle,
  MessageSquare,
  PlayCircle,
  Search,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SerializedProposal,
  SerializedProposalAIDebate,
} from "@/lib/actions/proposals";
import { useAuthStore } from "@/lib/auth-store";
import { runProposalDebateEvaluation } from "@/lib/ai/debate";
import {
  getProposalAIDebateClient,
  getProposalClient,
  saveProposalAIDebateClient,
} from "@/lib/api/client-mutations";
import { ProposalAIDebate } from "@/lib/types/api";
import { cn } from "@/lib/utils";

interface TypewriterProps {
  text?: string;
  speed?: number;
  className?: string;
  showCursor?: boolean;
  onComplete?: () => void;
}

function Typewriter({
  text = "",
  speed = 8,
  className,
  showCursor = true,
  onComplete,
}: TypewriterProps) {
  const [displayedText, setDisplayedText] = useState("");
  const index = useRef(0);
  const completed = useRef(false);

  useEffect(() => {
    setDisplayedText("");
    index.current = 0;
    completed.current = false;
  }, [text]);

  useEffect(() => {
    if (index.current >= text.length) {
      if (!completed.current) {
        completed.current = true;
        onComplete?.();
      }
      return;
    }

    const timeout = window.setTimeout(() => {
      setDisplayedText((prev) => prev + text[index.current]);
      index.current += 1;
    }, speed);

    return () => window.clearTimeout(timeout);
  }, [displayedText, onComplete, speed, text]);

  return (
    <p className={className}>
      {displayedText}
      {showCursor ? (
        <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-primary" />
      ) : null}
    </p>
  );
}

type DebateTimelineItem =
  | {
      kind: "research";
      searchText: string;
      geoHint: string | null;
    }
  | {
      kind: "message";
      round: number;
      side: "left" | "right";
      agent: string;
      text: string;
      accent: string;
      bubbleClassName: string;
    }
  | {
      kind: "verdict";
      round: number;
      winner: string;
      score: number;
      rationale: string;
    }
  | {
      kind: "final";
      aggregateScore: number;
      fundingPriorityScore: number;
      fundingRecommendation: string;
      rationale: string;
      criteria: {
        popularity: number;
        tourism_attendance: number;
        neglect_and_age: number;
        potential_tourism_benefit: number;
      };
    };

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function getRecommendationPresentation(recommendation: string) {
  switch (recommendation) {
    case "fund":
      return {
        label: "Leaning Supportive",
        headline: "AI debate leans toward backing this proposal",
        description:
          "The saved exchange ended with a supportive recommendation, while still leaving the final decision to voters.",
        badgeClassName: "bg-emerald-500 text-white",
        panelClassName:
          "border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100",
      };
    case "reject":
      return {
        label: "Leaning Cautious",
        headline: "AI debate leans against backing this proposal right now",
        description:
          "The debate surfaced enough unresolved concerns that the current recommendation is to hold back support.",
        badgeClassName: "bg-rose-500 text-white",
        panelClassName:
          "border-rose-200 bg-rose-50/80 text-rose-950 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-100",
      };
    default:
      return {
        label: "Needs Stronger Case",
        headline: "AI debate suggests waiting for stronger evidence",
        description:
          "The models see potential here, but think the proposal would benefit from clearer evidence before support.",
        badgeClassName: "bg-amber-500 text-white",
        panelClassName:
          "border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100",
      };
  }
}

function serializeProposalAIDebate(
  debate: ProposalAIDebate,
): SerializedProposalAIDebate {
  return {
    models: {
      advocate: debate.models.advocate,
      skeptic: debate.models.skeptic,
      judge: debate.models.judge,
    },
    search_text: debate.search_text,
    geo_hint_display_name:
      debate.geo_hint_display_name.length > 0
        ? debate.geo_hint_display_name[0]!
        : null,
    rounds: debate.rounds.map((round) => ({
      round: Number(round.round),
      advocate_statement: round.advocate_statement,
      skeptic_statement: round.skeptic_statement,
      winner: round.winner,
      score: Number(round.score),
      rationale: round.rationale,
    })),
    aggregate_score: Number(debate.aggregate_score),
    judge_reported_aggregate_score: Number(
      debate.judge_reported_aggregate_score,
    ),
    funding_priority_score: Number(debate.funding_priority_score),
    funding_recommendation: debate.funding_recommendation,
    rationale: debate.rationale,
    criteria_ratings: {
      popularity: Number(debate.criteria_ratings.popularity),
      tourism_attendance: Number(debate.criteria_ratings.tourism_attendance),
      neglect_and_age: Number(debate.criteria_ratings.neglect_and_age),
      potential_tourism_benefit: Number(
        debate.criteria_ratings.potential_tourism_benefit,
      ),
    },
    saved_at: Number(debate.saved_at),
  };
}

interface AIDebateLiveProps {
  proposal: SerializedProposal;
  onProposalUpdated?: (
    changes: Partial<
      Pick<SerializedProposal, "ai_debate" | "fairness_score" | "risk_flags">
    >,
  ) => void;
}

export function AIDebateLive({
  proposal,
  onProposalUpdated,
}: AIDebateLiveProps) {
  const savedDebate = proposal.ai_debate;
  const identity = useAuthStore((state) => state.identity);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isStartingDebate, setIsStartingDebate] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [startStatus, setStartStatus] = useState<string | null>(null);

  const timeline = useMemo<DebateTimelineItem[]>(() => {
    if (!savedDebate) {
      return [];
    }

    return [
      {
        kind: "research",
        searchText: savedDebate.search_text,
        geoHint: savedDebate.geo_hint_display_name,
      },
      ...savedDebate.rounds.flatMap((round) => [
        {
          kind: "message" as const,
          round: round.round,
          side: "left" as const,
          agent: "Advocate",
          text: round.advocate_statement,
          accent: "text-emerald-600",
          bubbleClassName:
            "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20",
        },
        {
          kind: "message" as const,
          round: round.round,
          side: "right" as const,
          agent: "Skeptic",
          text: round.skeptic_statement,
          accent: "text-rose-600",
          bubbleClassName:
            "border-rose-200 bg-rose-50/70 dark:border-rose-900/40 dark:bg-rose-950/20",
        },
        {
          kind: "verdict" as const,
          round: round.round,
          winner: round.winner,
          score: round.score,
          rationale: round.rationale,
        },
      ]),
      {
        kind: "final",
        aggregateScore: savedDebate.aggregate_score,
        fundingPriorityScore: savedDebate.funding_priority_score,
        fundingRecommendation: savedDebate.funding_recommendation,
        rationale: savedDebate.rationale,
        criteria: savedDebate.criteria_ratings,
      },
    ];
  }, [savedDebate]);

  const [visibleCount, setVisibleCount] = useState(0);
  const advanceTimeoutRef = useRef<number | null>(null);

  const recommendationPresentation = useMemo(
    () =>
      getRecommendationPresentation(
        savedDebate?.funding_recommendation ?? "defer",
      ),
    [savedDebate?.funding_recommendation],
  );

  useEffect(() => {
    if (!timeline.length) {
      setVisibleCount(0);
      return;
    }

    setVisibleCount(1);

    return () => {
      if (advanceTimeoutRef.current !== null) {
        window.clearTimeout(advanceTimeoutRef.current);
        advanceTimeoutRef.current = null;
      }
    };
  }, [timeline]);

  useEffect(() => {
    if (!savedDebate) {
      return;
    }

    setStartError(null);
    setStartStatus(null);
  }, [savedDebate]);

  const currentItem =
    visibleCount > 0 ? timeline[Math.min(visibleCount - 1, timeline.length - 1)] : null;

  useEffect(() => {
    if (!currentItem || currentItem.kind === "message" || visibleCount >= timeline.length) {
      return;
    }

    const delay = currentItem.kind === "research" ? 900 : currentItem.kind === "verdict" ? 1400 : 0;
    if (delay === 0) {
      return;
    }

    advanceTimeoutRef.current = window.setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 1, timeline.length));
    }, delay);

    return () => {
      if (advanceTimeoutRef.current !== null) {
        window.clearTimeout(advanceTimeoutRef.current);
        advanceTimeoutRef.current = null;
      }
    };
  }, [currentItem, timeline.length, visibleCount]);

  const advanceAfterMessage = (index: number) => {
    if (index !== visibleCount - 1 || visibleCount >= timeline.length) {
      return;
    }

    if (advanceTimeoutRef.current !== null) {
      window.clearTimeout(advanceTimeoutRef.current);
    }

    advanceTimeoutRef.current = window.setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 1, timeline.length));
    }, 450);
  };

  const hydrateSavedDebate = async () => {
    const [debate, updatedProposal] = await Promise.all([
      getProposalAIDebateClient(proposal.id, identity),
      getProposalClient(proposal.id, identity),
    ]);

    if (!debate) {
      throw new Error(
        "The debate finished, but it could not be read back from the canister yet. Refresh and try again in a moment.",
      );
    }

    const updatedFairnessScore =
      updatedProposal && updatedProposal.fairness_score.length > 0
        ? updatedProposal.fairness_score[0]!
        : proposal.fairness_score;

    onProposalUpdated?.({
      ai_debate: serializeProposalAIDebate(debate),
      fairness_score: updatedFairnessScore,
      risk_flags: updatedProposal?.risk_flags ?? proposal.risk_flags,
    });
  };

  const startFirstDebate = async () => {
    if (!identity) {
      setStartError("Sign in with Internet Identity to start the first debate.");
      return;
    }

    setIsStartingDebate(true);
    setStartError(null);
    setStartStatus("Running the first AI debate...");

    try {
      const generatedDebate = await runProposalDebateEvaluation(proposal);
      setStartStatus("Saving the first debate on-chain...");
      await saveProposalAIDebateClient(identity, proposal.id, generatedDebate);
      await hydrateSavedDebate();
      setStartStatus(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not start the first AI debate.";

      if (message.toLowerCase().includes("already")) {
        try {
          await hydrateSavedDebate();
          setStartError(null);
          setStartStatus("The first debate was already saved for this proposal.");
          return;
        } catch (readBackError) {
          const readBackMessage =
            readBackError instanceof Error
              ? readBackError.message
              : "The saved debate could not be loaded yet.";
          setStartError(readBackMessage);
          setStartStatus(null);
          return;
        }
      }

      setStartError(message);
      setStartStatus(null);
    } finally {
      setIsStartingDebate(false);
    }
  };

  if (!savedDebate) {
    return (
      <div className="rounded-3xl border border-dashed border-neutral-200 bg-neutral-50/70 p-8 dark:border-neutral-800 dark:bg-neutral-900/40">
        <div className="mx-auto max-w-2xl text-center">
          <BadgeAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h3 className="text-lg font-semibold tracking-tight">
            No saved AI debate yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            This proposal does not have a persisted debate transcript yet. The
            first completed debate will be saved on-chain and then replayed here
            for every viewer.
          </p>

          <div className="mt-6 flex flex-col items-center gap-3">
            <Button
              onClick={startFirstDebate}
              disabled={!isAuthenticated || isStartingDebate}
              size="lg"
              className="min-w-60"
            >
              {isStartingDebate ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {startStatus ?? "Starting debate"}
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" />
                  Start the first debate
                </>
              )}
            </Button>

            <p className="max-w-lg text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Only one debate is stored per proposal. After the first save, this
              tab becomes a replay for everyone.
            </p>

            {!isAuthenticated ? (
              <p className="max-w-md text-sm text-muted-foreground">
                Sign in with Internet Identity to launch and save the first
                debate for this proposal.
              </p>
            ) : null}

            {startStatus && !isStartingDebate ? (
              <p className="text-sm font-medium text-emerald-600">
                {startStatus}
              </p>
            ) : null}

            {startError ? (
              <p className="max-w-lg text-sm font-medium text-rose-600">
                {startError}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
              Saved Debate Replay
            </p>
            <h3 className="text-base font-semibold tracking-tight">
              One AI debate, persisted on-chain for every viewer
            </h3>
            <p className="text-xs text-muted-foreground">
              Advocate: {savedDebate.models.advocate} | Skeptic:{" "}
              {savedDebate.models.skeptic} | Judge: {savedDebate.models.judge}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="w-fit rounded-full border-neutral-200 bg-neutral-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] dark:border-neutral-800 dark:bg-neutral-900"
        >
          Saved{" "}
          {new Date(savedDebate.saved_at / 1000000).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </Badge>
      </div>

      <div
        className={cn(
          "rounded-2xl border p-5 shadow-sm",
          recommendationPresentation.panelClassName,
        )}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-70">
              AI takeaway
            </p>
            <h3 className="text-xl font-bold tracking-tight">
              {recommendationPresentation.headline}
            </h3>
            <p className="max-w-2xl text-sm leading-relaxed opacity-80">
              {recommendationPresentation.description}
            </p>
          </div>
          <div className="space-y-2 md:text-right">
            <Badge className={cn("border-none px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]", recommendationPresentation.badgeClassName)}>
              {recommendationPresentation.label}
            </Badge>
            <p className="text-sm font-medium opacity-80">
              Debate score: {formatPercent(savedDebate.aggregate_score)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {timeline.slice(0, visibleCount).map((item, index) => {
          const isLatest = index === visibleCount - 1;

          if (item.kind === "research") {
            return (
              <motion.div
                key={`research-${index}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-5 dark:border-neutral-800 dark:bg-neutral-900/60"
              >
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  <Search className="h-3.5 w-3.5" />
                  Internet evidence
                </div>
                <div className="space-y-3 text-sm text-foreground/85">
                  <p className="flex items-start gap-2">
                    <Activity className="mt-0.5 h-4 w-4 text-primary" />
                    <span>
                      Query used: <span className="font-medium">{item.searchText}</span>
                    </span>
                  </p>
                  {item.geoHint ? (
                    <p className="flex items-start gap-2 text-muted-foreground">
                      <Globe className="mt-0.5 h-4 w-4" />
                      <span>Geo hint: {item.geoHint}</span>
                    </p>
                  ) : null}
                </div>
              </motion.div>
            );
          }

          if (item.kind === "message") {
            return (
              <motion.div
                key={`${item.agent}-${item.round}-${index}`}
                initial={{ opacity: 0, x: item.side === "left" ? -16 : 16 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex",
                  item.side === "left" ? "justify-start" : "justify-end",
                )}
              >
                <div className="max-w-3xl space-y-2">
                  <div
                    className={cn(
                      "flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]",
                      item.side === "left" ? "justify-start" : "justify-end",
                      item.accent,
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{item.agent}</span>
                    <Badge
                      variant="outline"
                      className="rounded-full px-2 py-0 text-[10px] font-semibold"
                    >
                      Round {item.round}
                    </Badge>
                  </div>
                  <div
                    className={cn(
                      "rounded-3xl border px-5 py-4 shadow-sm",
                      item.bubbleClassName,
                    )}
                  >
                    {isLatest ? (
                      <Typewriter
                        text={item.text}
                        speed={6}
                        className="text-sm leading-relaxed text-foreground/90 md:text-[15px]"
                        showCursor
                        onComplete={() => advanceAfterMessage(index)}
                      />
                    ) : (
                      <p className="text-sm leading-relaxed text-foreground/90 md:text-[15px]">
                        {item.text}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          }

          if (item.kind === "verdict") {
            return (
              <motion.div
                key={`verdict-${item.round}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mx-auto max-w-2xl rounded-2xl border border-neutral-200 bg-background p-5 text-center shadow-sm dark:border-neutral-800"
              >
                <div className="mb-2 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Round {item.round} judge note
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Winner:{" "}
                  <span className="capitalize">
                    {item.winner === "tie" ? "Tie" : item.winner}
                  </span>{" "}
                  ({formatPercent(item.score)})
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.rationale}
                </p>
              </motion.div>
            );
          }

          return (
            <motion.div
              key={`final-${index}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-neutral-900 bg-neutral-950 p-6 text-white shadow-2xl"
            >
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">
                    Final verdict
                  </p>
                  <h4 className="text-4xl font-black tracking-tight">
                    {formatPercent(item.aggregateScore)}
                  </h4>
                  <p className="text-sm text-white/70">
                    Aggregate support score from the saved debate
                  </p>
                </div>
                <div className="space-y-3 text-right">
                  <Badge
                    className={cn(
                      "rounded-full border-none px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white",
                      recommendationPresentation.badgeClassName,
                    )}
                  >
                    {recommendationPresentation.label}
                  </Badge>
                  <p className="text-sm text-white/80">
                    Funding priority:{" "}
                    <span className="font-semibold">
                      {formatPercent(item.fundingPriorityScore)}
                    </span>
                  </p>
                </div>
              </div>

              <p className="mt-6 text-base leading-relaxed text-white/90">
                {item.rationale}
              </p>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                  Gentle recommendation
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {recommendationPresentation.headline}
                </p>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                    Popularity
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {formatPercent(item.criteria.popularity)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                    Tourism Attendance
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {formatPercent(item.criteria.tourism_attendance)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                    Neglect And Age
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {formatPercent(item.criteria.neglect_and_age)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                    Tourism Benefit
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {formatPercent(item.criteria.potential_tourism_benefit)}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {visibleCount >= timeline.length ? (
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          Saved debate replay complete
        </div>
      ) : null}
    </div>
  );
}
