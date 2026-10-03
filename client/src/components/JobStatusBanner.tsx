import React from 'react';
import { CheckCircle2, AlertTriangle, Clock, Cpu, FileJson, X, ExternalLink } from 'lucide-react';
import { ScrapeJob } from '../types';

interface JobStatusBannerProps {
  job: ScrapeJob | null;
  onViewPayload: (job: ScrapeJob) => void;
  onDismiss: () => void;
}

export const JobStatusBanner: React.FC<JobStatusBannerProps> = ({ job, onViewPayload, onDismiss }) => {
  if (!job) return null;

  const isSuccess = job.status === 'COMPLETED';
  const methodLabel =
    job.method === 'CHEERIO_NEXT_DATA'
      ? 'Next.js Hydration (Cheerio)'
      : job.method === 'CHEERIO_STATIC'
      ? 'Static HTML (Cheerio)'
      : 'Headless Browser (Playwright)';

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-xl ${
        isSuccess
          ? 'bg-slate-900/80 border-emerald-500/30 ring-1 ring-emerald-500/20'
          : 'bg-rose-950/30 border-rose-500/30 ring-1 ring-rose-500/20'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          {/* Avatar or Icon */}
          {job.avatarUrl ? (
            <img
              src={job.avatarUrl}
              alt={job.title || 'Profile'}
              className="w-12 h-12 rounded-xl object-cover border border-slate-700 shadow-md flex-shrink-0"
              onError={(e) => {
                // hide broken images
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
                isSuccess ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {isSuccess ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
          )}

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-base font-bold text-slate-100 truncate">
                {job.title || job.author || 'Scraped Target'}
              </h3>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                  isSuccess ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {job.platform}
              </span>
            </div>

            {job.description && (
              <p className="text-xs text-slate-400 line-clamp-2 mb-2 max-w-3xl">
                {job.description}
              </p>
            )}

            {/* Metrics pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <div className="inline-flex items-center gap-1 bg-slate-950/70 border border-slate-800 px-2 py-0.5 rounded-md">
                <Cpu className="w-3 h-3 text-cyan-400" />
                <span>{methodLabel}</span>
              </div>

              <div className="inline-flex items-center gap-1 bg-slate-950/70 border border-slate-800 px-2 py-0.5 rounded-md">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>{job.durationMs}ms</span>
              </div>

              <div className="inline-flex items-center gap-1 bg-slate-950/70 border border-slate-800 px-2 py-0.5 rounded-md font-semibold text-emerald-400">
                <span>{job.items?.length ?? job.itemCount ?? 0} items extracted</span>
              </div>

              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition underline underline-offset-2 ml-1"
              >
                <span className="truncate max-w-[200px]">{job.url}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {job.rawPayload && (
            <button
              onClick={() => onViewPayload(job)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              title="Inspect raw Next.js / JSON payload"
            >
              <FileJson className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Payload</span>
            </button>
          )}

          <button
            onClick={onDismiss}
            className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {job.errorMessage && (
        <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono">
          {job.errorMessage}
        </div>
      )}
    </div>
  );
};
