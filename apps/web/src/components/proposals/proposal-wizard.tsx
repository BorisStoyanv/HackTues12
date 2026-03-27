"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProposalFormValues, proposalSchema } from "@/lib/validations/proposal";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ChevronRight, ChevronLeft, Building2, MapPin, FileText, Landmark, ShieldCheck, Globe, Loader2, Zap, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocationPicker } from "./location-picker";
import {
  saveProposalAIDebateClient,
  submitProposalClient,
} from "@/lib/api/client-mutations";
import { useAuthStore } from "@/lib/auth-store";
import { Location, ProposalCategory } from "@/lib/types/api";
import { normalizeRegionTag } from "@/lib/profile-utils";
import { runProposalDebateEvaluation } from "@/lib/ai/debate";

const STEPS = [
  { id: "basic", title: "Basic Information", description: "Identity & Type", icon: Building2 },
  { id: "location", title: "Geographic Context", description: "Mapping & Region", icon: MapPin },
  { id: "impact", title: "Social Impact", description: "Projected Outcomes", icon: FileText },
  { id: "execution", title: "Execution Strategy", description: "Logistics & Timeline", icon: Zap },
  { id: "financials", title: "Financial Model", description: "Budget & Allocation", icon: Landmark },
];

export function ProposalWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitPhase, setSubmitPhase] = useState<string | null>(null);
  
  const identity = useAuthStore((state) => state.identity);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const userRole = useAuthStore((state) => state.user?.role);
  const hasProfile = useAuthStore((state) => state.hasProfile);

  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      title: "",
      description: "",
      region_tag: "",
      category: "Infrastructure",
      budget_amount: 0,
      budget_currency: "USD",
      budget_breakdown: "",
      executor_name: "",
      execution_plan: "",
      timeline: "",
      expected_impact: "",
    },
    mode: "onTouched",
  });

  const { register, trigger, handleSubmit, formState: { errors }, watch, setValue, control } = form;

  // Persist form state
  useEffect(() => {
    const savedData = localStorage.getItem("proposal_draft_v3");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData) as Partial<ProposalFormValues>;
        Object.entries(parsed).forEach(([key, value]) => {
          if (value !== undefined) {
             setValue(key as keyof ProposalFormValues, value as any);
          }
        });
      } catch (e) {
        console.error("Failed to parse draft");
      }
    }
  }, [setValue]);

  useEffect(() => {
    const subscription = watch((value) => {
      localStorage.setItem("proposal_draft_v3", JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const handleNext = async () => {
    let fieldsToValidate: (keyof ProposalFormValues)[] = [];
    
    switch (currentStep) {
      case 0:
        fieldsToValidate = ["title", "category", "description"];
        break;
      case 1:
        fieldsToValidate = ["region_tag", "location"];
        break;
      case 2:
        fieldsToValidate = ["expected_impact"];
        break;
      case 3:
        fieldsToValidate = ["executor_name", "execution_plan", "timeline"];
        break;
      case 4:
        fieldsToValidate = ["budget_amount", "budget_currency", "budget_breakdown"];
        break;
      default:
        break;
    }

    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) {
      setDirection(1);
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (data: ProposalFormValues) => {
    if (isInitializing) {
      setSubmitError("Your account is still loading. Please wait a moment and try again.");
      return;
    }

    if (!identity) {
      setSubmitError("Please sign in with Internet Identity to submit this proposal.");
      return;
    }

    if (!hasProfile) {
      setSubmitError("Complete community onboarding before submitting a proposal.");
      router.push("/onboarding/role");
      return;
    }

    if (userRole !== "regional") {
      setSubmitError("Only community users can submit proposals.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitPhase("Committing proposal");
    try {
      const category: ProposalCategory = { [data.category]: null } as any;
      const location: [] | [Location] = data.location
        ? [
            {
              city: data.location.city ?? data.region_tag,
              country: data.location.country ?? "Unknown Country",
              formatted_address: data.location.formatted_address,
              lat: data.location.lat,
              lng: data.location.lng,
            },
          ]
        : [];

      const result = await submitProposalClient(identity, {
        ...data,
        category,
        budget_amount: data.budget_amount,
        approved_company: [],
        location,
      });

      const createdProposalId = result.id.toString();

      try {
        setSubmitPhase("Running AI debate");
        const savedDebate = await runProposalDebateEvaluation({
          title: data.title,
          description: data.description,
          category: data.category,
          budget_amount: data.budget_amount,
          budget_currency: data.budget_currency,
          region_tag: data.region_tag,
          location: {
            formatted_address:
              data.location?.formatted_address || data.region_tag,
            city: data.location?.city || data.region_tag,
            country: data.location?.country || "Unknown Country",
            lat: data.location?.lat ?? 0,
            lng: data.location?.lng ?? 0,
          },
        });
        setSubmitPhase("Saving AI debate");
        await saveProposalAIDebateClient(identity, createdProposalId, savedDebate);
      } catch (aiError) {
        console.error("Proposal created but AI debate could not be saved", aiError);
      }
      
      console.log("Broadcasting successful:", result);
      localStorage.removeItem("proposal_draft_v3");
<<<<<<< HEAD
      router.push(`/dashboard/proposals/detail?id=${result.id.toString()}`);
=======
      router.push(`/dashboard/proposals/${createdProposalId}`);
>>>>>>> origin/Boris
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : "Blockchain communication failed. Please check the console.";
      setSubmitError(message);
      setSubmitPhase(null);

      if (
        message.includes("Register before submitting proposals") ||
        message.includes("Only community users can submit proposals")
      ) {
        router.push("/onboarding/role");
      }
      
      setIsSubmitting(false);
    }
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 15 : -15, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir < 0 ? 15 : -15, opacity: 0 })
  };

  return (
    <div className="flex flex-col xl:flex-row gap-12 items-start w-full">
      {/* Refined Step Navigation */}
      <div className="w-full xl:w-64 shrink-0">
        <div className="sticky top-24 space-y-6">
          <div className="space-y-2">
             <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">
                  Protocol Stage
                </h3>
                <span className="text-[10px] font-mono font-bold text-primary">
                  {currentStep + 1} / {STEPS.length}
                </span>
             </div>
             <div className="h-1 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
             </div>
          </div>

          <div className="space-y-0.5">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isPast = index < currentStep;

              return (
                <div 
                  key={step.id} 
                  className={cn(
                    "flex gap-3 p-2.5 rounded-lg transition-all duration-200 border border-transparent",
                    isActive ? "bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-sm" : "opacity-50"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-md border transition-all duration-300 shrink-0",
                      isActive
                        ? "bg-primary border-primary text-primary-foreground shadow-sm"
                        : isPast
                        ? "bg-green-500/10 border-transparent text-green-500"
                        : "bg-transparent border-neutral-200 dark:border-neutral-800 text-neutral-400"
                    )}
                  >
                    {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <p className={cn(
                      "text-xs font-semibold truncate",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {step.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50">
             <div className="flex items-center gap-2 mb-2 text-primary">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-foreground">Integrity Note</span>
             </div>
             <p className="text-[11px] text-muted-foreground leading-relaxed">
               All data is immutable once broadcasted. AI agents will cross-reference claims against regional ground-truth.
             </p>
          </div>
        </div>
      </div>

      {/* Main Wizard Form Container */}
      <div className="flex-1 w-full max-w-4xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 pb-24">
          {submitError && (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{submitError}</p>
            </div>
          )}
          <div className="relative min-h-[500px] flex flex-col">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              {/* STEP 1: Basic Info */}
              {currentStep === 0 && (
                <motion.div
                  key="step0"
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1"
                >
                  <div className="space-y-10">
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold tracking-tight">Classification & Identity</h2>
                      <p className="text-muted-foreground text-sm">Define the core project identity and classification.</p>
                    </div>

                    <div className="space-y-8">
                      <div className="space-y-2.5">
                        <Label htmlFor="title" className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                           Project Title
                        </Label>
                        <Input 
                          id="title" 
                          placeholder="e.g. Urban Solar Grid: Central District" 
                          {...register("title")} 
                          className={cn(
                            "h-10 text-base font-medium rounded-lg border-neutral-200 dark:border-neutral-800 bg-background focus-visible:ring-1 focus-visible:ring-primary transition-all duration-200",
                            errors.title ? "border-destructive focus-visible:ring-destructive" : ""
                          )}
                        />
                        {errors.title && <p className="text-[11px] text-destructive font-medium">{errors.title.message}</p>}
                      </div>

                      <div className="grid md:grid-cols-2 gap-8">
                         <div className="space-y-2.5">
                            <Label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                               Category
                            </Label>
                            <Controller
                              name="category"
                              control={control}
                              render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger className="h-10 rounded-lg border-neutral-200 dark:border-neutral-800 bg-background">
                                    <SelectValue placeholder="Select Category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {["Infrastructure", "Marketing", "Events", "Conservation", "Education", "Technology", "Other"].map(cat => (
                                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                         </div>
                      </div>

                      <div className="space-y-2.5">
                        <Label htmlFor="description" className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                           Executive Summary
                        </Label>
                        <Textarea 
                          id="description" 
                          placeholder="What specific problem are you solving? Summarize project objectives..." 
                          className={cn(
                            "min-h-[140px] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-background text-sm leading-relaxed transition-all resize-none focus-visible:ring-1",
                            errors.description ? "border-destructive focus-visible:ring-destructive" : ""
                          )}
                          {...register("description")} 
                        />
                        <div className="flex justify-between items-center px-1">
                           {errors.description ? <p className="text-[11px] text-destructive font-medium">{errors.description.message}</p> : <div />}
                           <p className="text-[10px] font-mono text-muted-foreground">{(watch("description") || "").length} / 1000</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Location */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1"
                >
                  <div className="space-y-10">
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold tracking-tight">Geographic Anchor</h2>
                      <p className="text-muted-foreground text-sm">Specify the impact zone to reach relevant regional voters.</p>
                    </div>

                    <div className="space-y-8">
                      <div className="p-1 border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50 dark:bg-neutral-950 overflow-hidden shadow-sm">
                        <Controller
                          name="location"
                          control={control}
                          render={({ field }) => (
                            <LocationPicker 
                              value={{
                                formatted_address: field.value?.formatted_address || "",
                                city: field.value?.city || "",
                                country: field.value?.country || "",
                                lat: field.value?.lat || 0,
                                lng: field.value?.lng || 0
                              }} 
                              onChange={(val) => {
                                 field.onChange(val);
                                 setValue("region_tag", val.city ? normalizeRegionTag(val.city) : "global");
                                 void trigger(["location", "region_tag"]);
                              }}
                              error={typeof errors.location?.message === "string" ? errors.location.message : undefined}
                            />
                          )}
                        />
                      </div>

                      <div className="space-y-2.5">
                        <Label htmlFor="region_tag" className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                           <Globe className="w-3 h-3" />
                           Region Tag
                        </Label>
                        <Input 
                          id="region_tag" 
                          placeholder="e.g. sofia_center" 
                          className="h-10 rounded-lg border-neutral-200 dark:border-neutral-800 font-mono text-sm bg-background"
                          {...register("region_tag")} 
                        />
                        {errors.region_tag && <p className="text-[11px] text-destructive font-medium">{errors.region_tag.message}</p>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Impact */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1"
                >
                  <div className="space-y-10">
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold tracking-tight">Social Impact</h2>
                      <p className="text-muted-foreground text-sm">Define positive externalities and measurable outcomes.</p>
                    </div>

                    <div className="space-y-8">
                      <div className="space-y-2.5">
                        <Label htmlFor="expected_impact" className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                           Measurable Outcomes & KPIs
                        </Label>
                        <Textarea 
                          id="expected_impact" 
                          placeholder="How exactly does the community benefit? Provide specific data points..." 
                          className={cn(
                            "min-h-[220px] p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-background text-sm leading-relaxed resize-none transition-all duration-200 focus-visible:ring-1",
                            errors.expected_impact ? "border-destructive focus-visible:ring-destructive" : ""
                          )}
                          {...register("expected_impact")} 
                        />
                        {errors.expected_impact && <p className="text-[11px] text-destructive font-medium mt-1">{errors.expected_impact.message}</p>}
                      </div>

                      <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 flex gap-4">
                         <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                         <p className="text-xs text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                           Claims will be cross-referenced by our AI Analyst against regional data.
                         </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: Execution */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1"
                >
                  <div className="space-y-10">
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold tracking-tight">Strategy & Timeline</h2>
                      <p className="text-muted-foreground text-sm">Who will execute the project and when will milestones be reached?</p>
                    </div>

                    <div className="space-y-8">
                      <div className="grid md:grid-cols-2 gap-8">
                         <div className="space-y-2.5">
                            <Label htmlFor="executor_name" className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Executor Identity</Label>
                            <Input id="executor_name" placeholder="Lead organization or individual" className="h-10 px-4 rounded-lg border-neutral-200 dark:border-neutral-800 bg-background text-sm" {...register("executor_name")} />
                            {errors.executor_name && <p className="text-[11px] text-destructive font-medium">{errors.executor_name.message}</p>}
                         </div>
                         <div className="space-y-2.5">
                            <Label htmlFor="timeline" className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Timeline</Label>
                            <Input id="timeline" placeholder="e.g. 6 months" className="h-10 px-4 rounded-lg border-neutral-200 dark:border-neutral-800 bg-background text-sm" {...register("timeline")} />
                            {errors.timeline && <p className="text-[11px] text-destructive font-medium">{errors.timeline.message}</p>}
                         </div>
                      </div>

                      <div className="space-y-2.5">
                        <Label htmlFor="execution_plan" className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Operational Roadmap</Label>
                        <Textarea 
                          id="execution_plan" 
                          placeholder="Step-by-step roadmap including technical milestones..." 
                          className="min-h-[180px] p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-background text-sm leading-relaxed resize-none focus-visible:ring-1" 
                          {...register("execution_plan")} 
                        />
                        {errors.execution_plan && <p className="text-[11px] text-destructive font-medium mt-1">{errors.execution_plan.message}</p>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 5: Financials */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1"
                >
                  <div className="space-y-10">
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold tracking-tight">Financial Model</h2>
                      <p className="text-muted-foreground text-sm">Specify the capital requirement and budget breakdown.</p>
                    </div>

                    <div className="space-y-8">
                      <div className="grid md:grid-cols-3 gap-8 items-end">
                        <div className="md:col-span-2 space-y-2.5">
                          <Label htmlFor="budget_amount" className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Funding Target</Label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">$</span>
                            <Input 
                              id="budget_amount" 
                              type="number"
                              placeholder="0.00" 
                              className="h-11 pl-8 text-lg font-bold border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 rounded-lg"
                              {...register("budget_amount", { valueAsNumber: true })} 
                            />
                          </div>
                          {errors.budget_amount && <p className="text-[11px] text-destructive font-medium">{errors.budget_amount.message}</p>}
                        </div>
                        
                        <div className="space-y-2.5 pb-0.5">
                          <Label htmlFor="budget_currency" className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Currency</Label>
                          <Input 
                            id="budget_currency" 
                            placeholder="e.g. USD" 
                            className="h-11 px-4 rounded-lg border border-neutral-200 dark:border-neutral-800 font-semibold"
                            {...register("budget_currency")} 
                          />
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <Label htmlFor="budget_breakdown" className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Budget Breakdown</Label>
                        <Textarea 
                          id="budget_breakdown" 
                          placeholder="Itemized allocation: 40% Infrastructure, 30% Labor, etc." 
                          className="min-h-[140px] p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-background text-sm leading-relaxed resize-none focus-visible:ring-1" 
                          {...register("budget_breakdown")} 
                        />
                        {errors.budget_breakdown && <p className="text-[11px] text-destructive font-medium mt-1">{errors.budget_breakdown.message}</p>}
                      </div>
                      
                      <div className="p-4 rounded-xl bg-primary/[0.02] border border-primary/10 flex items-center gap-4">
                         <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-md">
                            <ShieldCheck className="w-5 h-5 text-primary-foreground" />
                         </div>
                         <div className="space-y-0.5">
                            <h4 className="text-xs font-bold text-foreground tracking-tight">Protocol Agreement</h4>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              Funds released via milestone verification. Transparency is enforced at the ledger level.
                            </p>
                         </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation Controls */}
          <div className="sticky bottom-6 z-10 pt-4">
             <div className="p-2.5 rounded-xl bg-background/80 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-lg">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                  disabled={currentStep === 0 || isSubmitting}
                  className="h-10 px-5 rounded-lg font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1.5" />
                  Back
                </Button>
                
                {currentStep < STEPS.length - 1 ? (
                  <Button 
                    type="button" 
                    onClick={handleNext}
                    className="w-full sm:w-auto h-10 px-8 rounded-lg font-bold text-xs bg-foreground text-background hover:bg-foreground/90 transition-all"
                  >
                    Continue
                    <ChevronRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={
                      isSubmitting ||
                      !identity ||
                      !isAuthenticated ||
                      isInitializing ||
                      !hasProfile ||
                      userRole !== "regional"
                    }
                    className="w-full sm:w-auto h-10 px-8 rounded-lg font-bold text-xs shadow-md bg-primary text-primary-foreground hover:opacity-90 transition-all"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                         <Loader2 className="w-3.5 h-3.5 animate-spin" />
                         {submitPhase ?? "Broadcasting..."}
                      </div>
                    ) : (
                      <>
                        Commit Proposal
                        <CheckCircle2 className="w-3.5 h-3.5 ml-1.5" />
                      </>
                    )}
                  </Button>
                )}
             </div>
             {!identity && currentStep === STEPS.length - 1 && (
               <p className="text-[9px] text-destructive font-bold uppercase text-center mt-2 tracking-widest">
                 Identity Required to Sign Transaction
               </p>
             )}
             {identity && isInitializing && currentStep === STEPS.length - 1 && (
               <p className="text-[9px] text-muted-foreground font-bold uppercase text-center mt-2 tracking-widest">
                 Restoring Account Profile
               </p>
             )}
             {identity && !isInitializing && !hasProfile && currentStep === STEPS.length - 1 && (
               <p className="text-[9px] text-destructive font-bold uppercase text-center mt-2 tracking-widest">
                 Complete Community Onboarding Before Submitting
               </p>
             )}
             {identity && !isInitializing && hasProfile && userRole !== "regional" && currentStep === STEPS.length - 1 && (
               <p className="text-[9px] text-destructive font-bold uppercase text-center mt-2 tracking-widest">
                 Proposal Submission Is For Community Users Only
               </p>
             )}
          </div>
        </form>
      </div>
    </div>
  );
}
