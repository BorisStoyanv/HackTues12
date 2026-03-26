"use server";

import { createBackendActor } from "../api/icp";
import { User } from "../types/api";

// Helper to serialize User
function serializeUser(user: User) {
  return {
    principal: user.principal.toString(),
    reputation: Number(user.reputation),
    joinedAt: Number(user.joinedAt),
  };
}

export async function fetchUser(principalString: string) {
  // Normally the canister getSelf() relies on msgCaller().
  // Since server actions run anonymously (no Identity provided by default),
  // a real production app would need either an anonymous query that takes a Principal,
  // OR the client handles this fetch directly. 
  // Given the canister ONLY has getSelf(), it MUST be called from the client 
  // with the user's authenticated Identity. 
  // This server action is structurally limited by the canister's design.
  return { success: false, error: "getSelf must be called from the client with an authenticated Identity." };
}
