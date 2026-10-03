import React, { useState } from 'react';
import { X, Calendar, Copy, Check, ExternalLink, Sparkles, Smartphone, Globe } from 'lucide-react';

interface CalendarSubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalendarSubscribeModal: React.FC<CalendarSubscribeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
  const webcalUrl = currentOrigin.replace(/^https?:\/\//i, 'webcal://') + '/api/calendar.ics';
  const httpsUrl = currentOrigin + '/api/calendar.ics';

  const googleCalendarSubscribeUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(httpsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Calendar className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Subscribe to Live Calendar Feed
              </h2>
              <p className="text-[11px] text-slate-500">Auto-syncs upcoming Chicago Jewish events to your calendar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs text-slate-600">
          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 text-emerald-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Never miss an event</span>
            </div>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              When you subscribe, any newly announced Shabbat dinner, mixer, or community gathering will automatically appear in your iPhone or Google Calendar!
            </p>
          </div>

          {/* Quick Buttons */}
          <div className="space-y-2 pt-1">
            <a
              href={webcalUrl}
              className="w-full inline-flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition group"
            >
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-slate-700" />
                <div className="text-left">
                  <span className="font-bold text-xs text-slate-900 block">Apple Calendar (iPhone & Mac)</span>
                  <span className="text-[11px] text-slate-500 block">Tap to open directly in iOS/macOS Calendar app</span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
            </a>

            <a
              href={googleCalendarSubscribeUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition group"
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-emerald-700" />
                <div className="text-left">
                  <span className="font-bold text-xs text-slate-900 block">Google Calendar</span>
                  <span className="text-[11px] text-slate-500 block">Add to your Google Calendar via web</span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
            </a>
          </div>

          {/* Direct URL copy */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Direct Subscription URL (iCal / Webcal):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={httpsUrl}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono text-slate-700 focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition inline-flex items-center gap-1.5 shadow-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-xs font-semibold text-slate-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
