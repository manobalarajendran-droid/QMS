import type { ReactNode } from 'react';
import { KIND_LABEL, dueBucket, type InboxItem } from '../../lib/inbox';
import { navigate } from '../../lib/router';

const DAY_MS = 86_400_000;

function dayDiff(due: string, now: Date): number {
  const a = new Date(Date.parse(due));
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((start(a) - start(now)) / DAY_MS);
}

/** "5 days late" (red), "Today" (amber), a date (blue), or "No date". */
export function DueTag({ due }: { due: string | null }) {
  const base = 'inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold tabular-nums';
  if (!due || Number.isNaN(Date.parse(due))) {
    return <span className={`${base} bg-surface-secondary text-text-secondary`}>No date</span>;
  }
  const now = new Date();
  const days = dayDiff(due, now);
  if (days < 0) {
    const n = -days;
    return <span className={`${base} bg-danger-subtle text-danger-text`}>{n === 1 ? '1 day late' : `${n} days late`}</span>;
  }
  if (days === 0) return <span className={`${base} bg-warning-subtle text-warning-text`}>Today</span>;
  const label = new Date(Date.parse(due)).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const tone = dueBucket(due, now) === 'week' ? 'bg-accent-subtle text-accent-text' : 'bg-surface-secondary text-text-secondary';
  return <span className={`${base} ${tone}`}>{days === 1 ? 'Tomorrow' : label}</span>;
}

interface InboxListProps {
  items: InboxItem[];
  /** Label of the row button, e.g. "Open" or "Review". */
  actionLabel?: (item: InboxItem) => string;
  caption: string;
  empty: ReactNode;
}

const BTN =
  'rounded-md border border-border bg-surface px-2.5 py-1 text-[12.5px] font-medium text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
const BTN_PRIMARY =
  'rounded-md bg-accent px-2.5 py-1 text-[12.5px] font-medium text-white transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1';

function open(item: InboxItem) {
  navigate(item.screen, item.recordId);
}

/** One list of work: a table on wide screens, cards on phones. */
export function InboxList({ items, actionLabel, caption, empty }: InboxListProps) {
  if (items.length === 0) return <>{empty}</>;
  const label = (i: InboxItem) => actionLabel?.(i) ?? (i.needsApproval ? 'Review' : 'Open');
  return (
    <>
      <table className="hidden w-full text-left text-[13px] md:table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border text-[11.5px] font-semibold uppercase tracking-wide text-text-secondary">
            <th scope="col" className="px-4 py-2">What</th>
            <th scope="col" className="px-4 py-2">Type</th>
            <th scope="col" className="px-4 py-2">Owner</th>
            <th scope="col" className="px-4 py-2">Due</th>
            <th scope="col" className="px-4 py-2"><span className="sr-only">Action</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.key} className="border-b border-border-subtle last:border-0 hover:bg-surface-hover">
              <td className="max-w-[28rem] px-4 py-2.5">
                <div className="truncate font-semibold text-text-primary">{i.title || '(no title)'}</div>
                <div className="truncate text-[12px] text-text-secondary">{i.ref} · {i.status}</div>
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-text-secondary">{KIND_LABEL[i.kind]}</td>
              <td className="max-w-[12rem] truncate px-4 py-2.5 text-text-secondary">{i.owner || 'Not assigned'}</td>
              <td className="px-4 py-2.5"><DueTag due={i.due} /></td>
              <td className="px-4 py-2.5 text-right">
                <button type="button" onClick={() => open(i)} className={i.needsApproval ? BTN_PRIMARY : BTN} aria-label={`${label(i)} ${i.ref}`}>
                  {label(i)}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="divide-y divide-border-subtle md:hidden" aria-label={caption}>
        {items.map((i) => (
          <li key={i.key}>
            <button type="button" onClick={() => open(i)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold text-text-primary">{i.title || '(no title)'}</div>
                <div className="truncate text-[12.5px] text-text-secondary">{KIND_LABEL[i.kind]} · {i.ref}</div>
                <div className="truncate text-[12.5px] text-text-secondary">{i.owner || 'Not assigned'}</div>
              </div>
              <DueTag due={i.due} />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
