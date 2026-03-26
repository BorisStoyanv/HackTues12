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
import { useAuthStore } from "@/lib/auth-store";
import { MOCK_FEATURED_PROPOSALS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

import { SerializedProposal } from "@/lib/actions/proposals";

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
		// Merge backend data with mock data as fallback for UI-only fields
		const mock =
			MOCK_FEATURED_PROPOSALS.find((p) => p.id === id) ||
			MOCK_FEATURED_PROPOSALS[0]!;

		if (initialData) {
			return {
				...mock,
				...initialData,
				// Ensure complex nested objects use initialData if provided, otherwise mock
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
			<div className="flex flex-col items-center justify-center h-full p-4 text-center">
				<h1 className="text-2xl font-bold mb-4">Proposal not found</h1>
				<Button onClick={onBack}>Go Back</Button>
			</div>
		);
	}

	const fundingProgress =
		(proposal.current_funding / (proposal.funding_goal ?? 1)) * 100;
	const creatorId = proposal.creator_id;

	return (
		<div className="w-full min-h-screen bg-background text-foreground">
			{/* Header logic depends on mode */}
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
						<div className="flex items-center gap-2">
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
					</div>
				</header>
			)}

			<main
				className={cn(
					"py-8 px-4 sm:px-6 md:px-8 lg:px-12",
					mode === "public" && "container mx-auto",
					mode === "authenticated" && "max-w-400 mx-auto w-full",
				)}
			>
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start w-full">
					{/* LEFT: Main Content Area (8/12 or 9/12) */}
					<div className="lg:col-span-8 xl:col-span-9 space-y-12 min-w-0">
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
							<h1 className="text-4xl md:text-7xl font-bold tracking-tight leading-[1.1]">
								{proposal.title}
							</h1>
							<div className="flex flex-wrap items-center gap-10 text-sm text-muted-foreground">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center border text-xs font-bold">
										{creatorId?.[0]?.toUpperCase() || "U"}
									</div>
									<span className="text-lg">
										Proposed by{" "}
										<span className="text-foreground font-semibold">
											@{creatorId}
										</span>
									</span>
								</div>
								<div className="flex items-center gap-2 text-lg">
									<MapPin className="h-5 w-5" />{" "}
									{proposal.location.city},{" "}
									{proposal.location.country}
								</div>
								<div className="flex items-center gap-2 text-lg">
									<Clock className="h-5 w-5" /> Created March
									2024
								</div>
							</div>
						</div>

						<Separator />

						{/* Tabs Section */}
						<Tabs defaultValue="overview" className="w-full">
							{/* Tab List with a fixed border-bottom but naturally spaced triggers */}
							<TabsList className="w-full flex justify-start border-b rounded-none h-auto bg-transparent p-0 mb-10 overflow-x-auto">
								<div className="flex space-x-12 min-w-max">
									{[
										"overview",
										"ai-integrity",
										"debate",
										"budget",
									].map((tab) => (
										<TabsTrigger
											key={tab}
											value={tab}
											className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-5 bg-transparent shadow-none font-bold text-lg transition-none capitalize"
										>
											{tab === "ai-integrity"
												? "AI Integrity"
												: tab === "budget"
													? "Financials"
													: tab.replace("-", " ")}
											{tab === "ai-integrity" &&
												proposal.ai_integrity_report && (
													<Badge className="ml-3 bg-primary/10 text-primary border-none text-xs">
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
								className="space-y-12 focus-visible:outline-none m-0"
							>
								<section className="space-y-6">
									<h3 className="text-3xl font-bold tracking-tight">
										Problem Statement
									</h3>
									<p className="text-muted-foreground leading-relaxed text-2xl max-w-5xl">
										{proposal.problem_statement}
									</p>
								</section>
								<section className="space-y-6">
									<h3 className="text-3xl font-bold tracking-tight">
										Proposed Solution
									</h3>
									<p className="text-muted-foreground leading-relaxed text-2xl max-w-5xl">
										{proposal.short_description}
									</p>
								</section>
								<section className="space-y-6">
									<h3 className="text-3xl font-bold tracking-tight">
										Success Metrics
									</h3>
									<div className="p-10 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 max-w-5xl shadow-sm">
										<p className="text-2xl font-medium italic text-foreground leading-relaxed">
											"{proposal.success_metric}"
										</p>
									</div>
								</section>
							</TabsContent>

							{/* AI INTEGRITY CONTENT */}
							<TabsContent
								value="ai-integrity"
								className="space-y-12 focus-visible:outline-none m-0"
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
													className="border-neutral-200 dark:border-neutral-800 shadow-none p-4"
												>
													<CardHeader className="pb-2">
														<CardDescription className="text-xs uppercase font-bold tracking-widest">
															{item.label}
														</CardDescription>
														<CardTitle
															className={cn(
																"text-6xl font-black",
																item.color,
															)}
														>
															{item.value}%
														</CardTitle>
													</CardHeader>
												</Card>
											))}
										</div>
										<section className="space-y-6">
											<h3 className="text-4xl font-bold tracking-tight">
												AI Analysis Summary
											</h3>
											<p className="text-muted-foreground leading-relaxed text-2xl max-w-5xl">
												{
													proposal.ai_integrity_report
														.summary
												}
											</p>
										</section>
									</>
								) : (
									<div className="p-16 text-center border-2 border-dashed rounded-3xl">
										<BarChart3 className="h-20 w-20 mx-auto text-muted-foreground mb-6 opacity-20" />
										<h4 className="text-3xl font-bold tracking-tight">
											AI Debate in Progress
										</h4>
									</div>
								)}
							</TabsContent>

							{/* DEBATE LOG CONTENT */}
							<TabsContent
								value="debate"
								className="space-y-10 focus-visible:outline-none m-0"
							>
								<div className="flex items-center justify-between">
									<h3 className="text-4xl font-bold tracking-tight">
										3-Agent AI Consensus
									</h3>
									<Badge
										variant="outline"
										className="gap-2 px-5 py-2 text-sm font-semibold"
									>
										<ShieldCheck className="h-5 w-5 text-primary" />{" "}
										Verifiable Protocol
									</Badge>
								</div>
								<div className="relative pl-12 border-l-2 border-neutral-200 dark:border-neutral-800 space-y-20 py-8">
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
													"absolute -left-16.25 top-0 h-12 w-12 rounded-full border-4 border-background flex items-center justify-center shadow-xl",
													log.color,
												)}
											>
												<MessageSquare className="h-5 w-5 text-white" />
											</div>
											<div className="space-y-5">
												<div className="flex items-center gap-4">
													<span
														className={cn(
															"text-base font-bold uppercase tracking-widest",
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
														className="text-[11px] h-6 px-3"
													>
														{log.role}
													</Badge>
												</div>
												<div className="p-8 md:p-10 rounded-[2.5rem] bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow">
													<p className="text-xl md:text-2xl leading-relaxed italic text-muted-foreground">
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
								className="space-y-12 focus-visible:outline-none m-0"
							>
								<h3 className="text-4xl font-bold tracking-tight">
									Financial Roadmap
								</h3>
								<div className="grid gap-8">
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
											className="flex gap-10 p-10 rounded-4xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 hover:border-primary/40 transition-all shadow-sm hover:shadow-md"
										>
											<div className="h-20 w-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center font-black text-3xl shrink-0">
												{m.pct}%
											</div>
											<div className="space-y-3">
												<p className="font-bold text-2xl">
													{m.title}
												</p>
												<p className="text-muted-foreground text-xl leading-relaxed">
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
					<div className="lg:col-span-4 xl:col-span-3 space-y-10 lg:sticky lg:top-24 h-fit">
						<Card className="border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden rounded-4xl">
							<div className="h-2.5 bg-primary w-full" />
							<CardHeader className="pb-8 pt-8 px-8">
								<CardTitle className="text-3xl font-bold tracking-tight">
									Project Governance
								</CardTitle>
								<CardDescription className="text-lg font-medium">
									Target: $
									{(
										proposal.funding_goal ?? 0
									).toLocaleString()}{" "}
									{proposal.currency ?? "USD"}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-10 px-8 pb-10">
								<div className="space-y-4">
									<div className="flex justify-between items-end">
										<span className="font-black text-4xl">
											$
											{proposal.current_funding.toLocaleString()}
										</span>
										<span className="text-muted-foreground font-bold text-lg mb-1">
											{fundingProgress.toFixed(1)}% Funded
										</span>
									</div>
									<Progress
										value={fundingProgress}
										className="h-4 rounded-full"
									/>
								</div>
								<div className="grid grid-cols-2 gap-8 pt-2">
									<div className="space-y-2">
										<p className="text-[12px] uppercase font-black text-muted-foreground tracking-[0.2em]">
											Goal
										</p>
										<p className="text-xl font-black">
											$
											{proposal.funding_goal?.toLocaleString()}
										</p>
									</div>
									<div className="space-y-2 text-right">
										<p className="text-[12px] uppercase font-black text-muted-foreground tracking-[0.2em]">
											Status
										</p>
										<p
											className={cn(
												"text-xl font-black capitalize",
												proposal.status === "funding"
													? "text-green-500"
													: "text-primary",
											)}
										>
											{proposal.status.replace("_", " ")}
										</p>
									</div>
								</div>
								<Separator className="bg-neutral-200 dark:bg-neutral-800" />
								<div className="space-y-6 pt-4">
									{proposal.status === "voting" && (
										<Link
											href={
												mode === "authenticated"
													? `/dashboard/proposals/${id}/vote`
													: `/proposals/${id}/vote`
											}
											className={buttonVariants({
												className:
													"w-full h-16 text-2xl font-black shadow-xl rounded-2xl",
											})}
										>
											Cast Your Vote
										</Link>
									)}
									{proposal.status === "funding" && (
										<Link
											href={
												mode === "authenticated"
													? `/dashboard/proposals/${id}/fund`
													: `/proposals/${id}/fund`
											}
											className={buttonVariants({
												variant: "default",
												className:
													"w-full h-16 text-2xl font-black shadow-xl rounded-2xl",
											})}
										>
											Deploy Capital
										</Link>
									)}
									<Button
										variant="outline"
										className="w-full h-16 font-bold text-xl rounded-2xl border-2"
									>
										Share Proposal
									</Button>
								</div>
							</CardContent>
						</Card>

						<Card className="border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 rounded-4xl">
							<CardHeader className="pb-6 pt-8 px-8">
								<CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
									Governance Power Split
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-8 px-8 pb-10">
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
									<div key={i} className="space-y-3">
										<div className="flex justify-between text-sm">
											<span className="font-bold text-muted-foreground uppercase tracking-wider text-[11px]">
												{item.label}
											</span>
											<span className="font-black text-foreground">
												{item.val} $V_p$
											</span>
										</div>
										<div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
											<div
												className={cn(
													"h-full rounded-full transition-all duration-1000",
													item.color,
													item.width,
												)}
											/>
										</div>
									</div>
								))}
								<p className="text-xs text-muted-foreground italic opacity-70 leading-relaxed">
									*Weight is dynamically calculated via
									ZK-proofs of residency and reputation
									scores.
								</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</main>
		</div>
	);
}
