"use client";
import { buttonVariants } from "@/components/ui/button";
import { MOCK_FEATURED_PROPOSALS, MOCK_STATS } from "@/lib/mock-data";
import { ProposalMock } from "@/lib/types/models";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import {
	ArrowRight,
	Globe,
	Landmark,
	MapPin,
	ShieldCheck,
	Users,
	Vote,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
	const user = useAuthStore((state) => state.user);
	const is_logged_in = !!user;

	return (
		<div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/10">
			{/* Navigation */}
			<header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
				<div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
					<Link href="/" className="flex items-center gap-2">
						<Landmark className="h-6 w-6 text-primary" />
						<span className="text-xl font-bold tracking-tight">
							OpenFairTrip
						</span>
					</Link>
					<nav className="flex items-center gap-4">
						<Link
							href="/explore"
							className="text-sm font-medium transition-colors hover:text-primary hidden md:block"
						>
							Explore Map
						</Link>
						<Link
							href="/about"
							className="text-sm font-medium transition-colors hover:text-primary hidden md:block"
						>
							How it Works
						</Link>
						<Link
							href={is_logged_in ? "/dashboard" : "/login"}
							className={buttonVariants({
								variant: is_logged_in ? "outline" : "default",
								size: "sm",
							})}
						>
							{is_logged_in ? "Go to Dashboard" : "Sign In"}
						</Link>
					</nav>
				</div>
			</header>

			<main className="flex-1">
				{/* Hero Section */}
				<section className="relative overflow-hidden py-24 sm:py-32">
					{/* Subtle geometric background pattern */}
					<div
						className="absolute inset-0 -z-10 opacity-[0.03]"
						aria-hidden="true"
					>
						<svg className="h-full w-full" fill="none">
							<defs>
								<pattern
									id="grid"
									width="40"
									height="40"
									patternUnits="userSpaceOnUse"
								>
									<path
										d="M0 40L40 0M0 0l40 40"
										stroke="currentColor"
										strokeWidth="1"
									/>
								</pattern>
							</defs>
							<rect
								width="100%"
								height="100%"
								fill="url(#grid)"
							/>
						</svg>
					</div>

					<div className="container mx-auto px-4 sm:px-6 lg:px-8">
						<div className="flex flex-col items-center text-center">
							<div className="inline-flex items-center rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground mb-8">
								<span className="relative flex h-2 w-2 mr-2">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
									<span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
								</span>
								Decentralized Governance for Regional Impact
							</div>
							<h1 className="max-w-4xl text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl mb-6 bg-linear-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
								Transparent Funding, Governed by Local
								Consensus.
							</h1>
							<p className="max-w-2xl text-lg text-muted-foreground mb-10 sm:text-xl">
								Empowering regional communities through
								AI-vetted proposals, reputation-weighted voting,
								and verifiable milestone-based escrow.
							</p>
							<div className="flex flex-col sm:flex-row gap-4">
								<Link
									href="/explore"
									className={cn(
										buttonVariants({ size: "lg" }),
										"h-12 px-8 text-base",
									)}
								>
									Explore the interactive map
									<ArrowRight className="ml-2 h-4 w-4" />
								</Link>
								<Link
									href="/proposals/new"
									className={cn(
										buttonVariants({
											variant: "outline",
											size: "lg",
										}),
										"h-12 px-8 text-base",
									)}
								>
									Submit a Project
								</Link>
							</div>
						</div>
					</div>
				</section>

				{/* Stats Bar */}
				<section className="border-y bg-muted/30 py-12">
					<div className="container mx-auto px-4 sm:px-6 lg:px-8">
						<div className="grid grid-cols-2 gap-8 md:grid-cols-4">
							<div className="flex flex-col items-center justify-center space-y-2 text-center">
								<div className="text-3xl font-bold tracking-tighter sm:text-4xl">
									$
									{(
										MOCK_STATS.total_funded / 1000000
									).toFixed(1)}
									M
								</div>
								<div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
									Total Funded
								</div>
							</div>
							<div className="flex flex-col items-center justify-center space-y-2 text-center">
								<div className="text-3xl font-bold tracking-tighter sm:text-4xl">
									{MOCK_STATS.active_projects}
								</div>
								<div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
									Active Projects
								</div>
							</div>
							<div className="flex flex-col items-center justify-center space-y-2 text-center">
								<div className="text-3xl font-bold tracking-tighter sm:text-4xl">
									{(MOCK_STATS.verified_users / 1000).toFixed(
										1,
									)}
									k
								</div>
								<div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
									Verified Locals
								</div>
							</div>
							<div className="flex flex-col items-center justify-center space-y-2 text-center">
								<div className="text-3xl font-bold tracking-tighter sm:text-4xl">
									{MOCK_STATS.average_ai_integrity_score}%
								</div>
								<div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
									Avg. Integrity
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* How It Works Section */}
				<section className="py-24 sm:py-32 bg-background">
					<div className="container mx-auto px-4 sm:px-6 lg:px-8">
						<div className="mb-16 text-center">
							<h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
								How It Works
							</h2>
							<p className="mx-auto max-w-2xl text-lg text-muted-foreground">
								Our multi-agent system ensures only the most
								viable and fair projects reach the funding
								stage.
							</p>
						</div>
						<div className="grid grid-cols-1 gap-12 md:grid-cols-3">
							<div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
								<div className="rounded-full bg-primary/10 p-4">
									<MapPin className="h-8 w-8 text-primary" />
								</div>
								<h3 className="text-xl font-bold">
									1. Propose
								</h3>
								<p className="text-muted-foreground">
									Submit structured Data Packs including
									budgets, timelines, and measurable success
									metrics.
								</p>
							</div>
							<div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
								<div className="rounded-full bg-primary/10 p-4">
									<ShieldCheck className="h-8 w-8 text-primary" />
								</div>
								<h3 className="text-xl font-bold">2. Debate</h3>
								<p className="text-muted-foreground">
									3-Agent AI architecture (Advocate, Skeptic,
									Analyst) rigorously vets every proposal for
									integrity and ROI.
								</p>
							</div>
							<div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
								<div className="rounded-full bg-primary/10 p-4">
									<Vote className="h-8 w-8 text-primary" />
								</div>
								<h3 className="text-xl font-bold">3. Govern</h3>
								<p className="text-muted-foreground">
									Verified regional residents vote using
									weighted reputation. Approved funds are held
									in secure escrow.
								</p>
							</div>
						</div>
					</div>
				</section>

				{/* Featured Proposals Grid */}
				<section className="py-24 sm:py-32 bg-muted/20 border-t">
					<div className="container mx-auto px-4 sm:px-6 lg:px-8">
						<div className="mb-16 flex items-end justify-between">
							<div className="max-w-2xl">
								<h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
									Featured Proposals
								</h2>
								<p className="text-lg text-muted-foreground">
									Discover community-led projects currently in
									the AI debate or voting phase.
								</p>
							</div>
							<Link
								href="/explore"
								className={cn(
									buttonVariants({ variant: "ghost" }),
									"hidden sm:flex",
								)}
							>
								View all proposals{" "}
								<ArrowRight className="ml-2 h-4 w-4" />
							</Link>
						</div>
						<div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
							{MOCK_FEATURED_PROPOSALS.map((proposal) => (
								<ProposalCard
									key={proposal.id}
									proposal={proposal}
								/>
							))}
						</div>
						<div className="mt-12 text-center sm:hidden">
							<Link
								href="/explore"
								className={cn(
									buttonVariants({
										variant: "outline",
										size: "lg",
									}),
									"w-full",
								)}
							>
								View all proposals
							</Link>
						</div>
					</div>
				</section>
			</main>

			{/* Footer */}
			<footer className="border-t bg-background py-12">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 gap-12 md:grid-cols-4">
						<div className="space-y-4">
							<Link href="/" className="flex items-center gap-2">
								<Landmark className="h-6 w-6 text-primary" />
								<span className="text-xl font-bold tracking-tight">
									OpenFairTrip
								</span>
							</Link>
							<p className="text-sm text-muted-foreground">
								Decentralized regional governance and impact
								funding powered by ICP and AI.
							</p>
						</div>
						<div className="space-y-4">
							<h4 className="text-sm font-bold uppercase tracking-widest text-foreground">
								Platform
							</h4>
							<ul className="space-y-2 text-sm text-muted-foreground">
								<li>
									<Link
										href="/explore"
										className="hover:text-primary transition-colors"
									>
										Interactive Map
									</Link>
								</li>
								<li>
									<Link
										href="/proposals"
										className="hover:text-primary transition-colors"
									>
										All Proposals
									</Link>
								</li>
								<li>
									<Link
										href="/regions"
										className="hover:text-primary transition-colors"
									>
										Active Regions
									</Link>
								</li>
							</ul>
						</div>
						<div className="space-y-4">
							<h4 className="text-sm font-bold uppercase tracking-widest text-foreground">
								Governance
							</h4>
							<ul className="space-y-2 text-sm text-muted-foreground">
								<li>
									<Link
										href="/governance"
										className="hover:text-primary transition-colors"
									>
										Voter Reputation
									</Link>
								</li>
								<li>
									<Link
										href="/ai-audit"
										className="hover:text-primary transition-colors"
									>
										AI Audit Process
									</Link>
								</li>
								<li>
									<Link
										href="/escrow"
										className="hover:text-primary transition-colors"
									>
										Smart Escrow
									</Link>
								</li>
							</ul>
						</div>
						<div className="space-y-4">
							<h4 className="text-sm font-bold uppercase tracking-widest text-foreground">
								Community
							</h4>
							<ul className="space-y-2 text-sm text-muted-foreground">
								<li>
									<Link
										href="/docs"
										className="hover:text-primary transition-colors"
									>
										Documentation
									</Link>
								</li>
								<li>
									<Link
										href="/forum"
										className="hover:text-primary transition-colors"
									>
										Discussion Forum
									</Link>
								</li>
								<li>
									<Link
										href="/contact"
										className="hover:text-primary transition-colors"
									>
										Contact Support
									</Link>
								</li>
							</ul>
						</div>
					</div>
					<div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
						<p>
							© {new Date().getFullYear()} OpenFairTrip. All
							rights reserved.
						</p>
					</div>
				</div>
			</footer>
		</div>
	);
}

