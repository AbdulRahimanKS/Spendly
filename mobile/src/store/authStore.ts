import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  token: string | null;
  user: any | null;
  isAuthenticated: boolean;
  setToken: (token: string | null) => Promise<void>;
  setUser: (user: any | null) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  setToken: async (token) => {
    if (token) {
      await SecureStore.setItemAsync('userToken', token);
      set({ token, isAuthenticated: true });
    } else {
      await SecureStore.deleteItemAsync('userToken');
      set({ token: null, isAuthenticated: false });
    }
  },

  setUser: (user) => set({ user }),

  logout: async () => {
    await SecureStore.deleteItemAsync('userToken');
    set({ token: null, user: null, isAuthenticated: false });
  },

  initialize: async () => {
    const token = await SecureStore.getItemAsync('userToken');
    if (token) {
      set({ token, isAuthenticated: true });
    }
  },
}));
