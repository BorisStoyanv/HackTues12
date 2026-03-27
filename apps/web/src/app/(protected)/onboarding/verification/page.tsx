"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Briefcase,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Globe,
  Award,
  Fingerprint,
  ExternalLink,
  RefreshCw,
  Lock,
  Zap,
  Activity,
  Shield,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/lib/auth-store";
import {
  createMyProfileClient,
  updateMyProfileClient,
} from "@/lib/api/client-mutations";
import { getDefaultDisplayName, normalizeRegionTag } from "@/lib/profile-utils";
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

import { LocationPicker } from "@/components/proposals/location-picker";

const geoSchema = z.object({
  location: z.object({
    formatted_address: z.string().min(5, "Address must be at least 5 characters"),
    city: z.string(),
    country: z.string(),
    lat: z.number(),
    lng: z.number(),
  }),
});

type GeoFormValues = z.infer<typeof geoSchema>;

const expertiseSchema = z.object({
  area: z.string().min(1, "Please select an area of expertise"),
  linkedin: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
});

type ExpertiseFormValues = z.infer<typeof expertiseSchema>;

type Step = "geo" | "location-confirmed" | "verify" | "waiting" | "expertise" | "complete";

import { useVeriffSessionStatus } from "@/hooks/use-veriff-session-status";

