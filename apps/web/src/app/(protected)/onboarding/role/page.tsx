"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Building2, ArrowRight, Shield, Globe, Zap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="flex-1 flex flex-col items-center justify-center w-full min-h-full animate-in fade-in duration-700">
      <div className="w-full max-w-4xl flex flex-col items-center gap-12">
        <div className="flex flex-col items-center text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-foreground/5 border border-foreground/10 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
             <Zap className="h-3 w-3 text-foreground" />
             Identity Resolution
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight">
              Select your <span className="text-muted-foreground/50">Protocol Role</span>
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full relative">
          {/* CITIZEN ROLE */}
          <div
            onClick={() => handleRoleSelect("regional")}
            className={cn(
              "group relative flex flex-col p-10 rounded-[2rem] transition-all duration-500 cursor-pointer overflow-hidden border",
              currentRole === "regional"
                ? "border-foreground bg-foreground text-background shadow-xl"
                : "border-border/60 bg-muted/5 hover:bg-muted/10"
            )}
          >
            <div className="relative z-10 flex flex-col h-full gap-8">
              <div className="flex justify-between items-start">
                <div className={cn(
                  "h-16 w-16 rounded-2xl flex items-center justify-center transition-all duration-500",
                  currentRole === "regional" ? "bg-background text-foreground" : "bg-foreground/5 text-foreground group-hover:scale-105"
                )}>
                  <Users className="h-8 w-8" />
                </div>
                {currentRole === "regional" && (
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-background/60">
                    <CheckCircle2 className="h-5 w-5" />
                    Selected
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-3xl font-semibold tracking-tight">Citizen</h3>
                <p className={cn(
                  "text-base leading-relaxed transition-colors duration-500",
                  currentRole === "regional" ? "text-background/70" : "text-muted-foreground font-medium"
                )}>
                  Participate in regional governance, propose local initiatives, and shape community outcomes.
                </p>
              </div>

              <div className="mt-auto pt-8 border-t border-current/10 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className={cn("text-[9px] font-bold uppercase tracking-widest opacity-50")}>Proof Method</p>
                  <p className="text-sm font-semibold">ZK-Residency</p>
                </div>
                <div className="space-y-1">
                  <p className={cn("text-[9px] font-bold uppercase tracking-widest opacity-50")}>Rights</p>
                  <p className="text-sm font-semibold">Governance</p>
                </div>
              </div>
            </div>
          </div>

          {/* FUNDER ROLE */}
          <div
            onClick={() => handleRoleSelect("funder")}
            className={cn(
              "group relative flex flex-col p-10 rounded-[2rem] transition-all duration-500 cursor-pointer overflow-hidden border",
              currentRole === "funder"
                ? "border-foreground bg-foreground text-background shadow-xl"
                : "border-border/60 bg-muted/5 hover:bg-muted/10"
            )}
          >
            <div className="relative z-10 flex flex-col h-full gap-8">
              <div className="flex justify-between items-start">
                <div className={cn(
                  "h-16 w-16 rounded-2xl flex items-center justify-center transition-all duration-500",
                  currentRole === "funder" ? "bg-background text-foreground" : "bg-foreground/5 text-foreground group-hover:scale-105"
                )}>
                  <Building2 className="h-8 w-8" />
                </div>
                {currentRole === "funder" && (
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-background/60">
                    <CheckCircle2 className="h-5 w-5" />
                    Selected
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-3xl font-semibold tracking-tight">Funder</h3>
                <p className={cn(
                  "text-base leading-relaxed transition-colors duration-500",
                  currentRole === "funder" ? "text-background/70" : "text-muted-foreground font-medium"
                )}>
                  Deploy capital to verified projects, manage escrows, and drive institutional impact.
                </p>
              </div>

              <div className="mt-auto pt-8 border-t border-current/10 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className={cn("text-[9px] font-bold uppercase tracking-widest opacity-50")}>Proof Method</p>
                  <p className="text-sm font-semibold">KYC/Entity</p>
                </div>
                <div className="space-y-1">
                  <p className={cn("text-[9px] font-bold uppercase tracking-widest opacity-50")}>Rights</p>
                  <p className="text-sm font-semibold">Capital Control</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 max-w-sm w-full mx-auto pt-6">
          <Button
            size="lg"
            className="h-16 w-full text-lg font-semibold rounded-full shadow-lg transition-all active:scale-95 disabled:opacity-20 hover:scale-[1.01]"
            disabled={!currentRole}
            onClick={handleContinue}
          >
            Initialize Account
            <ArrowRight className="ml-2 h-6 w-6" />
          </Button>
          <div className="flex items-center justify-center gap-4 text-muted-foreground/50">
             <div className="flex items-center gap-1.5">
               <Shield className="h-4 w-4" />
               <span className="text-[10px] font-bold uppercase tracking-widest">Secure</span>
             </div>
             <div className="h-1 w-1 rounded-full bg-border" />
             <div className="flex items-center gap-1.5">
               <Globe className="h-4 w-4" />
               <span className="text-[10px] font-bold uppercase tracking-widest">Global Ledger</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
