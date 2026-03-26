"use server";

import { createBackendActor } from "../api/icp";
import { UserProfile } from "../types/api";
import { Principal } from "@dfinity/principal";

function serializeUserProfile(profile: UserProfile) {
  return {
    ...profile,
    id: profile.id.toString(),
    role: profile.role.length > 0 ? profile.role[0] : null,
    region: profile.region.length > 0 ? profile.region[0] : null,
    reputation: Number(profile.reputation),
  };
}

export async function fetchMyProfile() {
  try {
    const actor = await createBackendActor();
    const result = await actor.get_my_profile();
    
    if (result.length > 0) {
      return { success: true, profile: serializeUserProfile(result[0]!) };
    }
    
    return { success: false, error: "Profile not found." };
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    return { success: false, error: "Failed to connect to ledger." };
  }
}

export async function fetchUserByPrincipal(principalString: string) {
  try {
    const actor = await createBackendActor();
    const principal = Principal.fromText(principalString);
    const result = await actor.get_user(principal);
    
    if (result.length > 0) {
      return { success: true, user: serializeUserProfile(result[0]!) };
    }
    
    return { success: false, error: "User not found." };
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return { success: false, error: "Failed to fetch user details." };
  }
}

export async function fetchWhoAmI() {
  try {
    const actor = await createBackendActor();
    const principal = await actor.whoami();
    return { success: true, principal: principal.toString() };
  } catch (error) {
    console.error("Failed whoami call:", error);
    return { success: false, error: "Failed to fetch current identity." };
  }
}

export async function fetchMyVP() {
  try {
    const actor = await createBackendActor();
    const vp = await actor.get_my_vp();
    return { success: true, vp: Number(vp) };
  } catch (error) {
    console.error("Failed to fetch VP:", error);
    return { success: false, error: "Failed to fetch voting power." };
  }
}

export async function fetchRegionVP(region: string) {
  try {
    const actor = await createBackendActor();
    const vp = await actor.get_region_total_vp(region);
    return { success: true, vp: Number(vp) };
  } catch (error) {
    console.error("Failed to fetch region VP:", error);
    return { success: false, error: "Failed to fetch regional voting power." };
  }
}
