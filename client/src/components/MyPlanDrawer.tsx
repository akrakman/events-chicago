import React, { useState } from 'react';
import {
  X,
  Bookmark,
  Calendar,
  Download,
  Share2,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  MapPin,
  Clock,
} from 'lucide-react';
import { CommunityEvent } from '../types';

interface MyPlanDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedEvents: CommunityEvent[];
  onRemoveBookmark: (id: string) => void;
  onClearAll: () => void;
}

export const MyPlanDrawer: React.FC<MyPlanDrawerProps> = ({
  isOpen,
  onClose,
  savedEvents,
  onRemoveBookmark,
  onClearAll,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Generate .ics file in browser for saved events and download
  const handleDownloadICS = () => {
    if (savedEvents.length === 0) return;

    const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');

    const eventsIcs = savedEvents
      .map((e) => {
        const d = e.eventDate ? new Date(e.eventDate) : new Date();
        const start = fmt(d);
        const end = fmt(new Date(d.getTime() + 2 * 60 * 60 * 1000));
        const stamp = fmt(new Date());
        const summary = (e.title || 'Jewish Community Event').replace(/,/g, '\\,');
        const location = (e.location || 'Chicago, IL').replace(/,/g, '\\,');
        const description = (e.description ? `${e.description}\n\nRSVP: ${e.url}` : `RSVP: ${e.url}`).replace(/\n/g, '\\n');

        return [
          'BEGIN:VEVENT',
          `UID:${e.id}@jewishevents.chi`,
          `DTSTAMP:${stamp}`,
          `DTSTART:${start}`,
          `DTEND:${end}`,
          `SUMMARY:${summary}`,
          `DESCRIPTION:${description}`,
          `LOCATION:${location}`,
          `URL:${e.url}`,
          'STATUS:CONFIRMED',
          'END:VEVENT',
        ].join('\r\n');
      })
      .join('\r\n');

    const calendarContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//My Chicago Jewish Events Plan//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:My Chicago Jewish Events Schedule',
      eventsIcs,
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([calendarContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `my-chicago-jewish-events-${new Date().toISOString().slice(0, 10)}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  // Copy shareable schedule text for WhatsApp/iMessage
  const handleCopySchedule = async () => {
    if (savedEvents.length === 0) return;

    const lines = [
      `🗓️ My Upcoming Chicago Jewish Events Plan (${savedEvents.length} Gatherings)`,
      '-------------------------------------------------------',
      '',
      ...savedEvents.map((e, idx) => {
        const d = e.eventDate ? new Date(e.eventDate) : null;
        const dateStr = d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Date TBD';
        const timeStr = d ? ` @ ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : '';
        return `${idx + 1}. [${dateStr}${timeStr}] ${e.title}\n   Host: ${e.organization || e.hostName || 'Community'} | Location: ${e.location || 'Chicago'}\n   RSVP: ${e.url}\n`;
      }),
      'Saved from Chicago Jewish Events Aggregator: https://events-chicago.akrakman.workers.dev',
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-slideLeft">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Bookmark className="w-5 h-5 fill-emerald-700 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                <span>My Saved Plan</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  {savedEvents.length}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">Your personalized schedule of Chicago gatherings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {savedEvents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <Bookmark className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">Your plan is empty</h3>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  Click the bookmark icon on any event card to save it here, download a custom calendar (.ics) file, or share your schedule with friends.
                </p>
              </div>
            </div>
          ) : (
            savedEvents.map((evt) => {
              const d = evt.eventDate ? new Date(evt.eventDate) : null;
              const dateFormatted = d
                ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                : 'Date TBD';
              const timeFormatted = d
                ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                : null;

              return (
                <div
                  key={evt.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition space-y-2 shadow-xs group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                        <Calendar className="w-3 h-3" />
                        <span>{dateFormatted}</span>
                        {timeFormatted && <span>• {timeFormatted}</span>}
                      </div>
                      <a
                        href={evt.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-slate-900 hover:text-emerald-700 hover:underline block line-clamp-2"
                      >
                        {evt.title}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveBookmark(evt.id)}
                      className="p-1 text-slate-300 hover:text-rose-600 transition flex-shrink-0"
                      title="Remove from saved plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-50">
                    <span className="truncate max-w-[200px]">
                      {evt.organization || evt.hostName || 'Community Host'}
                    </span>
                    <a
                      href={evt.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline flex-shrink-0"
                    >
                      <span>RSVP</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        {savedEvents.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/70 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownloadICS}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export .ICS</span>
              </button>

              <button
                type="button"
                onClick={handleCopySchedule}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Plan!' : 'Copy for Text'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={onClearAll}
                className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 transition"
              >
                Clear all saved events
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 transition"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
