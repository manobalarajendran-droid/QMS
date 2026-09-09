import { useMemo } from 'react';
import { CalendarClock, ChevronRight, ClipboardList, Info } from 'lucide-react';
import { useNCRStore } from '../../store/useNCRStore';
import { useTUVStore } from '../../store/useTUVStore';
import { useCSIStore } from '../../store/useCSIStore';
import { useObjectivesStore } from '../../store/useObjectivesStore';
import { StatusBadge } from '../shared/StatusBadge';
import type { ViewTab } from '../../types';
import {
  CARD,
  ClauseSpine,
  DeptProgress,
  StagePipeline,
  T,
  clauseFamily,
  type ClauseDatum,
  type DeptDatum,
  type StageDatum,
} from './AuditCharts';

interface MRDashboardProps {
  onNavigate: (tab: ViewTab) => void;
}

const TUV_SURVEILLANCE_DATE = new Date('2027-06-30T00:00:00Z');

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** 'Achieved' is canonical; 'Completed' is the legacy alias kept for V12 imports. */
const OBJECTIVE_DONE = new Set(['Achieved', 'Completed']);

export function MRDashboard({ onNavigate }: MRDashboardProps) {
  const ncrRecords = useNCRStore((s) => s.records);
  const tuvRecords = useTUVStore((s) => s.records);
  const csiRecords = useCSIStore((s) => s.records);
  const objRecords = useObjectivesStore((s) => s.records);

  const openNCRsList = ncrRecords.filter((r) => r.status !== 'Closed');
  const openNCRs = openNCRsList.length;

  const activeObjectives = objRecords.filter((r) => !OBJECTIVE_DONE.has(r.status));
  const overdueObjectives = useMemo(() => {
    const now = new Date();
    return activeObjectives.filter((r) => r.deadline && new Date(r.deadline) < now).length;
  }, [activeObjectives]);

  const daysToTuv = useMemo(() => {
    const diff = TUV_SURVEILLANCE_DATE.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, []);

  const openTuv = tuvRecords.filter((r) => r.status !== 'Closed');
  const closedTuvCount = tuvRecords.length - openTuv.length;
  const tuvClosureRate = tuvRecords.length
    ? Math.round((closedTuvCount / tuvRecords.length) * 100)
    : 0;

  const csiPercent = useMemo(() => {
    const scored = csiRecords
      .map((r) => {
        // totalScore is the calculated 0-100 field; older V12 rows only carry
        // `score`, which was imported as a 0-1 fraction on some vintages.
        if (typeof r.totalScore === 'number' && Number.isFinite(r.totalScore)) return r.totalScore;
        const num = Number(r.score);
        if (!Number.isFinite(num) || num === 0) return null;
        return num <= 1 ? num * 100 : num <= 10 ? num * 10 : num;
      })
      .filter((n): n is number => n !== null);
    if (scored.length === 0) return null;
    return {
      value: Math.round(scored.reduce((a, b) => a + b, 0) / scored.length),
      n: scored.length,
    };
  }, [csiRecords]);

  const stages: StageDatum[] = useMemo(() => {
    const bucket = { Open: 0, 'Action Taken': 0, Verified: 0, Closed: 0 };
    for (const r of tuvRecords) {
      if (r.status === 'Closed') bucket.Closed += 1;
      else if (r.status === 'Verified') bucket.Verified += 1;
      else if (r.status === 'Action Taken' || r.status === 'In Progress')
        bucket['Action Taken'] += 1;
      else bucket.Open += 1;
    }
    return [
      { name: 'Open', value: bucket.Open, color: 'var(--color-stage-open)' },
      { name: 'Action taken', value: bucket['Action Taken'], color: 'var(--color-stage-action)' },
      { name: 'Verified', value: bucket.Verified, color: 'var(--color-stage-verified)' },
      { name: 'Closed', value: bucket.Closed, color: 'var(--color-stage-closed)' },
    ];
  }, [tuvRecords]);

  const { clauseData, unmappedFindings } = useMemo(() => {
    const now = Date.now();
    const map = new Map<number, ClauseDatum>();
    let unmapped = 0;
    for (const r of tuvRecords) {
      const fam = clauseFamily(r.cl);
      if (fam === null) {
        unmapped += 1;
        continue;
      }
      const entry = map.get(fam) ?? { clause: fam, total: 0, overdue: 0 };
      entry.total += 1;
      if (r.status !== 'Closed' && r.due && new Date(r.due).getTime() < now) entry.overdue += 1;
      map.set(fam, entry);
    }
    return { clauseData: [...map.values()], unmappedFindings: unmapped };
  }, [tuvRecords]);

  const deptData: DeptDatum[] = useMemo(() => {
    const now = Date.now();
    const map = new Map<string, { sum: number; count: number; overdue: number }>();
    for (const r of objRecords) {
      const dept = (r.dept || '').trim();
      if (!dept) continue;
      const entry = map.get(dept) ?? { sum: 0, count: 0, overdue: 0 };
      entry.sum += OBJECTIVE_DONE.has(r.status) ? 100 : Math.min(100, Math.max(0, r.pct ?? 0));
      entry.count += 1;
      if (!OBJECTIVE_DONE.has(r.status) && r.deadline && new Date(r.deadline).getTime() < now)
        entry.overdue += 1;
      map.set(dept, entry);
    }
    return [...map.entries()]
      .map(([dept, v]) => ({
        dept,
        pct: Math.round(v.sum / v.count),
        count: v.count,
        overdue: v.overdue,
      }))
      .sort((a, b) => a.pct - b.pct || b.count - a.count)
      .slice(0, 6);
  }, [objRecords]);

  const overdueTuv = useMemo(() => {
    const now = Date.now();
    return openTuv.filter((r) => r.due && new Date(r.due).getTime() < now).length;
  }, [openTuv]);

  /**
   * Every item is derived from a register and links to it. An action the data
   * cannot substantiate is a fabricated instruction on an audited system, so a
   * clear board shows the empty state rather than filler.
   */
  const secretariatActions = [
    {
      key: 'tuv-overdue',
      show: overdueTuv > 0,
      text: `Close ${overdueTuv} TÜV finding${overdueTuv === 1 ? '' : 's'} past the committed due date.`,
      tab: 'tuv' as ViewTab,
    },
    {
      key: 'obj-overdue',
      show: overdueObjectives > 0,
      text: `Follow up on ${overdueObjectives} departmental objective${
        overdueObjectives === 1 ? '' : 's'
      } past deadline.`,
      tab: 'objectives' as ViewTab,
    },
    {
      key: 'ncr-open',
      show: openNCRs > 0,
      text: `Progress ${openNCRs} open NCR${openNCRs === 1 ? '' : 's'} toward closure.`,
      tab: 'deviations' as ViewTab,
    },
    {
      key: 'clause-unmapped',
      show: unmappedFindings > 0,
      text: `Add clause references to ${unmappedFindings} finding${
        unmappedFindings === 1 ? '' : 's'
      } so they map to the standard.`,
      tab: 'tuv' as ViewTab,
    },
    {
      key: 'csi-missing',
      show: csiPercent === null,
      text: 'Record a customer satisfaction evaluation; none is on file.',
      tab: 'pms' as ViewTab,
    },
  ].filter((a) => a.show);

  const bandMetrics = [
    {
      key: 'ncr',
      label: 'Open NCRs',
      value: String(openNCRs),
      context: `of ${ncrRecords.length} raised`,
      alert: openNCRs > 0,
      tab: 'deviations' as ViewTab,
    },
    {
      key: 'obj',
      label: 'Overdue objectives',
      value: String(overdueObjectives),
      context: `of ${activeObjectives.length} active`,
      alert: overdueObjectives > 0,
      tab: 'objectives' as ViewTab,
    },
    {
      key: 'csi',
      label: 'CSI score',
      value: csiPercent === null ? '—' : `${csiPercent.value}%`,
      context: csiPercent === null ? 'Not evaluated' : `${csiPercent.n} evaluations`,
      alert: false,
      tab: 'pms' as ViewTab,
    },
  ];

  return (
    <div className="animate-fade-in mx-auto max-w-[1400px] space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[16px] font-semibold tracking-tight text-text-primary">
            MR Dashboard
          </h1>
          <p className={`mt-0.5 ${T.label}`}>
            Management representative overview and live metrics
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5">
          <CalendarClock className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
          <span className={T.body}>
            Surveillance No. 3 · {DATE_FORMAT.format(TUV_SURVEILLANCE_DATE)}
          </span>
        </div>
      </header>

      {/* Every tile carries its own denominator and links to the register it
          came from, so a number is never a dead end. */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <div className={`${CARD} p-3`}>
          <div className={T.micro}>Days to surveillance</div>
          <div className={`mt-1.5 ${T.hero}`}>{daysToTuv}</div>
          <div className={`mt-1.5 ${T.label}`}>{DATE_FORMAT.format(TUV_SURVEILLANCE_DATE)}</div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('tuv_tracker')}
          className={`${CARD} p-3 text-left transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
        >
          <div className={T.micro}>Findings closed</div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className={T.metric}>{tuvClosureRate}%</span>
            <span className={T.label}>
              {closedTuvCount}/{tuvRecords.length}
            </span>
          </div>
          <div
            className="mt-2 h-1 w-full overflow-hidden rounded-full bg-chart-track"
            role="progressbar"
            aria-valuenow={tuvClosureRate}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="TÜV findings closed"
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${tuvClosureRate}%` }} />
          </div>
        </button>

        {bandMetrics.map(({ key, label, value, context, alert, tab }) => (
          <button
            key={key}
            type="button"
            onClick={() => onNavigate(tab)}
            className={`${CARD} p-3 text-left transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
          >
            <div className={`truncate ${T.micro}`}>{label}</div>
            <div
              className={`mt-1.5 ${T.metric}`}
              style={alert ? { color: 'var(--color-danger-text)' } : undefined}
            >
              {value}
            </div>
            <div className={`mt-1.5 truncate ${T.label}`}>{context}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
        {/* Signature: TÜV audits against clauses, so weakness is a clause question */}
        <section className={`${CARD} lg:col-span-8`}>
          <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-2.5">
            <h2 className={T.section}>Findings by ISO 9001 clause</h2>
            <p className={T.label}>Red marks a clause with an overdue finding</p>
          </header>
          <div className="px-4 py-4">
            <ClauseSpine data={clauseData} unmapped={unmappedFindings} />
          </div>
        </section>

        <section className={`${CARD} lg:col-span-4`}>
          <header className="border-b border-border px-4 py-2.5">
            <h2 className={T.section}>Finding pipeline</h2>
            <p className={`mt-0.5 ${T.label}`}>How far the register has moved toward closure</p>
          </header>
          <div className="px-4 py-4">
            <StagePipeline data={stages} centerValue={String(openTuv.length)} centerLabel="open" />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
        <section className={`${CARD} lg:col-span-7`}>
          <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h2 className={T.section}>Open TÜV findings</h2>
            <span className={`tabular-nums ${T.label}`}>{openTuv.length}</span>
          </header>
          {openTuv.length === 0 ? (
            <p className={`px-4 py-5 text-center ${T.body}`}>No pending TÜV recommendations.</p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {openTuv.slice(0, 5).map((r) => (
                <li key={r.id} className="px-4 py-2.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[12.5px] font-semibold text-text-primary">{r.num}</span>
                    {r.cl && <span className={`tabular-nums ${T.label}`}>Cl. {r.cl}</span>}
                    <span className={`ml-auto tabular-nums ${T.label}`}>due {r.due || '—'}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[12.5px] text-text-secondary">{r.desc}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${CARD} lg:col-span-5`}>
          <header className="border-b border-border px-4 py-2.5">
            <h2 className={T.section}>Objective progress by department</h2>
            <p className={`mt-0.5 ${T.label}`}>Furthest behind first</p>
          </header>
          <div className="px-4 py-3">
            <DeptProgress data={deptData} />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
        <section className={`${CARD} lg:col-span-7`}>
          <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h2 className={T.section}>Open NCRs</h2>
            <span className={`tabular-nums ${T.label}`}>{openNCRs}</span>
          </header>
          {openNCRsList.length === 0 ? (
            <p className={`px-4 py-5 text-center ${T.body}`}>No open non-conformances.</p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {openNCRsList.slice(0, 5).map((r) => (
                <li key={r.id} className="px-4 py-2.5 transition-colors hover:bg-surface-hover">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[12.5px] font-medium text-accent-text">
                      {r.ref || r.id}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[12.5px] text-text-secondary">{r.desc}</p>
                  <div className={`mt-1 flex justify-between ${T.label}`}>
                    <span className="truncate">{r.raisedBy || 'Unassigned'}</span>
                    <span className="shrink-0 tabular-nums">{r.dt || r.createdAt.slice(0, 10)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${CARD} lg:col-span-5`}>
          <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <Info className="h-3.5 w-3.5 text-text-tertiary" />
            <h2 className={T.section}>Secretariat actions</h2>
          </header>
          {secretariatActions.length === 0 ? (
            <p className={`px-4 py-5 text-center ${T.body}`}>
              Nothing outstanding. Every register is clear.
            </p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {secretariatActions.map((a) => (
                <li key={a.key}>
                  <button
                    type="button"
                    onClick={() => onNavigate(a.tab)}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-surface-hover"
                  >
                    <ClipboardList className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                    <span className={`min-w-0 flex-1 ${T.body}`}>{a.text}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
