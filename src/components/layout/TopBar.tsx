
import { Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useInbox, countInbox, isMine } from '../../lib/inbox';
import { navigate } from '../../lib/router';
import { ThemeToggle } from '../shared/ThemeToggle';

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  const { user } = useAuth();
  const items = useInbox();
  const mine = user ? items.filter((i) => isMine(i, user.name)) : [];
  const counts = countInbox(mine);
  const due = counts.overdue + counts.week;

  return (
    <header className="z-10 flex h-12 shrink-0 items-center justify-between border-b border-border bg-chrome px-4 backdrop-blur-2xl backdrop-saturate-200">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
          style={{ background: 'linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end))' }}
        >
          PT
        </span>
        <span className="text-[13px] font-semibold text-text-primary">Plant-Tech Arabia</span>
        <span className="text-[13px] text-text-secondary sm:hidden">· {title}</span>
      </div>

      <div className="hidden text-[12.5px] font-medium text-text-secondary sm:block">
        {title}
      </div>

      <div className="flex items-center gap-1.5">
        <ThemeToggle />

        <button
          type="button"
          onClick={() => navigate('today')}
          aria-label={due > 0 ? `My work: ${due} due this week or late` : 'My work: nothing due'}
          className="relative rounded-md p-2 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {due > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold tabular-nums text-danger-fg">
              {due}
            </span>
          )}
        </button>

        {user && (
          <div className="ml-2 flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 shadow-xs animate-fade-in">
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
