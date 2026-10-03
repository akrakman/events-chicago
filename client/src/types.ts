export type PlatformType = 'LINKTREE' | 'PARTIFUL' | 'CHITRIBE' | 'ONETABLE' | 'SOCIAL' | 'GENERIC';
export type ItemType = 'LINK' | 'EVENT' | 'SOCIAL' | 'MEDIA';
export type ScrapeMethod = 'CHEERIO_NEXT_DATA' | 'CHEERIO_STATIC' | 'PLAYWRIGHT';
export type JobStatus = 'COMPLETED' | 'FAILED' | 'RUNNING';

export interface CommunityEvent {
  id: string;
  title: string;
  url: string;
  itemType: 'EVENT' | 'LINK' | 'SOCIAL';
  platform: string;
  eventDate: string | null;
  eventDateStr: string | null;
  eventEndDate?: string | null;
  description: string | null;
  imageUrl: string | null;
  location: string | null;
  hostName: string | null;
  rsvpCount: number | null;
  isPinned: boolean;
  sourceName: string | null;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
  organization?: string;
  orgGroup?: string;
  neighborhood?: string | null;
  categories?: string[];
  secondaryUrls?: Array<{ platform: string; url: string; sourceName: string }>;
}

export interface MonitoredSource {
  id: string;
  url: string;
  name: string | null;
  platform: string;
  isActive: boolean;
  lastPolledAt: string | null;
  lastStatus: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    jobs: number;
  };
}

export interface SyncStatus {
  isSyncing: boolean;
  lastPolledAt: string | null;
  totalEvents: number;
}

export interface ExtractedItem {
  id: string;
  jobId: string;
  title: string;
  url: string;
  itemType: ItemType;
  platform: string;
  description?: string | null;
  imageUrl?: string | null;
  icon?: string | null;
  eventDate?: string | null;
  eventEndDate?: string | null;
  location?: string | null;
  hostName?: string | null;
  rsvpCount?: number | null;
  isPinned: boolean;
  metadata?: string | null;
  createdAt: string;
}

export interface ScrapeJob {
  id: string;
  url: string;
  platform: PlatformType;
  method: ScrapeMethod;
  status: JobStatus;
  durationMs: number;
  title?: string | null;
  description?: string | null;
  author?: string | null;
  avatarUrl?: string | null;
  errorMessage?: string | null;
  rawPayload?: string | null;
  items?: ExtractedItem[];
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AggregatorStats {
  totalJobs: number;
  totalItems: number;
  eventCount: number;
  linkCount: number;
  socialCount: number;
  platformStats: Array<{ platform: string; count: number }>;
}

export interface SampleUrl {
  label: string;
  url: string;
  platform: string;
  description: string;
}
