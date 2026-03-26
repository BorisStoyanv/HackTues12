"use client";

import {
	ArrowLeft,
	BarChart3,
	ChevronRight,
	Clock,
	MapPin,
	MessageSquare,
	ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SerializedProposal } from "@/lib/actions/proposals";
import { useAuthStore } from "@/lib/auth-store";
import { MOCK_FEATURED_PROPOSALS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface ProposalViewProps {
	id: string;
	mode: "public" | "authenticated";
	onBack?: () => void;
	initialData?: SerializedProposal;
}

export function ProposalView({
	id,
	mode,
	onBack,
	initialData,
}: ProposalViewProps) {
	const user = useAuthStore((state) => state.user);

	const proposal = useMemo(() => {
		const mock =
			MOCK_FEATURED_PROPOSALS.find((p) => p.id === id) ||
			MOCK_FEATURED_PROPOSALS[0]!;
		if (initialData) {
			return {
				...mock,
				...initialData,
				ai_integrity_report:
					initialData.ai_integrity_report || mock.ai_integrity_report,
				voting_metrics:
					initialData.voting_metrics || mock.voting_metrics,
				tags:
					initialData.tags && initialData.tags.length > 0
						? initialData.tags
						: mock.tags,
			};
		}
		return mock;
	}, [id, initialData]);

	if (!proposal) {
		return (
			<div className="flex flex-col items-center justify-center min-h-100 p-4 text-center">
				<h1 className="text-2xl font-bold mb-4">Proposal not found</h1>
				<Button onClick={onBack}>Go Back</Button>
			</div>
		);
	}

	const fundingProgress =
		(proposal.current_funding / proposal.funding_goal) * 100;
	const creatorId = proposal.creator_id;

	return (
		<div className="w-full min-h-screen bg-background text-foreground">
			{mode === "public" && (
				<header className="z-40 border-b bg-background/80 backdrop-blur-md sticky top-0 h-14">
					<div className="container mx-auto flex h-full items-center justify-between px-4 sm:px-6">
						<div className="flex items-center gap-4">
							<Button
								variant="ghost"
								size="icon"
								onClick={onBack}
								className="-ml-2"
							>
								<ArrowLeft className="h-5 w-5" />
							</Button>
							<div className="flex items-center gap-2 text-sm font-medium">
								<span className="text-muted-foreground">
									Explore
								</span>
								<ChevronRight className="h-4 w-4 text-muted-foreground" />
								<span className="truncate max-w-50">
									{proposal.title}
								</span>
							</div>
						</div>
						{!user && (
							<Link
								href="/login"
								className={buttonVariants({
									variant: "outline",
									size: "sm",
								})}
							>
								Sign in to Vote
							</Link>
						)}
					</div>
				</header>
			)}

			<main
				className={cn(
					"py-8 px-4 sm:px-6 md:px-8 lg:px-12",
					mode === "public" && "container mx-auto",
				)}
			>
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
					{/* LEFT: Main Content Area (8/12 or 9/12) */}
					<div className="lg:col-span-8 xl:col-span-9 space-y-10">
						{/* Header Section */}
						<div className="space-y-6">
							<div className="flex flex-wrap gap-2">
								<Badge
									variant="secondary"
									className="uppercase tracking-wider text-[10px] px-2 py-0.5"
								>
									{proposal.status.replace("_", " ")}
								</Badge>
								{proposal.tags.map((tag) => (
									<Badge
										key={tag}
										variant="outline"
										className="text-[10px] px-2 py-0.5"
									>
										{tag}
									</Badge>
								))}
							</div>
							<h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
								{proposal.title}
							</h1>
							<div className="flex flex-wrap items-center gap-8 text-sm text-muted-foreground">
								<div className="flex items-center gap-2">
									<div className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center border text-xs font-bold">
										{creatorId?.[0]?.toUpperCase() || "U"}
									</div>
									<span className="text-base">
										Proposed by{" "}
										<span className="text-foreground font-semibold">
											@{creatorId}
										</span>
									</span>
								</div>
								<div className="flex items-center gap-1.5 text-base">
									<MapPin className="h-5 w-5" />{" "}
									{proposal.location.city},{" "}
									{proposal.location.country}
								</div>
								<div className="flex items-center gap-1.5 text-base">
									<Clock className="h-5 w-5" /> Created March
									2024
								</div>
							</div>
						</div>

						<Separator />

						{/* Tabs Section */}
						<Tabs defaultValue="overview" className="w-full">
							{/* Tab List with a fixed border-bottom but naturally spaced triggers */}
							<TabsList className="w-full flex justify-start border-b rounded-none h-auto bg-transparent p-0 mb-8 overflow-x-auto">
								<div className="flex space-x-10 min-w-max">
									{[
										"overview",
										"ai-integrity",
										"debate",
										"budget",
									].map((tab) => (
										<TabsTrigger
											key={tab}
											value={tab}
											className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-4 bg-transparent shadow-none font-bold text-base transition-none capitalize"
										>
											{tab === "ai-integrity"
												? "AI Integrity"
												: tab === "budget"
													? "Financials"
													: tab.replace("-", " ")}
											{tab === "ai-integrity" &&
												proposal.ai_integrity_report && (
													<Badge className="ml-2 bg-primary/10 text-primary border-none">
														{
															proposal
																.ai_integrity_report
																.overall_score
														}
														%
													</Badge>
												)}
										</TabsTrigger>
									))}
								</div>
							</TabsList>

							{/* OVERVIEW CONTENT */}
							<TabsContent
								value="overview"
								className="space-y-10 focus-visible:outline-none m-0"
							>
								<section className="space-y-4">
									<h3 className="text-2xl font-bold tracking-tight">
										Problem Statement
									</h3>
									<p className="text-muted-foreground leading-relaxed text-xl max-w-4xl">
										{proposal.problem_statement}
									</p>
								</section>
								<section className="space-y-4">
									<h3 className="text-2xl font-bold tracking-tight">
										Proposed Solution
									</h3>
									<p className="text-muted-foreground leading-relaxed text-xl max-w-4xl">
										{proposal.short_description}
									</p>
								</section>
								<section className="space-y-4">
									<h3 className="text-2xl font-bold tracking-tight">
										Success Metrics
									</h3>
									<div className="p-8 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 max-w-4xl">
										<p className="text-2xl font-medium italic text-foreground">
											"{proposal.success_metric}"
										</p>
									</div>
								</section>
							</TabsContent>

							{/* AI INTEGRITY CONTENT */}
							<TabsContent
								value="ai-integrity"
								className="space-y-10 focus-visible:outline-none m-0"
							>
								{proposal.ai_integrity_report ? (
									<>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
											{[
												{
													label: "Overall Integrity",
													value: proposal
														.ai_integrity_report
														.overall_score,
													color: "text-primary",
												},
												{
													label: "Fairness Score",
													value: proposal
														.ai_integrity_report
														.fairness_score,
													color: "text-blue-500",
												},
												{
													label: "Efficiency Score",
													value: proposal
														.ai_integrity_report
														.efficiency_score,
													color: "text-green-500",
												},
											].map((item, i) => (
												<Card
													key={i}
													className="border-neutral-200 dark:border-neutral-800 shadow-none p-2"
												>
													<CardHeader className="pb-2">
														<CardDescription className="text-xs uppercase font-bold tracking-widest">
															{item.label}
														</CardDescription>
														<CardTitle
															className={cn(
																"text-5xl font-black",
																item.color,
															)}
														>
															{item.value}%
														</CardTitle>
													</CardHeader>
												</Card>
											))}
										</div>
										<section className="space-y-4">
											<h3 className="text-3xl font-bold tracking-tight">
												AI Analysis Summary
											</h3>
											<p className="text-muted-foreground leading-relaxed text-xl max-w-4xl">
												{
													proposal.ai_integrity_report
														.summary
												}
											</p>
										</section>
									</>
								) : (
									<div className="p-16 text-center border-2 border-dashed rounded-2xl">
										<BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-6 opacity-20" />
										<h4 className="text-2xl font-bold tracking-tight">
											AI Debate in Progress
										</h4>
									</div>
								)}
							</TabsContent>

							{/* DEBATE LOG CONTENT */}
							<TabsContent
								value="debate"
								className="space-y-8 focus-visible:outline-none m-0"
							>
								<div className="flex items-center justify-between">
									<h3 className="text-3xl font-bold tracking-tight">
										3-Agent AI Consensus
									</h3>
									<Badge
										variant="outline"
										className="gap-2 px-4 py-1.5 text-sm font-semibold"
									>
										<ShieldCheck className="h-4 w-4 text-primary" />{" "}
										Verifiable Protocol
									</Badge>
								</div>
								<div className="relative pl-10 border-l-2 border-neutral-200 dark:border-neutral-800 space-y-16 py-4">
									{[
										{
											agent: "Advocate",
											role: "Proponent",
											color: "bg-blue-500",
											text: "The long-term impact on regional air quality justifies the initial capital outlay. Indigenous tree species are low-maintenance and provide maximum ecological resilience.",
										},
										{
											agent: "Skeptic",
											role: "Adversarial",
											color: "bg-red-500",
											text: "I question the maintenance budget in Years 2-5. Without a formal commitment from the municipal water department, survival rates could drop below 60% during drought.",
										},
										{
											agent: "Analyst",
											role: "Synthesizer",
											color: "bg-green-500",
											text: "Data indicates an average 12% property value increase. Recommending a 5% budget buffer for irrigation to mitigate Skeptic's concerns.",
										},
									].map((log, i) => (
										<div key={i} className="relative">
											<div
												className={cn(
													"absolute -left-12.75 top-0 h-10 w-10 rounded-full border-4 border-background flex items-center justify-center shadow-lg",
													log.color,
												)}
											>
												<MessageSquare className="h-4 w-4 text-white" />
											</div>
											<div className="space-y-4">
												<div className="flex items-center gap-3">
													<span
														className={cn(
															"text-sm font-bold uppercase tracking-widest",
															log.agent ===
																"Advocate"
																? "text-blue-500"
																: log.agent ===
																	  "Skeptic"
																	? "text-red-500"
																	: "text-green-500",
														)}
													>
														Agent: {log.agent}
													</span>
													<Badge
														variant="secondary"
														className="text-[10px] h-5 px-2"
													>
														{log.role}
													</Badge>
												</div>
												<div className="p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
													<p className="text-lg leading-relaxed italic text-muted-foreground">
														"{log.text}"
													</p>
												</div>
											</div>
										</div>
									))}
								</div>
							</TabsContent>

							{/* BUDGET CONTENT */}
							<TabsContent
								value="budget"
								className="space-y-8 focus-visible:outline-none m-0"
							>
								<h3 className="text-3xl font-bold tracking-tight">
									Financial Roadmap
								</h3>
								<div className="grid gap-6">
									{[
										{
											title: "Planning & Sourcing",
											pct: 20,
											desc: "Finalize tree species and nursery contracts.",
										},
										{
											title: "Phase 1: Excavation",
											pct: 30,
											desc: "Preparation of 250 sites along the Northern corridor.",
										},
										{
											title: "Phase 2: Planting",
											pct: 40,
											desc: "Installation of all 500 trees and irrigation setup.",
										},
										{
											title: "Verification & Audit",
											pct: 10,
											desc: "Independent survival audit after 3 months.",
										},
									].map((m, i) => (
										<div
											key={i}
											className="flex gap-8 p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 hover:border-primary/20 transition-all"
										>
											<div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl shrink-0">
												{m.pct}%
											</div>
											<div className="space-y-2">
												<p className="font-bold text-xl">
													{m.title}
												</p>
												<p className="text-muted-foreground text-lg">
													{m.desc}
												</p>
											</div>
										</div>
									))}
								</div>
							</TabsContent>
						</Tabs>
					</div>

					{/* RIGHT: Sidebar (Fixed height, sticky) */}
					<div className="lg:col-span-4 xl:col-span-3 space-y-8 lg:sticky lg:top-24 h-fit">
						<Card className="border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden">
							<div className="h-2 bg-primary w-full" />
							<CardHeader className="pb-6">
								<CardTitle className="text-2xl">
									Project Governance
								</CardTitle>
								<CardDescription className="text-base font-medium">
									Target: $
									{proposal.funding_goal.toLocaleString()} USD
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-8">
								<div className="space-y-3">
									<div className="flex justify-between items-end">
										<span className="font-bold text-2xl">
											$
											{proposal.current_funding.toLocaleString()}
										</span>
										<span className="text-muted-foreground font-semibold">
											{fundingProgress.toFixed(1)}% Funded
										</span>
									</div>
									<Progress
										value={fundingProgress}
										className="h-3"
									/>
								</div>
								<div className="grid grid-cols-2 gap-6 pt-2">
									<div className="space-y-1">
										<p className="text-[11px] uppercase font-black text-muted-foreground tracking-widest">
											Goal
										</p>
										<p className="text-lg font-bold">
											$
											{proposal.funding_goal.toLocaleString()}
										</p>
									</div>
									<div className="space-y-1 text-right">
										<p className="text-[11px] uppercase font-black text-muted-foreground tracking-widest">
											Status
										</p>
										<p
											className={cn(
												"text-lg font-bold capitalize",
												proposal.status === "funding"
													? "text-green-500"
													: "text-primary",
											)}
										>
											{proposal.status.replace("_", " ")}
										</p>
									</div>
								</div>
								<Separator />
								<div className="space-y-4 pt-2">
									{proposal.status === "voting" && (
										<Button className="w-full h-14 text-xl font-bold shadow-lg">
											Cast Your Vote
										</Button>
									)}
									<Button
										variant="outline"
										className="w-full h-14 font-bold text-lg"
									>
										Share Proposal
									</Button>
								</div>
							</CardContent>
						</Card>

						<Card className="border-neutral-200 dark:border-neutral-800 bg-neutral-50/30 dark:bg-neutral-900/30">
							<CardHeader className="pb-4">
								<CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
									Governance Power Split
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-6">
								{[
									{
										label: "Local Residents",
										val: proposal.voting_metrics
											.voting_power_distribution.locals,
										color: "bg-primary",
										width: "w-[60%]",
									},
									{
										label: "Verified Experts",
										val: proposal.voting_metrics
											.voting_power_distribution.experts,
										color: "bg-blue-500",
										width: "w-[30%]",
									},
									{
										label: "Global Community",
										val: proposal.voting_metrics
											.voting_power_distribution.general,
										color: "bg-neutral-400",
										width: "w-[10%]",
									},
								].map((item, i) => (
									<div key={i} className="space-y-2">
										<div className="flex justify-between text-sm">
											<span className="font-semibold text-muted-foreground">
												{item.label}
											</span>
											<span className="font-black text-foreground">
												{item.val} $V_p$
											</span>
										</div>
										<div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
											<div
												className={cn(
													"h-full",
													item.color,
													item.width,
												)}
											/>
										</div>
									</div>
								))}
								<p className="text-xs text-muted-foreground italic opacity-70">
									*Weight is dynamically calculated via
									ZK-proofs of residency.
								</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</main>
		</div>
	);
}
