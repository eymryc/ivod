import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { UserEntity } from '@ivod/types';

interface AuthState {
  user: UserEntity | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: UserEntity, token: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: async (user, token) => {
    await SecureStore.setItemAsync('ivod_token', token);
    await SecureStore.setItemAsync('ivod_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('ivod_token');
    await SecureStore.deleteItemAsync('ivod_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadFromStorage: async () => {
    try {
      const token = await SecureStore.getItemAsync('ivod_token');
      const userStr = await SecureStore.getItemAsync('ivod_user');
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true });
      }
    } catch {
      // Ignore
    }
  },
}));
