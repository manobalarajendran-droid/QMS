import { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, UploadCloud, DownloadCloud } from 'lucide-react';
import { pushToSupabase, pullFromSupabase } from '../../lib/supabaseSync';

export function CloudSyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const handlePush = async () => {
    setSyncing(true);
    const success = await pushToSupabase();
    if (success) {
      setLastSync(new Date());
    } else {
      alert('Failed to push to Supabase.');
    }
    setSyncing(false);
  };

  const handlePull = async () => {
    if (!window.confirm('Pulling from cloud will overwrite your local changes. Are you sure?')) return;
    setSyncing(true);
    const success = await pullFromSupabase();
    if (success) {
      setLastSync(new Date());
      window.location.reload(); // Reload to hydrate Zustand stores with new localStorage data
    } else {
      alert('Failed to pull from Supabase or no data found.');
    }
    setSyncing(false);
  };

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={handlePush}
        disabled={syncing}
        aria-label="Push local data to Supabase"
        title="Push local data to Supabase"
        className="rounded-lg p-2 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-secondary disabled:opacity-50"
      >
        <UploadCloud className="w-5 h-5" />
      </button>
      <button 
        onClick={handlePull}
        disabled={syncing}
        aria-label="Pull latest data from Supabase"
        title="Pull latest data from Supabase"
        className="rounded-lg p-2 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-secondary disabled:opacity-50"
      >
        <DownloadCloud className="w-5 h-5" />
      </button>
      {syncing && <RefreshCw className="w-4 h-4 text-accent animate-spin" />}
      {!syncing && lastSync && <span title={`Last synced: ${lastSync.toLocaleTimeString()}`}><Cloud className="w-4 h-4 text-success-text" /></span>}
      {!syncing && !lastSync && <span title="Not synced yet"><CloudOff className="w-4 h-4 text-text-tertiary" /></span>}
    </div>
  );
}
