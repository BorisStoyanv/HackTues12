"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProposalFormValues, proposalSchema } from "@/lib/validations/proposal";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ChevronRight, ChevronLeft, Building2, MapPin, FileText, Landmark, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocationPicker } from "./location-picker";

const STEPS = [
  { id: "basic", title: "Basic Info", icon: Building2 },
  { id: "location", title: "Location Context", icon: MapPin },
  { id: "data-pack", title: "Deep Data Pack", icon: FileText },
  { id: "financials", title: "Financials & Timeline", icon: Landmark },
];

export function ProposalWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward

  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      title: "",
      short_description: "",
      category: "",
      location: {
        city: "",
        country: "",
        address: "",
        lat: 0,
        lng: 0,
      },
      data_pack: {
        problem_statement: "",
        proposed_solution: "",
        success_metrics: "",
      },
      funding_goal: 0,
      estimated_duration_months: 1,
    },
    mode: "onTouched",
  });

  const { register, trigger, handleSubmit, formState: { errors }, watch, setValue, control } = form;

  // Persist form state to local storage to prevent data loss
  useEffect(() => {
    const savedData = localStorage.getItem("proposal_draft");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        Object.entries(parsed).forEach(([key, value]) => {
          setValue(key as any, value);
        });
      } catch (e) {
        console.error("Failed to parse saved proposal draft");
      }
    }
  }, [setValue]);

  useEffect(() => {
    const subscription = watch((value) => {
      localStorage.setItem("proposal_draft", JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const handleNext = async () => {
    let fieldsToValidate: any[] = [];
    
    // Determine which fields to validate based on current step
    switch (currentStep) {
      case 0:
        fieldsToValidate = ["title", "short_description", "category"];
        break;
      case 1:
        fieldsToValidate = ["location.city", "location.country", "location.address", "location.lat", "location.lng"];
        break;
      case 2:
        fieldsToValidate = ["data_pack.problem_statement", "data_pack.proposed_solution", "data_pack.success_metrics"];
        break;
      default:
        break;
    }

    const isStepValid = await trigger(fieldsToValidate as any);
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
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log("Submitted Data:", data);
      
      localStorage.removeItem("proposal_draft"); // Clear draft on success
      
      // In a real app, you'd get the ID back from the API
      const fakeId = "prop-" + Math.random().toString(36).substring(2, 9);
      router.push(`/proposals/${fakeId}`);
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  const variants = {
    enter: (direction: number) => {
      return {
        x: direction > 0 ? 50 : -50,
        opacity: 0
      };
    },
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => {
      return {
        zIndex: 0,
        x: direction < 0 ? 50 : -50,
        opacity: 0
      };
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl mx-auto">
      {/* Sidebar Progress */}
      <div className="w-full md:w-64 shrink-0">
        <div className="sticky top-24 space-y-8">
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
              Creation Process
            </h3>
            <div className="space-y-4">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isPast = index < currentStep;

                return (
                  <div key={step.id} className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                        isActive
                          ? "border-primary text-primary"
                          : isPast
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted text-muted-foreground"
                      )}
                    >
                      {isPast ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium transition-colors",
                        isActive ? "text-foreground" : isPast ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="hidden md:block p-4 bg-muted/50 rounded-lg border border-border/50">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your proposal will be evaluated by our AI Integrity agents (Advocate, Skeptic, Analyst) before it opens for funding. Be as thorough as possible.
            </p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1">
        <Card className="border-border shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit(onSubmit)}>
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
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex-1"
                  >
                    <CardHeader>
                      <CardTitle>Basic Information</CardTitle>
                      <CardDescription>
                        Provide a clear, concise title and summary to help voters understand your project immediately.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Proposal Title</Label>
                        <Input 
                          id="title" 
                          placeholder="e.g., Clean Water Initiative: Nairobi" 
                          {...register("title")} 
                          className={errors.title ? "border-destructive focus-visible:ring-destructive" : ""}
                        />
                        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select onValueChange={(val) => {
                          setValue("category", val as string);
                          trigger("category");
                        }} defaultValue={watch("category")} value={watch("category")}>
                          <SelectTrigger className={errors.category ? "border-destructive focus-visible:ring-destructive" : ""}>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="infrastructure">Infrastructure</SelectItem>
                            <SelectItem value="education">Education</SelectItem>
                            <SelectItem value="healthcare">Healthcare</SelectItem>
                            <SelectItem value="environment">Environment</SelectItem>
                            <SelectItem value="technology">Technology Access</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="short_description">Short Description</Label>
                        <Textarea 
                          id="short_description" 
                          placeholder="Briefly describe what you aim to achieve... (max 200 characters)" 
                          className={cn("resize-none h-24", errors.short_description ? "border-destructive focus-visible:ring-destructive" : "")}
                          {...register("short_description")} 
                        />
                        {errors.short_description && <p className="text-xs text-destructive">{errors.short_description.message}</p>}
                      </div>
                    </CardContent>
                  </motion.div>
                )}

                {/* STEP 2: Location Context */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex-1"
                  >
                    <CardHeader>
                      <CardTitle>Location Context</CardTitle>
                      <CardDescription>
                        Where will this project be executed? Accurate geographic data helps route your proposal to relevant regional voters and funders.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Controller
                        name="location"
                        control={control}
                        render={({ field }) => (
                          <LocationPicker 
                            value={field.value} 
                            onChange={(val) => {
                               field.onChange(val);
                               trigger("location"); // Re-validate on change
                            }}
                            error={errors.location?.message || errors.location?.address?.message || errors.location?.lat?.message}
                          />
                        )}
                      />
                      
                      {/* Detailed hidden errors display if needed, though they are bubbled up */}
                      {errors.location?.address && <p className="text-xs text-destructive mt-1">{errors.location.address.message}</p>}
                      {errors.location?.lat && <p className="text-xs text-destructive">{errors.location.lat.message}</p>}
                    </CardContent>
                  </motion.div>
                )}

                {/* STEP 3: Deep Data Pack */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex-1"
                  >
                    <CardHeader>
                      <CardTitle>Deep Data Pack</CardTitle>
                      <CardDescription>
                        This data will be parsed directly by our AI Integrity agents during the debate phase. Use structured, factual language.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="data_pack.problem_statement">Problem Statement</Label>
                        <Textarea 
                          id="data_pack.problem_statement" 
                          placeholder="Detail the exact problem this project solves. Provide statistics or ground-truth context if available..." 
                          className={cn("min-h-32", errors.data_pack?.problem_statement ? "border-destructive focus-visible:ring-destructive" : "")}
                          {...register("data_pack.problem_statement")} 
                        />
                        {errors.data_pack?.problem_statement && <p className="text-xs text-destructive">{errors.data_pack.problem_statement.message}</p>}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="data_pack.proposed_solution">Proposed Solution & Execution</Label>
                        <Textarea 
                          id="data_pack.proposed_solution" 
                          placeholder="How will you solve the problem? What are the immediate execution steps?" 
                          className={cn("min-h-32", errors.data_pack?.proposed_solution ? "border-destructive focus-visible:ring-destructive" : "")}
                          {...register("data_pack.proposed_solution")} 
                        />
                        {errors.data_pack?.proposed_solution && <p className="text-xs text-destructive">{errors.data_pack.proposed_solution.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="data_pack.success_metrics">Measurable Success Metrics</Label>
                        <Textarea 
                          id="data_pack.success_metrics" 
                          placeholder="e.g., Provide clean water access to 5,000 residents measured by smart meters installed..." 
                          className={cn("min-h-24", errors.data_pack?.success_metrics ? "border-destructive focus-visible:ring-destructive" : "")}
                          {...register("data_pack.success_metrics")} 
                        />
                        {errors.data_pack?.success_metrics && <p className="text-xs text-destructive">{errors.data_pack.success_metrics.message}</p>}
                      </div>
                    </CardContent>
                  </motion.div>
                )}

                {/* STEP 4: Financials & Timeline */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex-1"
                  >
                    <CardHeader>
                      <CardTitle>Financials & Timeline</CardTitle>
                      <CardDescription>
                        Define the required capital and the expected duration for project completion. Funds are held in escrow and released per milestone.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="funding_goal">Funding Goal (USD)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                            <Input 
                              id="funding_goal" 
                              type="number"
                              placeholder="0.00" 
                              className={cn("pl-7", errors.funding_goal ? "border-destructive focus-visible:ring-destructive" : "")}
                              {...register("funding_goal", { valueAsNumber: true })} 
                            />
                          </div>
                          {errors.funding_goal && <p className="text-xs text-destructive">{errors.funding_goal.message}</p>}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="estimated_duration_months">Estimated Duration (Months)</Label>
                          <Input 
                            id="estimated_duration_months" 
                            type="number"
                            placeholder="e.g., 6" 
                            {...register("estimated_duration_months", { valueAsNumber: true })} 
                            className={errors.estimated_duration_months ? "border-destructive focus-visible:ring-destructive" : ""}
                          />
                          {errors.estimated_duration_months && <p className="text-xs text-destructive">{errors.estimated_duration_months.message}</p>}
                        </div>
                      </div>
                      
                      {errors.root && (
                         <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm mt-2">
                            {errors.root.message}
                         </div>
                      )}

                      <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-lg text-sm text-foreground space-y-2">
                        <h4 className="font-semibold flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-primary" /> Integrity Agreement
                        </h4>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          By submitting this proposal, you agree to OpenFairTrip's transparent ledger policies. 
                          If approved, funds will be programmatically released based on the success metrics provided above. 
                          Any fraudulent reporting detected by regional verifiers will severely impact your cryptographic reputation score ($V_p$).
                        </p>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <CardFooter className="flex justify-between border-t pt-6 pb-6 mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0 || isSubmitting}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              
              {currentStep < STEPS.length - 1 ? (
                <Button type="button" onClick={handleNext}>
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting securely..." : "Submit Proposal"}
                  {!isSubmitting && <CheckCircle2 className="w-4 h-4 ml-2" />}
                </Button>
              )}
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
