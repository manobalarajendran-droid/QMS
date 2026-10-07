
import { Bell, Search } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useInbox, countInbox, isMine } from '../../lib/inbox';
import { navigate } from '../../lib/router';
import { ThemeToggle } from '../shared/ThemeToggle';

interface TopBarProps {
  title: string;
  onOpenSearch: () => void;
}

export function TopBar({ title, onOpenSearch }: TopBarProps) {
  const { user } = useAuth();
  const items = useInbox();
  const mine = user ? items.filter((i) => isMine(i, user.name)) : [];
  const counts = countInbox(mine);
  const due = counts.overdue + counts.week;

  return (
    <header className="z-10 flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-chrome px-4 backdrop-blur-2xl backdrop-saturate-200 md:mx-3 md:mt-3 md:h-14 md:rounded-2xl md:border md:shadow-[0_10px_30px_rgba(0,0,0,0.25)] dark:md:border-white/10 dark:md:bg-[rgba(58,58,63,0.42)]">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
          style={{ background: 'linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end))' }}
        >
          PT
        </span>
        <span className="text-[13px] font-semibold text-text-primary">Plant-Tech Arabia</span>
        <span className="text-[13px] text-text-secondary md:hidden">· {title}</span>
      </div>

      <button
        type="button"
        onClick={onOpenSearch}
        className="hidden min-w-0 max-w-sm flex-1 items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-left text-[12.5px] text-text-tertiary transition-colors hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:flex dark:border-white/10 dark:bg-white/5"
      >
        <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate">Search NCRs, documents, screens…</span>
        <kbd className="rounded border border-border px-1 text-[10px]">Ctrl K</kbd>
      </button>

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
