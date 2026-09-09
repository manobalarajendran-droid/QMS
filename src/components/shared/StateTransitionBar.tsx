import { useState } from 'react';
import { CheckCircle, GitCommit, ArrowRight, RotateCcw, Undo2 } from 'lucide-react';

export interface StateHistoryEntry {
  from: string;
  to: string;
  by: string;
  at: string;
  reason: string;
  kind: 'forward' | 'reject' | 'reopen' | 'verify';
}

interface StateTransitionBarProps {
  /** Ordered forward path of statuses, first = initial, last = terminal. */
  statuses: string[];
  statusLabels: Record<string, string>;
  current: string;
  history?: StateHistoryEntry[];
  /** May the acting user drive forward / reject transitions at all? */
  canAdvance: boolean;
  /** May the acting user perform the terminal verification-of-effectiveness transition (into the last status)? */
  canVerifyClose: boolean;
  /** May the acting user reopen a terminal (closed) record? */
  canReopen: boolean;
  onForward: (reason: string) => void;
  onReject: (reason: string) => void;
  onReopen: (reason: string) => void;
}

type PendingAction = 'forward' | 'reject' | 'reopen' | null;

export function StateTransitionBar({
  statuses,
  statusLabels,
  current,
  history = [],
  canAdvance,
  canVerifyClose,
  canReopen,
  onForward,
  onReject,
  onReopen,
}: StateTransitionBarProps) {
  const [pending, setPending] = useState<PendingAction>(null);
  const [reason, setReason] = useState('');

  const idx = statuses.indexOf(current);
  const isTerminal = idx === statuses.length - 1;
  const isInitial = idx <= 0;
  const nextStatus = !isTerminal && idx >= 0 ? statuses[idx + 1] : null;
  const prevStatus = !isInitial && idx >= 0 ? statuses[idx - 1] : null;
  const advancingToTerminal = nextStatus === statuses[statuses.length - 1];

  const forwardAllowed = canAdvance && !isTerminal && (!advancingToTerminal || canVerifyClose);
  const rejectAllowed = canAdvance && !isInitial && !isTerminal;
  const reopenAllowed = canReopen && isTerminal;

  function submit() {
    if (!reason.trim()) return;
    if (pending === 'forward') onForward(reason.trim());
    else if (pending === 'reject') onReject(reason.trim());
    else if (pending === 'reopen') onReopen(reason.trim());
    setPending(null);
    setReason('');
  }

  function cancel() {
    setPending(null);
    setReason('');
  }

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <div className="flex items-center flex-wrap gap-1">
        {statuses.map((status, i) => {
          const isCurrent = status === current;
          const isPast = idx > i;
          return (
            <div key={status} className="flex items-center">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border
                  ${isCurrent ? 'border-accent text-accent bg-accent-subtle'
                    : isPast ? 'border-border text-text-secondary bg-surface-secondary'
                    : 'border-border text-text-tertiary bg-surface'}`}
              >
                {isPast ? <CheckCircle className="w-3 h-3" /> : <GitCommit className="w-3 h-3" />}
                {statusLabels[status] ?? status}
              </div>
              {i !== statuses.length - 1 && <ArrowRight className="w-3 h-3 mx-1 text-text-tertiary shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {pending ? (
        <div className="bg-surface-secondary border border-border rounded-lg p-3 space-y-2">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Reason for {pending === 'forward' ? `moving to ${nextStatus ? statusLabels[nextStatus] : ''}` : pending === 'reject' ? `returning to ${prevStatus ? statusLabels[prevStatus] : ''}` : 'reopening'} (required)
          </label>
          <textarea
            autoFocus
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg p-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Explain why this transition is happening…"
          />
          <div className="flex justify-end gap-2">
            <button onClick={cancel} className="px-3 py-1.5 text-sm text-text-secondary bg-surface rounded-lg border border-border hover:bg-surface-hover transition-colors">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!reason.trim()}
              className="px-3 py-1.5 text-sm text-accent-fg bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {rejectAllowed && (
            <button
              onClick={() => setPending('reject')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" /> Reject / Return to {prevStatus ? statusLabels[prevStatus] : ''}
            </button>
          )}
          {forwardAllowed && nextStatus && (
            <button
              onClick={() => setPending('forward')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-accent text-accent-fg rounded-lg hover:bg-accent-hover transition-colors"
            >
              {advancingToTerminal ? <CheckCircle className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              {advancingToTerminal ? `Verify & Close` : `Advance to ${statusLabels[nextStatus]}`}
            </button>
          )}
          {reopenAllowed && (
            <button
              onClick={() => setPending('reopen')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reopen
            </button>
          )}
          {!isTerminal && advancingToTerminal && !canVerifyClose && canAdvance && (
            <p className="text-xs text-text-tertiary self-center">Only QA Manager / Admin can verify and close this record.</p>
          )}
          {!canAdvance && !isTerminal && (
            <p className="text-xs text-text-tertiary self-center">You do not have permission to change this record's state.</p>
          )}
        </div>
      )}

      {/* State history */}
      {history.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">Transition History</h4>
          <div className="space-y-2">
            {[...history].reverse().map((h, i) => (
              <div key={i} className="text-xs bg-surface-secondary border border-border rounded-lg px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text-primary">
                    {statusLabels[h.from] ?? h.from} → {statusLabels[h.to] ?? h.to}
                    <span className="ml-2 text-[10px] uppercase font-bold text-accent">{h.kind}</span>
                  </span>
                  <span className="text-text-tertiary">{new Date(h.at).toLocaleString()}</span>
                </div>
                <div className="text-text-secondary mt-1">By {h.by}: {h.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
