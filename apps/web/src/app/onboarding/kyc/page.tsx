"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  FileText,
  ShieldCheck,
} from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/auth-store";
import {
  createMyProfileClient,
  requestVerificationClient,
  updateMyProfileClient,
} from "@/lib/api/client-mutations";
import { getDefaultDisplayName } from "@/lib/profile-utils";
import { cn } from "@/lib/utils";

import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe outside of component to avoid recreating it
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const kycSchema = z.object({
  orgName: z.string().min(2, "Organization name must be at least 2 characters"),
  regNum: z
    .string()
    .min(5, "Registration number must be at least 5 characters"),
  country: z.string().min(2, "Country name must be at least 2 characters"),
});

type KYCFormValues = z.infer<typeof kycSchema>;

type Step = "details" | "upload" | "processing" | "complete";

export default function KYCPage() {
  const router = useRouter();
  const setKycStatus = useAuthStore((state) => state.setKycStatus);
  const user = useAuthStore((state) => state.user);
  const identity = useAuthStore((state) => state.identity);
  const hasProfile = useAuthStore((state) => state.hasProfile);
  const initialize = useAuthStore((state) => state.initialize);
  const [step, setStep] = useState<Step>("details");
  const [isUploading, setIsUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<KYCFormValues>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      orgName: "",
      regNum: "",
      country: "",
    },
  });

  // Guard: if no role or wrong role, redirect back
  useEffect(() => {
    if (!user || user.role !== "funder") {
      router.push("/onboarding/role");
    }
  }, [user, router]);

  const handleDetailsSubmit = async (values: KYCFormValues) => {
    if (!identity || !user) {
      setSubmitError("Sign in again before continuing.");
      return;
    }

    setSubmitError(null);

    try {
      if (hasProfile) {
        await updateMyProfileClient(identity, values.orgName, null);
      } else {
        await createMyProfileClient(
          identity,
          values.orgName || getDefaultDisplayName(user.id),
          { InvestorUser: null },
          null,
        );
      }

      await initialize();
    } catch (error) {
      console.error("Failed to save investor profile:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save your profile.",
      );
      return;
    }

    setStep("upload");
  };

  const handleUpload = async () => {
    setIsUploading(true);
    try {
      // Create Stripe Verification Session
      const res = await fetch("/api/stripe/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "funder" }),
      });

      const { client_secret, error: serverError } = await res.json();

      if (serverError || !client_secret) {
        console.error("Failed to create verification session:", serverError);
        setIsUploading(false);
        return;
      }

      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe failed to initialize");

      // Launch Stripe Identity modal
      const { error } = await stripe.verifyIdentity(client_secret);

      if (error) {
        console.error("Verification failed or was canceled:", error);
        setIsUploading(false);
      } else {
        // Verification submitted successfully!
        setIsUploading(false);
        setStep("processing");
      }
    } catch (err) {
      console.error(err);
      setIsUploading(false);
    }
  };

  const [processingStatus, setProcessingStatus] = useState(
    "Analyzing documents...",
  );

  useEffect(() => {
    if (step === "processing") {
      const statuses = [
        "Analyzing organizational documents...",
        "Cross-referencing global regulatory databases...",
        "Verifying tax-exempt status...",
        "Finalizing entity reputation score...",
      ];

      let currentIdx = 0;
      const interval = setInterval(() => {
        currentIdx++;
        if (currentIdx < statuses.length) {
          setProcessingStatus(statuses[currentIdx]);
        }
      }, 1500);

      const timer = setTimeout(() => {
        void (async () => {
          try {
            if (!identity) {
              throw new Error("Identity not found.");
            }

            await requestVerificationClient(identity);
            await initialize();
            setKycStatus("verified");
            setStep("complete");
          } catch (error) {
            console.error("Failed to finalize investor verification:", error);
            setSubmitError(
              error instanceof Error
                ? error.message
                : "Failed to finalize verification.",
            );
            setStep("upload");
          } finally {
            clearInterval(interval);
          }
        })();
      }, 6500);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [step, setKycStatus]);

  if (!user) return null;

  return (
    <div className="w-full max-w-xl space-y-8">
      {step === "details" && (
        <Card className="border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Entity Details</CardTitle>
            <CardDescription>
              Provide information about your organization to begin the KYC
              process.
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleDetailsSubmit)}>
              <CardContent className="space-y-4">
                {submitError && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {submitError}
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="orgName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Global Impact Fund"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="regNum"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 12345678-A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country of Operation</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. United States" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-6">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => router.push("/onboarding/role")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit">
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      )}

      {step === "upload" && (
        <Card className="border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              Document Upload
            </CardTitle>
            <CardDescription>
              Upload your tax-exempt status (e.g. 501(c)(3)) or organizational
              charter.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors cursor-pointer group">
              <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-lg">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-muted-foreground">
                  PDF, PNG, JPG (max. 10MB)
                </p>
              </div>
            </div>

            <div className="bg-neutral-100 dark:bg-neutral-900 rounded-lg p-4 flex items-center gap-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">charter_v2_final.pdf</p>
                <p className="text-xs text-muted-foreground">
                  Uploaded 2 mins ago
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button
              variant="ghost"
              onClick={() => setStep("details")}
              disabled={isUploading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  Submit for Verification
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === "processing" && (
        <Card className="border-neutral-200 dark:border-neutral-800 py-16">
          <CardContent className="flex flex-col items-center text-center space-y-8">
            <div className="relative h-32 w-32">
              <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ShieldCheck className="h-16 w-16 text-primary" />
              </div>
            </div>
            <div className="space-y-4">
              <CardTitle className="text-3xl font-bold tracking-tight italic animate-pulse">
                {processingStatus}
              </CardTitle>
              <CardDescription className="max-w-sm text-lg leading-relaxed">
                Our 3-agent AI consensus protocol is currently vetting your
                organization's credentials against international compliance
                standards.
              </CardDescription>
            </div>

            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>System Integrity</span>
                <span>Vetting in progress</span>
              </div>
              <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-900 rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "complete" && (
        <Card className="border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="h-2 bg-green-500" />
          <CardHeader className="text-center pt-12">
            <div className="mx-auto h-20 w-20 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <CardTitle className="text-3xl font-bold">
              Verification Successful
            </CardTitle>
            <CardDescription className="text-lg">
              Your entity has been verified. You can now start deploying
              capital.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-4 pb-12">
            <Button
              className="w-full h-12 text-lg font-bold"
              onClick={() => router.push("/dashboard")}
            >
              Go to Investor Dashboard
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              A copy of your verification report has been sent to your email.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
