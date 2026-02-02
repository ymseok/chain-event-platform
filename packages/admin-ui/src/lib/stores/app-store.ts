import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Application } from '@/types';

interface AppState {
  currentApp: Application | null;
  setCurrentApp: (app: Application | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentApp: null,
      setCurrentApp: (app) => set({ currentApp: app }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentApp: state.currentApp,
      }),
    }
  )
);
