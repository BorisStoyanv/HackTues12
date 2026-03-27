"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth-store";
import { useInternetIdentity } from "ic-use-internet-identity";
import { AlertCircle, Landmark } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();
  const { login: iiLogin, isLoggingIn, isError, error } = useInternetIdentity();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const hasProfile = useAuthStore((state) => state.hasProfile);
  const loginMock = useAuthStore((state) => state.loginMock);

  // Redirect when login is successful
  useEffect(() => {
    if (isAuthenticated && !isInitializing) {
      router.replace(hasProfile ? "/dashboard" : "/onboarding/role");
    }
  }, [hasProfile, isAuthenticated, isInitializing, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="flex items-center gap-2 mb-6">
            <Landmark className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold tracking-tight">
              OpenFairTrip
            </span>
          </Link>
        </div>

        <Card className="border-neutral-200 dark:border-neutral-800 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
            <CardDescription>
              Continue with Internet Identity
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {isError && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  {error?.message ??
                    "Internet Identity login failed. Check popup blocking and try again."}
                </p>
              </div>
            )}
            <Button
              variant="default"
              className="h-12 text-base font-semibold"
              onClick={() => iiLogin()}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <>
                  <div className="mr-2 h-5 w-5 rounded-full bg-white flex items-center justify-center overflow-hidden">
                    {/* ICP Placeholder logo */}
                    <span className="text-[10px] text-black font-black">∞</span>
                  </div>
                  Continue with Internet Identity
                </>
              )}
            </Button>
            <div className="flex flex-wrap items-center justify-center gap-1 text-sm text-muted-foreground">
              By continuing, you agree to our{" "}
              <Link
                href="/terms"
                className="underline hover:text-primary underline-offset-4"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="underline hover:text-primary underline-offset-4"
              >
                Privacy Policy
              </Link>
              .
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-center justify-center gap-4">
            <div className="pt-2 border-t w-full text-center">
              <button
                onClick={() => {
                  loginMock();
                  router.push("/onboarding/role");
                }}
                className="text-xs text-muted-foreground hover:text-primary transition-colors italic"
              >
                [Dev Mode] Skip authentication and start onboarding
              </button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
