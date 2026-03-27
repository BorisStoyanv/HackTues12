import { Identity } from "@icp-sdk/core/agent";
import { createBackendActor } from "@/lib/api/icp";
import { UserProfile } from "@/lib/types/api";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForProfileSync(
  identity: Identity,
  predicate: (profile: UserProfile) => boolean = () => true,
  attempts = 12,
  delayMs = 500,
) {
  const actor = await createBackendActor(identity);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const profile = await actor.get_my_profile();

      if (profile.length > 0 && predicate(profile[0]!)) {
        return profile[0]!;
      }
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error("Failed to read profile state from the canister.");
    }

    if (attempt < attempts - 1) {
      await sleep(delayMs);
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(
    "Your profile update was accepted but is not readable yet. Please refresh and try again.",
  );
}
