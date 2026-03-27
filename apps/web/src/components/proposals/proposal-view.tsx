"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
	BarChart3,
	Briefcase,
	Calendar,
	ChevronLeft,
	ChevronRight,
	DollarSign,
	FileText,
	Globe,
	Info,
	LayoutDashboard,
	TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";

import { useProposalGovernance } from "@/hooks/use-proposal-governance";
import { SerializedProposal, SerializedVote } from "@/lib/actions/proposals";
import { getProposalVotingMetrics } from "@/lib/proposals/voting";
import { AIDebateLive } from "./ai-debate-live";
import {
	ProtocolRules,
	TurnoutWidget,
	VoterInsight,
	VotingProgress,
} from "./governance-widgets";
import { ProposalActionCard } from "./proposal-action-card";

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
	const [auditPage, setAuditPage] = useState(1);
	const { isLoading, isLocallyVerified, viewerProfile, viewerVotingPower } =
		useProposalGovernance(initialData);

	if (!initialData) {
		return (
			<div className="flex flex-col items-center justify-center h-full p-4 text-center space-y-4">
				<BarChart3 className="h-12 w-12 text-neutral-400 animate-pulse" />
				<h1 className="text-xl font-semibold tracking-tight">
					Proposal Not Found
				</h1>
				<Link
					href="/dashboard"
					className="text-primary hover:underline font-bold uppercase tracking-widest text-xs"
				>
					Return to Dashboard
				</Link>
			</div>
		);
	}

	const proposal = initialData;
	const metrics = getProposalVotingMetrics(proposal);
	const statusFormatted = proposal.status.replace(/([A-Z])/g, " $1").trim();
	const locationLabel = proposal.location.city || proposal.region_tag;

	// Audit Ledger Pagination
	const votesPerPage = 10;
	const totalAuditPages = Math.ceil(votes.length / votesPerPage);
	const paginatedVotes = votes.slice(
		(auditPage - 1) * votesPerPage,
		auditPage * votesPerPage,
	);

	return (
		<div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
			{/* Header - Minimal & High Impact */}
			<header className="border-b bg-neutral-50/50 dark:bg-neutral-950/50 px-8 py-6 shrink-0">
				<div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<Badge className="bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] px-2 py-0.5 rounded">
								{statusFormatted}
							</Badge>
							<span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
								<Globe className="h-3 w-3" /> {locationLabel}
							</span>
						</div>
						<h1 className="text-3xl font-black tracking-tight leading-tight">
							{proposal.title}
						</h1>
					</div>
					<div className="flex items-center gap-8">
						<div className="text-right">
							<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
								Capital Required
							</p>
							<p className="text-2xl font-black tracking-tighter text-primary">
								{proposal.budget_amount.toLocaleString()}{" "}
								<span className="text-xs">
									{proposal.budget_currency}
								</span>
							</p>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content Grid */}
			<main className="flex-1 overflow-y-auto p-8 bg-neutral-50/20 dark:bg-neutral-950/20">
				<div className="max-w-7xl mx-auto space-y-8">
					{/* Interactive Debate & Governance Hub */}
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
						{/* Left: Quick Stats */}
						<div className="lg:col-span-3 space-y-6">
							<VoterInsight
								votingPower={viewerVotingPower}
								isLocal={isLocallyVerified}
								userType={viewerProfile?.userType}
							/>
							<TurnoutWidget
								metrics={metrics}
								voterCount={proposal.voter_count}
							/>
							<ProtocolRules
								metrics={metrics}
								status={proposal.status}
							/>

							{/* Audit Ledger Moved Here */}
							<div className="pt-4">
								<div className="flex items-center justify-between mb-3">
									<h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
										Audit Ledger
									</h3>
									<Badge
										variant="secondary"
										className="text-[8px] px-1.5 py-0 rounded-full font-black uppercase tracking-widest"
									>
										{votes.length} Votes
									</Badge>
								</div>
								<div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden bg-background">
									<table className="w-full text-sm">
										<thead className="bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800">
											<tr>
												<th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
													Voter
												</th>
												<th className="text-center px-4 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
													Stance
												</th>
												<th className="text-right px-4 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
													VP
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
											{paginatedVotes.length > 0 ? (
												paginatedVotes.map(
													(vote, i) => (
														<tr
															key={i}
															className="hover:bg-neutral-50/50 transition-colors"
														>
															<td className="px-4 py-3 font-mono text-[10px] font-bold text-muted-foreground truncate max-w-[80px]">
																...
																{vote.voter.substring(
																	vote.voter
																		.length -
																		6,
																)}
															</td>
															<td className="px-4 py-3 text-center">
																{vote.in_favor ? (
																	<Badge
																		variant="outline"
																		className="border-emerald-200 bg-emerald-50 text-emerald-700 font-black text-[8px] uppercase tracking-widest px-1.5 py-0 rounded"
																	>
																		Yes
																	</Badge>
																) : (
																	<Badge
																		variant="outline"
																		className="border-rose-200 bg-rose-50 text-rose-700 font-black text-[8px] uppercase tracking-widest px-1.5 py-0 rounded"
																	>
																		No
																	</Badge>
																)}
															</td>
															<td className="px-4 py-3 text-right font-mono font-black text-primary text-xs">
																{vote.weight.toFixed(
																	1,
																)}
															</td>
														</tr>
													),
												)
											) : (
												<tr>
													<td
														colSpan={3}
														className="px-4 py-8 text-center text-muted-foreground uppercase font-black tracking-widest text-[9px] opacity-50"
													>
														No votes yet
													</td>
												</tr>
											)}
										</tbody>
									</table>
									{totalAuditPages > 1 && (
										<div className="flex items-center justify-between p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/30 dark:bg-neutral-900/30">
											<Button
												variant="ghost"
												size="icon"
												className="h-6 w-6 rounded-md"
												onClick={() =>
													setAuditPage((p) =>
														Math.max(1, p - 1),
													)
												}
												disabled={auditPage === 1}
											>
												<ChevronLeft className="h-4 w-4" />
											</Button>
											<span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
												Page {auditPage} of{" "}
												{totalAuditPages}
											</span>
											<Button
												variant="ghost"
												size="icon"
												className="h-6 w-6 rounded-md"
												onClick={() =>
													setAuditPage((p) =>
														Math.min(
															totalAuditPages,
															p + 1,
														),
													)
												}
												disabled={
													auditPage ===
													totalAuditPages
												}
											>
												<ChevronRight className="h-4 w-4" />
											</Button>
										</div>
									)}
								</div>
							</div>
						</div>

						{/* Center: AI Debate centerpiece */}
						<div className="lg:col-span-6 bg-background rounded-[2rem] border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden flex flex-col">
							<AIDebateLive proposal={proposal} />
							{/* Sheet Trigger for Proposal Details */}
							<div className="mt-auto pt-4">
								<Sheet>
									<SheetTrigger
										render={
											<Button
												variant="outline"
												className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs border-2 shadow-sm gap-2"
											/>
										}
									>
										<FileText className="h-4 w-4" />
										View Full Proposal Details
									</SheetTrigger>
									<SheetContent
										side="right"
										className="w-full sm:max-w-6xl p-0 flex flex-col border-l"
									>
										<SheetHeader className="p-6 md:p-8 border-b bg-neutral-50/50 dark:bg-neutral-950/50 shrink-0">
											<SheetTitle className="text-2xl font-black tracking-tight">
												{proposal.title} Details
											</SheetTitle>
										</SheetHeader>
										<ScrollArea className="h-[50vh] flex-1 p-6 md:p-8">
											<div className="space-y-12 pb-12">
												{/* Overview */}
												<section className="space-y-4">
													<div className="flex items-center gap-3 text-primary">
														<Briefcase className="h-5 w-5" />
														<h3 className="text-lg font-bold">
															Scope of Work
														</h3>
													</div>
													<p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
														{proposal.description}
													</p>
													<div className="flex items-center gap-2 pt-2">
														<span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
															Category
														</span>
														<Badge
															variant="secondary"
															className="rounded-md px-3 font-bold uppercase tracking-wider text-[10px]"
														>
															{proposal.category}
														</Badge>
													</div>
												</section>

												{/* Execution */}
												<section className="space-y-6">
													<div className="space-y-4">
														<div className="flex items-center gap-3 text-primary">
															<Calendar className="h-5 w-5" />
															<h3 className="text-lg font-bold">
																Timeline &
																Ownership
															</h3>
														</div>
														<div className="space-y-3 bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border">
															<div className="flex justify-between border-b pb-2">
																<span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
																	Target
																	Completion
																</span>
																<span className="text-xs font-bold">
																	{
																		proposal.timeline
																	}
																</span>
															</div>
															<div className="flex justify-between pt-1">
																<span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
																	Lead
																	Executor
																</span>
																<span className="text-xs font-bold">
																	{
																		proposal.executor_name
																	}
																</span>
															</div>
														</div>
													</div>
													<div className="space-y-4">
														<div className="flex items-center gap-3 text-primary">
															<LayoutDashboard className="h-5 w-5" />
															<h3 className="text-lg font-bold">
																Strategy
															</h3>
														</div>
														<p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
															{
																proposal.execution_plan
															}
														</p>
													</div>
												</section>

												{/* Financials */}
												<section className="space-y-6">
													<div className="space-y-4">
														<div className="flex items-center gap-3 text-primary">
															<DollarSign className="h-5 w-5" />
															<h3 className="text-lg font-bold">
																Budget Breakdown
															</h3>
														</div>
														<div className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border font-mono text-xs leading-relaxed whitespace-pre-wrap">
															{
																proposal.budget_breakdown
															}
														</div>
													</div>
													<div className="space-y-4">
														<div className="flex items-center gap-3 text-primary">
															<TrendingUp className="h-5 w-5" />
															<h3 className="text-lg font-bold">
																Escrow
																Governance
															</h3>
														</div>
														<div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
															<p className="text-sm leading-relaxed text-primary/90 font-medium">
																Funds are
																cryptographically
																pinned to
																verifiable
																milestones. 66%
																regional
																consensus
																required for
																release.
															</p>
														</div>
													</div>
												</section>

												{/* Impact */}
												<section className="space-y-4">
													<div className="flex items-center gap-3 text-primary">
														<Globe className="h-5 w-5" />
														<h3 className="text-lg font-bold">
															Expected Regional
															Impact
														</h3>
													</div>
													<p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
														{
															proposal.expected_impact
														}
													</p>
												</section>
											</div>
										</ScrollArea>
									</SheetContent>
								</Sheet>
							</div>
						</div>

						{/* Right: Voting/Funding Action & Information */}
						<div className="lg:col-span-3 space-y-6 flex flex-col">
							<Card className="border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
								<CardContent className="p-6 space-y-6">
									<VotingProgress metrics={metrics} />
									<div className="h-px bg-neutral-100 dark:bg-neutral-800" />
									<ProposalActionCard proposal={proposal} />
								</CardContent>
							</Card>

							<div className="p-6 rounded-3xl bg-primary/5 border border-primary/20 text-foreground space-y-4">
								<div className="flex items-center gap-2">
									<Info className="h-4 w-4 text-primary" />
									<p className="text-[10px] font-black uppercase tracking-widest text-primary">
										Protocol Insight
									</p>
								</div>
								<p className="text-xs leading-relaxed opacity-80 font-medium">
									The OpenFairTrip protocol uses dual-layer
									consensus. AI vetting provides technical
									feasibility, while community voting ensures
									regional alignment.
								</p>
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
