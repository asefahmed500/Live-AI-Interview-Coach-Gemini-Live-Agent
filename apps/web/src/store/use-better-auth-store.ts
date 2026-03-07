'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authClient } from '@/lib/better-auth-client';

interface User {
  id: string;
  email: string;
  name: string;
}

interface BetterAuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

/**
 * Better Auth Store
 *
 * This store manages the authentication state using Better Auth.
 * It persists the user data and authentication status in localStorage.
 */
export const useBetterAuthStore = create<BetterAuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setLoading: (isLoading) => set({ isLoading }),

      setInitialized: (isInitialized) => set({ isInitialized }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const result = await authClient.signIn.email({ email, password });

          if (result.error) {
            throw new Error(result.error.message || 'Login failed');
          }

          if (result.data) {
            const user: User = {
              id: result.data.user.id,
              email: result.data.user.email,
              name: result.data.user.name || '',
            };
            set({ user, isAuthenticated: true, isLoading: false });
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true });
        try {
          const result = await authClient.signUp.email({
            email,
            password,
            name,
          });

          if (result.error) {
            throw new Error(result.error.message || 'Registration failed');
          }

          if (result.data) {
            const user: User = {
              id: result.data.user.id,
              email: result.data.user.email,
              name: result.data.user.name || '',
            };
            set({ user, isAuthenticated: true, isLoading: false });
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authClient.signOut();
          set({ user: null, isAuthenticated: false, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      refreshSession: async () => {
        set({ isLoading: true });
        try {
          const { data: session } = await authClient.getSession();

          if (session?.user) {
            const user: User = {
              id: session.user.id,
              email: session.user.email,
              name: session.user.name || '',
            };
            set({ user, isAuthenticated: true, isLoading: false });
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        } catch (error) {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'better-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

/**
 * Hook to initialize auth state from the Better Auth session
 * Call this in a layout or root component to check session on app load
 */
export function useBetterAuthInit() {
  const { refreshSession, setInitialized, isInitialized } = useBetterAuthStore();

  const init = async () => {
    if (!isInitialized) {
      await refreshSession();
      setInitialized(true);
    }
  };

  return { init };
}
