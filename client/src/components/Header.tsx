import React from 'react';
import { Calendar, RefreshCw, Settings, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { SyncStatus } from '../types';

interface HeaderProps {
  syncStatus: SyncStatus | null;
  onSync: () => void;
  onOpenSources: () => void;
  onOpenSubscribe: () => void;
  sourcesCount: number;
  upcomingCount: number;
}

function timeAgo(dateString?: string | null): string {
  if (!dateString) return 'Never';
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

export const Header: React.FC<HeaderProps> = ({
  syncStatus,
  onSync,
  onOpenSources,
  onOpenSubscribe,
  sourcesCount,
  upcomingCount,
}) => {
  const isSyncing = syncStatus?.isSyncing ?? false;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 flex items-center justify-center shadow-md shadow-emerald-600/20 ring-1 ring-black/5">
            <Calendar className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-xl tracking-tight text-slate-900">
                Jewish Events
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {upcomingCount} Events
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span>Automatically aggregated daily</span>
              <span>•</span>
              <span className="text-emerald-700 font-semibold">Chicago & Community Gatherings</span>
            </p>
          </div>
        </div>

        {/* Sync Status & Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sync Time Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Polled: <strong className="text-slate-800">{timeAgo(syncStatus?.lastPolledAt)}</strong></span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-700 font-medium">Daily Schedule Active</span>
          </div>

          {/* Subscribe to Calendar Button */}
          <button
            onClick={onOpenSubscribe}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200 transition text-xs font-semibold shadow-xs"
            title="Subscribe to Live Calendar Feed"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>Subscribe</span>
          </button>

          {/* Sync Now Button */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs shadow-sm shadow-emerald-600/20 transition"
            title="Poll and refresh events now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Polling...' : 'Sync Now'}</span>
          </button>

          {/* Sources Config Button */}
          <button
            onClick={onOpenSources}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-xs transition text-xs font-semibold"
            title="Manage Monitored Sources"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Sources</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-medium">
              {sourcesCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
