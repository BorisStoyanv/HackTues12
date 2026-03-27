"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isInitializing, hasProfile } = useAuthStore();

  useEffect(() => {
    if (!isInitializing) {
      if (!isAuthenticated) {
        router.replace("/login");
        return;
      }

      // If authenticated but no profile, and not on onboarding, redirect there
      if (isAuthenticated && !hasProfile && !pathname.startsWith("/onboarding")) {
        router.replace("/onboarding/role");
        return;
      }

      // If already has profile but somehow landed on onboarding, go to dashboard
      if (isAuthenticated && hasProfile && pathname.startsWith("/onboarding")) {
        router.replace("/dashboard");
        return;
      }
    }
  }, [isAuthenticated, isInitializing, hasProfile, router, pathname]);

  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Synchronizing with Ledger...
          </p>
        </div>
      </div>
    );
  }

  // Prevent flash of content during redirect
  if (!isAuthenticated && !isInitializing) {
    return null;
  }
  
  if (isAuthenticated && !hasProfile && !pathname.startsWith("/onboarding")) {
    return null;
  }

  return <>{children}</>;
}
