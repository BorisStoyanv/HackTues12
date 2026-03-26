import { create } from 'zustand';

export type UserRole = 'funder' | 'regional' | null;

interface AuthState {
  user: {
    id: string;
    email: string;
    role: UserRole;
    is_authenticated: boolean;
    kyc_status: 'pending' | 'verified' | 'unverified';
    geo_verified: boolean;
  } | null;
  login: (provider: string) => Promise<void>;
  logout: () => void;
  setRole: (role: UserRole) => void;
  setKycStatus: (status: 'pending' | 'verified' | 'unverified') => void;
  setGeoVerified: (verified: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  login: async (provider) => {
    // Mock login delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    set({
      user: {
        id: 'mock-user-123',
        email: 'user@example.com',
        role: null,
        is_authenticated: true,
        kyc_status: 'unverified',
        geo_verified: false,
      },
    });
  },
  logout: () => set({ user: null }),
  setRole: (role) =>
    set((state) => ({
      user: state.user ? { ...state.user, role } : null,
    })),
  setKycStatus: (kyc_status) =>
    set((state) => ({
      user: state.user ? { ...state.user, kyc_status } : null,
    })),
  setGeoVerified: (geo_verified) =>
    set((state) => ({
      user: state.user ? { ...state.user, geo_verified } : null,
    })),
}));
