
import { Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNCRStore } from '../../store/useNCRStore';
import { CloudSyncButton } from './CloudSyncButton';
import { ThemeToggle } from '../shared/ThemeToggle';

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  const { user } = useAuth();
  const ncrRecords = useNCRStore((state) => state.records);
  const openNCRs = ncrRecords.filter(r => r.status === 'Open').length;

  return (
    <header className="z-10 flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
          style={{ background: 'linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end))' }}
        >
          PT
        </span>
        <span className="text-[13px] font-semibold text-text-primary">Plant-Tech Arabia</span>
      </div>

      <div className="text-[12.5px] font-medium text-text-secondary">
        {title}
      </div>

      <div className="flex items-center gap-1.5">
        <CloudSyncButton />
        <ThemeToggle />

        <button
          type="button"
          aria-label={
            openNCRs > 0 ? `Notifications: ${openNCRs} open NCRs` : 'Notifications: none open'
          }
          className="relative rounded-md p-2 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-secondary"
        >
          <Bell className="h-4 w-4" />
          {openNCRs > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold tabular-nums text-danger-fg">
              {openNCRs}
            </span>
          )}
        </button>

        {user && (
          <div className="ml-2 flex items-center gap-2 border-l border-border pl-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-subtle text-[11px] font-bold text-accent-text">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="hidden text-[12.5px] font-medium text-text-secondary sm:block">
              {user.name}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
