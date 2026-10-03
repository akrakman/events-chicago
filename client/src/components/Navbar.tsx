import React from 'react';
import { Link2, Calendar, Share2, Layers, History, Activity } from 'lucide-react';
import { AggregatorStats } from '../types';

interface NavbarProps {
  stats: AggregatorStats | null;
  onOpenHistory: () => void;
  jobCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ stats, onOpenHistory, jobCount }) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-white/20">
            <Link2 className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                LinkHarvester
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Linktree, Partiful & Social Aggregator
            </p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-2 sm:gap-4">
          {stats && (
            <div className="hidden md:flex items-center gap-3 text-xs bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg shadow-inner">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold">{stats.totalItems}</span>
                <span className="text-slate-500">items</span>
              </div>
              <div className="w-px h-3 bg-slate-800" />
              <div className="flex items-center gap-1.5 text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold">{stats.eventCount}</span>
                <span className="text-slate-500">events</span>
              </div>
              <div className="w-px h-3 bg-slate-800" />
              <div className="flex items-center gap-1.5 text-slate-300">
                <Share2 className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold">{stats.socialCount}</span>
                <span className="text-slate-500">socials</span>
              </div>
            </div>
          )}

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 transition text-sm font-medium shadow-sm active:scale-95"
            title="View Scrape History"
          >
            <History className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Scrapes</span>
            <span className="px-1.5 py-0.2 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {jobCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
