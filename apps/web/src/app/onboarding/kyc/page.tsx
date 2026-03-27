"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Loader2,
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

const kycSchema = z.object({
  orgName: z.string().min(2, "Organization name must be at least 2 characters"),
  regNum: z
    .string()
    .min(5, "Registration number must be at least 5 characters"),
  country: z.string().min(2, "Country name must be at least 2 characters"),
});

type KYCFormValues = z.infer<typeof kycSchema>;
type Step = "details" | "verify" | "waiting";

function KYCPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setKycStatus = useAuthStore((state) => state.setKycStatus);
  const user = useAuthStore((state) => state.user);
  const identity = useAuthStore((state) => state.identity);
  const hasProfile = useAuthStore((state) => state.hasProfile);
  const initialize = useAuthStore((state) => state.initialize);

  const [step, setStep] = useState<Step>("details");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [detailsSnapshot, setDetailsSnapshot] = useState<KYCFormValues | null>(
    null,
  );
  const [representativeFirstName, setRepresentativeFirstName] = useState("");
  const [representativeLastName, setRepresentativeLastName] = useState("");
  const [isLaunchingVeriff, setIsLaunchingVeriff] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<KYCFormValues>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      orgName: user?.display_name ?? "",
      regNum: "",
      country: "",
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
      : `Veriff returned ${status}. Please review your KYC details and try again.`;
  }, [searchParams]);

  useEffect(() => {
    if (!user || user.role !== "funder") {
      router.push("/onboarding/role");
    }
  }, [router, user]);

  useEffect(() => {
    if (user?.kyc_status === "verified") {
      router.replace("/dashboard");
      return;
    }

    const pendingSession = readPendingVeriffSession();
    if (pendingSession?.role === "funder") {
      setStep("waiting");
    }
  }, [router, user?.kyc_status]);

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
      setSubmitError(null);
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

    if (!firstName || !lastName) {
      setSubmitError(
        "Enter the legal representative's first and last name before starting Veriff.",
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
        role: "funder",
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
      {step === "details" && (
        <Card className="border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Entity Details</CardTitle>
            <CardDescription>
              Save your organization profile before we hand KYC off to Veriff.
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleDetailsSubmit)}>
              <CardContent className="space-y-4">
                {(submitError || veriffErrorMessage) && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {submitError ?? veriffErrorMessage}
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
                        <Input placeholder="e.g. Bulgaria" {...field} />
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

      {step === "verify" && (
        <Card className="border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Launch Veriff</CardTitle>
            <CardDescription>
              We only unlock verified funder access after Veriff approves the
              session and the canister profile reflects that decision.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {submitError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {submitError}
              </div>
            )}

            {detailsSnapshot && (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Profile saved
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {detailsSnapshot.orgName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {detailsSnapshot.regNum} • {detailsSnapshot.country}
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Representative First Name</Label>
                <Input
                  value={representativeFirstName}
                  onChange={(event) =>
                    setRepresentativeFirstName(event.target.value)
                  }
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label>Representative Last Name</Label>
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
              Veriff will open in a new hosted flow. When it finishes, you will
              return to the dashboard while the app waits for the final canister
              verification state.
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button variant="ghost" onClick={() => setStep("details")}>
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
              A Veriff session is already open or waiting on a decision.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">
                    Waiting for the Veriff decision webhook
                  </p>
                  <p>
                    Open the dashboard to check the latest status. Access
                    unlocks only after the canister profile is marked verified.
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

export default function KYCPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-xl space-y-8" />}>
      <KYCPageContent />
    </Suspense>
  );
}
