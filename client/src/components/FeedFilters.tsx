import React from 'react';
import { Search, Filter, LayoutGrid, List, Calendar, Link2, Share2, Sparkles, X } from 'lucide-react';
import { ItemType } from '../types';

interface FeedFiltersProps {
  selectedType: string;
  onSelectType: (type: string) => void;
  selectedPlatform: string;
  onSelectPlatform: (platform: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  platformOptions: string[];
  totalCount: number;
}

export const FeedFilters: React.FC<FeedFiltersProps> = ({
  selectedType,
  onSelectType,
  selectedPlatform,
  onSelectPlatform,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  platformOptions,
  totalCount,
}) => {
  const tabs = [
    { id: 'ALL', label: 'All Items', icon: Sparkles },
    { id: 'LINK', label: 'Links', icon: Link2 },
    { id: 'EVENT', label: 'Events', icon: Calendar },
    { id: 'SOCIAL', label: 'Socials', icon: Share2 },
  ];

  const hasActiveFilters = selectedType !== 'ALL' || selectedPlatform !== 'ALL' || searchQuery !== '';

  const handleClearFilters = () => {
    onSelectType('ALL');
    onSelectPlatform('ALL');
    onSearchChange('');
  };

  return (
    <div className="space-y-3">
      {/* Top Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectType(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Search & Controls */}
        <div className="flex items-center gap-2">
          {/* Search box */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search feed..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Platform Selector */}
          <div className="relative">
            <select
              value={selectedPlatform}
              onChange={(e) => onSelectPlatform(e.target.value)}
              className="py-1.5 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Platforms</option>
              {platformOptions.map((plat) => (
                <option key={plat} value={plat}>
                  {plat}
                </option>
              ))}
            </select>
          </div>

          {/* View switcher */}
          <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter summary status */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Showing <strong className="text-slate-200">{totalCount}</strong> items
          {selectedType !== 'ALL' && <span> in <strong className="text-emerald-400">{selectedType}</strong></span>}
          {selectedPlatform !== 'ALL' && <span> on <strong className="text-cyan-400">{selectedPlatform}</strong></span>}
        </span>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition"
          >
            <X className="w-3 h-3" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};
