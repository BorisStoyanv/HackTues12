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
import { geocodeAddress } from "@/lib/mapbox";
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

const geoSchema = z.object({
  address: z.string().min(5, "Address must be at least 5 characters"),
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
      address: "",
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
    geoForm.clearErrors("address");
    try {
      const data = await geocodeAddress(values.address);
      const location = { city: data.city, country: data.country };
      setDetectedLocation(location);
      setGeoVerified(true, location);
      setStep("location-confirmed");
    } catch (err) {
      console.error(err);
      geoForm.setError("address", {
        message:
          err instanceof Error
            ? err.message
            : "Unable to verify this address right now.",
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
      router.replace("/dashboard");
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
    <div className="w-full max-w-xl space-y-8">
      {step === "geo" && (
        <Card className="border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              Geographic Verification
            </CardTitle>
            <CardDescription>
              We need to verify your location to ensure you can participate in
              local governance.
            </CardDescription>
          </CardHeader>
          <Form {...geoForm}>
            <form onSubmit={geoForm.handleSubmit(handleGeoSubmit)}>
              <CardContent className="space-y-6">
                {submitError && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {submitError}
                  </div>
                )}
                <FormField
                  control={geoForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Residential Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123 Main St, Berlin, Germany"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      Or use automated verification
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="flex gap-3">
                    <Map className="h-5 w-5 text-primary shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        Automatic ID verification is moving to Veriff
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Stripe Identity has been removed from this step. For now,
                        test regional onboarding with the address flow above
                        while we wire Veriff into the geo-specific
                        post-verification step.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4 flex gap-3">
                  <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Your location data is processed locally and never stored
                    on-chain. Only a zero-knowledge proof of residency is
                    generated.
                  </p>
                </div>
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
                <Button type="submit" disabled={isVerifying}>
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Next
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
        <Card className="border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="h-2 bg-green-500" />
          <CardHeader className="pb-2">
            <div className="h-12 w-12 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center mb-4">
              <MapIcon className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Location Verified
            </CardTitle>
            <CardDescription>
              We've successfully confirmed your geographic eligibility.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center gap-6">
              <div className="h-16 w-16 rounded-lg bg-white dark:bg-neutral-800 shadow-sm flex items-center justify-center border">
                <Globe className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                  Current Region
                </p>
                <p className="text-2xl font-bold">
                  {detectedLocation?.city}, {detectedLocation?.country}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-green-600 dark:text-green-400 font-medium">
                  <CheckCircle2 className="h-3 w-3" />
                  Eligible for Local Voting & Proposals
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/[0.02] p-4">
              <p className="text-sm font-medium mb-1 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Governance Rights
              </p>
              <p className="text-xs text-muted-foreground">
                As a verified resident of{" "}
                <strong>{detectedLocation?.city}</strong>, you have been granted
                voting power in regional infrastructure, education, and
                environmental projects.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6 bg-neutral-50/50 dark:bg-neutral-950/50">
            <Button variant="ghost" onClick={() => setStep("geo")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Change Address
            </Button>
            <Button onClick={() => setStep("expertise")}>
              Continue to Expertise
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === "expertise" && (
        <Card className="border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              Expertise Portfolio
            </CardTitle>
            <CardDescription>
              Linking your professional background increases your Reputation
              Attribute ($V_p$) in relevant categories.
            </CardDescription>
          </CardHeader>
          <Form {...expertiseForm}>
            <form onSubmit={expertiseForm.handleSubmit(handleExpertiseSubmit)}>
              <CardContent className="space-y-6">
                {submitError && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {submitError}
                  </div>
                )}
                <FormField
                  control={expertiseForm.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Area of Expertise</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="infra">
                            Infrastructure & Urban Planning
                          </SelectItem>
                          <SelectItem value="edu">
                            Education & Research
                          </SelectItem>
                          <SelectItem value="env">
                            Environmental Science
                          </SelectItem>
                          <SelectItem value="tech">
                            Technology & Software
                          </SelectItem>
                          <SelectItem value="health">
                            Healthcare & Wellness
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={expertiseForm.control}
                  name="linkedin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn Profile (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://linkedin.com/in/username"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                  <Briefcase className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Upload CV or Professional Certifications
                  </p>
                  <p className="text-xs text-muted-foreground">PDF (max 5MB)</p>
                </div>

                <div className="p-4 rounded-lg border bg-neutral-50 dark:bg-neutral-900 space-y-2">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold">
                      Projected Voting Weight
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-2 bg-neutral-200 dark:border-neutral-800 rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[65%]" />
                    </div>
                    <span className="text-sm font-bold text-primary">
                      1.65x
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    *This is an estimate based on your provided location and
                    expertise.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-6">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setStep("geo")}
                  disabled={isSavingProfile}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" disabled={isSavingProfile}>
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      Complete Onboarding
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
        <Card className="border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="h-2 bg-primary" />
          <CardHeader className="text-center pt-12">
            <div className="mx-auto h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
              <Globe className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">
              Welcome, Citizen
            </CardTitle>
            <CardDescription className="text-lg">
              Your community profile is ready. Redirecting you to the dashboard.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-4 pb-12">
            <Button
              className="w-full h-12 text-lg font-bold"
              onClick={() => router.push("/dashboard")}
            >
              Open Dashboard
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Voting power and regional activity are available from your dashboard.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
