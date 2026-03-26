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
import { CheckCircle2, ChevronRight, ChevronLeft, Building2, MapPin, FileText, Landmark, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocationPicker } from "./location-picker";
import { submitProposalClient } from "@/lib/api/client-mutations";
import { useAuthStore } from "@/lib/auth-store";

const STEPS = [
  { id: "basic", title: "Basic Info", icon: Building2 },
  { id: "location", title: "Location Context", icon: MapPin },
  { id: "details", title: "Problem & Solution", icon: FileText },
  { id: "financials", title: "Financials", icon: Landmark },
];

export function ProposalWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState(1);
  
  // In a real app, we get identity from a provider or auth store
  // For now, this is a placeholder for the ICP Identity
  const identity = null; 

  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      title: "",
      short_description: "",
      problem_statement: "",
      success_metric: "",
      location: {
        city: "",
        country: "",
        formatted_address: "",
        lat: 0,
        lng: 0,
      },
      funding_goal: 0,
    },
    mode: "onTouched",
  });

  const { register, trigger, handleSubmit, formState: { errors }, watch, setValue, control } = form;

  // Persist form state to local storage
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
    
    switch (currentStep) {
      case 0:
        fieldsToValidate = ["title", "short_description"];
        break;
      case 1:
        fieldsToValidate = ["location.city", "location.country", "location.formatted_address", "location.lat", "location.lng"];
        break;
      case 2:
        fieldsToValidate = ["problem_statement", "success_metric"];
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
    if (!identity) {
      alert("You must be logged in with Internet Identity to submit a proposal.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitProposalClient(identity, {
        ...data,
        funding_goal: BigInt(data.funding_goal),
      });
      
      console.log("Submitted Data:", result);
      localStorage.removeItem("proposal_draft");
      router.push(`/proposals/${result.id}`);
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

          <div className="hidden md:block p-4 bg-muted/50 rounded-lg border border-border/50">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your proposal will be stored on the Internet Computer blockchain. Ensure all details are accurate.
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
                        Provide a clear, concise title and summary for your project.
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
                        Where will this project be executed? Accurate geographic data is critical.
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
                               trigger("location");
                            }}
                            error={errors.location?.message || errors.location?.formatted_address?.message || errors.location?.lat?.message}
                          />
                        )}
                      />
                    </CardContent>
                  </motion.div>
                )}

                {/* STEP 3: Details */}
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
                      <CardTitle>Problem & Success Metrics</CardTitle>
                      <CardDescription>
                        Detail the exact problem this project solves and how success will be measured.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="problem_statement">Problem Statement</Label>
                        <Textarea 
                          id="problem_statement" 
                          placeholder="Detail the exact problem this project solves..." 
                          className={cn("min-h-32", errors.problem_statement ? "border-destructive focus-visible:ring-destructive" : "")}
                          {...register("problem_statement")} 
                        />
                        {errors.problem_statement && <p className="text-xs text-destructive">{errors.problem_statement.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="success_metric">Measurable Success Metrics</Label>
                        <Textarea 
                          id="success_metric" 
                          placeholder="e.g., Provide clean water access to 5,000 residents..." 
                          className={cn("min-h-24", errors.success_metric ? "border-destructive focus-visible:ring-destructive" : "")}
                          {...register("success_metric")} 
                        />
                        {errors.success_metric && <p className="text-xs text-destructive">{errors.success_metric.message}</p>}
                      </div>
                    </CardContent>
                  </motion.div>
                )}

                {/* STEP 4: Financials */}
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
                      <CardTitle>Financials & Submission</CardTitle>
                      <CardDescription>
                        Define the required capital. Funds are held in escrow and released per milestone.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                      
                      <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-lg text-sm text-foreground space-y-2">
                        <h4 className="font-semibold flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-primary" /> Integrity Agreement
                        </h4>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          By submitting this proposal, you agree to OpenFairTrip's transparent ledger policies. 
                          Any fraudulent reporting will severely impact your cryptographic reputation score ($V_p$).
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
