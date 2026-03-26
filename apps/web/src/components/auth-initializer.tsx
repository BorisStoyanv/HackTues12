"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { InternetIdentityProvider, useInternetIdentity } from "ic-use-internet-identity";

function AuthStateSync({ children }: { children: React.ReactNode }) {
  const { identity, status } = useInternetIdentity();
  const syncIdentity = useAuthStore((state) => state.syncIdentity);

  useEffect(() => {
    // Only sync if we have successfully logged in or are idle/error (meaning not logging in)
    if (status === "success" && identity) {
      syncIdentity(identity, true);
    } else if (status === "idle" || status === "error") {
      syncIdentity(null, false);
    }
  }, [identity, status, syncIdentity]);

  return <>{children}</>;
}

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  return (
    <InternetIdentityProvider
      loginOptions={{
        identityProvider: process.env.NEXT_PUBLIC_II_URL || "https://identity.ic0.app",
      }}
    >
      <AuthStateSync>{children}</AuthStateSync>
    </InternetIdentityProvider>
  );
}
