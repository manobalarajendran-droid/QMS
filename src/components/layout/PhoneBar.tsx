import { Sun, Plus, Search, Menu } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ViewTab } from '../../types';
import { navigate } from '../../lib/router';

interface PhoneBarProps {
  activeScreen: ViewTab;
  onOpenSearch: () => void;
  onOpenMenu: () => void;
}

/** Bottom bar on phones (below md): Today / Raise / Search / Menu. */
export function PhoneBar({ activeScreen, onOpenSearch, onOpenMenu }: PhoneBarProps) {
  return (
    <nav
      aria-label="Quick actions"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-chrome pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl backdrop-saturate-200 md:hidden"
    >
      <BarButton label="Today" active={activeScreen === 'today'} onClick={() => navigate('today')} icon={<Sun className="h-5 w-5" aria-hidden="true" />} />
      <BarButton label="Raise NCR" onClick={() => navigate('deviations', 'new')} icon={<Plus className="h-5 w-5" aria-hidden="true" />} />
      <BarButton label="Search" onClick={onOpenSearch} icon={<Search className="h-5 w-5" aria-hidden="true" />} />
      <BarButton label="Menu" onClick={onOpenMenu} icon={<Menu className="h-5 w-5" aria-hidden="true" />} />
    </nav>
  );
}

function BarButton({ label, icon, onClick, active }: { label: string; icon: ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
        active ? 'text-accent-text' : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
