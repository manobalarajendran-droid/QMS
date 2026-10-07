export type Scope = 'mine' | 'all';

interface ScopeSwitchProps {
  value: Scope;
  onChange: (s: Scope) => void;
  /** False when we do not know the user's name, so "Mine" cannot work. */
  canMine: boolean;
}

/** "Mine" / "All open" switch above a work list. */
export function ScopeSwitch({ value, onChange, canMine }: ScopeSwitchProps) {
  const opt = (s: Scope, label: string, disabled = false) => (
    <button
      type="button"
      onClick={() => onChange(s)}
      aria-pressed={value === s}
      disabled={disabled}
      className={`rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 ${
        value === s ? 'bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div role="group" aria-label="Whose work" className="inline-flex rounded-lg border border-border bg-surface-secondary p-0.5">
      {opt('mine', 'Mine', !canMine)}
      {opt('all', 'All open')}
    </div>
  );
}
