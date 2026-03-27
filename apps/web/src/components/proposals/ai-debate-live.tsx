"use client";

import {
	Activity,
	BadgeAlert,
	BrainCircuit,
	CheckCircle2,
	Globe,
	MessageSquare,
	MessagesSquare,
	Search,
	ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
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
				headline:
					"AI debate leans against backing this proposal right now",
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

export function AIDebateLive({ proposal }: { proposal: SerializedProposal }) {
	const savedDebate = proposal.ai_debate;
	const [isDialogOpen, setIsDialogOpen] = useState(false);

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

	const recommendationPresentation = useMemo(
		() =>
			getRecommendationPresentation(
				savedDebate?.funding_recommendation ?? "defer",
			),
		[savedDebate?.funding_recommendation],
	);

	if (!savedDebate) {
		return (
			<div className="rounded-3xl border border-dashed border-neutral-200 bg-neutral-50/70 p-8 text-center dark:border-neutral-800 dark:bg-neutral-900/40">
				<BadgeAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
				<h3 className="text-lg font-semibold tracking-tight">
					No saved AI debate yet
				</h3>
				<p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
					This proposal does not have a persisted debate transcript
					yet. New proposals will save the full AI debate during
					creation and replay it here for every viewer.
				</p>
			</div>
		);
	}

	const finalItem = timeline.find((item) => item.kind === "final") as Extract<
		DebateTimelineItem,
		{ kind: "final" }
	>;

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-background p-5 shadow-sm dark:border-neutral-800 md:flex-row md:items-center md:justify-between">
				<div className="flex items-center gap-4">
					<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
						<BrainCircuit className="h-5 w-5" />
					</div>
					<div className="space-y-1">
						<p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
							AI Agents Verdict
						</p>
						<h3 className="text-base font-semibold tracking-tight">
							One AI debate, persisted on-chain for every viewer
						</h3>
						<p className="text-xs text-muted-foreground">
							Advocate: {savedDebate.models.advocate} | Skeptic:{" "}
							{savedDebate.models.skeptic} | Judge:{" "}
							{savedDebate.models.judge}
						</p>
					</div>
				</div>
				<div className="flex flex-col items-start md:items-end gap-2">
					<Badge
						variant="outline"
						className="rounded-full border-neutral-200 bg-neutral-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] dark:border-neutral-800 dark:bg-neutral-900"
					>
						Saved{" "}
						{new Date(
							savedDebate.saved_at / 1000000,
						).toLocaleString(undefined, {
							dateStyle: "medium",
							timeStyle: "short",
						})}
					</Badge>

					<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
						<DialogTrigger
							render={
								<Button
									variant="outline"
									size="sm"
									className="h-8 text-xs font-bold w-full md:w-auto mt-1"
								/>
							}
						>
							<MessagesSquare className="mr-2 h-3.5 w-3.5" />
							Read Full Transcript
						</DialogTrigger>
						<DialogContent className="sm:max-w-6xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
							<DialogHeader className="p-6 border-b shrink-0 bg-background">
								<DialogTitle className="flex items-center gap-2">
									<MessagesSquare className="h-5 w-5 text-primary" />
									Full AI Debate Transcript
								</DialogTitle>
								<DialogDescription>
									The complete back-and-forth debate between
									the Advocate, Skeptic, and Judge models.
								</DialogDescription>
							</DialogHeader>
							<div className="flex-1 overflow-y-auto p-6 space-y-6 bg-neutral-50/50 dark:bg-neutral-950/50">
								{timeline.map((item, index) => {
									if (item.kind === "research") {
										return (
											<div
												key={`research-${index}`}
												className="rounded-xl border border-neutral-200 bg-background p-4 shadow-sm dark:border-neutral-800"
											>
												<div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
													<Search className="h-3.5 w-3.5" />
													Internet evidence retrieved
												</div>
												<div className="space-y-1.5 text-xs text-foreground/80">
													<p className="flex items-start gap-2">
														<Activity className="mt-0.5 h-3.5 w-3.5 text-primary shrink-0" />
														<span>
															<span className="font-semibold text-foreground">
																Query:
															</span>{" "}
															{item.searchText}
														</span>
													</p>
													{item.geoHint ? (
														<p className="flex items-start gap-2 text-muted-foreground">
															<Globe className="mt-0.5 h-3.5 w-3.5 shrink-0" />
															<span>
																<span className="font-semibold text-foreground">
																	Geo hint:
																</span>{" "}
																{item.geoHint}
															</span>
														</p>
													) : null}
												</div>
											</div>
										);
									}

									if (item.kind === "message") {
										return (
											<div
												key={`${item.agent}-${item.round}-${index}`}
												className={cn(
													"flex",
													item.side === "left"
														? "justify-start"
														: "justify-end",
												)}
											>
												<div className="max-w-[85%] space-y-1.5">
													<div
														className={cn(
															"flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em]",
															item.side === "left"
																? "justify-start"
																: "justify-end",
															item.accent,
														)}
													>
														<MessageSquare className="h-3 w-3" />
														<span>
															{item.agent}
														</span>
														<span className="opacity-50">
															• Round {item.round}
														</span>
													</div>
													<div
														className={cn(
															"rounded-2xl border px-4 py-3 shadow-sm text-sm leading-relaxed text-foreground/90",
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
												key={`verdict-${item.round}`}
												className="mx-auto max-w-lg rounded-xl border border-neutral-200 bg-background p-4 text-center shadow-sm dark:border-neutral-800"
											>
												<div className="mb-1.5 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
													<ShieldCheck className="h-3 w-3" />
													Round {item.round} judge
													note
												</div>
												<p className="text-xs font-semibold text-foreground">
													Winner:{" "}
													<span className="capitalize">
														{item.winner === "tie"
															? "Tie"
															: item.winner}
													</span>{" "}
													({formatPercent(item.score)}
													)
												</p>
												<p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
													{item.rationale}
												</p>
											</div>
										);
									}

									return null;
								})}
								<div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-600 pb-4">
									<CheckCircle2 className="h-4 w-4" />
									End of Transcript
								</div>
							</div>
						</DialogContent>
					</Dialog>
				</div>
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
						<Badge
							className={cn(
								"border-none px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]",
								recommendationPresentation.badgeClassName,
							)}
						>
							{recommendationPresentation.label}
						</Badge>
						<p className="text-sm font-medium opacity-80">
							Debate score:{" "}
							{formatPercent(savedDebate.aggregate_score)}
						</p>
					</div>
				</div>
			</div>

			{finalItem && (
				<div className="rounded-2xl border border-neutral-200 bg-background p-6 shadow-sm dark:border-neutral-800">
					<div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
						<div className="space-y-1.5">
							<p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-500">
								Final Protocol Verdict
							</p>
							<h4 className="text-3xl font-black tracking-tight text-foreground">
								{formatPercent(finalItem.aggregateScore)}
							</h4>
							<p className="text-xs text-muted-foreground">
								Aggregate support score from the saved debate
							</p>
						</div>
						<div className="space-y-2 text-left md:text-right">
							<p className="text-xs text-muted-foreground">
								Funding priority score:{" "}
								<span className="font-semibold text-foreground">
									{formatPercent(
										finalItem.fundingPriorityScore,
									)}
								</span>
							</p>
						</div>
					</div>

					<p className="mt-6 text-sm leading-relaxed text-foreground/90">
						{finalItem.rationale}
					</p>

					<div className="mt-6 grid gap-3 grid-cols-2 md:grid-cols-4">
						<div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 flex flex-col justify-between dark:border-neutral-800 dark:bg-neutral-900/50">
							<p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
								Popularity
							</p>
							<p className="text-lg font-semibold text-foreground">
								{formatPercent(finalItem.criteria.popularity)}
							</p>
						</div>
						<div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 flex flex-col justify-between dark:border-neutral-800 dark:bg-neutral-900/50">
							<p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
								Tourism Attnd.
							</p>
							<p className="text-lg font-semibold text-foreground">
								{formatPercent(
									finalItem.criteria.tourism_attendance,
								)}
							</p>
						</div>
						<div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 flex flex-col justify-between dark:border-neutral-800 dark:bg-neutral-900/50">
							<p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
								Neglect/Age
							</p>
							<p className="text-lg font-semibold text-foreground">
								{formatPercent(
									finalItem.criteria.neglect_and_age,
								)}
							</p>
						</div>
						<div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 flex flex-col justify-between dark:border-neutral-800 dark:bg-neutral-900/50">
							<p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
								Tourism Ben.
							</p>
							<p className="text-lg font-semibold text-foreground">
								{formatPercent(
									finalItem.criteria
										.potential_tourism_benefit,
								)}
							</p>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