function ProposalCard({ proposal }: { proposal: ProposalMock }) {
	const progress = (proposal.current_funding / proposal.funding_goal) * 100;

	return (
		<div className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:shadow-xl">
			<div className="relative h-48 bg-muted overflow-hidden">
				{/* Placeholder for project image or regional map snippet */}
				<div className="absolute inset-0 flex items-center justify-center opacity-20">
					<Globe className="h-24 w-24" />
				</div>
				<div className="absolute top-4 left-4">
					<div className="inline-flex items-center rounded-full bg-background/90 backdrop-blur-sm px-2.5 py-0.5 text-xs font-semibold text-foreground border">
						{proposal.region_id.split("_")[1].toUpperCase()}
					</div>
				</div>
				<div className="absolute top-4 right-4">
					<div className="flex items-center gap-1.5 rounded-full bg-primary/90 backdrop-blur-sm px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
						<ShieldCheck className="h-3 w-3" />
						{proposal.ai_integrity_report?.overall_score}% Integrity
					</div>
				</div>
			</div>

			<div className="flex flex-1 flex-col p-6">
				<div className="mb-4 flex-1">
					<h3 className="mb-2 text-xl font-bold line-clamp-1 group-hover:text-primary transition-colors">
						{proposal.title}
					</h3>
					<p className="text-sm text-muted-foreground line-clamp-2">
						{proposal.short_description}
					</p>
				</div>

				<div className="space-y-4">
					<div className="space-y-2">
						<div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
							<span>Funding Progress</span>
							<span className="text-foreground">
								{Math.round(progress)}%
							</span>
						</div>
						<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="h-full bg-primary transition-all"
								style={{ width: `${Math.min(100, progress)}%` }}
							/>
						</div>
					</div>

					<div className="flex items-center justify-between border-t pt-4">
						<div className="flex items-center gap-4">
							<div className="flex flex-col">
								<span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
									Goal
								</span>
								<span className="text-sm font-bold">
									${proposal.funding_goal.toLocaleString()}
								</span>
							</div>
							<div className="flex flex-col">
								<span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
									Voters
								</span>
								<span className="text-sm font-bold flex items-center gap-1">
									<Users className="h-3 w-3" />
									{proposal.voting_metrics.total_votes}
								</span>
							</div>
						</div>
						<Link
							href={`/proposals/${proposal.id}`}
							className={cn(
								buttonVariants({
									variant: "ghost",
									size: "sm",
								}),
								"h-8 w-8 p-0",
							)}
						>
							<ArrowRight className="h-4 w-4" />
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
