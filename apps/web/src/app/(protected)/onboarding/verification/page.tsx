"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Map,
  Map as MapIcon,
  Briefcase,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Globe,
  Award,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/lib/auth-store";
import {
  createMyProfileClient,
  updateMyProfileClient,
} from "@/lib/api/client-mutations";
import { getDefaultDisplayName, normalizeRegionTag } from "@/lib/profile-utils";
import { waitForProfileSync } from "@/lib/profile-sync";

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
import { cn } from "@/lib/utils";

import { LocationPicker } from "@/components/proposals/location-picker";

const geoSchema = z.object({
  location: z.object({
    formatted_address: z.string().min(5, "Address is required"),
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

type Step = "geo" | "location-confirmed" | "expertise" | "complete";

export default function VerificationPage() {
  const router = useRouter();
  const setGeoVerified = useAuthStore((state) => state.setGeoVerified);
  const user = useAuthStore((state) => state.user);
  const identity = useAuthStore((state) => state.identity);
  const hasProfile = useAuthStore((state) => state.hasProfile);
  const initialize = useAuthStore((state) => state.initialize);
  const [step, setStep] = useState<Step>("geo");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<{
    city: string;
    country: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const handleGeoSubmit = async (values: GeoFormValues) => {
    setIsVerifying(true);
    geoForm.clearErrors("location");
    try {
      const location = { 
        city: values.location.city, 
        country: values.location.country 
      };
      setDetectedLocation(location);
      setGeoVerified(true, location);
      setStep("location-confirmed");
    } catch (err) {
      console.error(err);
      geoForm.setError("location", {
        message: "Unable to verify this address right now.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExpertiseSubmit = async (values: ExpertiseFormValues) => {
    if (!identity || !user || !detectedLocation) {
      setSubmitError("Complete location verification before continuing.");
      return;
    }

    const homeRegion = normalizeRegionTag(detectedLocation.city);
    if (!homeRegion) {
      setSubmitError(
        "We could not derive a valid region from your verified location. Please change the address and try again.",
      );
      return;
    }
    const displayName = user.display_name || getDefaultDisplayName(user.id);

    try {
      setIsSavingProfile(true);
      setSubmitError(null);

      const mutationPromise = hasProfile
        ? updateMyProfileClient(identity, displayName, homeRegion)
        : createMyProfileClient(identity, displayName, { User: null }, homeRegion);

      const syncPromise = waitForProfileSync(
        identity,
        (profile) =>
          profile.home_region.length > 0 &&
          profile.home_region[0] === homeRegion,
      );

      await Promise.race([syncPromise, mutationPromise.then(() => syncPromise)]);

      await initialize();
      setStep("complete");
    } catch (error) {
      console.error("Failed to save community profile:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save your profile.",
      );
      return;
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (!user) return null;

  return (
    <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      {step === "geo" && (
        <Card className="border-border bg-background shadow-none">
          <CardHeader className="space-y-1 pt-8">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Location Verification
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Confirm your residency to access local governance tools and voting.
            </CardDescription>
          </CardHeader>
          <Form {...geoForm}>
            <form onSubmit={geoForm.handleSubmit(handleGeoSubmit)}>
              <CardContent className="space-y-6 pt-4">
                {submitError && (
                  <div className="rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in fade-in zoom-in-95">
                    {submitError}
                  </div>
                )}
                
                <FormField
                  control={geoForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Residential Address</FormLabel>
                      <FormControl>
                        <LocationPicker
                          value={field.value}
                          onChange={field.onChange}
                          error={geoForm.formState.errors.location?.formatted_address?.message}
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <div className="rounded-lg border border-border bg-muted/20 p-5 space-y-3">
                  <div className="flex gap-3 items-center">
                    <ShieldCheck className="h-4 w-4 text-foreground" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">Protocol Note</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Stripe Identity has been replaced by Veriff. For regional users, we use zero-knowledge proofs of residency based on validated session data.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-4 border border-border rounded-lg bg-muted/10">
                  <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Your location data is processed securely and never stored on the public ledger. Only the derived region tag is written to your profile.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t border-border bg-muted/30 py-6">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => router.push("/onboarding/role")}
                  className="rounded-full hover:bg-background"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button 
                  type="submit" 
                  disabled={isVerifying || !geoForm.getValues("location.city")}
                  className="rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all px-8"
                >
                  {isVerifying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Verify
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      )}

      {step === "location-confirmed" && (
        <Card className="border-border bg-background shadow-none overflow-hidden">
          <CardHeader className="space-y-1 pt-8">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Verified
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Geographic eligibility confirmed for the following region.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-4">
            <div className="p-8 border border-border rounded-xl bg-background flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg">
                <MapIcon className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold tracking-tight">
                  {detectedLocation?.city}
                </p>
                <p className="text-muted-foreground font-medium">{detectedLocation?.country}</p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-[10px] font-bold uppercase tracking-widest text-foreground">
                <CheckCircle2 className="h-3 w-3" />
                Regional Voting Active
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-border rounded-lg bg-muted/10 space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Region Tag</p>
                <p className="text-sm font-mono">{normalizeRegionTag(detectedLocation?.city || "")}</p>
              </div>
              <div className="p-4 border border-border rounded-lg bg-muted/10 space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Eligibility</p>
                <p className="text-sm font-semibold text-foreground">Full Governance</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-border bg-muted/30 py-6">
            <Button variant="ghost" onClick={() => setStep("geo")} className="rounded-full hover:bg-background">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Change
            </Button>
            <Button 
              onClick={() => setStep("expertise")}
              className="rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all px-8"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === "expertise" && (
        <Card className="border-border bg-background shadow-none">
          <CardHeader className="space-y-1 pt-8">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Expertise Portfolio
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Link your professional background to increase your weighted Reputation ($V_p$).
            </CardDescription>
          </CardHeader>
          <Form {...expertiseForm}>
            <form onSubmit={expertiseForm.handleSubmit(handleExpertiseSubmit)}>
              <CardContent className="space-y-8 pt-4">
                {submitError && (
                  <div className="rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {submitError}
                  </div>
                )}
                <FormField
                  control={expertiseForm.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Primary Sector</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-md border-border bg-background transition-all focus:border-foreground focus:ring-0">
                            <SelectValue placeholder="Select expertise area" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="infra">Urban Infrastructure</SelectItem>
                          <SelectItem value="edu">Education & Research</SelectItem>
                          <SelectItem value="env">Environmental Science</SelectItem>
                          <SelectItem value="tech">Digital Infrastructure</SelectItem>
                          <SelectItem value="health">Public Healthcare</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={expertiseForm.control}
                  name="linkedin"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Professional Profile (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://linkedin.com/in/..."
                          className="h-11 rounded-md border-border bg-background transition-all focus:border-foreground focus:ring-0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <div className="group border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center text-center space-y-3 cursor-pointer hover:border-foreground/50 hover:bg-muted/10 transition-all">
                  <div className="p-3 rounded-full bg-muted group-hover:bg-foreground group-hover:text-background transition-colors">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Upload Certifications</p>
                    <p className="text-[11px] text-muted-foreground">PDF or images (max 5MB)</p>
                  </div>
                </div>

                <div className="p-6 rounded-xl border border-border bg-muted/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-foreground" />
                      <span className="text-xs font-bold uppercase tracking-wider">Projected Voting Multiplier</span>
                    </div>
                    <span className="text-lg font-bold text-foreground">1.65x</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-foreground w-[65%] transition-all duration-1000" />
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    Reputation weighting is calculated based on verified professional history and regional activity.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t border-border bg-muted/30 py-6">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setStep("geo")}
                  disabled={isSavingProfile}
                  className="rounded-full hover:bg-background"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSavingProfile}
                  className="rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all px-8"
                >
                  {isSavingProfile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Complete
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      )}

      {step === "complete" && (
        <div className="text-center space-y-10 py-12">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-foreground bg-foreground text-background animate-in zoom-in-50 duration-500">
            <Globe className="h-12 w-12" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Welcome, Citizen
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
              Your regional profile is now active on the OpenFairTrip protocol. You are eligible to vote and submit proposals.
            </p>
          </div>
          <div className="pt-6">
            <Button
              className="h-14 px-12 text-lg font-semibold rounded-full bg-foreground text-background hover:bg-foreground/90 shadow-xl transition-all"
              onClick={() => router.push("/dashboard")}
            >
              Open Dashboard
            </Button>
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest max-w-xs mx-auto">
            Decentralized Governance Active: {detectedLocation?.city}
          </p>
        </div>
      )}
    </div>
  );
}
