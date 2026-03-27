"use client";

import { usePathname } from "next/navigation";
import { Landmark, Globe, Shield, Users, Building2, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";

const ALL_STEPS = [
  { id: "role", label: "Identity Type", path: "/onboarding/role" },
  { id: "kyc", label: "Entity Proof", path: "/onboarding/kyc" },
  { id: "verification", label: "Residency Proof", path: "/onboarding/verification" },
];

function SidebarContent({ pathname }: { pathname: string }) {
  if (pathname === "/onboarding/kyc") {
    return (
      <div className="space-y-12">
        <div className="flex items-center gap-3">
          <div className="bg-foreground text-background rounded-lg p-2">
            <Building2 className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight uppercase text-foreground">Institutional Node</span>
        </div>
        <div className="space-y-6">
          <h2 className="text-3xl font-semibold tracking-tight leading-tight text-foreground">
            Establish your institutional profile.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed font-medium">
            Verify your legal entity to initialize your funder-grade cryptographic profile and unlock capital deployment rights.
          </p>
        </div>
      </div>
    );
  }

  if (pathname === "/onboarding/verification") {
    return (
      <div className="space-y-12">
        <div className="flex items-center gap-3">
          <div className="bg-foreground text-background rounded-lg p-2">
            <Globe className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight uppercase text-foreground">Protocol Node</span>
        </div>
        <div className="space-y-6">
          <h2 className="text-3xl font-semibold tracking-tight leading-tight text-foreground">
            Anchor your identity in the ledger.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed font-medium">
            We use zero-knowledge identity verification to ensure protocol integrity without compromising your privacy. One person, one vote.
          </p>
        </div>
      </div>
    );
  }

  // Default to Role
  return (
    <div className="space-y-12">
      <div className="flex items-center gap-3">
        <div className="bg-foreground text-background rounded-lg p-2">
          <Zap className="h-6 w-6" />
        </div>
        <span className="text-xl font-bold tracking-tight uppercase text-foreground">Network Entry</span>
      </div>
      <div className="space-y-6">
        <h2 className="text-3xl font-semibold tracking-tight leading-tight text-foreground">
          Define your protocol role.
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed font-medium">
          Select your operational profile. This establishes your governance rights and operational capabilities within the OpenFairTrip ledger.
        </p>
      </div>
    </div>
  );
}

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  
  // Dynamically calculate steps based on selected role
  const role = user?.role;
  const activeSteps = ALL_STEPS.filter(step => {
    if (step.id === 'role') return true;
    if (role === 'funder' && step.id === 'kyc') return true;
    if (role === 'regional' && step.id === 'verification') return true;
    return false;
  });

  const currentStepIndex = activeSteps.findIndex((step) => pathname === step.path);
  const totalSteps = activeSteps.length || 1;
  const displayIndex = currentStepIndex >= 0 ? currentStepIndex : 0;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative font-sans antialiased text-foreground">
      {/* Dynamic Background */}
      <div className="fixed inset-0 -z-10 bg-background" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />

      {/* LEFT PANEL */}
      <div className="hidden lg:flex w-[35%] xl:w-[30%] flex-col bg-muted/30 border-r border-border/40 p-12 justify-between relative overflow-hidden">
        {/* Decorative Grid */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:40px_40px]" />
        
        <div className="relative z-10">
          <SidebarContent pathname={pathname || ""} />
        </div>

        <div className="relative z-10 space-y-8">
           <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Network Status</p>
                <p className="text-sm font-bold flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  Operational
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Encryption</p>
                <p className="text-sm font-bold">AES-256 GCM</p>
              </div>
           </div>
           <div className="pt-8 border-t border-border/40">
              <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                OpenFairTrip protocol v1.0 • Decentralized Identity Resolution
              </p>
           </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-background">
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="px-8 lg:px-12 flex h-16 items-center justify-between">
            <div className="flex items-center gap-10">
              <Link href="/" className="lg:hidden flex items-center gap-2.5 group transition-opacity hover:opacity-80">
                <div className="bg-foreground text-background rounded-lg p-1.5 shadow-sm">
                  <Landmark className="h-4.5 w-4.5" />
                </div>
              </Link>

              <nav className="hidden sm:flex items-center gap-6">
                {activeSteps.map((step, idx) => (
                  <div key={step.id} className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold transition-all",
                        idx === currentStepIndex 
                          ? "bg-foreground text-background border-foreground shadow-sm" 
                          : idx < currentStepIndex
                            ? "bg-foreground/10 border-foreground/10 text-foreground"
                            : "border-border text-muted-foreground/40"
                      )}>
                        {idx + 1}
                      </span>
                      <span className={cn(
                        "text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors",
                        idx <= currentStepIndex ? "text-foreground" : "text-muted-foreground/40"
                      )}>
                        {step.label}
                      </span>
                    </div>
                    {idx < activeSteps.length - 1 && (
                      <div className="h-px w-6 bg-border/40" />
                    )}
                  </div>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end gap-1">
                <span className="text-[9px] font-semibold uppercase tracking-[0.3em] text-muted-foreground leading-none">
                  Principal Node
                </span>
                <span className="text-[11px] font-mono font-bold text-foreground bg-foreground/5 px-2 py-0.5 rounded border border-foreground/5">
                  {user?.id.substring(0, 10)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Animated Progress Indicator */}
          <div className="w-full h-0.5 bg-border/20 relative overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-foreground transition-all duration-1000 ease-[cubic-bezier(0.19,1,0.22,1)] shadow-[0_0_10px_rgba(0,0,0,0.1)]" 
              style={{ width: `${((displayIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </header>

        <main className="flex-1 flex flex-col relative overflow-y-auto p-8 sm:p-12 lg:p-16">
          {children}
        </main>
      </div>
    </div>
  );
}
