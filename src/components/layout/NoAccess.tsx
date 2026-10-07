import { Lock } from 'lucide-react';
import { navigate, HOME_SCREEN } from '../../lib/router';

/** Shown when someone opens an admin screen by its link without the right role (L6). */
export function NoAccess() {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 text-center" role="alert">
      <Lock className="h-6 w-6 text-text-secondary" aria-hidden="true" />
      <p className="text-sm font-medium text-text-primary">No access</p>
      <p className="max-w-sm text-[13px] text-text-secondary">This screen is for QMS admins and QA managers. Ask your QMS admin if you need it.</p>
      <button
        type="button"
        onClick={() => navigate(HOME_SCREEN)}
        className="rounded-lg border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-text-primary shadow-sm hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Go to Today
      </button>
    </div>
  );
}
