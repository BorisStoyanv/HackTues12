"use client";

import { useEffect } from "react";
import {
  InternetIdentityProvider,
  useInternetIdentity,
} from "ic-use-internet-identity";
import { useAuthStore } from "@/lib/auth-store";
import { getDerivationOrigin, getIdentityProviderUrl } from "@/lib/env";

function AuthStateSync({ children }: { children: React.ReactNode }) {
  const { identity, status } = useInternetIdentity();
  const syncIdentity = useAuthStore((state) => state.syncIdentity);

  useEffect(() => {
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
        identityProvider: getIdentityProviderUrl(),
        derivationOrigin: getDerivationOrigin(),
      }}
    >
      <AuthStateSync>{children}</AuthStateSync>
    </InternetIdentityProvider>
  );
}
