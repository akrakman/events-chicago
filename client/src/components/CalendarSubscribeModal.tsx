import React, { useState } from 'react';
import { X, Calendar, Copy, Check, ExternalLink, Sparkles, Smartphone, Globe, Mail, Clock, CheckCircle2, Terminal } from 'lucide-react';
import { subscribeToNewsletter, sendTestNewsletterNow } from '../api';

interface CalendarSubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalendarSubscribeModal: React.FC<CalendarSubscribeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [newsletterMsg, setNewsletterMsg] = useState<string | null>(null);
  const [newsletterErr, setNewsletterErr] = useState<string | null>(null);

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

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsSubscribing(true);
    setNewsletterErr(null);
    setNewsletterMsg(null);
    try {
      const res = await subscribeToNewsletter(email.trim());
      setNewsletterMsg(res.message);
      try {
        localStorage.setItem('jewish_events_newsletter_email', email.trim().toLowerCase());
      } catch {}
      setEmail('');
    } catch (err: any) {
      setNewsletterErr(err.message || 'Failed to subscribe');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleTestSendNow = async () => {
    const target = (email.trim() || localStorage.getItem('jewish_events_newsletter_email') || 'test@jewishevents.chi').toLowerCase();
    setIsSubscribing(true);
    setNewsletterErr(null);
    setNewsletterMsg(null);
    try {
      const res = await sendTestNewsletterNow(target);
      setNewsletterMsg(`⚡ Dev Test Sent! Dispatched "${res.subject}" (${res.eventsCount} events) to ${target}.`);
    } catch (err: any) {
      setNewsletterErr(err.message || 'Failed to test newsletter');
    } finally {
      setIsSubscribing(false);
    }
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
          {/* Weekly Sunday 9:00 AM Newsletter Section */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                <span>Weekly Email Newsletter</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-emerald-800 border border-emerald-200">
                <Clock className="w-3 h-3 text-emerald-600" />
                <span>Sundays at 9:00 AM CT</span>
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Receive a curated weekly list of upcoming Chicago Jewish events in your inbox every Sunday morning at 9:00 AM.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <button
                type="submit"
                disabled={isSubscribing || !email.trim()}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs transition shadow-xs"
              >
                {isSubscribing ? 'Saving...' : 'Subscribe'}
              </button>
              <button
                type="button"
                onClick={handleTestSendNow}
                disabled={isSubscribing}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs transition shadow-xs"
                title="Trigger Sunday 9am newsletter dispatch immediately"
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Test Now</span>
              </button>
            </form>
            {newsletterMsg && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>{newsletterMsg}</span>
              </div>
            )}
            {newsletterErr && (
              <p className="text-[11px] text-rose-600 font-semibold">{newsletterErr}</p>
            )}
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
