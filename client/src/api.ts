import { CommunityEvent, MonitoredSource, SyncStatus } from './types';

const API_BASE = '/api';

export interface AvailableFilters {
  organizations: string[];
  orgGroups: string[];
  neighborhoods: string[];
  categories: string[];
}

export async function fetchUpcomingEvents(params?: {
  filter?: 'upcoming' | 'all' | 'past' | 'weekend' | 'week' | 'month';
  search?: string;
  platform?: string;
  organization?: string;
  neighborhood?: string;
  category?: string;
}): Promise<{
  events: CommunityEvent[];
  total: number;
  filter: string;
  availableFilters?: AvailableFilters;
}> {
  const query = new URLSearchParams();
  if (params?.filter) query.set('filter', params.filter);
  if (params?.search) query.set('search', params.search);
  if (params?.platform && params.platform !== 'ALL') query.set('platform', params.platform);
  if (params?.organization && params.organization !== 'ALL') query.set('organization', params.organization);
  if (params?.neighborhood && params.neighborhood !== 'ALL') query.set('neighborhood', params.neighborhood);
  if (params?.category && params.category !== 'ALL') query.set('category', params.category);

  const res = await fetch(`${API_BASE}/events/upcoming?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch events');
  return await res.json();
}

export async function fetchSources(): Promise<MonitoredSource[]> {
  const res = await fetch(`${API_BASE}/sources`);
  if (!res.ok) throw new Error('Failed to fetch monitored sources');
  const data = await res.json();
  return data.sources || [];
}

export async function addSource(url: string, name?: string): Promise<MonitoredSource> {
  const res = await fetch(`${API_BASE}/sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to add source');
  return data.source;
}

export async function deleteSource(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/sources/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete source');
}

export async function triggerSync(): Promise<{ success: boolean; results?: any[] }> {
  const res = await fetch(`${API_BASE}/sources/sync`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger synchronization');
  return await res.json();
}

export async function fetchSyncStatus(): Promise<SyncStatus> {
  const res = await fetch(`${API_BASE}/sync/status`);
  if (!res.ok) throw new Error('Failed to fetch sync status');
  return await res.json();
}
