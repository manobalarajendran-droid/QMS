
import { Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNCRStore } from '../../store/useNCRStore';
import { CloudSyncButton } from './CloudSyncButton';
import { ThemeToggle } from '../shared/ThemeToggle';

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  const { user } = useAuth();
  const ncrRecords = useNCRStore((state) => state.records);
  const openNCRs = ncrRecords.filter(r => r.status === 'Open').length;

  return (
    <header className="h-14 shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-between px-6 z-10">
      <div className="flex items-center gap-2">
        <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">PTA</span>
        <span className="text-slate-400">|</span>
        <span className="font-semibold text-slate-800 dark:text-slate-100">Plant-Tech Arabia</span>
      </div>
      
      <div className="font-medium text-slate-700 dark:text-slate-200">
        {title}
      </div>

      <div className="flex items-center gap-4">
        <CloudSyncButton />
        <ThemeToggle />
        
        <div className="relative">
          <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          {openNCRs > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {openNCRs}
            </span>
          )}
        </div>
        
        {user && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:block">
              {user.name}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
