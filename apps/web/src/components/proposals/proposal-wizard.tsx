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
import { 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  MapPin, 
  FileText, 
  ShieldCheck, 
  Globe, 
  Loader2, 
  Zap, 
  Info, 
  AlertCircle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
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
import { CategoryPicker } from "./category-picker";
import { EUROPEAN_CURRENCIES } from "@/lib/currencies";
import { Form } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { MoneyInput } from "./money-input";
import { Separator } from "@/components/ui/separator";

export const WIZARD_STEPS = [
  { id: "basic", title: "Identity", description: "Classification" },
  { id: "mission", title: "Mission", description: "Objective" },
  { id: "location", title: "Anchor", description: "Impact Zone" },
  { id: "strategy", title: "Logistics", description: "Execution" },
  { id: "financials", title: "Capital", description: "Budget" },
  { id: "review", title: "Protocol", description: "Submission" },
];

interface ProposalWizardProps {
  currentStep: number;
  onStepChange: (step: number) => void;
}

export function ProposalWizard({ currentStep, onStepChange }: ProposalWizardProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitPhase, setSubmitPhase] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  
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
      budget_currency: "EUR",
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
    const savedData = localStorage.getItem("proposal_draft_v9");
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
      localStorage.setItem("proposal_draft_v9", JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const handleNext = async () => {
    let fieldsToValidate: (keyof ProposalFormValues)[] = [];
    
    switch (currentStep) {
      case 0: fieldsToValidate = ["title", "category"]; break;
      case 1: fieldsToValidate = ["description", "expected_impact"]; break;
      case 2: fieldsToValidate = ["region_tag", "location"]; break;
      case 3: fieldsToValidate = ["executor_name", "execution_plan", "timeline"]; break;
      case 4: fieldsToValidate = ["budget_amount", "budget_currency", "budget_breakdown"]; break;
      default: break;
    }

    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) {
      setDirection(1);
      onStepChange(Math.min(currentStep + 1, WIZARD_STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setDirection(-1);
    onStepChange(Math.max(currentStep - 1, 0));
  };

  const onSubmit = async (data: ProposalFormValues) => {
    // Safety check: ensure we are actually on the review step before allowing submission
    if (currentStep !== WIZARD_STEPS.length - 1) {
        return;
    }

    if (isInitializing || !identity || !hasProfile || userRole !== "regional") return;

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
      setCreatedId(createdProposalId);

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
      
      localStorage.removeItem("proposal_draft_v9");
      setSubmitPhase("Success");
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Blockchain failed.";
      setSubmitError(message);
      setSubmitPhase(null);
      setIsSubmitting(false);
    }
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 30 : -30, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir < 0 ? 30 : -30, opacity: 0 })
  };

  if (submitPhase === "Success") {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full py-20 text-center space-y-12"
      >
        <div className="mx-auto h-32 w-32 rounded-full bg-green-500 flex items-center justify-center shadow-2xl shadow-green-500/20 animate-in zoom-in-50 duration-700">
           <CheckCircle2 className="h-16 w-16 text-white" />
        </div>
        <div className="space-y-4">
           <h2 className="text-5xl font-black tracking-tight uppercase italic leading-tight text-foreground">Broadcast <br /><span className="text-muted-foreground/30">Successful</span></h2>
           <p className="text-xl text-muted-foreground font-medium max-w-lg mx-auto">
             Your proposal has been committed to the ledger and is now entering the consensus phase.
           </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl mx-auto pt-6">
           <Button 
             className="h-16 rounded-2xl bg-foreground text-background font-black text-sm uppercase tracking-widest shadow-xl active:scale-95"
             onClick={() => router.push(`/dashboard/proposals/detail?id=${createdId}`)}
           >
              Detail Packet
           </Button>
           <Button 
             variant="outline"
             className="h-16 rounded-2xl border-2 border-border font-black text-sm uppercase tracking-widest hover:bg-muted/50 transition-all active:scale-95"
             onClick={() => router.push(`/dashboard/explore?id=${createdId}`)}
           >
              <MapPin className="mr-2 h-4 w-4" />
              View on Map
           </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="w-full">
      <Form {...form}>
        <form 
            onSubmit={handleSubmit(onSubmit)} 
            className="space-y-16"
            onKeyDown={(e) => {
                // Prevent 'Enter' from submitting the form prematurely
                if (e.key === "Enter" && currentStep < WIZARD_STEPS.length - 1) {
                    e.preventDefault();
                }
            }}
        >
          {submitError && (
            <div className="flex items-start gap-4 p-6 rounded-[2rem] border border-destructive/20 bg-destructive/5 text-destructive animate-in fade-in zoom-in-95">
              <AlertCircle className="h-6 w-6 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-lg font-bold uppercase tracking-tight italic">Protocol Rejection</p>
                <p className="text-sm font-medium opacity-80">{submitError}</p>
              </div>
            </div>
          )}

          <div className="relative min-h-[450px] flex flex-col">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              
              {/* STEP 0: IDENTITY */}
              {currentStep === 0 && (
                <motion.div
                  key="step0"
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
                  className="space-y-10"
                >
                  <div className="space-y-10">
                    <div className="space-y-4">
                      <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground ml-1">
                         Transaction Title
                      </Label>
                      <Input 
                        id="title" 
                        placeholder="e.g. Urban Solar Grid Expansion" 
                        {...register("title")} 
                        className={cn(
                          "h-16 text-xl font-bold rounded-2xl border-border/40 bg-background/50 px-6 focus:ring-0 focus:border-foreground transition-all duration-500",
                          errors.title ? "border-destructive text-destructive" : ""
                        )}
                      />
                      {errors.title && <p className="text-[10px] font-bold text-destructive px-2 uppercase">{errors.title.message}</p>}
                    </div>

                    <div className="space-y-4">
                      <Label className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground ml-1">
                         Governance Category
                      </Label>
                      <Controller
                        name="category"
                        control={control}
                        render={({ field }) => (
                          <CategoryPicker value={field.value} onChange={field.onChange} />
                        )}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 1: MISSION */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
                  className="space-y-10"
                >
                  <div className="grid grid-cols-1 gap-12">
                    <div className="space-y-4">
                      <Label htmlFor="description" className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground ml-1">
                         Executive Summary
                      </Label>
                      <div className="relative">
                        <Textarea 
                          id="description" 
                          placeholder="What specific problem are you solving?..." 
                          className={cn(
                            "min-h-[220px] p-8 rounded-[2.5rem] border-border/40 bg-background/50 text-lg leading-relaxed resize-none focus:ring-0 focus:border-foreground transition-all duration-500",
                            errors.description ? "border-destructive" : ""
                          )}
                          {...register("description")} 
                        />
                        <div className="absolute bottom-6 right-8 text-[10px] font-black uppercase text-muted-foreground opacity-40">
                          {(watch("description") || "").length} / 1000
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label htmlFor="expected_impact" className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground ml-1">
                         Measurable Impact & KPIs
                      </Label>
                      <Textarea 
                        id="expected_impact" 
                        placeholder="Identify specific community benefits and metrics..." 
                        className={cn(
                          "min-h-[160px] p-8 rounded-[2.5rem] border-border/40 bg-background/50 text-lg leading-relaxed resize-none focus:ring-0 focus:border-foreground transition-all duration-500",
                          errors.expected_impact ? "border-destructive" : ""
                        )}
                        {...register("expected_impact")} 
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: LOCATION */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
                  className="space-y-10"
                >
                  <div className="space-y-12">
                    <div className="p-1 border border-border/20 rounded-[2.5rem] bg-muted/5 overflow-hidden shadow-2xl min-h-[450px]">
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

                    <div className="space-y-4 max-w-md">
                      <Label htmlFor="region_tag" className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground ml-1 flex items-center gap-2">
                         <Globe className="w-3 h-3" />
                         Protocol Tag
                      </Label>
                      <Input 
                        id="region_tag" 
                        placeholder="e.g. sofia_center" 
                        className="h-14 rounded-2xl border-border/40 font-mono text-sm bg-background/50 px-6 uppercase tracking-widest"
                        {...register("region_tag")} 
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: STRATEGY */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
                  className="space-y-10"
                >
                  <div className="grid grid-cols-1 gap-12">
                    <div className="grid md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <Label htmlFor="executor_name" className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground ml-1">Responsible Executor</Label>
                          <Input 
                            id="executor_name" 
                            placeholder="Organization or Individual" 
                            className="h-16 px-6 rounded-2xl border-border/40 bg-background/50 text-lg font-semibold focus:border-foreground" 
                            {...register("executor_name")} 
                          />
                       </div>
                       <div className="space-y-4">
                          <Label htmlFor="timeline" className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground ml-1">Estimated Timeline</Label>
                          <Input 
                            id="timeline" 
                            placeholder="e.g. 12 Months" 
                            className="h-16 px-6 rounded-2xl border-border/40 bg-background/50 text-lg font-semibold focus:border-foreground" 
                            {...register("timeline")} 
                          />
                       </div>
                    </div>

                    <div className="space-y-4">
                      <Label htmlFor="execution_plan" className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground ml-1">Operational Roadmap</Label>
                      <Textarea 
                        id="execution_plan" 
                        placeholder="Step-by-step roadmap including technical milestones..." 
                        className="min-h-[200px] p-8 rounded-[2.5rem] border-border/40 bg-background/50 text-lg leading-relaxed resize-none focus:border-foreground transition-all duration-500" 
                        {...register("execution_plan")} 
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: CAPITAL */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
                  className="space-y-10"
                >
                  <div className="grid grid-cols-1 gap-12">
                    <div className="grid md:grid-cols-4 gap-8 items-end">
                      <div className="md:col-span-3">
                        <MoneyInput
                          form={form}
                          name="budget_amount"
                          label="Target Amount"
                          currencyCode={watch("budget_currency")}
                        />
                      </div>
                      
                      <div className="space-y-4">
                        <Label htmlFor="budget_currency" className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground ml-1">Currency</Label>
                        <Controller
                          name="budget_currency"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className="h-16 rounded-[1.5rem] border-border/40 bg-background text-xl font-black uppercase tracking-widest focus:border-foreground">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl shadow-2xl border-border/40">
                                {EUROPEAN_CURRENCIES.map(curr => (
                                  <SelectItem key={curr.code} value={curr.code} className="py-3 font-bold">{curr.code}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label htmlFor="budget_breakdown" className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground ml-1">Itemized Breakdown</Label>
                      <Textarea 
                        id="budget_breakdown" 
                        placeholder="e.g. 60% Procurement, 20% Logistics, 20% Quality Control..." 
                        className="min-h-[160px] p-8 rounded-[2.5rem] border-border/40 bg-background/50 text-lg leading-relaxed resize-none focus:border-foreground transition-all duration-500" 
                        {...register("budget_breakdown")} 
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 5: REVIEW (Sophisticated Redesign) */}
              {currentStep === 5 && (
                <motion.div
                  key="step5"
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
                  className="space-y-10"
                >
                  <div className="space-y-6">
                    <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Final Audit Review</p>
                        <h2 className="text-3xl font-black tracking-tighter uppercase italic leading-none">Initialization Packet</h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Summary Column */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="border-border/40 bg-neutral-50/50 dark:bg-neutral-950/50 shadow-sm rounded-3xl overflow-hidden">
                                <div className="p-8 space-y-8">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Initiative Identity</p>
                                            <h3 className="text-2xl font-black tracking-tight leading-tight uppercase italic truncate pr-4">
                                                {watch("title") || "Untitled Initiative"}
                                            </h3>
                                        </div>
                                        <Badge variant="secondary" className="text-[8px] font-black uppercase px-3 py-1 rounded-full bg-background border-border/60">
                                            {watch("category").toUpperCase()}
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-1.5">
                                            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Mission Context</p>
                                            <p className="text-sm font-medium leading-relaxed line-clamp-3 italic opacity-70">
                                                "{watch("description") || "No summary provided."}"
                                            </p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Impact Vectors</p>
                                            <p className="text-sm font-medium leading-relaxed line-clamp-3 opacity-70">
                                                {watch("expected_impact") || "Not defined."}
                                            </p>
                                        </div>
                                    </div>

                                    <Separator className="bg-border/40" />

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase text-muted-foreground">Region</p>
                                            <p className="text-xs font-bold truncate flex items-center gap-1">
                                                <MapPin className="h-3 w-3 text-primary" />
                                                {watch("region_tag").toUpperCase()}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase text-muted-foreground">Executor</p>
                                            <p className="text-xs font-bold truncate">{watch("executor_name") || "TBD"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase text-muted-foreground">Timeline</p>
                                            <p className="text-xs font-bold">{watch("timeline") || "TBD"}</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Financial Sidebar */}
                        <div className="space-y-6">
                            <Card className="border-primary/20 bg-primary/5 shadow-xl shadow-primary/5 rounded-3xl p-8 flex flex-col justify-between min-h-[200px]">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase text-primary tracking-[0.2em]">Requested Capital</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-black text-primary/60">{EUROPEAN_CURRENCIES.find(c => c.code === watch("budget_currency"))?.symbol}</span>
                                        <h4 className="text-4xl font-black tracking-tighter tabular-nums">
                                            {watch("budget_amount").toLocaleString()}
                                        </h4>
                                    </div>
                                </div>
                                
                                <div className="space-y-3 pt-6 border-t border-primary/10">
                                    <div className="flex items-center gap-2">
                                        <Zap className="h-3.5 w-3.5 text-primary" />
                                        <p className="text-[10px] font-bold uppercase tracking-tight text-primary">Protocol Status: ACTIVE</p>
                                    </div>
                                    <p className="text-[10px] text-primary/60 font-medium leading-tight">
                                        Funds locked in programmatic escrow upon successful consensus.
                                    </p>
                                </div>
                            </Card>

                            <div className="p-6 rounded-3xl border border-dashed border-border/60 space-y-4">
                                <div className="flex items-center gap-2 opacity-50">
                                    <ShieldCheck className="h-4 w-4" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Ledger Proof</span>
                                </div>
                                <p className="text-[11px] font-medium leading-relaxed italic opacity-40">
                                    "I authorize the permanent broadcast of this initiative to the OpenFairTrip protocol."
                                </p>
                            </div>
                        </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* COMPACT NAVIGATION */}
          <div className="pt-12 border-t border-border/40 flex justify-between items-center gap-6">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 0 || isSubmitting}
              className="h-14 px-10 rounded-full font-black uppercase tracking-widest text-[10px] hover:bg-foreground/5 transition-all"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
            
            {currentStep < WIZARD_STEPS.length - 1 ? (
              <Button 
                type="button" 
                onClick={handleNext}
                className="h-14 px-14 rounded-2xl font-black text-xs bg-foreground text-background hover:bg-foreground/90 transition-all shadow-lg active:scale-95 group"
              >
                Continue Step
                <ChevronRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            ) : (
              <Button 
                type="submit" 
                disabled={isSubmitting || !identity || !hasProfile || userRole !== "regional"}
                className="h-16 px-20 rounded-2xl font-black text-sm shadow-xl bg-primary text-primary-foreground hover:opacity-90 transition-all active:scale-95 group"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-4">
                     <Loader2 className="h-5 w-5 animate-spin" />
                     <span className="uppercase italic">{submitPhase ?? "Wait..."}</span>
                  </div>
                ) : (
                  <span className="flex items-center gap-3 uppercase italic tracking-widest">
                    Broadcast to Ledger
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-2" />
                  </span>
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
