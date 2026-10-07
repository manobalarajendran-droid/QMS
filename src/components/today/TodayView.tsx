import { useMemo, useState } from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import { useInbox, countInbox, dueBucket, isMine, type InboxItem } from '../../lib/inbox';
import { navigate } from '../../lib/router';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { EmptyState } from '../shared/EmptyState';
import { InboxList } from './InboxList';
import { TodayGlassStats } from './TodayGlassStats';
import { TodayCharts } from './TodayCharts';
import { ScopeSwitch, type Scope } from './ScopeSwitch';

type Filter = 'all' | 'overdue' | 'week' | 'approvals';

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function applyFilter(items: InboxItem[], f: Filter): InboxItem[] {
  if (f === 'all') return items;
  if (f === 'approvals') return items.filter((i) => i.needsApproval);
  return items.filter((i) => dueBucket(i.due) === f);
}

interface ChipProps {
  label: string;
  count: number;
  tone: 'danger' | 'warning' | 'accent';
  pressed: boolean;
  onClick: () => void;
}

const TONE: Record<ChipProps['tone'], string> = {
  danger: 'text-danger-text',
  warning: 'text-warning-text',
  accent: 'text-accent-text',
};

function Chip({ label, count, tone, pressed, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`glass-card flex min-w-[9rem] flex-1 flex-col items-start rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        pressed ? 'border-accent ring-1 ring-accent' : 'border-border hover:bg-surface-hover'
      }`}
    >
      <span className={`text-2xl font-semibold tabular-nums ${count > 0 ? TONE[tone] : 'text-text-secondary'}`}>{count}</span>
      <span className="text-[12.5px] font-medium text-text-secondary">{label}</span>
    </button>
  );
}

export function TodayView() {
  const all = useInbox();
  const me = useCurrentUser();
  const [scope, setScope] = useState<Scope>(me.name ? 'mine' : 'all');
  const [filter, setFilter] = useState<Filter>('all');
  const now = new Date();

  const scoped = useMemo(() => (scope === 'mine' ? all.filter((i) => isMine(i, me.name)) : all), [all, scope, me.name]);
  const counts = countInbox(scoped);
  const shown = applyFilter(scoped, filter);
  const toggle = (f: Filter) => setFilter((cur) => (cur === f ? 'all' : f));

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{greeting(now)}{me.name ? `, ${me.name.split(' ')[0]}` : ''}</h1>
          <p className="text-[13px] text-text-secondary">
            {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate('deviations', 'new')} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white shadow-sm hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
            <Plus className="h-4 w-4" aria-hidden="true" /> Raise NCR
          </button>
          <button type="button" onClick={() => navigate('tasks')} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[13px] font-medium text-text-primary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <Plus className="h-4 w-4" aria-hidden="true" /> Task
          </button>
        </div>
      </header>

      <TodayGlassStats overdue={counts.overdue} />
      <TodayCharts />

      <div className="flex flex-wrap gap-3" role="group" aria-label="Filter my work">
        <Chip label="Overdue" count={counts.overdue} tone="danger" pressed={filter === 'overdue'} onClick={() => toggle('overdue')} />
        <Chip label="Due this week" count={counts.week} tone="warning" pressed={filter === 'week'} onClick={() => toggle('week')} />
        <Chip label="Waiting for approval" count={counts.approvals} tone="accent" pressed={filter === 'approvals'} onClick={() => toggle('approvals')} />
      </div>

      <section className="glass-card overflow-hidden rounded-xl border border-border" aria-labelledby="today-list-title">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <h2 id="today-list-title" className="text-[14px] font-semibold text-text-primary">
            {filter === 'all' ? 'Open work' : filter === 'overdue' ? 'Overdue' : filter === 'week' ? 'Due this week' : 'Waiting for approval'}
            <span className="ml-2 font-normal text-text-secondary">{shown.length}</span>
          </h2>
          <ScopeSwitch value={scope} onChange={setScope} canMine={Boolean(me.name)} />
        </div>
        <InboxList
          items={shown}
          caption="Open work, soonest due first"
          empty={
            <EmptyState
              icon={<CheckCircle2 className="h-8 w-8" />}
              title={filter === 'all' ? 'Nothing open here' : 'Nothing in this group'}
              hint={
                scope === 'mine'
                  ? 'Nothing is assigned to you. Switch to "All open" to see the whole team, or raise an NCR if you found a problem.'
                  : 'All work is closed. Raise an NCR when you find a problem.'
              }
              action={filter === 'all' ? { label: 'Raise NCR', onClick: () => navigate('deviations', 'new') } : { label: 'Show all', onClick: () => setFilter('all') }}
            />
          }
        />
      </section>
    </div>
  );
}
