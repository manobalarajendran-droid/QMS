import { useEffect, useState } from 'react';
import { CloudOff, UploadCloud, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { onSyncChange, pendingImports, syncStatus, importLocalData } from '../../lib/qmsSync';

/**
 * One line under the top bar that says where the data lives:
 * - offline mode: this PC only, with a "Sign in" button;
 * - server lists that are still empty while this PC has records (admin can send them);
 * - screens that could not reach the server (showing the copy saved on this PC).
 */

const BAR = 'flex flex-wrap items-center gap-2 px-4 py-1.5 text-[12.5px] border-b';

function useSyncSnapshot() {
  const read = () => ({ pending: pendingImports(), failed: syncStatus().failed });
  const [snap, setSnap] = useState(read);
  useEffect(() => onSyncChange(() => setSnap(read())), []);
  return snap;
}

export function SyncStatusBar() {
  const { isOffline, logout, profile } = useAuth();
  const { pending, failed } = useSyncSnapshot();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  if (isOffline) {
    return (
      <div role="status" className={`${BAR} bg-amber-500/10 border-amber-500/30 text-text-primary`}>
        <CloudOff className="w-4 h-4 shrink-0" />
        <span>Offline - this PC only. Nothing you do here is shared or saved to the server.</span>
        <button type="button" onClick={logout} className="ml-auto font-medium underline">Sign in</button>
      </div>
    );
  }

  const sendLocalData = async () => {
    setBusy(true);
    setMessage('');
    try {
      const results = await importLocalData();
      const total = results.reduce((sum, r) => sum + r.imported, 0);
      setMessage(`Sent ${total} records to the server.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not send the records.');
    } finally {
      setBusy(false);
    }
  };

  if (pending.length > 0) {
    const records = pending.reduce((sum, p) => sum + p.count, 0);
    const isAdmin = profile?.role === 'admin';
    return (
      <div role="status" className={`${BAR} bg-accent/10 border-accent/30 text-text-primary`}>
        <UploadCloud className="w-4 h-4 shrink-0" />
        <span>
          {records} records on this PC ({pending.length} screens) are not on the server yet.
          {!isAdmin && ' Ask a QMS admin to send the starting data.'}
        </span>
        {isAdmin && (
          <button type="button" disabled={busy} onClick={() => void sendLocalData()}
            className="ml-auto inline-flex items-center gap-1 font-medium underline disabled:opacity-50">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Send them to the server
          </button>
        )}
        {message && <span className="w-full text-text-secondary">{message}</span>}
      </div>
    );
  }

  if (failed > 0) {
    return (
      <div role="status" className={`${BAR} bg-red-500/10 border-red-500/30 text-text-primary`}>
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>{failed} screens could not reach the server. Showing the copy saved on this PC; it will retry.</span>
      </div>
    );
  }

  return message ? <div role="status" className={`${BAR} border-border text-text-secondary`}>{message}</div> : null;
}
