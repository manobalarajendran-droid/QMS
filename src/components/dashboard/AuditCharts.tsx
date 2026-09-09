import { PieChart, Pie, Cell } from 'recharts';

/**
 * One type scale for the whole console.
 *
 * This is a register-driven compliance tool, not a marketing dashboard: the
 * people using it read tables all day, so the scale is deliberately tight and
 * tops out at 26px. Every size lives here and the views compose from it, so
 * sizes cannot drift per element the way they did before.
 */
export const T = {
  /** Column headers and eyebrows. Uppercase, so kept at 10px only for short words. */
  micro: 'text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary',
  /** Supporting meta under a value. */
  label: 'text-[11px] text-text-tertiary',
  /** Default reading size. */
  body: 'text-[12.5px] text-text-secondary',
  /** Card and section headings. */
  section: 'text-[12.5px] font-semibold text-text-primary',
  /** Standard KPI value. */
  metric: 'text-[18px] font-semibold leading-none tabular-nums tracking-tight text-text-primary',
  /** The one value allowed to be larger. Used once per screen. */
  hero: 'text-[26px] font-semibold leading-none tabular-nums tracking-tight text-text-primary',
} as const;

/** Flat card: hairline border, 8px radius, no drop shadow. */
export const CARD = 'rounded-lg border border-border bg-surface';

/* ------------------------------------------------------------------ */
/* ISO 9001:2015 clause spine                                          */
/* ------------------------------------------------------------------ */

/**
 * TÜV audits against clauses, so "where are we weak" is a clause question.
 * Records carry `cl` as a sub-clause ("7.1.3"); the leading digit is the
 * clause family. Clauses 1-3 are scope/references/terms and are never
 * audited for conformity, so the spine runs 4 through 10.
 */
const ISO_CLAUSES = [
  { id: 4, name: 'Context' },
  { id: 5, name: 'Leadership' },
  { id: 6, name: 'Planning' },
  { id: 7, name: 'Support' },
  { id: 8, name: 'Operation' },
  { id: 9, name: 'Performance' },
  { id: 10, name: 'Improvement' },
] as const;

export function clauseFamily(cl?: string): number | null {
  if (!cl) return null;
  const match = /^\s*(\d{1,2})/.exec(cl);
  if (!match) return null;
  const n = Number(match[1]);
  return n >= 4 && n <= 10 ? n : null;
}

export interface ClauseDatum {
  clause: number;
  total: number;
  overdue: number;
}

export function ClauseSpine({ data, unmapped }: { data: ClauseDatum[]; unmapped: number }) {
  const byClause = new Map(data.map((d) => [d.clause, d]));
  const max = Math.max(1, ...data.map((d) => d.total));

  return (
    <div>
      <div className="flex items-end gap-1.5">
        {ISO_CLAUSES.map(({ id, name }) => {
          const d = byClause.get(id);
          const total = d?.total ?? 0;
          const overdue = d?.overdue ?? 0;
          const heightPct = total === 0 ? 0 : Math.max(14, (total / max) * 100);
          const label =
            total === 0
              ? `Clause ${id} ${name}: no findings`
              : `Clause ${id} ${name}: ${total} finding${total === 1 ? '' : 's'}${
                  overdue > 0 ? `, ${overdue} overdue` : ''
                }`;

          return (
            <div key={id} className="min-w-0 flex-1" title={label}>
              {/* Empty clauses draw a baseline rule rather than a track box, so
                  "no findings" can never read as a filled bar. */}
              <div className="flex h-14 items-end justify-center" aria-hidden="true">
                {total === 0 ? (
                  <div className="h-px w-full bg-border" />
                ) : (
                  <div
                    className={`w-full max-w-9 rounded-sm ${
                      overdue > 0 ? 'bg-danger' : 'bg-accent'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                )}
              </div>
              {/* The count is the value, so it is the only thing set in the
                  primary weight; the clause number and name sit under it as
                  the axis label and never compete with it. */}
              <div className="mt-1.5 border-t border-border pt-1.5 text-center">
                <div
                  className={`text-[12px] tabular-nums ${
                    total === 0 ? 'text-text-tertiary' : 'font-semibold text-text-primary'
                  }`}
                >
                  {total === 0 ? '—' : total}
                </div>
                <div className="truncate text-[10px] text-text-tertiary">
                  {id} · {name}
                </div>
              </div>
              <span className="sr-only">{label}</span>
            </div>
          );
        })}
      </div>
      {unmapped > 0 && (
        <p className={`mt-2.5 ${T.label}`}>
          {unmapped} finding{unmapped === 1 ? '' : 's'} carry no clause reference and are not
          plotted.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Finding pipeline donut                                              */
/* ------------------------------------------------------------------ */

export interface StageDatum {
  name: string;
  value: number;
  color: string;
}

export function StagePipeline({
  data,
  centerValue,
  centerLabel,
}: {
  data: StageDatum[];
  centerValue: string;
  centerLabel: string;
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const shown = data.filter((d) => d.value > 0);

  if (total === 0) {
    return <p className={`py-5 text-center ${T.body}`}>No recommendations on the register yet.</p>;
  }

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-28 w-28 shrink-0">
        <PieChart width={112} height={112}>
          <Pie
            data={shown}
            dataKey="value"
            nameKey="name"
            cx={56}
            cy={56}
            innerRadius={38}
            outerRadius={56}
            paddingAngle={shown.length > 1 ? 2 : 0}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            // recharts animates via requestAnimationFrame; a throttled or
            // backgrounded tab freezes it on frame 0 and the ring renders as a
            // sliver. The donut has to be readable the moment it paints.
            isAnimationActive={false}
          >
            {shown.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className={T.metric}>{centerValue}</span>
          <span className="mt-1 text-[10px] text-text-tertiary">{centerLabel}</span>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-1.5">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: d.color }}
            />
            <span className="min-w-0 flex-1 truncate text-[12px] text-text-secondary">{d.name}</span>
            <span className="text-[12px] font-semibold tabular-nums text-text-primary">
              {d.value}
            </span>
            <span className="w-8 text-right text-[11px] tabular-nums text-text-tertiary">
              {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Departmental objective progress                                     */
/* ------------------------------------------------------------------ */

export interface DeptDatum {
  dept: string;
  pct: number;
  count: number;
  overdue: number;
}

export function DeptProgress({ data }: { data: DeptDatum[] }) {
  if (data.length === 0) {
    return <p className={`py-5 text-center ${T.body}`}>No departmental objectives recorded.</p>;
  }

  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.dept}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[12px] text-text-secondary">{d.dept}</span>
            <span className="shrink-0 text-[12px] font-semibold tabular-nums text-text-primary">
              {d.pct}%
            </span>
          </div>
          <div
            className="mt-1 h-1 w-full overflow-hidden rounded-full bg-chart-track"
            role="progressbar"
            aria-valuenow={d.pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${d.dept} objectives ${d.pct}% complete`}
          >
            <div
              className={`h-full rounded-full ${d.overdue > 0 ? 'bg-danger' : 'bg-accent'}`}
              style={{ width: `${d.pct}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] text-text-tertiary">
            {d.count} objective{d.count === 1 ? '' : 's'}
            {d.overdue > 0 ? ` · ${d.overdue} past deadline` : ''}
          </div>
        </li>
      ))}
    </ul>
  );
}
