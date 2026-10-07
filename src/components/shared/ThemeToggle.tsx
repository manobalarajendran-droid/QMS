import { Monitor, Moon, Sun } from 'lucide-react';
import { useThemeStore, type Theme } from '../../store/useThemeStore';

const LABEL: Record<Theme, string> = {
  system: 'Theme: same as system',
  light: 'Theme: light',
  dark: 'Theme: dark',
};

/** One button that steps through system, light and dark. */
export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const cycleTheme = useThemeStore((s) => s.cycleTheme);
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`${LABEL[theme]}. Click to change.`}
      title={LABEL[theme]}
      className="w-9 h-9 rounded-lg bg-surface-tertiary hover:bg-surface-hover border border-border flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <Icon className="w-4 h-4 text-text-secondary" aria-hidden="true" />
    </button>
  );
}
