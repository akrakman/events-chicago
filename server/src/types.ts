export type PlatformType = 'LINKTREE' | 'PARTIFUL' | 'CHITRIBE' | 'MISHKAN' | 'CHABAD' | 'SOCIAL' | 'GENERIC';
export type ItemType = 'LINK' | 'EVENT' | 'SOCIAL' | 'MEDIA';
export type ScrapeMethod = 'CHEERIO_NEXT_DATA' | 'CHEERIO_STATIC' | 'PLAYWRIGHT';
export type JobStatus = 'COMPLETED' | 'FAILED' | 'RUNNING';

export interface ParsedItem {
  title: string;
  url: string;
  itemType: ItemType;
  platform: string;
  description?: string | null;
  imageUrl?: string | null;
  icon?: string | null;
  eventDate?: string | null;
  eventDateStr?: string | null;
  eventEndDate?: string | null;
  location?: string | null;
  hostName?: string | null;
  rsvpCount?: number | null;
  isPinned?: boolean;
  metadata?: Record<string, any> | null;
}

export interface ScrapeResult {
  url: string;
  platform: PlatformType;
  method: ScrapeMethod;
  durationMs: number;
  title?: string | null;
  description?: string | null;
  author?: string | null;
  avatarUrl?: string | null;
  rawPayload?: string | null;
  items: ParsedItem[];
  errorMessage?: string | null;
}

export type ScrapeModePreference = 'auto' | 'cheerio' | 'playwright';
