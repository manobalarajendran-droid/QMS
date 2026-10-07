import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, Clock, FileText, Target } from 'lucide-react';
import { useNCRStore } from '../../store/useNCRStore';
import { useDMLStore } from '../../store/useDMLStore';
import { useObjectivesStore } from '../../store/useObjectivesStore';
import { navigate } from '../../lib/router';
import type { ViewTab } from '../../types';

/** Documents whose review date falls inside this window count as "due review". */
const REVIEW_WINDOW_DAYS = 30;
const DAY_MS = 86_400_000;
const ON_TRACK = new Set(['In Progress', 'Ongoing', 'Achieved', 'Completed']);

interface StatProps {
  label: string;
  value: string | number;
  note: string;
  icon: ReactNode;
  chip: string;
  to: ViewTab;
}

function Stat({ label, value, note, icon, chip, to }: StatProps) {
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="glass-card animate-glass-rise relative flex flex-col items-start gap-1 rounded-2xl border border-border bg-surface p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span className={`absolute right-3.5 top-3.5 flex h-9 w-9 items-center justify-center rounded-xl ${chip}`} aria-hidden="true">
        {icon}
      </span>
      <span className="text-[12.5px] font-medium text-text-secondary">{label}</span>
      <span className="text-[28px] font-semibold leading-tight tabular-nums text-text-primary">{value}</span>
      <span className="text-[11.5px] text-text-tertiary">{note}</span>
    </button>
  );
}

function daysFromNow(iso: string | undefined, now: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : Math.floor((t - now) / DAY_MS);
}

export interface TodayGlassStatsProps {
  overdue: number;
}

/** The four big glass cards at the top of Today, from the sample design. */
export function TodayGlassStats({ overdue }: TodayGlassStatsProps) {
  const ncrs = useNCRStore((s) => s.records);
  const docs = useDMLStore((s) => s.records);
  const objectives = useObjectivesStore((s) => s.records);
  const [now] = useState(() => Date.now());

  const stats = useMemo(() => {
    const openNcr = ncrs.filter((n) => n.status !== 'Closed');
    const lateNcr = openNcr.filter((n) => {
      const d = daysFromNow(n.corrTargetDate, now);
      return d !== null && d < 0;
    }).length;
    const liveDocs = docs.filter((d) => d.status !== 'Obsolete');
    const dueReview = liveDocs.filter((d) => {
      const days = daysFromNow(d.reviewDate, now);
      return days !== null && days <= REVIEW_WINDOW_DAYS;
    }).length;
    const onTrack = objectives.filter((o) => ON_TRACK.has(o.status)).length;
    const pct = objectives.length ? Math.round((onTrack / objectives.length) * 100) : 0;
    return { open: openNcr.length, lateNcr, dueReview, docCount: liveDocs.length, onTrack, objCount: objectives.length, pct };
  }, [ncrs, docs, objectives, now]);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Stat
        label="Open NCRs"
        value={stats.open}
        note={stats.lateNcr ? `${stats.lateNcr} past the action date` : 'None past the action date'}
        icon={<AlertTriangle className="h-[18px] w-[18px]" />}
        chip="bg-orange-500/15 text-orange-500"
        to="deviations"
      />
      <Stat
        label="Actions overdue"
        value={overdue}
        note={overdue ? 'Needs action now' : 'All on time'}
        icon={<Clock className="h-[18px] w-[18px]" />}
        chip="bg-red-500/15 text-red-500"
        to="tasks"
      />
      <Stat
        label="Documents due review"
        value={stats.dueReview}
        note={`Next ${REVIEW_WINDOW_DAYS} days · ${stats.docCount} live documents`}
        icon={<FileText className="h-[18px] w-[18px]" />}
        chip="bg-sky-500/15 text-sky-500"
        to="dml_manager"
      />
      <Stat
        label="Objectives on track"
        value={`${stats.pct}%`}
        note={`${stats.onTrack} of ${stats.objCount} objectives`}
        icon={<Target className="h-[18px] w-[18px]" />}
        chip="bg-emerald-500/15 text-emerald-500"
        to="objectives"
      />
    </div>
  );
}
