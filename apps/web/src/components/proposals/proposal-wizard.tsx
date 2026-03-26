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
import { submitProposalClient } from "@/lib/api/client-mutations";
import { useAuthStore } from "@/lib/auth-store";
import { ProposalCategory } from "@/lib/types/api";

const STEPS = [
  { id: "basic", title: "Basic Info", icon: Building2 },
  { id: "location", title: "Location Context", icon: MapPin },
  { id: "details", title: "Problem & Solution", icon: FileText },
  { id: "execution", title: "Execution Plan", icon: CheckCircle2 },
  { id: "financials", title: "Financials", icon: Landmark },
];

export function ProposalWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState(1);
  
  const identity = useAuthStore((state) => state.identity);

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
      location: {
        city: "",
        country: "",
        formatted_address: "",
        lat: 0,
        lng: 0,
      },
    },
    mode: "onTouched",
  });

  const { register, trigger, handleSubmit, formState: { errors }, watch, setValue, control } = form;

  // Persist form state to local storage
  useEffect(() => {
    const savedData = localStorage.getItem("proposal_draft");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData) as Partial<ProposalFormValues>;
        Object.entries(parsed).forEach(([key, value]) => {
          if (value !== undefined) {
             setValue(key as keyof ProposalFormValues, value as any);
          }
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
    let fieldsToValidate: (keyof ProposalFormValues)[] = [];
    
    switch (currentStep) {
      case 0:
        fieldsToValidate = ["title", "category", "description"];
        break;
      case 1:
        fieldsToValidate = ["location", "region_tag"];
        break;
      case 2:
        fieldsToValidate = ["expected_impact"];
        break;
      case 3:
        fieldsToValidate = ["executor_name", "execution_plan", "timeline"];
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
    if (!identity) {
      alert("You must be logged in with Internet Identity to submit a proposal.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitProposalClient(identity, {
        title: data.title,
        description: data.description,
        region_tag: data.region_tag,
        category: { [data.category]: null } as any as ProposalCategory,
        budget_amount: data.budget_amount,
        budget_currency: data.budget_currency,
        budget_breakdown: data.budget_breakdown,
        executor_name: data.executor_name,
        execution_plan: data.execution_plan,
        timeline: data.timeline,
        expected_impact: data.expected_impact,
      });
      
      console.log("Submitted Data:", result);
      localStorage.removeItem("proposal_draft");
      router.push(`/dashboard/proposals/${result.id}`);
    } catch (error) {
      console.error(error);
      alert("Failed to submit proposal. Please check the console for details.");
      setIsSubmitting(false);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0
    })
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
                    className="flex-1 p-8"
                  >
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="title">Proposal Title</Label>
                        <Input 
                          id="title" 
                          placeholder="e.g., Clean Water Initiative: Nairobi" 
                          {...register("title")} 
                          className={errors.title ? "border-destructive" : ""}
                        />
                        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Controller
                          name="category"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                                <SelectItem value="Marketing">Marketing</SelectItem>
                                <SelectItem value="Events">Events</SelectItem>
                                <SelectItem value="Conservation">Conservation</SelectItem>
                                <SelectItem value="Education">Education</SelectItem>
                                <SelectItem value="Technology">Technology</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Executive Summary</Label>
                        <Textarea 
                          id="description" 
                          placeholder="Provide a high-level summary of your project..." 
                          className={cn("min-h-32", errors.description ? "border-destructive" : "")}
                          {...register("description")} 
                        />
                        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
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
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex-1 p-8"
                  >
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label>Map Location</Label>
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
                                 setValue("region_tag", val.city || val.country || "Global");
                                 trigger("location");
                              }}
                              error={errors.location?.message}
                            />
                          )}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="region_tag">Region Tag</Label>
                        <Input 
                          id="region_tag" 
                          placeholder="e.g. Sofia, Bulgaria" 
                          {...register("region_tag")} 
                        />
                        {errors.region_tag && <p className="text-xs text-destructive">{errors.region_tag.message}</p>}
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
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex-1 p-8"
                  >
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="expected_impact">Expected Impact</Label>
                        <Textarea 
                          id="expected_impact" 
                          placeholder="Detail the measurable positive outcomes..." 
                          className={cn("min-h-48", errors.expected_impact ? "border-destructive" : "")}
                          {...register("expected_impact")} 
                        />
                        {errors.expected_impact && <p className="text-xs text-destructive">{errors.expected_impact.message}</p>}
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
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex-1 p-8"
                  >
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="executor_name">Executor Entity Name</Label>
                        <Input id="executor_name" placeholder="Name of organization or lead..." {...register("executor_name")} />
                        {errors.executor_name && <p className="text-xs text-destructive">{errors.executor_name.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="execution_plan">Execution Plan</Label>
                        <Textarea id="execution_plan" placeholder="Step-by-step implementation guide..." className="min-h-32" {...register("execution_plan")} />
                        {errors.execution_plan && <p className="text-xs text-destructive">{errors.execution_plan.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timeline">Timeline</Label>
                        <Input id="timeline" placeholder="e.g. 6 months, 1 year..." {...register("timeline")} />
                        {errors.timeline && <p className="text-xs text-destructive">{errors.timeline.message}</p>}
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
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex-1 p-8"
                  >
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="budget_amount">Funding Goal (USD)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                          <Input 
                            id="budget_amount" 
                            type="number"
                            placeholder="0.00" 
                            className="pl-7"
                            {...register("budget_amount", { valueAsNumber: true })} 
                          />
                        </div>
                        {errors.budget_amount && <p className="text-xs text-destructive">{errors.budget_amount.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="budget_breakdown">Budget Breakdown</Label>
                        <Textarea id="budget_breakdown" placeholder="Explain where the funds go..." className="min-h-32" {...register("budget_breakdown")} />
                        {errors.budget_breakdown && <p className="text-xs text-destructive">{errors.budget_breakdown.message}</p>}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <CardFooter className="flex justify-between border-t p-6 mt-auto">
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
