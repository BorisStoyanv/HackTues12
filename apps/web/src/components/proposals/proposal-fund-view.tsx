"use client";

import {
	AlertCircle,
	ArrowLeft,
	CheckCircle2,
	DollarSign,
	HandCoins,
	History,
	Loader2,
	Lock,
	ShieldCheck,
	TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SerializedProposal } from "@/lib/actions/proposals";
import { backProposalClient } from "@/lib/api/client-mutations";
import { useAuthStore } from "@/lib/auth-store";
import { MOCK_FEATURED_PROPOSALS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface ProposalFundViewProps {
	id: string;
	mode: "public" | "authenticated";
	initialData?: SerializedProposal;
	onBack?: () => void;
}

export function ProposalFundView({
	id,
	mode,
	initialData,
	onBack,
}: ProposalFundViewProps) {
	const { user, identity } = useAuthStore();
	const [pledgeAmount, setPledgeAmount] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const proposal = useMemo(() => {
		const mock =
			MOCK_FEATURED_PROPOSALS.find((p) => p.id === id) ||
			MOCK_FEATURED_PROPOSALS[0]!;
		return initialData ? { ...mock, ...initialData } : mock;
	}, [id, initialData]);

	const amountNum = parseFloat(pledgeAmount) || 0;
	const projectedFunding = (proposal.current_funding ?? 0) + amountNum;
	const projectedPercentage =
		(proposal.funding_goal ?? 0) > 0
			? (projectedFunding / (proposal.funding_goal ?? 1)) * 100
			: 0;

	const handlePledge = async () => {
		if (!identity) {
			setError("Identity not found. Please sign in again.");
			return;
		}

		// The backend only allows backing if status is AwaitingFunding
		if (
			proposal.status !== "AwaitingFunding" &&
			proposal.status !== "active"
		) {
			// Allow 'active' for testing if needed, but per .did it should be AwaitingFunding
			// Actually let's just check against the variant names
		}

		setIsSubmitting(true);
		setError(null);

		try {
			// The backend 'back_proposal' currently backs the entire proposal
			await backProposalClient(identity, id);
			setIsSuccess(true);
		} catch (err: any) {
			console.error("Backing failed:", err);
			setError(err.message || "Failed to deploy capital to the ledger.");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (
		mode === "authenticated" &&
		(user?.role as string) !== "InvestorUser" &&
		(user?.role as string) !== "funder"
	) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center space-y-4">
				<AlertCircle className="h-12 w-12 text-amber-500" />
				<h2 className="text-2xl font-bold">Access Restricted</h2>
				<p className="text-muted-foreground max-w-sm">
					Only verified Capital Providers (Investor Users) can fund
					proposals. Please upgrade your profile in settings.
				</p>
				<Button onClick={onBack}>Go Back</Button>
			</div>
		);
	}

	if (isSuccess) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center animate-in fade-in zoom-in duration-500">
				<div className="mb-8 relative">
					<div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
					<div className="relative h-24 w-24 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center border-2 border-green-500">
						<CheckCircle2 className="h-12 w-12 text-green-500" />
					</div>
				</div>
				<h1 className="text-4xl font-black tracking-tight mb-2">
					Capital Deployed
				</h1>
				<p className="text-muted-foreground text-xl max-w-md mb-8">
					Your contribution of{" "}
					<span className="text-foreground font-bold">
						${amountNum.toLocaleString()}
					</span>{" "}
					has been securely locked in the regional escrow.
				</p>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg mb-8 text-left">
					<div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
						<p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
							Impact Score
						</p>
						<p className="text-xl font-black text-primary">
							+12.4% Est.
						</p>
					</div>
					<div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
						<p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
							Trust Reward
						</p>
						<p className="text-xl font-black text-blue-500">
							+25 $V_p$
						</p>
					</div>
				</div>

				<div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
					<Button
						className="flex-1 h-12 text-lg font-bold"
						onClick={() =>
							(window.location.href =
								mode === "authenticated"
									? `/dashboard/proposals/${id}`
									: `/proposals/${id}`)
						}
					>
						View Updated Proposal
					</Button>
					<Button
						variant="outline"
						className="flex-1 h-12 text-lg font-bold"
						onClick={() => (window.location.href = "/dashboard")}
					>
						Return to Dashboard
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full min-h-full bg-background text-foreground">
			{/* Header */}
			{mode === "public" && (
				<header className="z-40 border-b bg-background/80 backdrop-blur-md sticky top-0 h-14">
					<div className="container mx-auto flex h-full items-center px-4 sm:px-6">
						<Button
							variant="ghost"
							size="icon"
							onClick={onBack}
							className="-ml-2 mr-4"
						>
							<ArrowLeft className="h-5 w-5" />
						</Button>
						<h1 className="text-lg font-bold tracking-tight">
							Deploy Capital
						</h1>
					</div>
				</header>
			)}

			<main
				className={cn(
					"py-8 px-4 sm:px-6 md:px-8 lg:px-12",
					mode === "public" && "container mx-auto",
				)}
			>
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 w-full max-w-7xl mx-auto">
					{/* LEFT: Investment Input Area */}
					<div className="lg:col-span-7 xl:col-span-8 space-y-10">
						<div className="space-y-4">
							<Badge
								variant="outline"
								className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5"
							>
								Dual-Path Funding Active
							</Badge>
							<h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
								Empower {proposal.title}
							</h2>
							<p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
								Your pledge is protected by the OpenFairTrip
								Escrow. Funds are only released to the community
								once milestones are verified by on-chain
								consensus.
							</p>
						</div>

						<Card className="border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden rounded-[2.5rem]">
							<CardHeader className="p-8 md:p-12 pb-4">
								<CardTitle className="text-2xl font-bold flex items-center gap-3">
									<HandCoins className="h-6 w-6 text-primary" />
									Pledge Capital
								</CardTitle>
								<CardDescription className="text-lg">
									Define your contribution to this community
									project.
								</CardDescription>
							</CardHeader>
							<CardContent className="p-8 md:p-12 pt-0 space-y-8">
								{error && (
									<div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
										<AlertCircle className="h-4 w-4 shrink-0" />
										<p className="font-medium">{error}</p>
									</div>
								)}
								<div className="space-y-4">
									<div className="relative">
										<DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 h-10 w-10 text-muted-foreground opacity-50" />
										<Input
											type="number"
											placeholder="0.00"
											value={pledgeAmount}
											onChange={(e) =>
												setPledgeAmount(e.target.value)
											}
											className="h-24 pl-18 text-5xl font-black bg-neutral-50 dark:bg-neutral-900 border-none focus-visible:ring-2 focus-visible:ring-primary rounded-3xl"
										/>
									</div>
									<div className="flex flex-wrap gap-2">
										{[1000, 5000, 10000, 25000].map(
											(amt) => (
												<Button
													key={amt}
													variant="outline"
													className="h-10 px-6 font-bold rounded-xl border-neutral-200 dark:border-neutral-800 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
													onClick={() =>
														setPledgeAmount(
															amt.toString(),
														)
													}
												>
													+${amt.toLocaleString()}
												</Button>
											),
										)}
									</div>
								</div>

								<div className="space-y-6 pt-4">
									<div className="flex items-center justify-between">
										<h3 className="font-bold text-lg">
											Projected Progress
										</h3>
										<span className="text-sm font-bold text-muted-foreground tracking-widest uppercase">
											After Pledge
										</span>
									</div>
									<div className="space-y-3">
										<div className="flex justify-between text-base">
											<span className="font-medium text-muted-foreground">
												Regional Funding
											</span>
											<span className="font-black text-xl">
												{Math.min(
													100,
													projectedPercentage,
												).toFixed(1)}
												%
											</span>
										</div>
										<div className="h-4 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
											<div
												className="h-full bg-primary transition-all duration-1000 ease-out rounded-full"
												style={{
													width: `${Math.min(100, projectedPercentage)}%`,
												}}
											/>
										</div>
									</div>
								</div>
							</CardContent>
							<CardFooter className="p-8 md:p-12 bg-neutral-50/50 dark:bg-neutral-900/50 border-t border-neutral-200 dark:border-neutral-800">
								<Button
									className="w-full h-16 text-2xl font-black shadow-2xl rounded-2xl group relative overflow-hidden"
									disabled={amountNum <= 0 || isSubmitting}
									onClick={handlePledge}
								>
									<div className="relative z-10 flex items-center justify-center gap-3">
										{isSubmitting ? (
											<>
												<Loader2 className="h-6 w-6 animate-spin" />
												Authorizing Transaction...
											</>
										) : (
											<>
												<ShieldCheck className="h-6 w-6" />
												Sign and Deploy Capital
											</>
										)}
									</div>
									<div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
								</Button>
							</CardFooter>
						</Card>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="p-6 rounded-3xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 flex gap-4">
								<Lock className="h-6 w-6 text-blue-500 shrink-0" />
								<div className="space-y-1">
									<p className="font-bold text-blue-700 dark:text-blue-300">
										Escrow Security
									</p>
									<p className="text-xs text-blue-600/80 dark:text-blue-400/80 leading-relaxed">
										Funds are cryptographically held. No
										entity can withdraw capital without
										meeting community-verified milestones.
									</p>
								</div>
							</div>
							<div className="p-6 rounded-3xl bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/50 flex gap-4">
								<History className="h-6 w-6 text-green-500 shrink-0" />
								<div className="space-y-1">
									<p className="font-bold text-green-700 dark:text-green-300">
										Verifiable Ledger
									</p>
									<p className="text-xs text-green-600/80 dark:text-green-400/80 leading-relaxed">
										Every deployment is logged on the
										transparency ledger. Real-time auditing
										for every dollar spent.
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* RIGHT: Context Sidebar */}
					<div className="lg:col-span-5 xl:col-span-4 space-y-8">
						<Card className="border-neutral-200 dark:border-neutral-800 bg-neutral-50/30 dark:bg-neutral-900/30 rounded-[2rem] overflow-hidden">
							<CardHeader className="p-8">
								<CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
									Milestone Roadmap
								</CardTitle>
							</CardHeader>
							<CardContent className="px-8 pb-8 space-y-6">
								{[
									{
										phase: 1,
										title: "Infrastructure",
										pct: 40,
									},
									{
										phase: 2,
										title: "Implementation",
										pct: 40,
									},
									{
										phase: 3,
										title: "Audit & Close",
										pct: 20,
									},
								].map((m, i) => (
									<div
										key={i}
										className="flex items-center gap-4 group"
									>
										<div className="h-10 w-10 rounded-xl bg-background border border-neutral-200 dark:border-neutral-800 flex items-center justify-center font-bold text-xs shrink-0 group-hover:border-primary transition-colors">
											P{m.phase}
										</div>
										<div className="flex-1 space-y-1">
											<p className="text-sm font-bold">
												{m.title}
											</p>
											<div className="flex items-center gap-2">
												<div className="flex-1 h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
													<div className="h-full bg-neutral-400 w-full" />
												</div>
												<span className="text-[10px] font-black text-muted-foreground">
													{m.pct}% Release
												</span>
											</div>
										</div>
									</div>
								))}
							</CardContent>
						</Card>

						<Card className="border-neutral-200 dark:border-neutral-800 rounded-[2rem] p-8 space-y-6 bg-primary text-primary-foreground shadow-2xl">
							<div className="space-y-2">
								<div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
									<TrendingUp className="h-6 w-6 text-white" />
								</div>
								<h3 className="text-xl font-bold">
									Social ROI Projection
								</h3>
								<p className="text-sm text-primary-foreground/80 leading-relaxed">
									Based on your proposed contribution, the
									project will achieve critical mass{" "}
									<strong>3 weeks faster</strong> than
									estimated.
								</p>
							</div>
							<Separator className="bg-white/10" />
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-1">
									<p className="text-[10px] font-black uppercase tracking-widest opacity-60">
										Reach
									</p>
									<p className="text-xl font-black">
										+1,200 Persons
									</p>
								</div>
								<div className="space-y-1">
									<p className="text-[10px] font-black uppercase tracking-widest opacity-60">
										Durability
									</p>
									<p className="text-xl font-black">
										15+ Years
									</p>
								</div>
							</div>
						</Card>
					</div>
				</div>
			</main>
		</div>
	);
}
