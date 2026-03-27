import { create } from "zustand";
import { AuthClient } from "@icp-sdk/auth/client";
import { Identity, AnonymousIdentity } from "@icp-sdk/core/agent";
import { createBackendActor } from "./api/icp";
import { UserProfile } from "./types/api";

export type UserRole = "User" | "InvestorUser" | "funder" | "regional" | null;

interface AuthUser {
  id: string;
  role: UserRole;
  reputation: number;
  display_name?: string;
  home_region?: string;
  kyc_status: "pending" | "verified" | "unverified";
  geo_verified: boolean;
  detected_location?: { city: string; country: string };
}

interface AuthState {
  authClient: AuthClient | null;
  identity: Identity | null;
  principal: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  hasProfile: boolean;
  user: AuthUser | null;
  initialize: () => Promise<void>;
  login: () => Promise<void>;
  loginMock: () => void;
  logout: () => Promise<void>;
  setRole: (role: UserRole) => void;
  setKycStatus: (status: "pending" | "verified" | "unverified") => void;
  setGeoVerified: (
    verified: boolean,
    location?: { city: string; country: string },
  ) => void;
  syncIdentity: (identity: Identity | null, isAuthenticated: boolean) => void;
}

let globalAuthClient: AuthClient | null = null;

function buildPlaceholderUser(
  principal: string,
  previousUser: AuthUser | null,
): AuthUser {
  return {
    id: principal,
    role: previousUser?.id === principal ? previousUser.role : null,
    reputation: previousUser?.id === principal ? previousUser.reputation : 0,
    display_name:
      previousUser?.id === principal ? previousUser.display_name : undefined,
    home_region:
      previousUser?.id === principal ? previousUser.home_region : undefined,
    kyc_status:
      previousUser?.id === principal ? previousUser.kyc_status : "unverified",
    geo_verified:
      previousUser?.id === principal ? previousUser.geo_verified : false,
    detected_location:
      previousUser?.id === principal
        ? previousUser.detected_location
        : undefined,
  };
}

function mapProfileToAuthUser(
  principal: string,
  profile: UserProfile,
  previousUser: AuthUser | null,
): AuthUser {
  const isInvestor = "InvestorUser" in profile.user_type;
  const homeRegion =
    profile.home_region.length > 0 ? profile.home_region[0] : undefined;
  const isVerified =
    profile.is_verified.length > 0 ? profile.is_verified[0] : false;
  const preservedLocation =
    previousUser?.id === principal ? previousUser.detected_location : undefined;

  return {
    id: principal,
    role: isInvestor ? "funder" : "regional",
    reputation: Number(profile.reputation),
    display_name: profile.display_name,
    home_region: homeRegion,
    kyc_status: isVerified
      ? "verified"
      : previousUser?.id === principal && previousUser.kyc_status === "pending"
        ? "pending"
        : "unverified",
    geo_verified: isInvestor
      ? false
      : Boolean(profile.is_local_verified || homeRegion),
    detected_location:
      preservedLocation ??
      (homeRegion ? { city: homeRegion, country: "Saved region" } : undefined),
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  authClient: null,
  identity: null,
  principal: null,
  isAuthenticated: false,
  isInitializing: true,
  hasProfile: false,
  user: null,

  initialize: async () => {
    try {
      const { identity, principal, isAuthenticated, user } = get();

      if (
        !identity ||
        !principal ||
        !isAuthenticated ||
        principal === "2vxsx-fae"
      ) {
        set({ user: null, hasProfile: false, isInitializing: false });
        return;
      }

      set({
        isInitializing: true,
        user: buildPlaceholderUser(principal, user),
      });

      const actor = await createBackendActor(identity);
      const profile = await actor.get_my_profile();

      if (profile.length > 0) {
        set({
          user: mapProfileToAuthUser(principal, profile[0]!, get().user),
          hasProfile: true,
          isInitializing: false,
        });
        return;
      }

      set({
        user: buildPlaceholderUser(principal, get().user),
        hasProfile: false,
        isInitializing: false,
      });
    } catch (error) {
      console.error("[Auth] Initialization failed:", error);
      const { principal, user } = get();
      set({
        user: principal ? buildPlaceholderUser(principal, user) : null,
        hasProfile: false,
        isInitializing: false,
      });
    }
  },

  login: async () => {
    // This function is kept for backwards compatibility
    // but the actual login is triggered via useInternetIdentity() hook directly
    console.warn(
      "[Auth] Store login called directly, please use useInternetIdentity hook instead",
    );
    return Promise.resolve();
  },

  loginMock: () => {
    const mockPrincipal = "aaaaa-aa-mock-user";
    set({
      identity: new AnonymousIdentity(),
      principal: mockPrincipal,
      isAuthenticated: true,
      hasProfile: true,
      user: {
        id: mockPrincipal,
        role: "regional",
        reputation: 150,
        kyc_status: "verified",
        geo_verified: true,
        detected_location: { city: "Sofia", country: "Bulgaria" },
      },
    });
  },

  logout: async () => {
    // Similarly, actual logout should happen via useInternetIdentity
    set({
      identity: null,
      principal: null,
      isAuthenticated: false,
      hasProfile: false,
      user: null,
    });
  },

  setRole: (role) =>
    set((state) => ({
      user: state.user ? { ...state.user, role } : null,
    })),

  setKycStatus: (kyc_status) =>
    set((state) => ({
      user: state.user ? { ...state.user, kyc_status } : null,
    })),

  setGeoVerified: (geo_verified, detected_location) =>
    set((state) => ({
      user: state.user
        ? { ...state.user, geo_verified, detected_location }
        : null,
    })),

  syncIdentity: (identity, isAuthenticated) => {
    const principal = identity?.getPrincipal().toString() || null;
    const isActuallyAuthenticated =
      isAuthenticated && principal !== null && principal !== "2vxsx-fae";

    if (!isActuallyAuthenticated || !principal) {
      set({
        identity: null,
        principal: null,
        isAuthenticated: false,
        hasProfile: false,
        user: null,
        isInitializing: false,
      });
      return;
    }

    set((state) => ({
      identity,
      principal,
      isAuthenticated: true,
      hasProfile: false,
      user: buildPlaceholderUser(principal, state.user),
      isInitializing: true,
    }));

    void get().initialize();
  },
}));
