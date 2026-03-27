"use client";

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
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { analyzeDocumentAction, validateCompanyVies } from "@/lib/actions/kyc";
import {
	createMyProfileClient,
	updateMyProfileClient,
} from "@/lib/api/client-mutations";
import { useAuthStore } from "@/lib/auth-store";
import { waitForProfileSync } from "@/lib/profile-sync";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
	Activity,
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	Building2,
	CheckCircle2,
	FileSearch,
	FileText,
	Loader2,
	Lock,
	Search,
	ShieldCheck,
	Upload,
	Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const lookupSchema = z.object({
	vatNumber: z
		.string()
		.min(5, "VAT number must be at least 5 characters")
		.regex(
			/^[a-zA-Z]{2}[0-9a-zA-Z]+$/,
			"Enter VAT with country prefix (e.g. BG123456789)",
		),
});

type LookupFormValues = z.infer<typeof lookupSchema>;
type Step = "lookup" | "upload" | "audit" | "complete";

export default function KYCPage() {
	const router = useRouter();
	const setKycStatus = useAuthStore((state) => state.setKycStatus);
	const user = useAuthStore((state) => state.user);
	const identity = useAuthStore((state) => state.identity);
	const hasProfile = useAuthStore((state) => state.hasProfile);
	const initialize = useAuthStore((state) => state.initialize);

	const [step, setStep] = useState<Step>("lookup");
	const [isSavingProfile, setIsSavingProfile] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	// VIES State
	const [viesResult, setViesResult] = useState<any>(null);
	const [isViesLoading, setIsViesLoading] = useState(false);

	// Upload State
	const [file, setFile] = useState<File | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Analysis State
	const [analysisResult, setAnalysisResult] = useState<any>(null);
	const [isAnalyzing, setIsAnalyzing] = useState(false);

	const [isLocal, setIsLocal] = useState(false);

	useEffect(() => {
		setIsLocal(
			typeof window !== "undefined" &&
				(window.location.hostname.includes("localhost") ||
					window.location.hostname.includes("127.0.0.1")),
		);
	}, []);

	const lookupForm = useForm<LookupFormValues>({
		resolver: zodResolver(lookupSchema),
		defaultValues: {
			vatNumber: "",
		},
	});

	useEffect(() => {
		if (!user || user.role !== "funder") {
			router.push("/onboarding/role");
		}
	}, [user, router]);

	const handleLookup = async (values: LookupFormValues) => {
		setIsViesLoading(true);
		setSubmitError(null);
		setViesResult(null);

		try {
			const countryCode = values.vatNumber.substring(0, 2).toUpperCase();
			const number = values.vatNumber.substring(2);

			const res = await validateCompanyVies(countryCode, number);
			if (res.success) {
				setViesResult(res);
				if (!res.isValid) {
					setSubmitError(
						"Entity not found in VIES database. Check prefix and number.",
					);
				}
			} else {
				setSubmitError(res.error || "Network handshake failed");
			}
		} catch (err) {
			setSubmitError("Validation protocol interrupted");
		} finally {
			setIsViesLoading(false);
		}
	};

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (selectedFile) {
			setFile(selectedFile);
		}
	};

	const startAnalysis = async () => {
		if (!file) return;
		setStep("audit");
		setIsAnalyzing(true);

		try {
			const formData = new FormData();
			formData.append("file", file);

			const res = await analyzeDocumentAction(formData);
			if (res.success) {
				setAnalysisResult(res.data);
			} else {
				setSubmitError(res.error || "Analysis failed");
			}
		} catch (err) {
			setSubmitError("Analysis protocol failed");
		} finally {
			setIsAnalyzing(false);
		}
	};

	const finalizeProfile = async () => {
		if (!identity || !user || !viesResult?.name) return;

		setIsSavingProfile(true);
		try {
			const orgName = viesResult.name;
			const mutationPromise = hasProfile
				? updateMyProfileClient(identity, orgName, null)
				: createMyProfileClient(
						identity,
						orgName,
						{ InvestorUser: null },
						null,
					);

			const syncPromise = waitForProfileSync(
				identity,
				(profile) => "InvestorUser" in profile.user_type,
			);

			await Promise.race([
				syncPromise,
				mutationPromise.then(() => syncPromise),
			]);
			await initialize();
			setStep("complete");
		} catch (err) {
			setSubmitError("Failed to commit profile to ledger");
		} finally {
			setIsSavingProfile(false);
		}
	};

	if (!user) return null;

	return (
		<div className="flex-1 w-full max-w-4xl mx-auto flex flex-col items-center justify-center min-h-full animate-in fade-in duration-700 relative py-12">
			<AnimatePresence mode="wait">
				{/* STEP 1: ENTITY LOOKUP */}
				{step === "lookup" && (
					<motion.div
						key="lookup"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						className="w-full"
					>
						<Card className="border-border/40 bg-background/50 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
							<CardHeader className="space-y-4 pb-8 pt-12 px-12">
								<div className="h-16 w-16 rounded-2xl bg-foreground text-background flex items-center justify-center shadow-lg">
									<Building2 className="h-8 w-8" />
								</div>
								<div className="space-y-3">
									<CardTitle className="text-4xl font-black tracking-tighter uppercase italic">
										Institutional Identification
									</CardTitle>
									<CardDescription className="text-muted-foreground text-lg font-medium">
										Enter your VAT/Registration ID to
										resolve your entity from the European
										VIES database.
									</CardDescription>
								</div>
							</CardHeader>
							<CardContent className="space-y-10 px-12 pb-12">
								<Form {...lookupForm}>
									<form
										onSubmit={lookupForm.handleSubmit(
											handleLookup,
										)}
										className="space-y-6"
									>
										<FormField
											control={lookupForm.control}
											name="vatNumber"
											render={({ field }) => (
												<FormItem className="space-y-3">
													<FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">
														VAT / Registration ID
														(with country prefix)
													</FormLabel>
													<div className="flex gap-3">
														<FormControl>
															<Input
																placeholder="e.g. BG201234567"
																className="h-16 rounded-2xl border-border/40 bg-background/50 transition-all focus:border-foreground focus:ring-0 text-xl font-mono uppercase px-6"
																{...field}
															/>
														</FormControl>
														<Button
															type="submit"
															disabled={
																isViesLoading
															}
															className="h-16 w-16 rounded-2xl bg-foreground text-background shrink-0 shadow-lg hover:scale-105 transition-all"
														>
															{isViesLoading ? (
																<Loader2 className="h-6 w-6 animate-spin" />
															) : (
																<Search className="h-6 w-6" />
															)}
														</Button>
													</div>
													<FormMessage className="text-[10px] font-bold" />
												</FormItem>
											)}
										/>
									</form>
								</Form>

								{submitError && !viesResult && (
									<div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-sm text-destructive font-medium animate-in fade-in">
										{submitError}
									</div>
								)}

								{viesResult && (
									<motion.div
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										className={cn(
											"p-8 rounded-4xl border flex flex-col gap-6 transition-all duration-500",
											viesResult.isValid
												? "bg-green-500/5 border-green-500/20 shadow-lg shadow-green-500/5"
												: "bg-red-500/5 border-red-500/20",
										)}
									>
										<div className="flex justify-between items-start">
											<div className="space-y-1">
												<p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
													Database Resolution
												</p>
												<h4 className="text-2xl font-bold tracking-tight">
													{viesResult.isValid
														? viesResult.name
														: "Unresolved Entity"}
												</h4>
												<p className="text-xs font-mono text-muted-foreground">
													{lookupForm
														.getValues("vatNumber")
														.toUpperCase()}
												</p>
											</div>
											<Badge
												className={cn(
													"px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border-none",
													viesResult.isValid
														? "bg-green-500 text-white"
														: "bg-red-500 text-white",
												)}
											>
												{viesResult.isValid
													? "VALIDATED"
													: "NOT FOUND"}
											</Badge>
										</div>

										{viesResult.isValid && (
											<div className="pt-6 border-t border-green-500/10 space-y-4">
												<div className="space-y-1">
													<p className="text-[9px] font-black uppercase text-muted-foreground">
														Registered Address
													</p>
													<p className="text-sm font-medium leading-relaxed italic">
														{viesResult.address ||
															"Proprietary Data - Identity Masked"}
													</p>
												</div>
											</div>
										)}
									</motion.div>
								)}

								{isLocal && (
									<div className="pt-4 border-t border-border/40">
										<Button
											variant="outline"
											type="button"
											className="w-full border-dashed border-primary/40 text-primary/60 text-[10px] font-bold uppercase tracking-widest hover:bg-primary/5 h-12 rounded-xl"
											onClick={() => {
												setViesResult({
													isValid: true,
													name: "Dev Corp Global",
													address:
														"123 Silicon Way, Dublin, IE",
												});
												setSubmitError(null);
											}}
										>
											[Dev Mode] Simulate VIES Success
										</Button>
									</div>
								)}
							</CardContent>
							<CardFooter className="flex justify-between items-center border-t border-border/40 bg-muted/5 py-8 px-12">
								<Button
									variant="ghost"
									type="button"
									onClick={() =>
										router.push("/onboarding/role")
									}
									className="rounded-full px-8 font-black uppercase tracking-widest text-[10px]"
								>
									<ArrowLeft className="mr-2 h-4 w-4" />
									Abort
								</Button>
								<Button
									disabled={
										!viesResult?.isValid || isViesLoading
									}
									onClick={() => setStep("upload")}
									className="h-16 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all px-12 text-sm font-black shadow-xl active:scale-95 disabled:opacity-20"
								>
									Seal Identity
									<ArrowRight className="ml-2 h-5 w-5" />
								</Button>
							</CardFooter>
						</Card>
					</motion.div>
				)}

				{/* STEP 2: CREDENTIAL VAULT */}
				{step === "upload" && (
					<motion.div
						key="upload"
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						className="w-full"
					>
						<Card className="border-border/40 bg-background/50 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
							<CardHeader className="space-y-4 pb-8 pt-12 px-12">
								<div className="h-16 w-16 rounded-2xl bg-foreground text-background flex items-center justify-center shadow-lg">
									<Lock className="h-8 w-8" />
								</div>
								<div className="space-y-3">
									<CardTitle className="text-4xl font-black tracking-tighter uppercase italic">
										Credential Vault
									</CardTitle>
									<CardDescription className="text-muted-foreground text-lg font-medium">
										Upload proof of incorporation for{" "}
										{viesResult?.name} to be verified by our
										forensic AI.
									</CardDescription>
								</div>
							</CardHeader>
							<CardContent className="px-12 pb-12 space-y-10">
								<input
									type="file"
									ref={fileInputRef}
									onChange={handleFileUpload}
									accept=".pdf,.jpg,.jpeg,.png,.webp"
									className="hidden"
								/>

								<div
									onClick={() =>
										fileInputRef.current?.click()
									}
									className={cn(
										"group border-2 border-dashed rounded-[3rem] p-16 flex flex-col items-center justify-center text-center space-y-6 cursor-pointer transition-all duration-500",
										file
											? "border-primary bg-primary/5 shadow-inner"
											: "border-border/60 bg-muted/5 hover:border-foreground/20 hover:bg-muted/10",
									)}
								>
									<div
										className={cn(
											"p-6 rounded-3xl transition-all duration-500 shadow-sm",
											file
												? "bg-primary text-white scale-110"
												: "bg-muted text-muted-foreground group-hover:scale-105",
										)}
									>
										{file ? (
											<FileText className="h-10 w-10" />
										) : (
											<Upload className="h-10 w-10" />
										)}
									</div>
									<div className="space-y-2">
										<p className="text-xl font-bold tracking-tight">
											{file
												? file.name
												: "Drop Certification Pack"}
										</p>
										<p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
											{file
												? `${(file.size / 1024 / 1024).toFixed(2)} MB • READY`
												: "PDF, WEBP OR PNG (MAX 10MB)"}
										</p>
									</div>
									{file && (
										<Badge
											variant="outline"
											className="rounded-full px-4 py-1 text-[9px] font-black uppercase tracking-widest border-primary/30 text-primary bg-white"
										>
											REPLACE FILE
										</Badge>
									)}
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="p-6 rounded-2xl bg-foreground/5 border border-border/40 space-y-3">
										<div className="flex items-center gap-2">
											<ShieldCheck className="h-4 w-4 text-primary" />
											<span className="text-[10px] font-black uppercase tracking-widest">
												Forensic Privacy
											</span>
										</div>
										<p className="text-xs text-muted-foreground leading-relaxed">
											Your documents are processed in an
											encrypted sandbox and never stored
											in plain text.
										</p>
									</div>
									<div className="p-6 rounded-2xl bg-foreground/5 border border-border/40 space-y-3">
										<div className="flex items-center gap-2">
											<Zap className="h-4 w-4 text-blue-500" />
											<span className="text-[10px] font-black uppercase tracking-widest">
												Instant Consensus
											</span>
										</div>
										<p className="text-xs text-muted-foreground leading-relaxed">
											Our AI architecture validates
											authenticity signals in real-time to
											prevent fraud.
										</p>
									</div>
								</div>
							</CardContent>
							<CardFooter className="flex justify-between border-t border-border/40 bg-muted/5 py-8 px-12">
								<Button
									variant="ghost"
									onClick={() => setStep("lookup")}
									className="rounded-full px-8 font-black uppercase tracking-widest text-[10px]"
								>
									Back
								</Button>
								<Button
									disabled={!file}
									onClick={startAnalysis}
									className="h-16 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all px-12 text-sm font-black shadow-xl active:scale-95"
								>
									Seal & Analyze
									<Activity className="ml-2 h-5 w-5" />
								</Button>
							</CardFooter>
						</Card>
					</motion.div>
				)}

				{/* STEP 3: AI FORENSIC AUDIT */}
				{step === "audit" && (
					<motion.div
						key="audit"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						className="w-full"
					>
						<Card className="border-border/40 bg-background/50 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
							<CardHeader className="space-y-4 pb-8 pt-12 px-12">
								<div className="flex items-center justify-between">
									<div className="h-16 w-16 rounded-2xl bg-foreground text-background flex items-center justify-center shadow-lg">
										<FileSearch className="h-8 w-8" />
									</div>
									{analysisResult && (
										<Badge
											variant={
												analysisResult.summary.is_valid
													? "default"
													: "outline"
											}
											className={cn(
												"px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] rounded-full",
												analysisResult.summary
													.is_suspicious
													? "bg-amber-500 text-white border-none"
													: "bg-green-500 text-white border-none",
											)}
										>
											Status:{" "}
											{analysisResult.status.toUpperCase()}
										</Badge>
									)}
								</div>
								<div className="space-y-3">
									<CardTitle className="text-4xl font-black tracking-tighter uppercase italic">
										Forensic Report
									</CardTitle>
									<CardDescription className="text-muted-foreground text-lg font-medium">
										Autonomous audit of institutional
										credentials.
									</CardDescription>
								</div>
							</CardHeader>
							<CardContent className="px-12 pb-12 space-y-10">
								{isAnalyzing ? (
									<div className="space-y-12 py-10">
										<div className="flex flex-col items-center gap-8 text-center">
											<div className="relative">
												<Loader2 className="h-24 w-24 animate-spin text-primary opacity-20" />
												<div className="absolute inset-0 flex items-center justify-center">
													<Activity className="h-8 w-8 text-primary animate-pulse" />
												</div>
											</div>
											<div className="space-y-2">
												<p className="text-xl font-bold tracking-tight uppercase italic">
													Neural Extraction In
													Progress
												</p>
												<p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto">
													Scanning for tampering, date
													consistency, and official
													seals...
												</p>
											</div>
										</div>
										<div className="space-y-4">
											<div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
												<span>
													Consensus Confidence
												</span>
												<span>82%</span>
											</div>
											<Progress
												value={82}
												className="h-1.5 bg-muted/30"
											/>
										</div>
										{isLocal && (
											<Button
												variant="outline"
												type="button"
												className="w-full border-dashed border-primary/40 text-primary/60 text-[10px] font-bold uppercase tracking-widest hover:bg-primary/5 h-12 rounded-xl"
												onClick={() => {
													setAnalysisResult({
														status: "processed",
														subtype:
															"dev_mock_incorporation",
														summary: {
															is_valid: true,
															is_suspicious: false,
															overall_confidence: 0.99,
														},
														validation_results: [
															{
																rule: "tamper_check",
																status: "passed",
																details:
																	"Mock validation",
															},
															{
																rule: "date_consistency",
																status: "passed",
																details:
																	"Mock validation",
															},
														],
													});
													setIsAnalyzing(false);
												}}
											>
												[Dev Mode] Simulate Analysis
												Success
											</Button>
										)}
									</div>
								) : analysisResult ? (
									<div className="space-y-10">
										{/* Summary Grid */}
										<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
											<div className="p-6 rounded-3xl bg-foreground/5 border border-border/40 space-y-2">
												<p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
													Confidence
												</p>
												<p className="text-3xl font-black italic tracking-tighter">
													{(
														analysisResult.summary
															.overall_confidence *
														100
													).toFixed(0)}
													%
												</p>
											</div>
											<div className="p-6 rounded-3xl bg-foreground/5 border border-border/40 space-y-2">
												<p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
													Type
												</p>
												<p className="text-lg font-bold truncate uppercase">
													{analysisResult.subtype.replace(
														"_",
														" ",
													)}
												</p>
											</div>
											<div className="p-6 rounded-3xl bg-foreground/5 border border-border/40 space-y-2">
												<p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
													Tamper Check
												</p>
												<p
													className={cn(
														"text-lg font-bold uppercase",
														analysisResult.summary
															.is_suspicious
															? "text-amber-500"
															: "text-green-500",
													)}
												>
													{analysisResult.summary
														.is_suspicious
														? "SUSPICIOUS"
														: "PASS"}
												</p>
											</div>
										</div>

										{/* Validation Rules */}
										<div className="space-y-4">
											<h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">
												Protocol Rules Audit
											</h5>
											<div className="grid gap-3">
												{analysisResult.validation_results.map(
													(rule: any, i: number) => (
														<div
															key={i}
															className="flex items-center justify-between p-4 rounded-2xl bg-background border border-border/40 shadow-sm"
														>
															<div className="flex items-center gap-3">
																<div
																	className={cn(
																		"h-2 w-2 rounded-full",
																		rule.status ===
																			"passed"
																			? "bg-green-500"
																			: rule.status ===
																				  "warning"
																				? "bg-amber-500"
																				: "bg-muted",
																	)}
																/>
																<span className="text-xs font-bold capitalize">
																	{rule.rule.replace(
																		/_/g,
																		" ",
																	)}
																</span>
															</div>
															{rule.details && (
																<span className="text-[10px] text-muted-foreground italic max-w-50 truncate">
																	{
																		rule.details
																	}
																</span>
															)}
															<Badge
																variant="outline"
																className={cn(
																	"text-[8px] font-black uppercase tracking-widest px-2 py-0 rounded-sm border-none",
																	rule.status ===
																		"passed"
																		? "text-green-500 bg-green-500/10"
																		: rule.status ===
																			  "warning"
																			? "text-amber-500 bg-amber-500/10"
																			: "text-muted-foreground",
																)}
															>
																{rule.status}
															</Badge>
														</div>
													),
												)}
											</div>
										</div>

										{/* Suspicion Alerts */}
										{analysisResult.summary
											.is_suspicious && (
											<div className="p-8 rounded-4xl bg-amber-500/5 border border-amber-500/20 space-y-4">
												<div className="flex items-center gap-3">
													<AlertTriangle className="h-6 w-6 text-amber-500" />
													<p className="text-sm font-black uppercase tracking-widest text-amber-600">
														Forensic Alerts
													</p>
												</div>
												<ul className="space-y-3">
													{analysisResult.artifacts?.analysis?.llm_review?.suspicion_reasons?.map(
														(
															reason: string,
															i: number,
														) => (
															<li
																key={i}
																className="text-sm font-medium text-amber-700/80 flex items-start gap-2 leading-relaxed"
															>
																<span className="mt-1.5 h-1 w-1 rounded-full bg-amber-500 shrink-0" />
																{reason}
															</li>
														),
													)}
												</ul>
												<p className="text-[10px] text-amber-600/60 italic pt-2">
													Warning: Submitting
													suspicious documents may
													impact your institutional
													reputation multiplier.
												</p>
											</div>
										)}
									</div>
								) : (
									<div className="p-12 text-center text-muted-foreground italic border-2 border-dashed rounded-3xl">
										Protocol error: Analysis result not
										found.
									</div>
								)}
							</CardContent>
							<CardFooter className="flex justify-between border-t border-border/40 bg-muted/5 py-8 px-12">
								<Button
									variant="ghost"
									onClick={() => setStep("upload")}
									className="rounded-full px-8 font-black uppercase tracking-widest text-[10px]"
								>
									Discard File
								</Button>
								<Button
									disabled={
										isSavingProfile ||
										isAnalyzing ||
										!analysisResult
									}
									onClick={finalizeProfile}
									className="h-16 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all px-12 text-sm font-black shadow-xl active:scale-95"
								>
									{isSavingProfile ? (
										<Loader2 className="h-6 w-6 animate-spin" />
									) : (
										"Commit to Ledger"
									)}
									<ArrowRight className="ml-2 h-5 w-5" />
								</Button>
							</CardFooter>
						</Card>
					</motion.div>
				)}

				{/* STEP 4: COMPLETE */}
				{step === "complete" && (
					<motion.div
						key="complete"
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						className="text-center space-y-12 py-16"
					>
						<div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full border border-border/40 bg-background text-foreground animate-in zoom-in-50 duration-700 shadow-2xl">
							<CheckCircle2 className="h-20 w-20" />
						</div>
						<div className="space-y-4">
							<h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground leading-tight uppercase italic">
								Node <br />
								<span className="text-muted-foreground/30">
									Active
								</span>
							</h1>
							<p className="text-muted-foreground text-2xl max-w-xl mx-auto leading-relaxed font-medium">
								Your institutional entity is now recognized by
								the OpenFairTrip protocol. Tier 3 capital
								deployment rights enabled.
							</p>
						</div>
						<div className="pt-8">
							<Button
								className="h-20 px-16 text-2xl font-black rounded-[2.5rem] bg-foreground text-background shadow-2xl transition-all hover:scale-105 active:scale-95 uppercase tracking-tighter"
								onClick={() => router.push("/dashboard")}
							>
								Enter Protocol Dashboard
							</Button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
