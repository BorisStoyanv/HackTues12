"use client";

import {
	BadgeAlert,
	BrainCircuit,
	Globe,
	MessagesSquare,
	Search,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SerializedProposal } from "@/lib/actions/proposals";
import { cn } from "@/lib/utils";

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
	  };

function formatPercent(value: number) {
	return `${Math.round(value * 100)}%`;
}

export function AIDebateLive({ proposal }: { proposal: SerializedProposal }) {
	const savedDebate = proposal.ai_debate;

	const { timeline, finalResult } = useMemo(() => {
		if (!savedDebate) return { timeline: [], finalResult: null };

		const items: DebateTimelineItem[] = [
			{
				kind: "research",
				searchText: savedDebate.search_text,
				geoHint: savedDebate.geo_hint_display_name,
			},
		];

		savedDebate.rounds.forEach((round) => {
			items.push({
				kind: "message",
				round: round.round,
				side: "left",
				agent: "Advocate",
				text: round.advocate_statement,
				accent: "text-emerald-600",
				bubbleClassName:
					"border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20",
			});
			items.push({
				kind: "message",
				round: round.round,
				side: "right",
				agent: "Skeptic",
				text: round.skeptic_statement,
				accent: "text-rose-600",
				bubbleClassName:
					"border-rose-200 bg-rose-50/70 dark:border-rose-900/40 dark:bg-rose-950/20",
			});
			items.push({
				kind: "verdict",
				round: round.round,
				winner: round.winner,
				score: round.score,
				rationale: round.rationale,
			});
		});

		const final = {
			aggregateScore: savedDebate.aggregate_score,
			fundingPriorityScore: savedDebate.funding_priority_score,
			fundingRecommendation: savedDebate.funding_recommendation,
			rationale: savedDebate.rationale,
			criteria: savedDebate.criteria_ratings,
		};

		return { timeline: items, finalResult: final };
	}, [savedDebate]);

	if (!savedDebate || !finalResult) {
		return (
			<div className="rounded-3xl border border-dashed border-neutral-200 bg-neutral-50/70 p-8 text-center dark:border-neutral-800 dark:bg-neutral-900/40">
				<BadgeAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
				<h3 className="text-lg font-semibold tracking-tight">
					No saved AI debate yet
				</h3>
				<p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
					This proposal does not have a persisted debate transcript
					yet.
				</p>
			</div>
		);
	}

	const renderTimelineItem = (item: DebateTimelineItem, index: number) => {
		if (item.kind === "research") {
			return (
				<div
					key={`research-${index}`}
					className="rounded-2xl border bg-background p-4 shadow-sm"
				>
					<div className="flex items-center gap-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
						<Search className="h-3 w-3" />
						Internet Research Stage
					</div>
					<p className="text-xs font-bold">{item.searchText}</p>
					{item.geoHint && (
						<p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
							<Globe className="h-3 w-3" /> {item.geoHint}
						</p>
					)}
				</div>
			);
		}

		if (item.kind === "message") {
			return (
				<div
					key={`msg-${index}`}
					className={cn(
						"flex",
						item.side === "left" ? "justify-start" : "justify-end",
					)}
				>
					<div className="max-w-[85%] space-y-1.5">
						<div
							className={cn(
								"flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest",
								item.side === "left"
									? "justify-start"
									: "justify-end",
								item.accent,
							)}
						>
							{item.agent} Round {item.round}
						</div>
						<div
							className={cn(
								"rounded-2xl border p-4 text-xs leading-relaxed shadow-sm",
								item.bubbleClassName,
							)}
						>
							{item.text}
						</div>
					</div>
				</div>
			);
		}

		if (item.kind === "verdict") {
			return (
				<div
					key={`verdict-${index}`}
					className="mx-auto max-w-sm rounded-xl border border-dashed bg-background/50 p-4 text-center"
				>
					<div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1 flex items-center justify-center gap-2">
						<ShieldCheck className="h-3 w-3" /> Round {item.round}{" "}
						Judge Verdict
					</div>
					<p className="text-xs font-bold">
						Winner:{" "}
						<span className="text-primary capitalize">
							{item.winner}
						</span>{" "}
						({formatPercent(item.score)})
					</p>
					<p className="text-[10px] text-muted-foreground mt-1">
						{item.rationale}
					</p>
				</div>
			);
		}
		return null;
	};

	return (
		<div className="flex flex-col h-full bg-background">
			{/* Header */}
			<div className="flex items-center gap-3 p-6 border-b bg-neutral-50/50 dark:bg-neutral-950/50 shrink-0">
				<div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
					<BrainCircuit className="h-5 w-5" />
				</div>
				<div>
					<h3 className="text-sm font-semibold uppercase tracking-widest">
						Protocol Vetting
					</h3>
					<p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
						{savedDebate.models.advocate} vs{" "}
						{savedDebate.models.skeptic}
					</p>
				</div>
			</div>

			{/* Persistent Final Result */}
			<div className="p-6 pb-2 shrink-0">
				<div className="rounded-3xl bg-primary/5 border border-primary/20 p-6 relative overflow-hidden">
					<Sparkles className="absolute top-4 right-4 h-8 w-8 text-primary/20" />
					<div className="relative z-10 space-y-4">
						<div className="space-y-1">
							<p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
								Final AI Consensus
							</p>
							<h4 className="text-2xl font-semibold tracking-tight text-foreground">
								{formatPercent(finalResult.aggregateScore)}{" "}
								Support
							</h4>
						</div>
						<p className="text-sm font-medium leading-relaxed text-foreground/80">
							{finalResult.rationale}
						</p>

						<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-primary/10">
							{Object.entries(finalResult.criteria).map(
								([key, val]) => (
									<div key={key}>
										<p className="text-[8px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5 truncate">
											{key.replace(/_/g, " ")}
										</p>
										<p className="text-base font-bold text-foreground">
											{formatPercent(val as number)}
										</p>
									</div>
								),
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Full Transcript Action Area */}
			<div className="flex-1 flex flex-col items-center justify-center p-6 bg-neutral-50/20 dark:bg-neutral-950/20 text-center space-y-4">
				<p className="text-xs text-muted-foreground leading-relaxed font-medium max-w-70">
					The AI consensus is drawn from an extensive, automated
					debate simulating public scrutiny.
				</p>
				<Dialog>
					<DialogTrigger
						render={
							<Button
								variant="outline"
								className="rounded-full shadow-sm gap-2 font-bold uppercase tracking-widest text-[10px] h-10 px-5 border-2 border-neutral-200 dark:border-neutral-800 hover:bg-primary/5 hover:text-primary transition-colors"
							/>
						}
					>
						<MessagesSquare className="h-4 w-4" />
						Read Full Transcript
					</DialogTrigger>
					<DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col p-0">
						<DialogHeader className="p-6 border-b shrink-0 bg-background">
							<DialogTitle className="flex items-center gap-2 text-lg">
								<BrainCircuit className="h-5 w-5 text-primary" />
								Full Debate Transcript
							</DialogTitle>
						</DialogHeader>
						<ScrollArea className="h-[50vh] flex-1 p-6 space-y-6 bg-neutral-50/20 dark:bg-neutral-950/20">
							<div className="space-y-6 pb-6">
								{timeline.map((item, index) =>
									renderTimelineItem(item, index),
								)}
							</div>
						</ScrollArea>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}
