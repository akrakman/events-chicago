import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Bookmark,
  Sparkles,
  Link2,
  Share2,
} from 'lucide-react';
import { ExtractedItem } from '../types';

interface ItemCardProps {
  item: ExtractedItem;
  onDelete: (id: string) => void;
  viewMode?: 'grid' | 'list';
}

function getPlatformBadgeStyle(platform: string): { bg: string; text: string; border: string } {
  const p = platform.toUpperCase();
  if (p === 'LINKTREE') return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
  if (p === 'PARTIFUL') return { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/20' };
  if (p === 'TWITTER') return { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' };
  if (p === 'INSTAGRAM') return { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' };
  if (p === 'GITHUB') return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' };
  if (p === 'SPOTIFY') return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' };
  if (p === 'YOUTUBE') return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' };
  if (p === 'DISCORD') return { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' };
  return { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' };
}

function formatDate(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onDelete, viewMode = 'grid' }) => {
  const [copied, setCopied] = useState(false);
  const badgeStyle = getPlatformBadgeStyle(item.platform);
  const isEvent = item.itemType === 'EVENT';
  const isSocial = item.itemType === 'SOCIAL';
  const formattedDate = formatDate(item.eventDate);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const domain = (() => {
    try {
      return new URL(item.url).hostname.replace(/^www\./, '');
    } catch {
      return item.url;
    }
  })();

  if (viewMode === 'list') {
    return (
      <div className="group bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-xl p-3 sm:p-4 transition shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Thumbnail / Icon */}
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt=""
              className="w-10 h-10 rounded-lg object-cover border border-slate-800 flex-shrink-0"
              onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
            />
          ) : (
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${badgeStyle.bg} ${badgeStyle.border}`}>
              {isEvent ? (
                <Calendar className={`w-5 h-5 ${badgeStyle.text}`} />
              ) : isSocial ? (
                <Share2 className={`w-5 h-5 ${badgeStyle.text}`} />
              ) : (
                <Link2 className={`w-5 h-5 ${badgeStyle.text}`} />
              )}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                {item.platform}
              </span>
              {item.isPinned && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                  Pinned
                </span>
              )}
              {isEvent && item.rsvpCount != null && (
                <span className="text-[10px] text-fuchsia-400 bg-fuchsia-500/10 px-1.5 py-0.5 rounded">
                  {item.rsvpCount} RSVPs
                </span>
              )}
            </div>
            <h4 className="text-sm font-semibold text-slate-100 truncate group-hover:text-emerald-400 transition-colors">
              {item.title}
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
              <span>{domain}</span>
              {formattedDate && (
                <>
                  <span>•</span>
                  <span className="text-amber-400/90 font-medium">{formattedDate}</span>
                </>
              )}
              {item.location && (
                <>
                  <span>•</span>
                  <span className="truncate">{item.location}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* List actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleCopy}
            title="Copy URL"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            title="Open link"
            className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={() => onDelete(item.id)}
            title="Delete item"
            className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Grid Card View
  return (
    <div className="group bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-black/40 flex flex-col justify-between">
      <div>
        {/* Cover / Image if present */}
        {item.imageUrl && (
          <div className="relative h-36 w-full overflow-hidden bg-slate-950 border-b border-slate-800">
            <img
              src={item.imageUrl}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => ((e.target as HTMLElement).parentElement!.style.display = 'none')}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
            <div className="absolute top-2.5 left-2.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-md border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                {item.platform}
              </span>
            </div>
            {item.isPinned && (
              <div className="absolute top-2.5 right-2.5">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold backdrop-blur-md flex items-center gap-1">
                  <Bookmark className="w-3 h-3 fill-amber-300" />
                  Featured
                </span>
              </div>
            )}
          </div>
        )}

        <div className="p-4 sm:p-5 space-y-3">
          {/* Header if no cover image */}
          {!item.imageUrl && (
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                {item.platform}
              </span>
              {item.isPinned && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold flex items-center gap-1">
                  <Bookmark className="w-3 h-3 fill-amber-300" />
                  Featured
                </span>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <h4 className="text-base font-bold text-slate-100 group-hover:text-emerald-400 transition-colors line-clamp-2">
              {item.title}
            </h4>
            <p className="text-xs text-slate-500 mt-1 truncate font-mono">
              {domain}
            </p>
          </div>

          {/* Event Specific Attributes */}
          {isEvent && (
            <div className="space-y-1.5 pt-2 border-t border-slate-800/60 text-xs">
              {formattedDate && (
                <div className="flex items-center gap-2 text-amber-300 font-medium">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                  <span className="truncate">{formattedDate}</span>
                </div>
              )}

              {item.location && (
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-rose-400" />
                  <span className="truncate">{item.location}</span>
                </div>
              )}

              {item.hostName && (
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-slate-500">Host:</span>
                  <span className="text-slate-300 font-medium truncate">{item.hostName}</span>
                </div>
              )}

              {item.rsvpCount != null && (
                <div className="flex items-center gap-2 text-fuchsia-300 font-medium">
                  <Users className="w-3.5 h-3.5 flex-shrink-0 text-fuchsia-400" />
                  <span>{item.rsvpCount} People Attending</span>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {item.description && !isEvent && (
            <p className="text-xs text-slate-400 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="px-4 py-3 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
        >
          <span>Visit Page</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            title="Copy URL"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onDelete(item.id)}
            title="Delete from Feed"
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
