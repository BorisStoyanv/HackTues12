"use client";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth-store";
import { useInternetIdentity } from "ic-use-internet-identity";
import { AlertCircle, Landmark, Shield, Lock, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
	const router = useRouter();
	const {
		login: iiLogin,
		isLoggingIn,
		isError,
		error,
	} = useInternetIdentity();
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
	const isInitializing = useAuthStore((state) => state.isInitializing);
	const hasProfile = useAuthStore((state) => state.hasProfile);
	const loginAsDev = useAuthStore((state) => state.loginAsDev);

	const [isLocal, setIsLocal] = useState(false);

	useEffect(() => {
		setIsLocal(
			typeof window !== "undefined" &&
				(window.location.hostname.includes("localhost") ||
					window.location.hostname.includes("127.0.0.1")),
		);
	}, []);

	// Redirect when login is successful
	useEffect(() => {
		if (isAuthenticated && !isInitializing) {
			router.replace(hasProfile ? "/dashboard" : "/onboarding/role");
		}
	}, [hasProfile, isAuthenticated, isInitializing, router]);

	return (
		<div className="flex min-h-screen items-center justify-center bg-background selection:bg-foreground selection:text-background font-sans antialiased text-foreground px-4 relative">
			{/* Background Grid Pattern - Very subtle */}
			<div className="fixed inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px]" />

			<div className="w-full max-w-[400px] space-y-10">
				<div className="flex flex-col items-center text-center space-y-6">
					<Link href="/" className="transition-opacity hover:opacity-80 active:scale-95">
						<div className="bg-foreground text-background rounded-lg p-2 shadow-sm">
							<Landmark className="h-6 w-6" />
						</div>
					</Link>
					<div className="space-y-1">
						<h1 className="text-2xl font-semibold tracking-tight">OpenFairTrip</h1>
						<p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em]">
							Protocol Access
						</p>
					</div>
				</div>

				<Card className="border-border/60 bg-background shadow-sm rounded-xl overflow-hidden">
					<CardHeader className="space-y-1 text-center pt-8 pb-4">
						<CardTitle className="text-xl font-medium tracking-tight">
							Authentication
						</CardTitle>
						<CardDescription className="text-sm font-medium text-muted-foreground/60">
							Identify via decentralized provider
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-6 px-8 pb-8">
						{isError && (
							<div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-[11px] text-destructive animate-in fade-in zoom-in-95 font-medium">
								<AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
								<p>
									{error?.message ?? "Authentication failed. Please retry."}
								</p>
							</div>
						)}
						<Button
							variant="default"
							className="h-12 text-sm font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-all shadow-sm"
							onClick={() => iiLogin()}
							disabled={isLoggingIn}
						>
							{isLoggingIn ? (
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
							) : (
								<span className="flex items-center gap-2">
									Continue with Internet Identity
								</span>
							)}
						</Button>

						{isLocal && (
							<div className="flex flex-col gap-3 pt-2">
								<div className="flex items-center gap-3">
									<div className="h-px flex-1 bg-border/40" />
									<span className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Lab</span>
									<div className="h-px flex-1 bg-border/40" />
								</div>
								<div className="grid grid-cols-2 gap-3">
									<Button
										variant="outline"
										className="h-9 text-[10px] font-bold border-border/60 hover:bg-muted/30 transition-all uppercase tracking-widest rounded-lg"
										onClick={() => loginAsDev(false)}
									>
										Stored
									</Button>
									<Button
										variant="outline"
										className="h-9 text-[10px] font-bold border-border/60 hover:bg-muted/30 transition-all uppercase tracking-widest rounded-lg"
										onClick={() => loginAsDev(true)}
									>
										Fresh
									</Button>
								</div>
							</div>
						)}

						<div className="text-[10px] font-medium text-muted-foreground/50 leading-relaxed text-center px-2">
							By connecting, you accept the protocol&apos;s{" "}
							<Link href="/terms" className="text-foreground hover:underline underline-offset-4 transition-colors">
								Terms
							</Link>{" "}
							and{" "}
							<Link href="/privacy" className="text-foreground hover:underline underline-offset-4 transition-colors">
								Policy
							</Link>
							.
						</div>
					</CardContent>
				</Card>

				<div className="flex items-center justify-center gap-6 text-muted-foreground/30">
					<div className="flex items-center gap-1.5">
						<Shield className="h-3 w-3" />
						<span className="text-[9px] font-bold uppercase tracking-[0.1em]">ZK Proofs</span>
					</div>
					<div className="flex items-center gap-1.5">
						<Lock className="h-3 w-3" />
						<span className="text-[9px] font-bold uppercase tracking-[0.1em]">Secured</span>
					</div>
				</div>
			</div>
		</div>
	);
}
