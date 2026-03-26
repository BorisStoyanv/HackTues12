"use client";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth-store";
import { useInternetIdentity } from "ic-use-internet-identity";
import { Landmark, Mail, Link as LinkIcon, Code } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
	const router = useRouter();
	const { login: iiLogin, isLoggingIn, status } = useInternetIdentity();
	const [isLoading, setIsLoading] = useState<string | null>(null);

	// Redirect when login is successful
	useEffect(() => {
		if (status === "success") {
			console.log("[Login] Success detected, redirecting...");
			router.push("/onboarding/role");
		}
	}, [status, router]);

	const handleLogin = async (provider: string) => {
		if (provider !== "internet-identity") {
			alert(`${provider} login is coming soon. Please use Internet Identity.`);
			return;
		}

		console.log(`[Login] Initiating II flow on origin: ${window.location.origin}`);
		setIsLoading(provider);
		
		try {
			iiLogin();
		} catch (error: any) {
			console.error("[Login] Handshake error:", error);
			const errorMessage = typeof error === 'string' ? error : error?.message || String(error);
			
			if (errorMessage.includes("UserInterrupt")) {
				console.log("[Login] User interrupted the process.");
			} else {
				alert(`Authentication Handshake Failed: ${errorMessage}\n\nCheck the console for security context details.`);
			}
			setIsLoading(null);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<div className="w-full max-w-md space-y-8">
				<div className="flex flex-col items-center text-center">
					<Link href="/" className="flex items-center gap-2 mb-6">
						<Landmark className="h-8 w-8 text-primary" />
						<span className="text-2xl font-bold tracking-tight">
							OpenFairTrip
						</span>
					</Link>
				</div>

				<Card className="border-neutral-200 dark:border-neutral-800 shadow-lg">
					<CardHeader className="space-y-1 text-center">
						<CardTitle className="text-2xl font-bold">
							Sign in
						</CardTitle>
						<CardDescription>
							Choose your preferred method to continue
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4">
						<Button
							variant="default"
							className="h-12 text-base font-semibold"
							onClick={() => handleLogin("internet-identity")}
							disabled={!!isLoading || isLoggingIn}
						>
							{isLoading === "internet-identity" || isLoggingIn ? (
								<div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
							) : (
								<>
									<div className="mr-2 h-5 w-5 rounded-full bg-white flex items-center justify-center overflow-hidden">
										{/* ICP Placeholder logo */}
										<span className="text-[10px] text-black font-black">
											∞
										</span>
									</div>
									Continue with Internet Identity
								</>
							)}
						</Button>

						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<span className="w-full border-t" />
							</div>
							<div className="relative flex justify-center text-xs uppercase">
								<span className="bg-card px-2 text-muted-foreground">
									Or continue with social
								</span>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<Button
								variant="outline"
								className="h-11"
								onClick={() => handleLogin("google")}
								disabled={!!isLoading}
							>
								<Mail className="mr-2 h-4 w-4" />
								Google
							</Button>
							<Button
								variant="outline"
								className="h-11"
								onClick={() => handleLogin("linkedin")}
								disabled={!!isLoading}
							>
								<LinkIcon className="mr-2 h-4 w-4" />
								LinkedIn
							</Button>
						</div>
						<Button
							variant="outline"
							className="h-11 w-full"
							onClick={() => handleLogin("github")}
							disabled={!!isLoading}
						>
							<Code className="mr-2 h-4 w-4" />
							GitHub
						</Button>
					</CardContent>
					<CardFooter className="flex flex-col items-center justify-center gap-4">
						<div className="flex flex-wrap items-center justify-center gap-1 text-sm text-muted-foreground">
							By continuing, you agree to our{" "}
							<Link
								href="/terms"
								className="underline hover:text-primary underline-offset-4"
							>
								Terms of Service
							</Link>{" "}
							and{" "}
							<Link
								href="/privacy"
								className="underline hover:text-primary underline-offset-4"
							>
								Privacy Policy
							</Link>
							.
						</div>
						
						<div className="pt-4 border-t w-full text-center">
							<button 
								onClick={() => {
									useAuthStore.getState().loginMock();
									router.push("/dashboard");
								}}
								className="text-xs text-muted-foreground hover:text-primary transition-colors italic"
							>
								[Dev Mode] Skip authentication and go to Dashboard
							</button>
						</div>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
