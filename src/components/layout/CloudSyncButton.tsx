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
        title="Push local data to Supabase"
        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors disabled:opacity-50"
      >
        <UploadCloud className="w-5 h-5" />
      </button>
      <button 
        onClick={handlePull}
        disabled={syncing}
        title="Pull latest data from Supabase"
        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors disabled:opacity-50"
      >
        <DownloadCloud className="w-5 h-5" />
      </button>
      {syncing && <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />}
      {!syncing && lastSync && <span title={`Last synced: ${lastSync.toLocaleTimeString()}`}><Cloud className="w-4 h-4 text-green-500" /></span>}
      {!syncing && !lastSync && <span title="Not synced yet"><CloudOff className="w-4 h-4 text-slate-300" /></span>}
    </div>
  );
}
