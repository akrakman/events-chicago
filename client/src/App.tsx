import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { EventCard } from './components/EventCard';
import { EventFilters, DateFilterType } from './components/EventFilters';
import { SourcesModal } from './components/SourcesModal';
import { ShareModal } from './components/ShareModal';
import { CalendarSubscribeModal } from './components/CalendarSubscribeModal';
import { EventDetailModal } from './components/EventDetailModal';
import {
  fetchUpcomingEvents,
  fetchSources,
  fetchSyncStatus,
  triggerSync,
  addSource,
  deleteSource,
  AvailableFilters,
} from './api';
import { CommunityEvent, MonitoredSource, SyncStatus } from './types';
import { Calendar, RefreshCw, Sparkles, Inbox, AlertCircle, MapPin, Bookmark } from 'lucide-react';

const SAVED_STORAGE_KEY = 'jewish_events_saved_ids';

export const App: React.FC = () => {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [sources, setSources] = useState<MonitoredSource[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  // Filters
  const [filter, setFilter] = useState<DateFilterType>('upcoming');
  const [search, setSearch] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [selectedOrganization, setSelectedOrganization] = useState<string>('ALL');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Available filter options returned by backend
  const [availableFilters, setAvailableFilters] = useState<AvailableFilters>({
    organizations: [],
    orgGroups: [],
    neighborhoods: [],
    categories: [],
  });

  // Bookmarking / Saved Events
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(SAVED_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // UI Modals
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState<boolean>(false);
  const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState<boolean>(false);
  const [sharingEvent, setSharingEvent] = useState<CommunityEvent | null>(null);
  const [viewingEvent, setViewingEvent] = useState<CommunityEvent | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const toggleBookmark = (id: string) => {
    setSavedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleClearFilters = () => {
    setFilter('upcoming');
    setSearch('');
    setSelectedPlatform('ALL');
    setSelectedOrganization('ALL');
    setSelectedNeighborhood('ALL');
    setSelectedCategory('ALL');
  };

  // Load events from backend
  const loadEvents = useCallback(async () => {
    try {
      // If user selected "saved", fetch all events and filter on client
      const apiFilter = filter === 'saved' ? 'all' : filter;

      const data = await fetchUpcomingEvents({
        filter: apiFilter,
        search: search || undefined,
        platform: selectedPlatform !== 'ALL' ? selectedPlatform : undefined,
        organization: selectedOrganization !== 'ALL' ? selectedOrganization : undefined,
        neighborhood: selectedNeighborhood !== 'ALL' ? selectedNeighborhood : undefined,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
      });

      let processedEvents = data.events;

      if (filter === 'saved') {
        processedEvents = processedEvents.filter((e) => savedIds.includes(e.id));
      }

      setEvents(processedEvents);
      setTotalCount(data.total);

      if (data.availableFilters) {
        setAvailableFilters(data.availableFilters);
      }
    } catch (err: any) {
      console.error('Failed to load events:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filter, search, selectedPlatform, selectedOrganization, selectedNeighborhood, selectedCategory, savedIds]);

  // Load sources & sync status
  const loadMetadata = useCallback(async () => {
    try {
      const [srcs, status] = await Promise.all([
        fetchSources().catch(() => []),
        fetchSyncStatus().catch(() => null),
      ]);
      setSources(srcs);
      setSyncStatus(status);
    } catch {}
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    loadMetadata();
    const interval = setInterval(loadMetadata, 30000);
    return () => clearInterval(interval);
  }, [loadMetadata]);

  // Manual trigger sync
  const handleSyncNow = async () => {
    setSyncStatus((prev) =>
      prev ? { ...prev, isSyncing: true } : { isSyncing: true, lastPolledAt: null, totalEvents: events.length }
    );
    try {
      await triggerSync();
      const status = await fetchSyncStatus().catch(() => null);
      if (status) setSyncStatus(status);
      await Promise.all([loadEvents(), loadMetadata()]);
    } catch (err: any) {
      setErrorNotice(err.message || 'Sync failed');
      setSyncStatus((prev) => (prev ? { ...prev, isSyncing: false } : null));
    }
  };

  // While syncing is active, poll sync status every 2s and refresh events on completion
  useEffect(() => {
    if (!syncStatus?.isSyncing) return;
    const interval = setInterval(async () => {
      try {
        const status = await fetchSyncStatus();
        setSyncStatus(status);
        if (!status.isSyncing) {
          await Promise.all([loadEvents(), loadMetadata()]);
        }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [syncStatus?.isSyncing, loadEvents, loadMetadata]);

  const handleAddSource = async (url: string, name?: string) => {
    await addSource(url, name);
    await Promise.all([loadMetadata(), loadEvents()]);
  };

  const handleDeleteSource = async (id: string) => {
    await deleteSource(id);
    await Promise.all([loadMetadata(), loadEvents()]);
  };

  // Distinct platform options
  const platformOptions = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.platform) set.add(e.platform);
    });
    return Array.from(set).sort();
  }, [events]);

  const nearestEvent = events.find((e) => e.eventDate);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <Header
        syncStatus={syncStatus}
        onSync={handleSyncNow}
        onOpenSources={() => setIsSourcesModalOpen(true)}
        onOpenSubscribe={() => setIsSubscribeModalOpen(true)}
        sourcesCount={sources.length}
        upcomingCount={totalCount}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Error notification banner */}
        {errorNotice && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
              <span>{errorNotice}</span>
            </div>
            <button
              onClick={() => setErrorNotice(null)}
              className="text-xs uppercase font-bold text-rose-700 hover:text-rose-900"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Community Intro Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 border border-slate-200/90 p-5 sm:p-6 shadow-xs">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Community Calendar
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500 font-medium">Chicago Jewish Gatherings</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Jewish Events
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                Aggregated daily from Chicago Moishe Houses, Moishe Pods, Silverstein Base, Anshe Emet YAD, JCUA, and grassroots organizers.
                Filter by organization, neighborhood, or weekend plans, and subscribe to your phone calendar.
              </p>
            </div>

            {nearestEvent && (
              <div className="bg-white/95 border border-slate-200/80 shadow-xs rounded-xl px-4 py-3 flex-shrink-0 text-right hidden lg:block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Next Upcoming Event
                </span>
                <span className="text-xs font-bold text-emerald-700 truncate max-w-[200px] block mt-0.5">
                  {nearestEvent.title}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {nearestEvent.eventDate ? new Date(nearestEvent.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Soon'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Filter Controls (Tabs, Organization, Neighborhood, Category, Search) */}
        <EventFilters
          filter={filter}
          onFilterChange={setFilter}
          search={search}
          onSearchChange={setSearch}
          selectedPlatform={selectedPlatform}
          onPlatformChange={setSelectedPlatform}
          platforms={platformOptions}
          selectedOrganization={selectedOrganization}
          onOrganizationChange={setSelectedOrganization}
          organizations={availableFilters.organizations}
          orgGroups={availableFilters.orgGroups}
          selectedNeighborhood={selectedNeighborhood}
          onNeighborhoodChange={setSelectedNeighborhood}
          neighborhoods={availableFilters.neighborhoods}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categories={availableFilters.categories}
          savedCount={savedIds.length}
          total={totalCount}
          onClearFilters={handleClearFilters}
        />

        {/* Event List Feed */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-36 bg-slate-200/50 border border-slate-200/80 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
              <Inbox className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                {filter === 'saved'
                  ? 'No bookmarked events yet'
                  : filter === 'past'
                  ? 'No past events found'
                  : 'No upcoming events match your selected filters'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {filter === 'saved'
                  ? 'Click the bookmark icon on any event card to save it for easy reference.'
                  : 'Try resetting your filters or check back after the daily poll.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Reset All Filters
              </button>
              <button
                onClick={handleSyncNow}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Poll Sources Now
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((evt) => (
              <EventCard
                key={evt.id}
                event={evt}
                isBookmarked={savedIds.includes(evt.id)}
                onToggleBookmark={toggleBookmark}
                onShare={(e) => setSharingEvent(e)}
                onViewDetails={(e) => setViewingEvent(e)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Monitored Sources Modal */}
      <SourcesModal
        isOpen={isSourcesModalOpen}
        onClose={() => setIsSourcesModalOpen(false)}
        sources={sources}
        onAddSource={handleAddSource}
        onDeleteSource={handleDeleteSource}
        onSync={handleSyncNow}
        isSyncing={syncStatus?.isSyncing ?? false}
      />

      {/* Calendar Subscription Feed Modal */}
      <CalendarSubscribeModal
        isOpen={isSubscribeModalOpen}
        onClose={() => setIsSubscribeModalOpen(false)}
      />

      {/* Share / WhatsApp Invite Modal */}
      <ShareModal
        event={sharingEvent}
        onClose={() => setSharingEvent(null)}
      />

      {/* Event Details In-App Modal */}
      <EventDetailModal
        isOpen={!!viewingEvent}
        event={viewingEvent}
        onClose={() => setViewingEvent(null)}
        isBookmarked={viewingEvent ? savedIds.includes(viewingEvent.id) : false}
        onToggleBookmark={toggleBookmark}
        onShare={(e) => {
          setViewingEvent(null);
          setSharingEvent(e);
        }}
      />
    </div>
  );
};
