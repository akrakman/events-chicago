import React, { useState } from 'react';
import { X, Copy, Check, FileJson } from 'lucide-react';
import { ScrapeJob } from '../types';

interface RawPayloadModalProps {
  job: ScrapeJob | null;
  onClose: () => void;
}

export const RawPayloadModal: React.FC<RawPayloadModalProps> = ({ job, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!job || !job.rawPayload) return null;

  let formatted = job.rawPayload;
  try {
    formatted = JSON.stringify(JSON.parse(job.rawPayload), null, 2);
  } catch {}

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileJson className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Raw Hydration Payload: {job.title || job.url}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-4 flex-1 overflow-auto bg-slate-950 font-mono text-xs text-slate-300">
          <pre className="whitespace-pre-wrap break-all leading-relaxed">
            {formatted}
          </pre>
        </div>
      </div>
    </div>
  );
};
