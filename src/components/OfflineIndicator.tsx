import React from 'react';
import { useOnlineStatus } from '../utils/useOnlineStatus.ts';
import { WifiOff, Database } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-5 left-5 z-30 max-w-[calc(100vw-2.5rem)] flex items-center gap-2.5 rounded-xl bg-amber-600 dark:bg-amber-700 px-4 py-2 text-xs font-semibold text-white shadow-xl border border-amber-500 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
      <div className="space-y-0.5">
        <div>Offline Mode Active</div>
        <div className="text-[10px] text-amber-100 font-normal">
          Serving cached hardware specs and ADB guides from local storage.
        </div>
      </div>
    </div>
  );
};
