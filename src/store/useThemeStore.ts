import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 'system' follows the computer or phone setting and changes with it. */
export type Theme = 'system' | 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Steps through system -> light -> dark -> system. */
  cycleTheme: () => void;
}

const darkQuery = (): MediaQueryList | null =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

export function resolveDark(theme: Theme): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return darkQuery()?.matches ?? false;
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', resolveDark(theme));
}

const NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      cycleTheme: () => {
        const next = NEXT[get().theme] ?? 'system';
        applyTheme(next);
        set({ theme: next });
      },
    }),
    {
      name: 'pta-qms:theme',
      version: 1,
      // Version 0 only knew light/dark and saved 'light' even when nobody chose
      // it. Keep a real dark choice; everyone else now follows the system.
      migrate: (persisted) => {
        const old = (persisted as { theme?: string } | undefined)?.theme;
        return { theme: old === 'dark' ? 'dark' : 'system' } as ThemeState;
      },
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);

/** Re-check when the system setting changes, but only in 'system' mode. */
export function watchSystemTheme(): void {
  const query = darkQuery();
  if (!query) return;
  query.addEventListener('change', () => {
    if (useThemeStore.getState().theme === 'system') applyTheme('system');
  });
}
