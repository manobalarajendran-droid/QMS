import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNCRStore } from '../../store/useNCRStore';
import { useDMLStore } from '../../store/useDMLStore';

const MONTHS_SHOWN = 6;
const DAY_MS = 86_400_000;
const OPENED = '#ff6a3d';
const CLOSED = '#a1a1aa';
const LEVELS = [
  { key: 'L1', label: 'Policies / manual', color: '#ff6a3d' },
  { key: 'L2', label: 'Procedures', color: '#ffb36b' },
  { key: 'L3', label: 'Work instructions', color: '#38bdf8' },
  { key: 'L4', label: 'Forms / records', color: '#34d399' },
  { key: 'other', label: 'Other', color: '#71717a' },
] as const;

const TIP = {
  background: 'rgba(24,24,27,0.92)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  color: '#fff',
  fontSize: 12,
};

function monthKey(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : `${d.getFullYear()}-${d.getMonth()}`;
}

function NcrTrend() {
  const ncrs = useNCRStore((s) => s.records);
  const data = useMemo(() => {
    const now = new Date();
    const rows = Array.from({ length: MONTHS_SHOWN }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS_SHOWN - 1 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, month: d.toLocaleDateString(undefined, { month: 'short' }), opened: 0, closed: 0 };
    });
    const byKey = new Map(rows.map((r) => [r.key, r]));
    for (const n of ncrs) {
      const o = byKey.get(monthKey(n.dt ?? n.createdAt) ?? '');
      if (o) o.opened += 1;
      if (n.status === 'Closed') {
        const c = byKey.get(monthKey(n.verifiedDate ?? n.updatedAt) ?? '');
        if (c) c.closed += 1;
      }
    }
    return rows;
  }, [ncrs]);
  const total = data.reduce((sum, r) => sum + r.opened, 0);

  return (
    <section className="glass-card animate-glass-rise rounded-2xl border border-border bg-surface p-4 lg:col-span-2" aria-labelledby="ncr-trend-title">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="ncr-trend-title" className="text-[14px] font-semibold text-text-primary">NCRs opened vs closed</h2>
        <span className="text-[12px] text-text-secondary">Last {MONTHS_SHOWN} months · {total} opened</span>
      </div>
      <div className="h-56 text-text-tertiary" role="img" aria-label={`NCRs opened and closed per month for the last ${MONTHS_SHOWN} months`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="ncrOpened" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={OPENED} stopOpacity={0.45} />
                <stop offset="100%" stopColor={OPENED} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="currentColor" strokeOpacity={0.15} vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'currentColor' }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'currentColor' }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TIP} labelStyle={{ color: '#fff' }} />
            <Area type="monotone" dataKey="opened" name="Opened" stroke={OPENED} strokeWidth={2.5} fill="url(#ncrOpened)" />
            <Area type="monotone" dataKey="closed" name="Closed" stroke={CLOSED} strokeWidth={2} strokeDasharray="5 4" fill="transparent" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function DocDonut() {
  const docs = useDMLStore((s) => s.records);
  const [now] = useState(() => Date.now());
  const { slices, pct } = useMemo(() => {
    const liveDocs = docs.filter((d) => d.status !== 'Obsolete');
    const counts = new Map<string, number>();
    let current = 0;
    for (const d of liveDocs) {
      const k = d.hierarchyLevel ?? 'other';
      counts.set(k, (counts.get(k) ?? 0) + 1);
      const t = d.reviewDate ? Date.parse(d.reviewDate) : NaN;
      if (Number.isNaN(t) || t >= now - DAY_MS) current += 1;
    }
    return {
      slices: LEVELS.map((l) => ({ ...l, value: counts.get(l.key) ?? 0 })),
      pct: liveDocs.length ? Math.round((current / liveDocs.length) * 100) : 0,
    };
  }, [docs, now]);
  const filled = slices.filter((s) => s.value > 0);

  return (
    <section className="glass-card animate-glass-rise rounded-2xl border border-border bg-surface p-4" aria-labelledby="doc-donut-title">
      <h2 id="doc-donut-title" className="mb-2 text-[14px] font-semibold text-text-primary">Document Master List</h2>
      <div className="relative mx-auto h-40 w-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={filled} dataKey="value" nameKey="label" innerRadius="70%" outerRadius="100%" paddingAngle={2} stroke="none">
              {filled.map((s) => <Cell key={s.key} fill={s.color} />)}
            </Pie>
            <Tooltip contentStyle={TIP} itemStyle={{ color: '#fff' }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums text-text-primary">{pct}%</span>
          <span className="text-[11px] text-text-secondary">up to date</span>
        </div>
      </div>
      <ul className="mt-3 space-y-1 text-[12px]">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-text-secondary">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} aria-hidden="true" />
            <span className="flex-1">{s.label}</span>
            <span className="tabular-nums text-text-primary">{s.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Sample-design charts for Today: NCR trend plus the document donut. */
export function TodayCharts() {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <NcrTrend />
      <DocDonut />
    </div>
  );
}
