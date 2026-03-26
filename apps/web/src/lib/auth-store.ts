import { create } from 'zustand';
import { AuthClient } from '@icp-sdk/auth/client';
import { Identity, AnonymousIdentity } from '@icp-sdk/core/agent';

export type UserRole = 'User' | 'InvestorUser' | 'funder' | 'regional' | null;

interface AuthUser {
  id: string;
  role: UserRole;
  reputation: number;
  kyc_status: 'pending' | 'verified' | 'unverified';
  geo_verified: boolean;
  detected_location?: { city: string; country: string };
}

interface AuthState {
  authClient: AuthClient | null;
  identity: Identity | null;
  principal: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  user: AuthUser | null;
  initialize: () => Promise<void>;
  login: () => Promise<void>;
  loginMock: () => void;
  logout: () => Promise<void>;
  setRole: (role: UserRole) => void;
  setKycStatus: (status: 'pending' | 'verified' | 'unverified') => void;
  setGeoVerified: (verified: boolean, location?: { city: string; country: string }) => void;
  syncIdentity: (identity: Identity | null, isAuthenticated: boolean) => void;
}

let globalAuthClient: AuthClient | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  authClient: null,
  identity: null,
  principal: null,
  isAuthenticated: false,
  isInitializing: true,
  user: null,

  initialize: async () => {
    try {
      console.log('[Auth] Initializing...');
      // The auth initialization is now primarily handled by the ic-use-internet-identity provider
      // but we keep this empty promise to satisfy existing components calling initialize()
      set({ isInitializing: false });
    } catch (error) {
      console.error('[Auth] Initialization failed:', error);
      set({ isInitializing: false });
    }
  },

  login: async () => {
    // This function is kept for backwards compatibility 
    // but the actual login is triggered via useInternetIdentity() hook directly
    console.warn('[Auth] Store login called directly, please use useInternetIdentity hook instead');
    return Promise.resolve();
  },

  loginMock: () => {
    const mockPrincipal = "aaaaa-aa-mock-user";
    set({
      identity: new AnonymousIdentity(),
      principal: mockPrincipal,
      isAuthenticated: true,
      user: {
        id: mockPrincipal,
        role: 'regional',
        reputation: 150,
        kyc_status: 'verified',
        geo_verified: true,
        detected_location: { city: 'Sofia', country: 'Bulgaria' }
      },
    });
  },

  logout: async () => {
    // Similarly, actual logout should happen via useInternetIdentity
    set({
      identity: null,
      principal: null,
      isAuthenticated: false,
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
      user: state.user ? { ...state.user, geo_verified, detected_location } : null,
    })),

  syncIdentity: (identity, isAuthenticated) => {
    const principal = identity?.getPrincipal().toString() || null;
    const isActuallyAuthenticated = isAuthenticated && principal !== null && principal !== '2vxsx-fae';
    
    set((state) => ({
      identity,
      principal: isActuallyAuthenticated ? principal : null,
      isAuthenticated: isActuallyAuthenticated,
      user: isActuallyAuthenticated && principal ? (state.user?.id === principal ? state.user : {
        id: principal,
        role: null,
        reputation: 0,
        kyc_status: 'unverified',
        geo_verified: false,
      }) : null,
      isInitializing: false,
    }));
  },
}));