import { useId, useRef, useState } from 'react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { inputCls } from './ncrShared';

interface Props {
  title: string;
  confirmLabel: string;
  hint?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

/** Small dialog that asks for a reason before a stage change. The reason goes in the history. */
export function NCRReasonDialog({ title, confirmLabel, hint, danger, onCancel, onConfirm }: Props) {
  const [reason, setReason] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const ok = reason.trim().length > 0;
  // L6: focus stays in the dialog, Esc closes it. A click outside closes it only
  // when nothing is typed yet, so a stray click never loses the reason.
  const box = useDialogFocus<HTMLFormElement>(onCancel);
  const onOutside = () => { if (!reason.trim()) onCancel(); };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onMouseDown={onOutside}>
      <form
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); if (ok) onConfirm(reason.trim()); }}
        className="w-full max-w-md space-y-3 rounded-xl border border-border bg-surface p-5 shadow-2xl"
      >
        <h2 id={`${id}-t`} className="text-[15px] font-semibold text-text-primary">{title}</h2>
        {hint && <p className="text-[13px] text-text-secondary">{hint}</p>}
        <div>
          <label htmlFor={`${id}-r`} className="mb-1 block text-[12px] font-medium text-text-secondary">
            Reason <span className="text-danger-text" aria-hidden="true">*</span>
          </label>
          <textarea id={`${id}-r`} ref={ref} className={inputCls} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} required />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm text-text-primary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!ok}
            className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${danger ? 'bg-danger text-danger-fg hover:bg-danger-hover' : 'bg-accent text-accent-fg hover:bg-accent-hover'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
