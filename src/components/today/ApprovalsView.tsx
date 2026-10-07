import { useMemo, useState } from 'react';
import { Inbox } from 'lucide-react';
import { useInbox, isMine, KIND_LABEL, type InboxKind } from '../../lib/inbox';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { navigate } from '../../lib/router';
import { EmptyState } from '../shared/EmptyState';
import { InboxList } from './InboxList';
import { ScopeSwitch, type Scope } from './ScopeSwitch';

/** Everything waiting for a review or sign-off, from every record type. */
export function ApprovalsView() {
  const all = useInbox();
  const me = useCurrentUser();
  const canApprove = me.can.canApprove;
  const [scope, setScope] = useState<Scope>(canApprove || !me.name ? 'all' : 'mine');
  const [kind, setKind] = useState<InboxKind | 'any'>('any');

  const waiting = useMemo(() => all.filter((i) => i.needsApproval), [all]);
  const scoped = scope === 'mine' ? waiting.filter((i) => isMine(i, me.name)) : waiting;
  const kinds = Array.from(new Set(waiting.map((i) => i.kind)));
  const shown = kind === 'any' ? scoped : scoped.filter((i) => i.kind === kind);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-text-primary">Approvals</h1>
        <p className="text-[13px] text-text-secondary">
          {canApprove
            ? 'Records waiting for your review or sign-off. Open one to approve or send it back.'
            : 'Records waiting for review. Your role can view them; a QA manager or reviewer signs them off.'}
        </p>
      </header>

      <section className="glass-card overflow-hidden rounded-xl border border-border" aria-labelledby="approvals-title">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <h2 id="approvals-title" className="text-[14px] font-semibold text-text-primary">
            Waiting <span className="ml-1 font-normal text-text-secondary">{shown.length}</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="approval-kind">Record type</label>
            <select
              id="approval-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as InboxKind | 'any')}
              className="rounded-md border border-border bg-surface px-2 py-1 text-[12.5px] text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="any">All types</option>
              {kinds.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
            <ScopeSwitch value={scope} onChange={setScope} canMine={Boolean(me.name)} />
          </div>
        </div>
        <InboxList
          items={shown}
          caption="Records waiting for approval"
          actionLabel={() => (canApprove ? 'Review' : 'Open')}
          empty={
            <EmptyState
              icon={<Inbox className="h-8 w-8" />}
              title="Nothing waiting for approval"
              hint="When someone sends an NCR, document change or review for sign-off, it shows up here."
              action={{ label: 'Go to Today', onClick: () => navigate('today') }}
            />
          }
        />
      </section>
    </div>
  );
}
