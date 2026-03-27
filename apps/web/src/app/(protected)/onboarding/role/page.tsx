"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Users, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore, UserRole } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

export default function RoleSelectionPage() {
  const router = useRouter();
  const setRole = useAuthStore((state) => state.setRole);
  const currentRole = useAuthStore((state) => state.user?.role);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const hasProfile = useAuthStore((state) => state.hasProfile);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!isInitializing && hasProfile) {
      router.replace("/dashboard");
    }
  }, [hasProfile, isAuthenticated, isInitializing, router]);

  const handleRoleSelect = (role: UserRole) => {
    setRole(role);
  };

  const handleContinue = () => {
    if (currentRole === "funder") {
      router.push("/onboarding/kyc");
    } else if (currentRole === "regional") {
      router.push("/onboarding/verification");
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          How do you want to participate?
        </h1>
        <p className="text-muted-foreground text-lg">
          Select the role that best describes your intent on OpenFairTrip.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          className={cn(
            "relative cursor-pointer transition-all border-2 hover:border-primary/50",
            currentRole === "funder"
              ? "border-primary bg-primary/[0.02]"
              : "border-neutral-200 dark:border-neutral-800",
          )}
          onClick={() => handleRoleSelect("funder")}
        >
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Funder / NPO</CardTitle>
            <CardDescription className="text-base">
              I want to deploy capital and fund verified local projects with
              high impact.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Tiered KYC Verification
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Milestone-based Escrow
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Dual-Path funding capability
              </li>
            </ul>
          </CardContent>
          {currentRole === "funder" && (
            <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              <div className="h-3 w-3 rounded-full bg-background" />
            </div>
          )}
        </Card>

        <Card
          className={cn(
            "relative cursor-pointer transition-all border-2 hover:border-primary/50",
            currentRole === "regional"
              ? "border-primary bg-primary/[0.02]"
              : "border-neutral-200 dark:border-neutral-800",
          )}
          onClick={() => handleRoleSelect("regional")}
        >
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Regional User</CardTitle>
            <CardDescription className="text-base">
              I want to propose projects, debate, and vote in my local
              community.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Geographic verification
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Expertise-weighted voting
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Submit "Data Pack" proposals
              </li>
            </ul>
          </CardContent>
          {currentRole === "regional" && (
            <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              <div className="h-3 w-3 rounded-full bg-background" />
            </div>
          )}
        </Card>
      </div>

      <div className="flex justify-end pt-8">
        <Button
          size="lg"
          className="h-12 px-8 font-semibold"
          disabled={!currentRole}
          onClick={handleContinue}
        >
          Continue
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
