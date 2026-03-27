"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ProposalWizard } from "@/components/proposals/proposal-wizard";
import { useAuthStore } from "@/lib/auth-store";

export default function NewProposalPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const hasProfile = useAuthStore((state) => state.hasProfile);
  const userRole = useAuthStore((state) => state.user?.role);

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!hasProfile || userRole !== "regional") {
      router.replace("/onboarding/role");
    }
  }, [hasProfile, isAuthenticated, isInitializing, router, userRole]);

  if (isInitializing || !isAuthenticated || !hasProfile || userRole !== "regional") {
    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center bg-background px-6 py-12">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking proposal access…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      <div className="border-b bg-neutral-50/30 dark:bg-neutral-950/30 px-6 py-4 md:px-8 shrink-0 transition-colors duration-500">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              New Impact Proposal
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 border-l pl-3 ml-1">
              Governance v1.0
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                Protocol Fee
              </span>
              <span className="text-[11px] font-mono font-bold text-green-500">
                0.00 ICP
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 md:px-8 bg-background">
        <div className="max-w-screen-2xl mx-auto">
          <ProposalWizard />
        </div>
      </div>
    </div>
  );
}
