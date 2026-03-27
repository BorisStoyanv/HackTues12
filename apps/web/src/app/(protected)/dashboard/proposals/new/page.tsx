"use client";

import {
	ProposalWizard,
	WIZARD_STEPS,
} from "@/components/proposals/proposal-wizard";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { CheckCircle2, Landmark, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function NewProposalPage() {
	const router = useRouter();
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
	const isInitializing = useAuthStore((state) => state.isInitializing);
	const hasProfile = useAuthStore((state) => state.hasProfile);
	const userRole = useAuthStore((state) => state.user?.role);

	const [currentStep, setCurrentStep] = useState(0);

	useEffect(() => {
		if (isInitializing) return;
		if (!isAuthenticated) {
			router.replace("/login");
			return;
		}
		if (!hasProfile || userRole !== "regional") {
			router.replace("/onboarding/role");
		}
	}, [hasProfile, isAuthenticated, isInitializing, router, userRole]);

	if (
		isInitializing ||
		!isAuthenticated ||
		!hasProfile ||
		userRole !== "regional"
	) {
		return (
			<div className="flex min-h-[60vh] flex-1 items-center justify-center bg-background px-6 py-12">
				<div className="flex items-center gap-3 text-sm text-muted-foreground">
					<Loader2 className="h-4 w-4 animate-spin" />
					<span>Validating Credentials…</span>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full w-full bg-background overflow-hidden relative">
			{/* LEFT PANEL: PROTOCOL SIDEBAR */}
			<div className="hidden lg:flex w-75 xl:w-87.5 flex-col bg-muted/20 border-r border-border/40 p-10 justify-between relative overflow-hidden shrink-0">
				{/* Decorative background grid */}
				<div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-size-[30px:30px]" />

				<div className="relative z-10 space-y-12">
					<div className="flex items-center gap-3">
						<div className="bg-foreground text-background rounded-lg p-2 shadow-sm">
							<Landmark className="h-5 w-5" />
						</div>
						<span className="text-sm font-black uppercase tracking-[0.2em] italic">
							Impact Ledger
						</span>
					</div>

					<div className="space-y-1">
						<h2 className="text-4xl font-black tracking-tighter leading-[0.9] uppercase italic text-foreground">
							Protocol <br />
							Initialization
						</h2>
						<p className="text-sm text-muted-foreground font-medium pt-4 border-t border-border/40">
							Establish a new regional initiative on the global
							governance layer.
						</p>
					</div>

					<nav className="space-y-6 relative">
						{/* Vertical Progress Line */}
						<div className="absolute left-4.75 top-4 bottom-4 w-0.5 bg-neutral-100 dark:bg-neutral-800 -z-10" />

						{WIZARD_STEPS.map((step, idx) => {
							const isActive = idx === currentStep;
							const isCompleted = idx < currentStep;

							return (
								<div
									key={step.id}
									className="flex items-start gap-5 group"
								>
									<div
										className={cn(
											"h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 shrink-0 bg-background",
											isActive
												? "border-primary shadow-lg scale-110"
												: isCompleted
													? "border-foreground bg-foreground text-background"
													: "border-border/60 text-muted-foreground/40",
										)}
									>
										{isCompleted ? (
											<CheckCircle2 className="h-5 w-5" />
										) : (
											<span className="text-xs font-black">
												{idx + 1}
											</span>
										)}
									</div>
									<div className="pt-1 space-y-0.5">
										<p
											className={cn(
												"text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
												isActive
													? "text-primary"
													: isCompleted
														? "text-foreground"
														: "text-muted-foreground/40",
											)}
										>
											{step.title}
										</p>
										<p
											className={cn(
												"text-xs font-bold transition-colors",
												isActive
													? "text-foreground"
													: "text-muted-foreground/30",
											)}
										>
											{step.description}
										</p>
									</div>
								</div>
							);
						})}
					</nav>
				</div>

				<div className="relative z-10 pt-10 border-t border-border/40">
					<div className="flex items-center gap-4">
						<div className="space-y-0.5">
							<p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
								Node Identity
							</p>
							<p className="text-xs font-mono font-bold text-foreground">
								v1.0.4-ledger
							</p>
						</div>
						<div className="h-8 w-px bg-border/40" />
						<div className="space-y-0.5">
							<p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
								Encryption
							</p>
							<p className="text-xs font-bold text-foreground uppercase">
								AES-256
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* RIGHT PANEL: IMMERSIVE WORKSPACE */}
			<div className="flex-1 flex flex-col relative overflow-hidden bg-background">
				<header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl shrink-0">
					<div className="px-8 lg:px-12 flex h-16 items-center justify-between">
						<div className="flex items-center gap-6">
							<div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
							<span className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">
								Broadcast Mode
							</span>
						</div>
						<div className="flex items-center gap-4">
							<span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
								Fee
							</span>
							<Badge className="bg-green-500/10 text-green-600 border-none px-3 font-mono font-bold text-xs">
								0.00 ICP
							</Badge>
						</div>
					</div>

					{/* Top Progress Trace */}
					<div className="w-full h-px bg-border/20">
						<motion.div
							className="h-full bg-primary"
							initial={{ width: 0 }}
							animate={{
								width: `${((currentStep + 1) / WIZARD_STEPS.length) * 100}%`,
							}}
							transition={{
								duration: 0.8,
								ease: [0.19, 1, 0.22, 1],
							}}
						/>
					</div>
				</header>

				<main className="flex-1 flex flex-col relative overflow-y-auto p-8 lg:p-16">
					<div className="max-w-4xl w-full mx-auto pb-20">
						<ProposalWizard
							currentStep={currentStep}
							onStepChange={setCurrentStep}
						/>
					</div>
				</main>
			</div>
		</div>
	);
}
