import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

/** "More" button with a short list of less-used actions. Esc or a click outside closes it. */
export function NCRMoreMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const close = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Escape' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    if (e.key === 'Escape') { setOpen(false); (wrap.current?.querySelector('[aria-haspopup]') as HTMLElement | null)?.focus(); return; }
    const btns = Array.from(wrap.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
    const at = btns.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'ArrowDown' ? (at + 1) % btns.length : (at - 1 + btns.length) % btns.length;
    btns[next]?.focus();
  };

  return (
    <div ref={wrap} className="relative" onKeyDown={onKey}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        More <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-1 w-48 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-xl">
          {items.map((it, i) => (
            <button
              key={it.label}
              ref={i === 0 ? first : undefined}
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); it.onSelect(); }}
              className={`block w-full px-3 py-2 text-left text-[13px] hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none ${it.danger ? 'border-t border-border text-danger-text' : 'text-text-primary'}`}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
