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
    const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

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
        "NEXT_PUBLIC_APP_URL is missing. Point it to your HTTPS tunnel before starting Veriff.",
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
    } finally {
      setIsLaunchingVeriff(false);
    }
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
            <CardTitle className="text-2xl font-bold">
              Identity Verification
            </CardTitle>
            <CardDescription>
              Internet Identity still handles sign-in. The Rust Veriff service
              creates sessions and verifies webhook decisions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {detailsSnapshot && (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Entity Snapshot
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Organization</p>
                    <p className="font-medium">{detailsSnapshot.orgName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Registration</p>
                    <p className="font-medium">{detailsSnapshot.regNum}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Country</p>
                    <p className="font-medium">{detailsSnapshot.country}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
              <div className="mb-4 flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-primary/10 p-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold">Launch Veriff KYC</p>
                  <p className="text-sm text-muted-foreground">
                    Veriff will collect the legal representative&apos;s identity
                    documents and return to the public HTTPS URL configured in
                    the web app.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="rep-first-name">
                    Legal Representative First Name
                  </label>
                  <Input
                    id="rep-first-name"
                    value={representativeFirstName}
                    onChange={(event) =>
                      setRepresentativeFirstName(event.target.value)
                    }
                    placeholder="Ivan"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="rep-last-name">
                    Legal Representative Last Name
                  </label>
                  <Input
                    id="rep-last-name"
                    value={representativeLastName}
                    onChange={(event) =>
                      setRepresentativeLastName(event.target.value)
                    }
                    placeholder="Lambev"
                  />
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-neutral-50 px-4 py-3 text-sm text-muted-foreground dark:bg-neutral-900">
                Backend target:{" "}
                <span className="font-mono">
                  {getVeriffApiUrl("/api/veriff/sessions")}
                </span>
              </div>
            </div>

            {veriffError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
                {veriffError}
              </div>
            )}

            <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:bg-blue-950/20 dark:text-blue-300">
              We only unlock the verified funder tier after the Rust backend
              receives and validates an approved Veriff webhook.
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
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold">
                    We&apos;re waiting for Veriff&apos;s decision webhook.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Open the dashboard to check the live result from the Rust
                    backend, or clear this pending session and restart the flow.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button
              variant="ghost"
              onClick={() => {
                clearPendingVeriffSession();
                setKycStatus("unverified");
                setVeriffError(null);
                setStep("details");
              }}
            >
              Start Over
            </Button>
            <Button onClick={() => router.push("/dashboard")}>
              Check Status
              <RefreshCw className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === "complete" && (
        <Card className="border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="h-2 bg-green-500" />
          <CardHeader className="text-center pt-12">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-50 dark:bg-green-950/30">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <CardTitle className="text-3xl font-bold">
              Verification Successful
            </CardTitle>
            <CardDescription className="text-lg">
              Your funder profile has been verified. You can now continue into
              the platform with verified access.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-4 pb-12">
            <Button
              className="h-12 w-full text-lg font-bold"
              onClick={() => router.push("/dashboard")}
            >
              Go to Dashboard
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Internet Identity remains your login method. The Rust backend only
              upgrades the account after Veriff approval.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
