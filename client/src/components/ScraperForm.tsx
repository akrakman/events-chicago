import React, { useState } from 'react';
import { Search, Sparkles, Zap, Globe, ArrowRight, Loader2, Clipboard, HelpCircle } from 'lucide-react';
import { SampleUrl } from '../types';

interface ScraperFormProps {
  onScrape: (url: string, mode: 'auto' | 'cheerio' | 'playwright') => Promise<void>;
  isLoading: boolean;
  samples: SampleUrl[];
}

export const ScraperForm: React.FC<ScraperFormProps> = ({ onScrape, isLoading, samples }) => {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<'auto' | 'cheerio' | 'playwright'>('auto');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isLoading) return;
    await onScrape(url.trim(), mode);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch {}
  };

  const handleSelectSample = (sampleUrl: string) => {
    setUrl(sampleUrl);
  };

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Target Page or Profile URL
          </label>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-400 transition-colors">
                <Globe className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g. linktr.ee/billieeilish or partiful.com/e/summer-party"
                className="w-full pl-11 pr-12 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition shadow-inner font-mono"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={handlePaste}
                title="Paste from clipboard"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition"
              >
                <Clipboard className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Selector */}
            <div className="sm:w-52">
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
                disabled={isLoading}
                className="w-full py-3 px-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition cursor-pointer"
              >
                <option value="auto">⚡ Auto (Fast + Fallback)</option>
                <option value="cheerio">🚀 Cheerio (__NEXT_DATA__)</option>
                <option value="playwright">🎭 Playwright (Headless Browser)</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/25 transition transform active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Scraping...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-slate-950" />
                  <span>Harvest Links</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sample URL Chips */}
        {samples.length > 0 && (
          <div className="pt-2 border-t border-slate-800/60">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1 font-medium">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Quick Test Presets:
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Click any preset to populate URL
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {samples.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSample(sample.url)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 ${
                    url === sample.url
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                  }`}
                  title={sample.description}
                >
                  <span className="font-medium">{sample.label}</span>
                  <span className="text-[10px] text-slate-500 uppercase">
                    ({sample.platform})
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
