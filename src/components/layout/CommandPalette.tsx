import { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, FileSearch, Search } from 'lucide-react';
import type { ViewTab } from '../../types';
import { navigate } from '../../lib/router';
import { visibleGroups } from '../../lib/nav';
import { useInbox, KIND_LABEL } from '../../lib/inbox';
import { useNCRStore } from '../../store/useNCRStore';
import { useCurrentUser } from '../../hooks/useCurrentUser';

interface Hit {
  key: string;
  group: 'Screens' | 'Records';
  label: string;
  sub: string;
  screen: ViewTab;
  recordId?: string;
  haystack: string;
}

const MAX_RECORDS = 30;

function useHits(): Hit[] {
  const me = useCurrentUser();
  const inbox = useInbox();
  const ncrs = useNCRStore((s) => s.records);
  return useMemo(() => {
    const screens: Hit[] = visibleGroups(me.role).flatMap((g) =>
      g.items.map((i) => ({
        key: `screen:${i.id}`, group: 'Screens' as const, label: i.label, sub: g.label, screen: i.id,
        haystack: `${i.label} ${g.label} ${i.keywords ?? ''}`.toLowerCase(),
      })),
    );
    const seen = new Set<string>();
    const records: Hit[] = [];
    for (const i of inbox) {
      seen.add(`${i.screen}:${i.recordId}`);
      records.push({
        key: i.key, group: 'Records', label: `${i.ref} ${i.title}`.trim(), sub: `${KIND_LABEL[i.kind]} · ${i.status}`,
        screen: i.screen, recordId: i.recordId, haystack: `${i.ref} ${i.title} ${i.owner} ${KIND_LABEL[i.kind]}`.toLowerCase(),
      });
    }
    // Closed NCRs too, so old records can be found by number.
    for (const r of ncrs) {
      if (seen.has(`deviations:${r.id}`)) continue;
      records.push({
        key: `ncr-all:${r.id}`, group: 'Records', label: `${r.ref ?? ''} ${r.desc ?? ''}`.trim(), sub: `NCR · ${r.status}`,
        screen: 'deviations', recordId: r.id, haystack: `${r.ref ?? ''} ${r.desc ?? ''}`.toLowerCase(),
      });
    }
    return [...screens, ...records];
  }, [me.role, inbox, ncrs]);
}

/** Ctrl+K: jump to any screen or record by typing. */
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const hits = useHits();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<Element | null>(null);

  useEffect(() => {
    returnFocus.current = document.activeElement;
    inputRef.current?.focus();
    return () => { (returnFocus.current as HTMLElement | null)?.focus?.(); };
  }, []);

  const results = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const match = (h: Hit) => words.every((w) => h.haystack.includes(w));
    const screens = hits.filter((h) => h.group === 'Screens' && match(h));
    const records = words.length ? hits.filter((h) => h.group === 'Records' && match(h)).slice(0, MAX_RECORDS) : [];
    return [...screens, ...records];
  }, [hits, q]);

  const choose = (h: Hit | undefined) => {
    if (!h) return;
    navigate(h.screen, h.recordId);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(results[active]); }
  };

  const activeId = results[active] ? `cmd-${results[active].key}` : undefined;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 p-4 pt-[10vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search or jump"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden="true" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            placeholder="Type a screen, NCR number or title"
            aria-label="Search screens and records"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmd-results"
            aria-activedescendant={activeId}
            className="h-12 flex-1 bg-transparent text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
          <kbd className="rounded border border-border px-1.5 text-[11px] text-text-secondary">Esc</kbd>
        </div>
        <ul id="cmd-results" role="listbox" aria-label="Results" className="max-h-[50vh] overflow-y-auto py-1">
          {results.length === 0 && (
            <li className="flex flex-col items-center gap-1 px-4 py-8 text-center text-[13px] text-text-secondary">
              <FileSearch className="h-6 w-6" aria-hidden="true" />
              Nothing matches. Try a record number like NCR-2026, or a screen name.
            </li>
          )}
          {results.map((h, idx) => {
            const first = idx === 0 || results[idx - 1].group !== h.group;
            const on = idx === active;
            return (
              <li key={h.key} role="presentation">
                {first && <div className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{h.group}</div>}
                <div
                  id={`cmd-${h.key}`}
                  role="option"
                  aria-selected={on}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => choose(h)}
                  className={`mx-1 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 ${on ? 'bg-accent-subtle' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium text-text-primary">{h.label || '(no title)'}</div>
                    <div className="truncate text-[12px] text-text-secondary">{h.sub}</div>
                  </div>
                  {on && <CornerDownLeft className="h-3.5 w-3.5 text-text-secondary" aria-hidden="true" />}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
