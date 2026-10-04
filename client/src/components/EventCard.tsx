import React, { useState } from 'react';
import {
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
} from 'lucide-react';
import { CommunityEvent } from '../types';

interface EventCardProps {
  event: CommunityEvent;
  isBookmarked?: boolean;
  onToggleBookmark?: (id: string) => void;
  onShare?: (event: CommunityEvent) => void;
  onViewDetails?: (event: CommunityEvent) => void;
}

function parseDateDetails(dateStr?: string | null): {
  month: string;
  day: string;
  weekday: string;
  time: string | null;
  relative: string;
  isPast: boolean;
} {
  if (!dateStr) {
    return {
      month: 'TBD',
      day: '?',
      weekday: 'Date TBD',
      time: null,
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
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    relative,
    isPast: diffDays < 0,
  };
}

function getPlatformBadge(platform: string) {
  const p = platform.toUpperCase();
  if (p === 'PARTIFUL') {
    return {
      name: 'Partiful',
      badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
      btn: 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white shadow-sm shadow-fuchsia-600/20',
    };
  }
  if (p === 'ONETABLE') {
    return {
      name: 'OneTable',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-600/20',
    };
  }
  if (p === 'MISHKAN') {
    return {
      name: 'Mishkan Chicago',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      btn: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shadow-indigo-600/20',
    };
  }
  if (p === 'CHITRIBE') {
    return {
      name: 'ChiTribe',
      badge: 'bg-sky-50 text-sky-700 border-sky-200',
      btn: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm shadow-sky-600/20',
    };
  }
  return {
    name: platform,
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    btn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20',
  };
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  isBookmarked = false,
  onToggleBookmark,
  onShare,
  onViewDetails,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const dateInfo = parseDateDetails(event.eventDate || event.eventDateStr);
  const platStyle = getPlatformBadge(event.platform);
  const isChiTribeSource = event.platform === 'CHITRIBE' || (event.url && event.url.includes('chitribe.org'));

  // Extract direct external registration link from description if present
  const directLink = (() => {
    if (!event.description) return null;
    const matches = event.description.match(/https?:\/\/[^\s<">]+/g) || [];
    const ext = matches.find((u) => !u.includes('chitribe.org') && !u.includes('instagram.com') && !u.includes('facebook.com'));
    return ext || null;
  })();

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(event.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownloadIcs = (e: React.MouseEvent) => {
    e.stopPropagation();
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
      `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}\\n\\nOrganizer: ${event.organization || event.hostName || 'Community'}\\nRSVP Link: ${event.url}`,
      `LOCATION:${(event.location || event.neighborhood || event.sourceName || '').replace(/\n/g, ' ')}`,
      `URL:${event.url}`,
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

  // Generate Google Calendar Link
  const googleCalendarUrl = (() => {
    if (!event.eventDate) return null;
    const start = new Date(event.eventDate);
    if (isNaN(start.getTime())) return null;
    const end = event.eventEndDate ? new Date(event.eventEndDate) : new Date(start.getTime() + 2 * 60 * 60 * 1000);

    const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(
      `${event.description || ''}\n\nOrganizer: ${event.organization || event.hostName || 'Community'}\nRSVP link: ${event.url}\nAggregated from ${event.sourceName || 'Community'}`
    );
    const location = encodeURIComponent(event.location || event.neighborhood || event.sourceName || '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}&location=${location}`;
  })();

  const displayHost = event.organization || event.hostName;

  return (
    <div className={`group bg-white hover:bg-white/95 border transition-all duration-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md flex flex-col md:flex-row ${
      dateInfo.isPast ? 'border-slate-200/60 opacity-65 bg-slate-50/50' : 'border-slate-200/90 hover:border-slate-300'
    }`}>
      {/* Date ribbon on desktop / header on mobile */}
      <div className="flex md:flex-col items-center justify-between md:justify-center p-4 md:px-5 md:py-6 bg-slate-50/90 border-b md:border-b-0 md:border-r border-slate-100 md:w-32 flex-shrink-0 text-center">
        <div className="flex items-center md:flex-col gap-2 md:gap-0">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            {dateInfo.month}
          </span>
          <span className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight">
            {dateInfo.day}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            {dateInfo.weekday}
          </span>
        </div>

        <div className="md:mt-3">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            dateInfo.isPast ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {dateInfo.relative}
          </span>
        </div>
      </div>

      {/* Center Event Information */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 min-w-0">
        <div>
          {/* Top badges bar */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {/* Platform badge */}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border ${platStyle.badge}`}>
              {platStyle.name}
            </span>

            {/* Time badge */}
            {dateInfo.time && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>{dateInfo.time}</span>
              </span>
            )}

            {/* Neighborhood badge */}
            {event.neighborhood && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 font-medium bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                <MapPin className="w-3 h-3 text-rose-500" />
                <span>{event.neighborhood}</span>
              </span>
            )}

            {/* Categories */}
            {event.categories && event.categories.slice(0, 2).map((cat) => (
              <span
                key={cat}
                className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200"
              >
                {cat}
              </span>
            ))}

            {/* Source credit */}
            {event.sourceName && (
              <span className="text-[11px] text-slate-400 ml-auto hidden sm:inline">
                via {event.sourceName}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
            {onViewDetails ? (
              <button
                type="button"
                onClick={() => onViewDetails(event)}
                className="text-left font-bold text-slate-900 group-hover:text-emerald-700 hover:underline transition-colors focus:outline-none"
              >
                {event.title}
              </button>
            ) : directLink || !isChiTribeSource ? (
              <a href={directLink || event.url} target="_blank" rel="noreferrer" className="hover:underline">
                {event.title}
              </a>
            ) : (
              <span>{event.title}</span>
            )}
          </h3>

          {/* Host & Location */}
          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 mt-1.5">
            {displayHost && (
              <span className="text-slate-600">
                Event organized by <strong className="text-slate-900 font-semibold">{displayHost}</strong>
              </span>
            )}
            {event.location && (
              <span className="inline-flex items-center gap-1 text-slate-700">
                <MapPin className="w-3 h-3 text-rose-500 flex-shrink-0" />
                <span>{event.location}</span>
              </span>
            )}
            {event.rsvpCount != null && (
              <span className="inline-flex items-center gap-1 text-fuchsia-700 font-medium">
                <Users className="w-3 h-3 text-fuchsia-600 flex-shrink-0" />
                <span>{event.rsvpCount} RSVPs</span>
              </span>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div className="mt-2">
              <p className={`text-xs text-slate-600 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                {event.description}
              </p>
              {event.description.length > 120 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 mt-1 inline-block focus:outline-none"
                >
                  {isExpanded ? 'Show less ▲' : 'Read full event details... ▼'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          {/* Left Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Action Button */}
            {directLink ? (
              <a
                href={directLink}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs active:scale-95 ${platStyle.btn}`}
              >
                <span>Direct RSVP Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : !isChiTribeSource ? (
              <a
                href={event.url}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs active:scale-95 ${platStyle.btn}`}
              >
                <span>RSVP & View Details</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => onViewDetails && onViewDetails(event)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs active:scale-95 ${platStyle.btn}`}
              >
                <span>View Full Details</span>
              </button>
            )}

            {/* In-app details view button */}
            {onViewDetails && (directLink || !isChiTribeSource) && (
              <button
                type="button"
                onClick={() => onViewDetails(event)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
              >
                <span>Full Details</span>
              </button>
            )}

            {/* Secondary Cross-Posted RSVP Links */}
            {event.secondaryUrls && event.secondaryUrls.map((sec, idx) => (
              <a
                key={idx}
                href={sec.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
                title={`Also cross-posted on ${sec.platform}`}
              >
                <span>Also on {sec.platform}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>

          {/* Secondary Actions: Calendars, Bookmarking, Sharing, Copy */}
          <div className="flex items-center gap-1.5">
            {/* Add to Google Calendar */}
            {googleCalendarUrl && (
              <a
                href={googleCalendarUrl}
                target="_blank"
                rel="noreferrer"
                title="Add to Google Calendar"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-medium border border-slate-200 transition"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Google Cal</span>
              </a>
            )}

            {/* Download .ICS */}
            {event.eventDate && (
              <button
                onClick={handleDownloadIcs}
                title="Download .ICS for Apple / Outlook Calendar"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-medium border border-slate-200 transition"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">.ICS</span>
              </button>
            )}

            {/* Bookmark button */}
            {onToggleBookmark && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(event.id);
                }}
                title={isBookmarked ? 'Remove bookmark' : 'Bookmark event'}
                className={`p-2 rounded-lg border transition ${
                  isBookmarked
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 border-slate-200'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-emerald-600 text-emerald-600' : ''}`} />
              </button>
            )}

            {/* Share button */}
            {onShare && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(event);
                }}
                title="Share event invite"
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Copy link */}
            <button
              onClick={handleCopy}
              title="Copy event link"
              className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Cover / Flyer Thumbnail if available */}
      {event.imageUrl && (
        <div className="hidden lg:block w-44 bg-slate-100 flex-shrink-0 relative overflow-hidden">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
          />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-white/10" />
        </div>
      )}
    </div>
  );
};

