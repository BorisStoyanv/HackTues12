"use client";

import { usePathname } from "next/navigation";
import { Landmark } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { cn } from "@/lib/utils";

const steps = [
  { id: "role", label: "Role selection", path: "/onboarding/role" },
  { id: "kyc", label: "KYC / Entity verification", path: "/onboarding/kyc" },
  { id: "verification", label: "Regional verification", path: "/onboarding/verification" },
];

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentStepIndex = steps.findIndex((step) => pathname === step.path);
  const progressValue = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Landmark className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">OpenFairTrip</span>
          </Link>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
             <span className="font-medium text-foreground">
               Step {currentStepIndex + 1}
             </span>{" "}
             of {steps.length}: {steps[currentStepIndex]?.label}
          </div>
        </div>
        <Progress value={progressValue} className="h-1 rounded-none bg-transparent" />
      </header>

      <main className="flex-1 overflow-auto bg-neutral-50 dark:bg-neutral-950/50">
        <div className="container mx-auto flex h-full max-w-4xl flex-col items-center justify-center p-4 sm:p-8 lg:p-12">
          {children}
        </div>
      </main>
    </div>
  );
}