export default function VerificationPage() {
  const router = useRouter();
  const setGeoVerified = useAuthStore((state) => state.setGeoVerified);
  const setKycStatus = useAuthStore((state) => state.setKycStatus);
  const user = useAuthStore((state) => state.user);
  const identity = useAuthStore((state) => state.identity);
  const hasProfile = useAuthStore((state) => state.hasProfile);
  const initialize = useAuthStore((state) => state.initialize);
  
  const { pendingSession } = useVeriffSessionStatus();

  // Redirect if session is already active
  useEffect(() => {
    if (pendingSession && user?.kyc_status === 'pending') {
      router.replace('/dashboard/verification/status');
    }
  }, [pendingSession, router, user?.kyc_status]);
  
  const [step, setStep] = useState<Step>("geo");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<{
    city: string;
    country: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLaunchingVeriff, setIsLaunchingVeriff] = useState(false);
  const [veriffError, setVeriffError] = useState<string | null>(null);

  const geoForm = useForm<GeoFormValues>({
    resolver: zodResolver(geoSchema),
    defaultValues: {
      location: {
        formatted_address: "",
        city: "",
        country: "",
        lat: 0,
        lng: 0,
      },
    },
  });

  const expertiseForm = useForm<ExpertiseFormValues>({
    resolver: zodResolver(expertiseSchema),
    defaultValues: {
      area: "",
      linkedin: "",
    },
  });

  // Guard: if no role or wrong role, redirect back
  useEffect(() => {
    if (!user || user.role !== "regional") {
      router.push("/onboarding/role");
    }
  }, [user, router]);

  // Handle Veriff session recovery or completion
  useEffect(() => {
    if (user?.kyc_status === "verified" && (step === "verify" || step === "waiting")) {
      setStep("expertise");
      return;
    }

    if (readPendingVeriffSession() && step === "geo") {
      setStep("waiting");
    }
  }, [user?.kyc_status, step]);

  const handleGeoSubmit = async (values: GeoFormValues) => {
    setIsVerifying(true);
    geoForm.clearErrors("location");
    try {
      if (!values.location.city || values.location.city === "Unknown City") {
         throw new Error("Unable to verify city from the provided location.");
      }
      const location = { city: values.location.city, country: values.location.country };
      setDetectedLocation(location);
      setGeoVerified(true, location);
      setStep("location-confirmed");
    } catch (err) {
      console.error(err);
      geoForm.setError("location", {
        message:
          err instanceof Error
            ? err.message
            : "Unable to verify this address right now.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleStartVeriff = async () => {
    const fName = firstName.trim();
    const lName = lastName.trim();
    const publicAppUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      (typeof window !== "undefined"
        ? window.location.origin.replace(/\/$/, "")
        : "");

    if (!fName || !lName) {
      setVeriffError("Enter your full legal name before starting verification.");
      return;
    }

    if (!user?.id || !identity) {
      setVeriffError("You need to be signed in before starting verification.");
      return;
    }

    setIsLaunchingVeriff(true);
    setVeriffError(null);

    try {
      // Step 1: Create/Update profile on ledger
      // CRITICAL: We do NOT call initialize() here.
      // This prevents the ProtectedRoute from seeing hasProfile=true and redirecting to /dashboard.
      const homeRegion = detectedLocation ? normalizeRegionTag(detectedLocation.city) : "global";
      const displayName = user.display_name || getDefaultDisplayName(user.id);
      
      if (hasProfile) {
        await updateMyProfileClient(identity, displayName, homeRegion);
      } else {
        await createMyProfileClient(identity, displayName, { User: null }, homeRegion);
      }

      // Step 2: Request Veriff session
      const response = await fetch(getVeriffApiUrl("/api/veriff/sessions"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callback: `${publicAppUrl}/onboarding/verification`,
          firstName: fName,
          lastName: lName,
          vendorData: user.id,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.sessionId || !payload?.url) {
        throw new Error(payload?.error || payload?.message || "Failed to start Veriff session.");
      }

      writePendingVeriffSession({
        sessionId: payload.sessionId,
        role: "regional",
        startedAt: new Date().toISOString(),
      });

      setKycStatus("pending");
      
      // Sophisticated redirect
      window.location.assign(payload.url);
    } catch (error) {
      console.error("Failed to start Veriff session:", error);
      setVeriffError(error instanceof Error ? error.message : "Failed to start Veriff session.");
      setIsLaunchingVeriff(false);
    }
  };

  const handleExpertiseSubmit = async (values: ExpertiseFormValues) => {
    if (!identity || !user || !detectedLocation) {
      setSubmitError("Complete location verification before continuing.");
      return;
    }

    try {
      setIsSavingProfile(true);
      setSubmitError(null);
      // Now that they are fully done, we sync the profile and move to complete
      await initialize();
      setStep("complete");
    } catch (error) {
      console.error("Failed to save expertise profile:", error);
      setSubmitError(error instanceof Error ? error.message : "Failed to save your profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col justify-center min-h-full animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      <div className="w-full">
        {step === "geo" && (
          <div className="space-y-12">
            <div className="space-y-3">
              <h3 className="text-4xl font-semibold tracking-tight text-foreground">Location Anchor</h3>
              <p className="text-muted-foreground text-lg font-medium">Identify your regional governance zone.</p>
            </div>
            <Form {...geoForm}>
              <form onSubmit={geoForm.handleSubmit(handleGeoSubmit)} className="space-y-10">
                <FormField
                  control={geoForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground ml-1">Search Region</FormLabel>
                      <FormControl>
                        <LocationPicker
                          value={field.value}
                          onChange={field.onChange}
                          error={geoForm.formState.errors.location?.formatted_address?.message || geoForm.formState.errors.location?.message}
                        />
                      </FormControl>
                      <FormMessage className="text-[11px] font-medium" />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  disabled={isVerifying || !geoForm.watch("location.city") || geoForm.watch("location.city") === "Unknown City"}
                  className="w-full h-16 rounded-2xl bg-foreground text-background hover:bg-foreground/90 transition-all text-base font-semibold shadow-xl active:scale-95"
                >
                  {isVerifying ? <Loader2 className="h-6 w-6 animate-spin" /> : "Confirm Location"}
                </Button>
              </form>
            </Form>
          </div>
        )}

        {step === "location-confirmed" && (
          <div className="space-y-12">
            <div className="space-y-3">
              <h3 className="text-4xl font-semibold tracking-tight text-foreground">Location Resolved</h3>
              <p className="text-muted-foreground text-lg font-medium">Confirming residency for {detectedLocation?.city}</p>
            </div>
            
            <div className="p-12 border border-border/40 rounded-3xl bg-muted/5 flex flex-col items-center text-center space-y-6">
              <div className="h-20 w-20 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg">
                <MapPin className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <p className="text-4xl font-semibold tracking-tight">{detectedLocation?.city}</p>
                <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-[0.3em]">{detectedLocation?.country}</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-start gap-5">
                <ShieldCheck className="h-8 w-8 text-foreground shrink-0 mt-1" />
                <p className="text-base text-muted-foreground leading-relaxed font-medium">
                  To prevent protocol exploitation, every citizen must complete a one-time cryptographic identity verification.
                </p>
              </div>
              <div className="flex gap-6">
                <Button variant="ghost" onClick={() => setStep("geo")} className="h-16 flex-1 rounded-2xl text-base font-semibold">Back</Button>
                <Button onClick={() => setStep("verify")} className="h-16 flex-[2] rounded-2xl bg-foreground text-background shadow-xl text-base font-semibold">Verify Identity</Button>
              </div>
            </div>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-12">
            <div className="space-y-3">
              <h3 className="text-4xl font-semibold tracking-tight text-foreground">Identity Proof</h3>
              <p className="text-muted-foreground text-lg font-medium">Enter your legal details as they appear on ID.</p>
            </div>

            <div className="space-y-10">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground ml-1">First Name</label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="h-16 rounded-2xl border-border/40 bg-background/50 focus:border-foreground focus:ring-0 text-lg font-medium transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground ml-1">Last Name</label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="h-16 rounded-2xl border-border/40 bg-background/50 focus:border-foreground focus:ring-0 text-lg font-medium transition-all"
                  />
                </div>
              </div>

              {veriffError && (
                <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-2xl text-sm text-destructive font-medium animate-in fade-in">
                  {veriffError}
                </div>
              )}

              <div className="flex gap-6">
                <Button variant="ghost" onClick={() => setStep("location-confirmed")} className="h-16 flex-1 rounded-2xl text-base font-semibold">Back</Button>
                <Button 
                  onClick={handleStartVeriff} 
                  disabled={isLaunchingVeriff || !firstName || !lastName}
                  className="h-16 flex-[2] rounded-2xl bg-foreground text-background shadow-xl active:scale-95 text-base font-semibold transition-all"
                >
                  {isLaunchingVeriff ? <Loader2 className="h-6 w-6 animate-spin" /> : "Launch Veriff"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "waiting" && (
          <div className="text-center space-y-12 py-10">
            <div className="mx-auto h-32 w-32 rounded-full border-2 border-dashed border-foreground/20 flex items-center justify-center">
              <Loader2 className="h-14 w-14 animate-spin text-foreground/40" />
            </div>
            <div className="space-y-4">
              <h3 className="text-4xl font-semibold tracking-tight text-foreground">Consensus Pending</h3>
              <p className="text-muted-foreground text-xl font-medium leading-relaxed max-w-lg mx-auto">
                Your identity proof is being validated by the ledger consensus engine. This usually takes 2-3 minutes.
              </p>
            </div>
            <div className="pt-12 flex flex-col gap-6 max-w-sm mx-auto">
              <Button 
                className="h-16 w-full rounded-2xl bg-foreground text-background shadow-xl font-semibold text-base"
                onClick={() => router.push("/dashboard")}
              >
                Protocol Status
              </Button>
              <Button
                variant="ghost"
                className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
                onClick={() => {
                  clearPendingVeriffSession();
                  setKycStatus("unverified");
                  setStep("geo");
                }}
              >
                Restart Verification
              </Button>
            </div>
          </div>
        )}

        {step === "expertise" && (
          <div className="space-y-12">
            <div className="space-y-3">
              <h3 className="text-4xl font-semibold tracking-tight text-foreground">Reputation Vector</h3>
              <p className="text-muted-foreground text-lg font-medium leading-relaxed">Identity verified. Now define your expertise domain.</p>
            </div>

            <Form {...expertiseForm}>
              <form onSubmit={expertiseForm.handleSubmit(handleExpertiseSubmit)} className="space-y-10">
                <div className="space-y-8">
                  <FormField
                    control={expertiseForm.control}
                    name="area"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground ml-1">Primary Domain</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-16 rounded-2xl border-border/40 bg-background/50 focus:ring-0 focus:border-foreground text-lg transition-all">
                              <SelectValue placeholder="Select expertise area" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-2xl border-border/40 shadow-2xl">
                            <SelectItem value="infra" className="py-4 text-base">Urban Infrastructure</SelectItem>
                            <SelectItem value="edu" className="py-4 text-base">Education & Research</SelectItem>
                            <SelectItem value="env" className="py-4 text-base">Environmental Science</SelectItem>
                            <SelectItem value="tech" className="py-4 text-base">Digital Infrastructure</SelectItem>
                            <SelectItem value="health" className="py-4 text-base">Public Healthcare</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[11px] font-medium" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={expertiseForm.control}
                    name="linkedin"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground ml-1">Professional Proof (URL)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://linkedin.com/in/..."
                            className="h-16 rounded-2xl border-border/40 bg-background/50 focus:ring-0 focus:border-foreground text-lg transition-all"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px] font-medium" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="p-10 rounded-3xl border border-border/40 bg-muted/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-foreground/10 p-2 rounded-xl">
                        <Award className="h-6 w-6 text-foreground" />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-[0.3em]">Multiplier</span>
                    </div>
                    <span className="text-3xl font-black text-foreground">1.65x</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-foreground w-[65%] transition-all duration-1000 ease-out" />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isSavingProfile}
                  className="w-full h-16 rounded-2xl bg-foreground text-background hover:bg-foreground/90 transition-all font-semibold text-base shadow-xl active:scale-95"
                >
                  {isSavingProfile ? <Loader2 className="h-6 w-6 animate-spin" /> : "Seal Citizen Profile"}
                </Button>
              </form>
            </Form>
          </div>
        )}

        {step === "complete" && (
          <div className="text-center space-y-12 py-12">
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full border border-border/40 bg-background text-foreground shadow-2xl animate-in zoom-in-50 duration-1000">
              <CheckCircle2 className="h-20 w-20" />
            </div>
            <div className="space-y-4">
              <h3 className="text-5xl font-semibold tracking-tight text-foreground leading-tight">Identity Resolved</h3>
              <p className="text-muted-foreground text-xl leading-relaxed font-medium max-w-lg mx-auto">
                Your node is now active on the OpenFairTrip protocol. Access your regional governance dashboard to begin.
              </p>
            </div>
            <Button
              className="h-20 w-full px-12 text-xl font-semibold rounded-2xl bg-foreground text-background shadow-2xl transition-all hover:scale-105 active:scale-95"
              onClick={() => router.push("/dashboard")}
            >
              Enter Protocol
            </Button>
            <div className="pt-12 space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground/60">Node Active: {detectedLocation?.city}</p>
              <p className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-[0.2em]">Authorized Status • 1.65 VP</p>
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
