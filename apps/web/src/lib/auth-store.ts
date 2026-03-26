import { create } from 'zustand';
import { AuthClient } from '@dfinity/auth-client';
import { Identity } from '@dfinity/agent';

export type UserRole = 'funder' | 'regional' | null;

interface AuthState {
  identity: Identity | null;
  principal: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  user: {
    id: string;
    role: UserRole;
    kyc_status: 'pending' | 'verified' | 'unverified';
    geo_verified: boolean;
    detected_location?: { city: string; country: string };
  } | null;
  initialize: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setRole: (role: UserRole) => void;
  setKycStatus: (status: 'pending' | 'verified' | 'unverified') => void;
  setGeoVerified: (verified: boolean, location?: { city: string; country: string }) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  identity: null,
  principal: null,
  isAuthenticated: false,
  isInitializing: true,
  user: null,

  initialize: async () => {
    try {
      const authClient = await AuthClient.create();
      const isAuthenticated = await authClient.isAuthenticated();
      
      if (isAuthenticated) {
        const identity = authClient.getIdentity();
        const principal = identity.getPrincipal().toString();
        
        set({
          identity,
          principal,
          isAuthenticated: true,
          user: {
            id: principal,
            role: null,
            kyc_status: 'unverified',
            geo_verified: false,
          },
        });
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    } finally {
      set({ isInitializing: false });
    }
  },

  login: async () => {
    // We create the client first to ensure the .login() call is "fast" after the user click
    const authClient = await AuthClient.create();
    const identityProvider = process.env.NEXT_PUBLIC_II_URL || 'https://identity.ic0.app';

    return new Promise<void>((resolve, reject) => {
      authClient.login({
        identityProvider,
        // Using a standard session time
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), 
        onSuccess: () => {
          const identity = authClient.getIdentity();
          const principal = identity.getPrincipal().toString();
          
          set({
            identity,
            principal,
            isAuthenticated: true,
            user: {
              id: principal,
              role: null,
              kyc_status: 'unverified',
              geo_verified: false,
            },
          });
          resolve();
        },
        onError: (err) => {
          console.error('AuthClient login error:', err);
          reject(err);
        },
        // Helpful for debugging connection issues
        windowOpenerFeatures: `left=${window.screen.width / 2 - 200},top=${window.screen.height / 2 - 300},width=400,height=600`,
      });
    });
  },

  logout: async () => {
    const authClient = await AuthClient.create();
    await authClient.logout();
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
}));
