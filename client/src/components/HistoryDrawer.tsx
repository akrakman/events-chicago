import React from 'react';
import { X, RefreshCw, Trash2, FileJson, Clock, ExternalLink, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { ScrapeJob } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: ScrapeJob[];
  onSelectJob: (job: ScrapeJob) => void;
  onDeleteJob: (id: string) => void;
  onRescrapeJob: (id: string) => void;
  onViewPayload: (job: ScrapeJob) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  jobs,
  onSelectJob,
  onDeleteJob,
  onRescrapeJob,
  onViewPayload,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-slideLeft">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-100">Scrape History</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
              {jobs.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {jobs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No scrapes recorded yet. Submit a URL to get started!
            </div>
          ) : (
            jobs.map((job) => {
              const isCompleted = job.status === 'COMPLETED';
              return (
                <div
                  key={job.id}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5 transition hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                          {job.platform}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            isCompleted ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-200 truncate" title={job.title || job.url}>
                        {job.title || job.url}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate font-mono">
                        {job.url}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => onRescrapeJob(job.id)}
                        title="Re-scrape"
                        className="p-1.5 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteJob(job.id)}
                        title="Delete Scrape"
                        className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {job.durationMs}ms
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-emerald-400">
                        <Layers className="w-3 h-3 text-emerald-400" />
                        {job.itemCount ?? job.items?.length ?? 0} items
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {job.rawPayload && (
                        <button
                          onClick={() => onViewPayload(job)}
                          className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          <FileJson className="w-3 h-3" />
                          Payload
                        </button>
                      )}
                      <button
                        onClick={() => {
                          onSelectJob(job);
                          onClose();
                        }}
                        className="text-[11px] text-emerald-400 hover:underline font-semibold"
                      >
                        Filter Feed
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
