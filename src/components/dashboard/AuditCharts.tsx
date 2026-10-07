import { PieChart, Pie, Cell } from 'recharts';
import {
  T,
  ISO_CLAUSES,
  type ClauseDatum,
  type StageDatum,
  type DeptDatum,
} from './auditChartConstants';

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
              <div className="flex h-40 items-end justify-center" aria-hidden="true">
                {total === 0 ? (
                  <div className="h-px w-full bg-border" />
                ) : (
                  <svg width="100%" height="100%" className="w-full max-w-12" style={{ height: `${heightPct}%` }}>
                    <defs>
                      <linearGradient id="premiumGradientBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#4f46e5" />
                      </linearGradient>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#premiumGradientBar)" rx={4} />
                  </svg>
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
      <div className="relative h-48 w-48 shrink-0">
        <PieChart width={192} height={192}>
          <defs>
            <linearGradient id="pieGradOpen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="pieGradAction" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="pieGradVerified" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="pieGradClosed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
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
              <Cell 
                key={d.name} 
                fill={
                  d.name === 'Open' ? 'url(#pieGradOpen)' :
                  d.name === 'Action taken' ? 'url(#pieGradAction)' :
                  d.name === 'Verified' ? 'url(#pieGradVerified)' :
                  'url(#pieGradClosed)'
                } 
              />
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
