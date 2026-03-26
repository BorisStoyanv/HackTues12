"use server";

import { createBackendActor } from "../api/icp";
import { UserProfile } from "../types/api";
import { Principal } from "@icp-sdk/core/principal";

function serializeUserProfile(profile: UserProfile, principal?: Principal) {
  const roleKey = Object.keys(profile.user_type)[0];
  
  return {
    id: principal ? principal.toString() : "unknown",
    display_name: profile.display_name,
    user_type: roleKey || 'User',
    role: roleKey || 'User',
    reputation: Number(profile.reputation),
    home_region: profile.home_region.length > 0 ? profile.home_region[0] : null,
    region: profile.home_region.length > 0 ? profile.home_region[0] : null,
    created_at: Number(profile.created_at),
    updated_at: Number(profile.updated_at),
    last_activity_ts: Number(profile.last_activity_ts),
    activity_count: profile.activity_count,
    vote_count: profile.vote_count,
    is_local_verified: profile.is_local_verified,
    has_expert_standing: profile.has_expert_standing,
    concluded_votes: profile.concluded_votes,
    accurate_votes: profile.accurate_votes,
    is_verified: profile.is_verified.length > 0 ? profile.is_verified[0] : false,
    kyc_status: profile.is_verified.length > 0 && profile.is_verified[0] ? 'verified' : 'unverified',
  };
}

export type SerializedUserProfile = ReturnType<typeof serializeUserProfile>;

export async function fetchMyProfile() {
  try {
    const actor = await createBackendActor();
    const [profile, principal] = await Promise.all([
      actor.get_my_profile(),
      actor.whoami()
    ]);
    
    if (profile.length > 0) {
      return { success: true, profile: serializeUserProfile(profile[0]!, principal) };
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
      return { success: true, user: serializeUserProfile(result[0]!, principal) };
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

export async function fetchMyVP(regionTag: string = "Global") {
  try {
    const actor = await createBackendActor();
    const result = await actor.get_my_vp(regionTag);
    if ('Ok' in result) {
      return { success: true, vp: Number(result.Ok) };
    }
    return { success: false, error: result.Err };
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
