import React from 'react';
import {
  Search,
  Calendar,
  History,
  Sparkles,
  X,
  Bookmark,
  Building2,
  MapPin,
  Tag,
  FilterX,
} from 'lucide-react';

export type DateFilterType = 'upcoming' | 'all' | 'past' | 'weekend' | 'week' | 'month' | 'saved';

interface EventFiltersProps {
  filter: DateFilterType;
  onFilterChange: (filter: DateFilterType) => void;
  search: string;
  onSearchChange: (search: string) => void;
  selectedPlatform: string;
  onPlatformChange: (platform: string) => void;
  platforms: string[];
  selectedOrganization: string;
  onOrganizationChange: (org: string) => void;
  organizations: string[];
  orgGroups: string[];
  selectedNeighborhood: string;
  onNeighborhoodChange: (hood: string) => void;
  neighborhoods: string[];
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  categories: string[];
  savedCount: number;
  total: number;
  onClearFilters: () => void;
}

export const EventFilters: React.FC<EventFiltersProps> = ({
  filter,
  onFilterChange,
  search,
  onSearchChange,
  selectedPlatform,
  onPlatformChange,
  platforms,
  selectedOrganization,
  onOrganizationChange,
  organizations,
  orgGroups,
  selectedNeighborhood,
  onNeighborhoodChange,
  neighborhoods,
  selectedCategory,
  onCategoryChange,
  categories,
  savedCount,
  total,
  onClearFilters,
}) => {
  const tabs: Array<{ id: DateFilterType; label: string; icon: any; count?: number }> = [
    { id: 'upcoming', label: 'All Upcoming', icon: Calendar },
    { id: 'weekend', label: 'This Weekend', icon: Sparkles },
    { id: 'week', label: 'Next 7 Days', icon: Calendar },
    { id: 'month', label: 'This Month', icon: Calendar },
    { id: 'saved', label: 'Saved', icon: Bookmark, count: savedCount },
    { id: 'past', label: 'Past Events', icon: History },
  ];

  const hasActiveFilters =
    search !== '' ||
    selectedPlatform !== 'ALL' ||
    selectedOrganization !== 'ALL' ||
    selectedNeighborhood !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    filter !== 'upcoming';

  return (
    <div className="space-y-3.5">
      {/* 1. Date Range Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        <div className="flex items-center gap-1 p-1 bg-slate-100/90 border border-slate-200/80 rounded-xl flex-shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onFilterChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab.id === 'saved' && savedCount > 0 ? 'text-emerald-600' : ''}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold ml-0.5">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition border border-slate-200"
          >
            <FilterX className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Filters</span>
          </button>
        )}
      </div>

      {/* 2. Filter Dropdowns Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search title, host, topic..."
            className="w-full pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs transition"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Organization Filter Dropdown */}
        <div className="relative">
          <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={selectedOrganization}
            onChange={(e) => onOrganizationChange(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs cursor-pointer truncate"
          >
            <option value="ALL">All Organizations</option>
            {orgGroups.length > 0 && (
              <optgroup label="Major Organizations">
                {orgGroups.map((g) => (
                  <option key={`group-${g}`} value={g}>
                    {g} (All)
                  </option>
                ))}
              </optgroup>
            )}
            {organizations.length > 0 && (
              <optgroup label="Specific Chapters & Houses">
                {organizations.map((org) => (
                  <option key={`org-${org}`} value={org}>
                    {org}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Neighborhood Filter Dropdown */}
        <div className="relative">
          <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={selectedNeighborhood}
            onChange={(e) => onNeighborhoodChange(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs cursor-pointer truncate"
          >
            <option value="ALL">All Neighborhoods</option>
            {neighborhoods.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* Platform Dropdown */}
        <div className="relative">
          <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={selectedPlatform}
            onChange={(e) => onPlatformChange(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs cursor-pointer truncate"
          >
            <option value="ALL">All Platforms</option>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Category Tags Bar */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-0.5">
          <button
            onClick={() => onCategoryChange('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition border ${
              selectedCategory === 'ALL'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onCategoryChange(isSelected ? 'ALL' : cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
