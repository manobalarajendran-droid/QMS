import type { ViewTab } from '../../types';
import { navigate } from '../../lib/router';
import { SUB_TABS } from '../../lib/nav';

/** Tab strip for merged screens (Document changes, Customer feedback, Objectives & KPIs). */
export function SubTabs({ screen }: { screen: ViewTab }) {
  const tabs = SUB_TABS[screen];
  if (!tabs) return null;
  return (
    <div role="tablist" aria-label="Views" className="mb-4 flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((t) => {
        const selected = t.id === screen;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => navigate(t.id)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              selected ? 'border-accent text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
