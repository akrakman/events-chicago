import React, { useState } from 'react';
import { X, Plus, Trash2, Globe, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { MonitoredSource } from '../types';

interface SourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: MonitoredSource[];
  onAddSource: (url: string, name?: string) => Promise<void>;
  onDeleteSource: (id: string) => Promise<void>;
  onSync: () => void;
  isSyncing: boolean;
}

export const SourcesModal: React.FC<SourcesModalProps> = ({
  isOpen,
  onClose,
  sources,
  onAddSource,
  onDeleteSource,
  onSync,
  isSyncing,
}) => {
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onAddSource(newUrl.trim(), newName.trim() || undefined);
      setNewUrl('');
      setNewName('');
    } catch (err: any) {
      setError(err.message || 'Failed to add source');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              Monitored Event Sources ({sources.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          <p className="text-xs text-slate-500 leading-relaxed">
            The app automatically polls these links once a day to harvest upcoming events into your feed.
          </p>

          {/* Sources List */}
          <div className="space-y-2.5">
            {sources.map((src) => (
              <div
                key={src.id}
                className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {src.name || src.url}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {src.platform}
                    </span>
                  </div>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-500 hover:text-slate-800 transition truncate block font-mono"
                  >
                    {src.url}
                  </a>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Last polled: {src.lastPolledAt ? new Date(src.lastPolledAt).toLocaleString() : 'Pending'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    title="Open link"
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  {sources.length > 1 && (
                    <button
                      onClick={() => onDeleteSource(src.id)}
                      title="Remove source"
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add New Source Form */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Add Another Monitored Source
            </h3>
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="Target URL (e.g. https://linktr.ee/... or partiful.com/...)"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
                required
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Label / Community Name (optional)"
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !newUrl.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  {isSubmitting ? 'Adding...' : 'Add Link'}
                </button>
              </div>
              {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
            </form>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => {
              onSync();
              onClose();
            }}
            disabled={isSyncing}
            className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Poll All Sources Now</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
