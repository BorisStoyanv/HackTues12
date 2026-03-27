"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  Globe,
  Loader2,
  Map as MapIcon,
  MapPin,
  RefreshCw,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/lib/auth-store";
import {
  createMyProfileClient,
  updateMyProfileClient,
} from "@/lib/api/client-mutations";
import { geocodeAddress } from "@/lib/mapbox";
import { getDefaultDisplayName, normalizeRegionTag } from "@/lib/profile-utils";
import { waitForProfileSync } from "@/lib/profile-sync";
import {
  clearPendingVeriffSession,
  readPendingVeriffSession,
  writePendingVeriffSession,
} from "@/lib/veriff-browser";
import {
  createVeriffSession,
  getVeriffCallbackUrl,
} from "@/lib/veriff-api";
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

const geoSchema = z.object({
  address: z.string().min(5, "Address must be at least 5 characters"),
});

const expertiseSchema = z.object({
  area: z.string().min(1, "Please select an area of expertise"),
  linkedin: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
});

type GeoFormValues = z.infer<typeof geoSchema>;
type ExpertiseFormValues = z.infer<typeof expertiseSchema>;
type Step =
  | "geo"
  | "location-confirmed"
  | "expertise"
  | "verify"
  | "waiting";

function VerificationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setGeoVerified = useAuthStore((state) => state.setGeoVerified);
  const setKycStatus = useAuthStore((state) => state.setKycStatus);
  const user = useAuthStore((state) => state.user);
  const identity = useAuthStore((state) => state.identity);
  const hasProfile = useAuthStore((state) => state.hasProfile);
  const initialize = useAuthStore((state) => state.initialize);

  const [step, setStep] = useState<Step>("geo");
  const [isVerifyingAddress, setIsVerifyingAddress] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<{
    city: string;
    country: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [representativeFirstName, setRepresentativeFirstName] = useState("");
  const [representativeLastName, setRepresentativeLastName] = useState("");
  const [isLaunchingVeriff, setIsLaunchingVeriff] = useState(false);

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

  const veriffErrorMessage = useMemo(() => {
    const status = searchParams.get("veriff_status");
    const reason = searchParams.get("veriff_reason");

    if (!status) {
      return null;
    }

    return reason
      ? `Veriff returned ${status}. ${reason}`
      : `Veriff returned ${status}. Please review your regional KYC details and try again.`;
  }, [searchParams]);

  useEffect(() => {
    if (!user || user.role !== "regional") {
      router.push("/onboarding/role");
    }
  }, [router, user]);

  useEffect(() => {
    if (user?.kyc_status === "verified") {
      router.replace("/dashboard");
      return;
    }

    const pendingSession = readPendingVeriffSession();
    if (pendingSession?.role === "regional") {
      setStep("waiting");
      return;
    }

    if (hasProfile && (user?.geo_verified || user?.home_region)) {
      setDetectedLocation(
        user.detected_location ?? {
          city: user.home_region ?? "Saved region",
          country: "Saved region",
        },
      );
      setStep("verify");
    }
  }, [
    hasProfile,
    router,
    user?.detected_location,
    user?.geo_verified,
    user?.home_region,
    user?.kyc_status,
  ]);

  const handleGeoSubmit = async (values: GeoFormValues) => {
    setIsVerifyingAddress(true);
    setSubmitError(null);
    geoForm.clearErrors("address");

    try {
      const data = await geocodeAddress(values.address);
      const location = { city: data.city, country: data.country };
      setDetectedLocation(location);
      setGeoVerified(true, location);
      setStep("location-confirmed");
    } catch (error) {
      console.error("Failed to geocode address:", error);
      geoForm.setError("address", {
        message:
          error instanceof Error
            ? error.message
            : "Unable to verify this address right now.",
      });
    } finally {
      setIsVerifyingAddress(false);
    }
  };

  const handleExpertiseSubmit = async (_values: ExpertiseFormValues) => {
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
        : createMyProfileClient(
            identity,
            displayName,
            { User: null },
            homeRegion,
          );

      const syncPromise = waitForProfileSync(
        identity,
        (profile) =>
          profile.home_region.length > 0 &&
          profile.home_region[0] === homeRegion,
      );

      await Promise.race([syncPromise, mutationPromise.then(() => syncPromise)]);
      await initialize();

      if (useAuthStore.getState().user?.kyc_status === "verified") {
        router.replace("/dashboard");
        return;
      }

      setStep("verify");
    } catch (error) {
      console.error("Failed to save regional profile:", error);
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

    if (!firstName || !lastName) {
      setSubmitError(
        "Enter your first and last name before starting Veriff.",
      );
      return;
    }

    if (!user?.id) {
      setSubmitError("You need to be signed in before starting verification.");
      return;
    }

    if (!getVeriffCallbackUrl()) {
      setSubmitError(
        "NEXT_PUBLIC_VERIFF_CALLBACK_URL is missing. Point it to the canister callback route before starting Veriff.",
      );
      return;
    }

    setIsLaunchingVeriff(true);
    setSubmitError(null);

    try {
      const payload = await createVeriffSession({
        firstName,
        lastName,
        vendorData: user.id,
      });

      writePendingVeriffSession({
        sessionId: payload.sessionId,
        role: "regional",
        startedAt: new Date().toISOString(),
      });

      setKycStatus("pending");
      window.location.assign(payload.url);
    } catch (error) {
      console.error("Failed to start Veriff session:", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to start Veriff session.",
      );
    } finally {
      setIsLaunchingVeriff(false);
    }
  };

  const handleRestart = () => {
    clearPendingVeriffSession();
    setKycStatus("unverified");
    setStep("verify");
  };

  if (!user) {
    return null;
  }

  return (
    <div className="w-full max-w-xl space-y-8">
      {step === "geo" && (
        <Card className="border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              Geographic Verification
            </CardTitle>
            <CardDescription>
              First we save your regional anchor. Veriff comes immediately after
              this step.
            </CardDescription>
          </CardHeader>
          <Form {...geoForm}>
            <form onSubmit={geoForm.handleSubmit(handleGeoSubmit)}>
              <CardContent className="space-y-6">
                {(submitError || veriffErrorMessage) && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {submitError ?? veriffErrorMessage}
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
                          placeholder="123 Main St, Sofia, Bulgaria"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
                  <div className="flex gap-3">
                    <ShieldCheck className="h-5 w-5 shrink-0 text-blue-500" />
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Your verified region is still required. Identity KYC runs
                      after this step through Veriff.
                    </p>
                  </div>
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
                <Button type="submit" disabled={isVerifyingAddress}>
                  {isVerifyingAddress ? (
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
        <Card className="overflow-hidden border-neutral-200 dark:border-neutral-800">
          <div className="h-2 bg-green-500" />
          <CardHeader className="pb-2">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 dark:bg-green-950/30">
              <MapIcon className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Location Verified
            </CardTitle>
            <CardDescription>
              We successfully confirmed your geographic eligibility.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6 rounded-xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border bg-white shadow-sm dark:bg-neutral-800">
                <Globe className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Current Region
                </p>
                <p className="text-2xl font-bold">
                  {detectedLocation?.city}, {detectedLocation?.country}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs font-medium text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Eligible for Local Voting & Proposals
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t bg-neutral-50/50 pt-6 dark:bg-neutral-950/50">
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
              This step still saves your regional profile before the required
              Veriff handoff.
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

                <div className="flex cursor-pointer flex-col items-center justify-center space-y-2 rounded-lg border-2 border-dashed border-neutral-200 p-6 text-center transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900/50">
                  <Briefcase className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Upload CV or Professional Certifications
                  </p>
                  <p className="text-xs text-muted-foreground">PDF (max 5MB)</p>
                </div>

                <div className="space-y-2 rounded-lg border bg-neutral-50 p-4 dark:bg-neutral-900">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold">
                      Projected Voting Weight
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                      <div className="h-full w-[65%] bg-primary" />
                    </div>
                    <span className="text-sm font-bold text-primary">1.65x</span>
                  </div>
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
                      Saving...
                    </>
                  ) : (
                    <>
                      Continue to KYC
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      )}

      {step === "verify" && (
        <Card className="border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Launch Veriff</CardTitle>
            <CardDescription>
              Your region is saved. We now require identity KYC before
              dashboard access unlocks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {submitError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {submitError}
              </div>
            )}

            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Current regional anchor
              </p>
              <p className="mt-2 text-sm font-semibold">
                {detectedLocation?.city ?? user.home_region ?? "Saved region"}
              </p>
              <p className="text-xs text-muted-foreground">
                {detectedLocation?.country ?? "Saved region"}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={representativeFirstName}
                  onChange={(event) =>
                    setRepresentativeFirstName(event.target.value)
                  }
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={representativeLastName}
                  onChange={(event) =>
                    setRepresentativeLastName(event.target.value)
                  }
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 text-sm text-muted-foreground">
              Veriff will redirect back to the dashboard callback route, where
              the app waits for the final canister `is_verified` state.
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button variant="ghost" onClick={() => setStep("expertise")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleStartVeriff} disabled={isLaunchingVeriff}>
              {isLaunchingVeriff ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting Veriff...
                </>
              ) : (
                <>
                  Start Veriff
                  <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === "waiting" && (
        <Card className="border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              Verification in Progress
            </CardTitle>
            <CardDescription>
              Your Veriff session is open or waiting on a final decision.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-primary" />
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">
                    Regional profile saved, KYC still pending
                  </p>
                  <p>
                    Open the dashboard to check the latest decision and final
                    canister sync status.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap justify-between gap-3 border-t pt-6">
            <Button variant="ghost" onClick={handleRestart}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Restart KYC
            </Button>
            <Button onClick={() => router.push("/dashboard")}>
              Open Dashboard Status
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

export default function VerificationPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-xl space-y-8" />}>
      <VerificationPageContent />
    </Suspense>
  );
}
