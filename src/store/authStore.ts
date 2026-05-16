import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  username: string | null;
  password: string | null;
  token: string | null;
  isLoggedIn: boolean;
  login: (username: string, password: string, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      username: null,
      password: null,
      token: null,
      isLoggedIn: false,
      login: (username, password, token) => set({ username, password, token, isLoggedIn: true }),
      logout: () => set({ username: null, password: null, token: null, isLoggedIn: false }),
    }),
    {
      name: 'novatune-auth',
    }
  )
);
