import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Users,
  Copy,
  Check,
  CalendarPlus,
  Share2,
  Bookmark,
  Building,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { CommunityEvent } from '../types';

interface EventDetailModalProps {
  event: CommunityEvent | null;
  isOpen: boolean;
  onClose: () => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (id: string) => void;
  onShare?: (event: CommunityEvent) => void;
}

function parseDateDetails(dateStr?: string | null) {
  if (!dateStr) {
    return {
      month: 'TBD',
      day: '?',
      weekday: 'Date TBD',
      time: null,
      fullDate: 'Date to be announced',
      relative: 'Upcoming',
      isPast: false,
    };
  }

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return {
      month: 'DATE',
      day: '—',
      weekday: dateStr,
      time: null,
      fullDate: dateStr,
      relative: 'Upcoming',
      isPast: false,
    };
  }

  const now = new Date();
  const diffDays = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let relative = 'Today';
  if (diffDays === 0) relative = 'Today';
  else if (diffDays === 1) relative = 'Tomorrow';
  else if (diffDays > 1 && diffDays <= 7) relative = `In ${diffDays} days`;
  else if (diffDays > 7) relative = `${Math.ceil(diffDays / 7)} weeks away`;
  else if (diffDays === -1) relative = 'Yesterday';
  else if (diffDays < -1) relative = `${Math.abs(diffDays)} days ago`;

  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: d.toLocaleDateString('en-US', { day: 'numeric' }),
    weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    fullDate: d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    relative,
    isPast: diffDays < 0,
  };
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  isOpen,
  onClose,
  isBookmarked = false,
  onToggleBookmark,
  onShare,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedDetails, setCopiedDetails] = useState(false);

  if (!isOpen || !event) return null;

  const dateInfo = parseDateDetails(event.eventDate || event.eventDateStr);
  const isChiTribeSource = event.platform === 'CHITRIBE' || (event.url && event.url.includes('chitribe.org'));

  // Extract direct external RSVP link from description if present
  const directLink = (() => {
    if (!event.description) return null;
    const matches = event.description.match(/https?:\/\/[^\s<">]+/g) || [];
    const ext = matches.find(
      (u) =>
        !u.includes('chitribe.org') &&
        !u.includes('instagram.com') &&
        !u.includes('facebook.com')
    );
    return ext || null;
  })();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(directLink || event.url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  const handleCopyDetails = async () => {
    const text = [
      `📅 ${event.title}`,
      `🕒 ${dateInfo.fullDate}${dateInfo.time ? ` at ${dateInfo.time}` : ''}`,
      event.location ? `📍 ${event.location}` : '',
      event.organization ? `🏛️ Organizer: ${event.organization}` : '',
      directLink ? `🔗 RSVP: ${directLink}` : `🔗 Info: ${event.url}`,
      '',
      event.description ? event.description : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedDetails(true);
      setTimeout(() => setCopiedDetails(false), 2000);
    } catch {}
  };

  // Generate Google Calendar Link
  const googleCalendarUrl = (() => {
    if (!event.eventDate) return null;
    const start = new Date(event.eventDate);
    if (isNaN(start.getTime())) return null;
    const end = event.eventEndDate ? new Date(event.eventEndDate) : new Date(start.getTime() + 2 * 60 * 60 * 1000);

    const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(
      `${event.description || ''}\n\nOrganizer: ${event.organization || event.hostName || 'Community'}\nRSVP link: ${directLink || event.url}\nAggregated from ${event.sourceName || 'Community'}`
    );
    const location = encodeURIComponent(event.location || event.neighborhood || event.sourceName || '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}&location=${location}`;
  })();

  // Download .ICS file
  const handleDownloadIcs = () => {
    if (!event.eventDate) return;
    const start = new Date(event.eventDate);
    const end = event.eventEndDate ? new Date(event.eventEndDate) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Jewish Events Chicago//NONSGML v1.0//EN',
      'BEGIN:VEVENT',
      `UID:${event.id}@jewishevents.chi`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${event.title.replace(/\n/g, ' ')}`,
      `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}\\n\\nOrganizer: ${event.organization || event.hostName || 'Community'}\\nRSVP Link: ${directLink || event.url}`,
      `LOCATION:${(event.location || event.neighborhood || event.sourceName || '').replace(/\n/g, ' ')}`,
      `URL:${directLink || event.url}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = `${event.title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
    a.click();
    URL.revokeObjectURL(u);
  };

  const displayHost = event.organization || event.hostName;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="p-4 sm:p-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-2">
            {/* Platform badge */}
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              {event.platform}
            </span>

            {/* Neighborhood badge */}
            {event.neighborhood && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                {event.neighborhood}
              </span>
            )}

            {/* Categories */}
            {event.categories &&
              event.categories.map((cat) => (
                <span
                  key={cat}
                  className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200"
                >
                  {cat}
                </span>
              ))}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition focus:outline-none"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6">
          {/* Cover image if available */}
          {event.imageUrl && (
            <div className="w-full h-48 sm:h-64 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 relative">
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-full h-full object-cover"
                onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
              />
            </div>
          )}

          {/* Title */}
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
              {event.title}
            </h2>
            {displayHost && (
              <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
                <Building className="w-4 h-4 text-emerald-600" />
                <span>
                  Organized by <strong className="font-semibold text-slate-900">{displayHost}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Date, Time, Location Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Date Card */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Date & Time
                </span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{dateInfo.fullDate}</p>
                {dateInfo.time ? (
                  <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{dateInfo.time}</span>
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 mt-0.5">Time to be announced</p>
                )}
              </div>
            </div>

            {/* Location Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-slate-200/70 text-slate-700">
                <MapPin className="w-5 h-5 text-rose-500" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Location
                </span>
                <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                  {event.location || event.neighborhood || 'Chicago, IL'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {event.neighborhood ? `Neighborhood: ${event.neighborhood}` : 'In-person event'}
                </p>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Event Details & Description
            </h3>
            {event.description ? (
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-4 rounded-2xl border border-slate-200/70">
                {event.description}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">
                No extended description provided. Check with the organizer or RSVP link below.
              </p>
            )}
          </div>

          {/* In-App Direct Registration Info Notice */}
          {isChiTribeSource && (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex items-start gap-3 text-xs text-amber-900">
              <ShieldCheck className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">ChiTribe Parity Mode</p>
                <p className="mt-0.5 text-amber-800 leading-relaxed">
                  All details, dates, and locations for this event are displayed directly here so you never need to visit ChiTribe's site or risk WordPress security blocks.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          {/* Primary Action Button */}
          <div className="flex flex-wrap items-center gap-2">
            {directLink ? (
              <a
                href={directLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition active:scale-95"
              >
                <span>Direct RSVP / Ticket Portal</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : !isChiTribeSource ? (
              <a
                href={event.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition active:scale-95"
              >
                <span>RSVP on {event.platform}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : null}

            {/* Secondary Cross-posted links */}
            {event.secondaryUrls &&
              event.secondaryUrls.map((sec, idx) => (
                <a
                  key={idx}
                  href={sec.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
                >
                  <span>Also on {sec.platform}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ))}
          </div>

          {/* Calendar & Share Actions */}
          <div className="flex items-center gap-2">
            {googleCalendarUrl && (
              <a
                href={googleCalendarUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
              >
                <CalendarPlus className="w-4 h-4 text-emerald-600" />
                <span>Google Cal</span>
              </a>
            )}

            {event.eventDate && (
              <button
                onClick={handleDownloadIcs}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
              >
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>Apple / .ICS</span>
              </button>
            )}

            <button
              onClick={handleCopyDetails}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition"
              title="Copy event details"
            >
              {copiedDetails ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>

            {onShare && (
              <button
                onClick={() => onShare(event)}
                className="p-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition"
                title="Share event"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
