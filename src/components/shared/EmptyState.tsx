import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  /** Say what to do next, in one short sentence. */
  hint: string;
  action?: { label: string; onClick: () => void };
}

/** Shown when a list has nothing in it. Always points to the next step. */
export function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon && <div className="mb-3 text-text-tertiary" aria-hidden="true">{icon}</div>}
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] text-text-secondary">{hint}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 rounded-lg bg-accent px-3.5 py-1.5 text-[13px] font-medium text-accent-fg shadow-sm transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
