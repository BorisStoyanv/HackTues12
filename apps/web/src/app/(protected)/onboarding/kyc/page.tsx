"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  Building2,
  Lock,
  Zap,
  Activity,
  Shield,
  Fingerprint
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
import { useAuthStore } from "@/lib/auth-store";
import {
  createMyProfileClient,
  updateMyProfileClient,
} from "@/lib/api/client-mutations";
import { getDefaultDisplayName } from "@/lib/profile-utils";
import { waitForProfileSync } from "@/lib/profile-sync";
import {
  clearPendingVeriffSession,
  readPendingVeriffSession,
  writePendingVeriffSession,
} from "@/lib/veriff-browser";
import { getVeriffApiUrl } from "@/lib/veriff-api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

const kycSchema = z.object({
  orgName: z.string().min(2, "Organization name must be at least 2 characters"),
  regNum: z
    .string()
    .min(5, "Registration number must be at least 5 characters"),
  country: z.string().min(2, "Country name must be at least 2 characters"),
});

type KYCFormValues = z.infer<typeof kycSchema>;
type Step = "details" | "verify" | "waiting" | "complete";

export default function KYCPage() {
  const router = useRouter();
  const setKycStatus = useAuthStore((state) => state.setKycStatus);
  const user = useAuthStore((state) => state.user);
  const identity = useAuthStore((state) => state.identity);
  const hasProfile = useAuthStore((state) => state.hasProfile);
  const initialize = useAuthStore((state) => state.initialize);
  const [step, setStep] = useState<Step>("details");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [detailsSnapshot, setDetailsSnapshot] = useState<KYCFormValues | null>(
    null,
  );
  const [representativeFirstName, setRepresentativeFirstName] = useState("");
  const [representativeLastName, setRepresentativeLastName] = useState("");
  const [isLaunchingVeriff, setIsLaunchingVeriff] = useState(false);
  const [veriffError, setVeriffError] = useState<string | null>(null);

  const form = useForm<KYCFormValues>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      orgName: "",
      regNum: "",
      country: "",
    },
  });

  useEffect(() => {
    if (!user || user.role !== "funder") {
      router.push("/onboarding/role");
    }
  }, [user, router]);

  useEffect(() => {
    if (user?.kyc_status === "verified") {
      setStep("complete");
      return;
    }

    if (readPendingVeriffSession()) {
      setStep("waiting");
    }
  }, [user?.kyc_status]);

  const handleDetailsSubmit = async (values: KYCFormValues) => {
    if (!identity || !user) {
      setSubmitError("Sign in again before continuing.");
      return;
    }

    setSubmitError(null);

    try {
      setIsSavingProfile(true);
      const mutationPromise = hasProfile
        ? updateMyProfileClient(identity, values.orgName, null)
        : createMyProfileClient(
            identity,
            values.orgName || getDefaultDisplayName(user.id),
            { InvestorUser: null },
            null,
          );

      const syncPromise = waitForProfileSync(
        identity,
        (profile) => "InvestorUser" in profile.user_type,
      );

      await Promise.race([syncPromise, mutationPromise.then(() => syncPromise)]);
      await initialize();

      setDetailsSnapshot(values);
      setVeriffError(null);
      setStep("verify");
    } catch (error) {
      console.error("Failed to save investor profile:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save your profile.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleStartVeriff = async () => {
    const firstName = representativeFirstName.trim();
    const lastName = representativeLastName.trim();
    const publicAppUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      (typeof window !== "undefined"
        ? window.location.origin.replace(/\/$/, "")
        : "");

    if (!firstName || !lastName) {
      setVeriffError(
        "Enter the legal representative's first and last name before starting Veriff.",
      );
      return;
    }

    if (!user?.id) {
      setVeriffError("You need to be signed in before starting verification.");
      return;
    }

    if (!publicAppUrl) {
      setVeriffError(
        "Unable to determine the public app URL for the Veriff callback.",
      );
      return;
    }

    setIsLaunchingVeriff(true);
    setVeriffError(null);

    try {
      const response = await fetch(getVeriffApiUrl("/api/veriff/sessions"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callback: `${publicAppUrl}/dashboard`,
          firstName,
          lastName,
          vendorData: user.id,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.sessionId || !payload?.url) {
        throw new Error(
          payload?.error || payload?.message || "Failed to start Veriff session.",
        );
      }

      writePendingVeriffSession({
        sessionId: payload.sessionId,
        role: "funder",
        startedAt: new Date().toISOString(),
      });

      setKycStatus("pending");
      window.location.assign(payload.url);
    } catch (error) {
      console.error("Failed to start Veriff session:", error);
      setVeriffError(
        error instanceof Error ? error.message : "Failed to start Veriff session.",
      );
      setIsLaunchingVeriff(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col items-center justify-center min-h-full animate-in fade-in duration-700 relative">
      <div className="w-full">
        {step === "details" && (
          <Card className="border-border/40 bg-background/50 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="space-y-4 pb-8 pt-12 px-12">
              <div className="h-16 w-16 rounded-2xl bg-foreground text-background flex items-center justify-center shadow-lg">
                <Building2 className="h-8 w-8" />
              </div>
              <div className="space-y-3">
                <CardTitle className="text-4xl font-semibold tracking-tight">Entity Declaration</CardTitle>
                <CardDescription className="text-muted-foreground text-lg">
                  Provide institutional details to initialize the funder-grade cryptographic profile.
                </CardDescription>
              </div>
            </CardHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleDetailsSubmit)}>
                <CardContent className="space-y-10 px-12 pb-12">
                  {submitError && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in fade-in zoom-in-95">
                      {submitError}
                    </div>
                  )}
                  
                  <div className="grid gap-8">
                    <FormField
                      control={form.control}
                      name="orgName"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Legal Entity Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Global Impact Fund"
                              className="h-16 rounded-2xl border-border/40 bg-background/50 transition-all focus:border-foreground focus:ring-0 text-lg font-medium"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[11px] font-bold" />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <FormField
                        control={form.control}
                        name="regNum"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Registration ID</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. 12345678-A" 
                                className="h-16 rounded-2xl border-border/40 bg-background/50 transition-all focus:border-foreground focus:ring-0 text-lg font-medium"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage className="text-[11px] font-bold" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Jurisdiction</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. United States" 
                                className="h-16 rounded-2xl border-border/40 bg-background/50 transition-all focus:border-foreground focus:ring-0 text-lg font-medium"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage className="text-[11px] font-bold" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center border-t border-border/40 bg-muted/5 py-8 px-12">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => router.push("/onboarding/role")}
                    disabled={isSavingProfile}
                    className="rounded-full px-6 font-bold uppercase tracking-widest text-[11px] hover:bg-foreground/5"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Abort
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSavingProfile}
                    className="h-16 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all px-10 text-base font-semibold shadow-xl active:scale-95"
                  >
                    {isSavingProfile ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        Initialize Tier 3
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        )}

        {step === "verify" && (
          <Card className="border-border/40 bg-background/50 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="space-y-4 pb-8 pt-12 px-12 text-center">
              <div className="mx-auto h-20 w-20 rounded-full bg-foreground text-background flex items-center justify-center shadow-xl">
                <Lock className="h-10 w-10" />
              </div>
              <div className="space-y-3">
                <CardTitle className="text-4xl font-semibold tracking-tight">
                  Cryptographic Verification
                </CardTitle>
                <CardDescription className="text-muted-foreground text-lg max-w-md mx-auto">
                  Secure your institutional profile through our zero-knowledge verification partner.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-12 px-12 pb-12 pt-4">
              {detailsSnapshot && (
                <div className="rounded-[1.5rem] border border-border/40 bg-muted/10 p-8 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Entity Active</p>
                    <p className="text-xl font-semibold">{detailsSnapshot.orgName}</p>
                  </div>
                  <div className="h-1 w-1 rounded-full bg-border" />
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Region</p>
                    <p className="text-base font-semibold text-foreground/60">{detailsSnapshot.country}</p>
                  </div>
                </div>
              )}

              <div className="space-y-8">
                <div className="flex items-start gap-6">
                  <div className="mt-1 h-12 w-12 shrink-0 rounded-2xl bg-foreground/5 flex items-center justify-center">
                    <ShieldCheck className="h-7 w-7 text-foreground" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-xl text-foreground">Representative Proof</p>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      Identify the legal representative who will authorize institutional transactions on the ledger.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground ml-1" htmlFor="rep-first-name">
                      First Name
                    </label>
                    <Input
                      id="rep-first-name"
                      value={representativeFirstName}
                      onChange={(event) =>
                        setRepresentativeFirstName(event.target.value)
                      }
                      placeholder="e.g. Jane"
                      className="h-16 rounded-2xl border-border/40 bg-background/50 transition-all focus:border-foreground focus:ring-0 text-lg font-medium"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground ml-1" htmlFor="rep-last-name">
                      Last Name
                    </label>
                    <Input
                      id="rep-last-name"
                      value={representativeLastName}
                      onChange={(event) =>
                        setRepresentativeLastName(event.target.value)
                      }
                      placeholder="e.g. Doe"
                      className="h-16 rounded-2xl border-border/40 bg-background/50 transition-all focus:border-foreground focus:ring-0 text-lg font-medium"
                    />
                  </div>
                </div>
              </div>

              {veriffError && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in fade-in zoom-in-95">
                  {veriffError}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t border-border/40 bg-muted/5 py-8 px-12">
              <Button variant="ghost" onClick={() => setStep("details")} className="rounded-full px-6 font-bold uppercase tracking-widest text-[11px]">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Modify Details
              </Button>
              <Button 
                onClick={handleStartVeriff} 
                disabled={isLaunchingVeriff}
                className="h-16 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all px-10 text-base font-semibold shadow-xl"
              >
                Launch Veriff
                <ExternalLink className="ml-3 h-5 w-5" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === "waiting" && (
          <Card className="border-border/40 bg-background/50 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="space-y-6 pt-20 pb-12 px-12 text-center">
              <div className="mx-auto h-24 w-24 rounded-full border-2 border-dashed border-foreground/20 flex items-center justify-center mb-4">
                <Loader2 className="h-12 w-12 animate-spin text-foreground" />
              </div>
              <div className="space-y-4">
                <CardTitle className="text-5xl font-semibold tracking-tight">
                  Processing Proof
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xl max-w-lg mx-auto leading-relaxed">
                  Your institutional verification is currently being verified by the Veriff consensus engine.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pb-16 text-center px-12">
              <p className="text-base text-muted-foreground/60 max-w-sm mx-auto">
                Please maintain your connection. The ledger will automatically update once the cryptographic payload is validated.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-center gap-6 border-t border-border/40 bg-muted/5 py-12 px-12">
              <Button
                variant="outline"
                className="rounded-full border-border/40 bg-background h-16 px-10 font-bold uppercase tracking-widest text-[11px] w-full sm:w-auto"
                onClick={() => {
                  clearPendingVeriffSession();
                  setKycStatus("unverified");
                  setVeriffError(null);
                  setStep("details");
                }}
              >
                Reset Session
              </Button>
              <Button 
                className="h-16 rounded-full bg-foreground text-background hover:bg-foreground/90 w-full sm:w-auto px-10 font-bold uppercase tracking-widest text-[11px] shadow-lg"
                onClick={() => router.push("/dashboard")}
              >
                Consensus Status
                <RefreshCw className="ml-3 h-5 w-5" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === "complete" && (
          <div className="text-center space-y-12 py-16">
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full border border-border/40 bg-background text-foreground animate-in zoom-in-50 duration-700 shadow-2xl">
              <CheckCircle2 className="h-20 w-20" />
            </div>
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-foreground leading-tight">
                Institutional <br /><span className="text-muted-foreground/30 italic">Active</span>
              </h1>
              <p className="text-muted-foreground text-2xl max-w-xl mx-auto leading-relaxed font-medium">
                Your entity is now recognized by the OpenFairTrip protocol. You have been granted Tier 3 capital deployment rights.
              </p>
            </div>
            <div className="pt-8">
              <Button
                className="h-20 px-16 text-2xl font-semibold rounded-[2rem] bg-foreground text-background shadow-2xl transition-all hover:scale-105 active:scale-95"
                onClick={() => router.push("/dashboard")}
              >
                Enter Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* VERIFF REDIRECT OVERLAY - Scoped to Right Panel */}
      {isLaunchingVeriff && (
        <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-500 rounded-xl">
           <div className="relative z-10 flex flex-col items-center gap-12 max-w-md text-center">
              <div className="relative">
                <div className="h-28 w-28 rounded-full border-4 border-foreground/5 flex items-center justify-center">
                  <Lock className="h-12 w-12 text-foreground" />
                </div>
                <div className="absolute inset-0 h-28 w-28 rounded-full border-4 border-foreground border-t-transparent animate-spin" />
              </div>
              
              <div className="space-y-6">
                 <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-foreground text-background text-[11px] font-bold uppercase tracking-[0.2em]">
                    Securing Channel
                 </div>
                 <h2 className="text-3xl font-semibold tracking-tight">Handshaking with <br />Identity Partner</h2>
                 <p className="text-base text-muted-foreground font-medium leading-relaxed px-4">
                   Establishing an end-to-end encrypted session for your biometric proof. This will only take a moment.
                 </p>
              </div>

              <div className="flex items-center gap-8 pt-8 grayscale opacity-40">
                 <Activity className="h-6 w-6" />
                 <Shield className="h-6 w-6" />
                 <Fingerprint className="h-6 w-6" />
                 <Zap className="h-6 w-6" />
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
