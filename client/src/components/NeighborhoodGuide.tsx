import React from 'react';
import { MapPin, Navigation, Train, ExternalLink, Calendar, Users, Building2, ChevronRight } from 'lucide-react';
import { CommunityEvent } from '../types';

export interface NeighborhoodInfo {
  id: string;
  name: string;
  displayName: string;
  tagline: string;
  transit: string;
  color: string;
  venues: string[];
  description: string;
}

export const CHICAGO_NEIGHBORHOODS: NeighborhoodInfo[] = [
  {
    id: 'Lakeview',
    name: 'Lakeview',
    displayName: 'Lakeview & Lincoln Park',
    tagline: 'Vibrant hub for young Jewish professionals & Shabbat dinners',
    transit: 'CTA Red / Brown / Purple Lines (Belmont, Wellington, Fullerton)',
    color: 'from-emerald-500/10 to-teal-500/10 border-emerald-300',
    venues: [
      'Moishe House Lakeview',
      'Moishe House Lincoln Park',
      'Chabad East Lakeview / YJP',
      'Mishkan Chicago HQ',
      'Silverstein Base Lincoln Park',
      'Anshe Emet Synagogue / YAD',
    ],
    description:
      'Home to the highest concentration of Jewish 20s and 30s in Chicago, featuring weekly Friday night dinners, social mixers, learning circles, and holiday bashes.',
  },
  {
    id: 'Loop',
    name: 'Loop',
    displayName: 'The Loop & West Loop',
    tagline: 'Downtown professionals, lunch & learns, and loft gatherings',
    transit: 'CTA All Loop ' + 'L' + ' Lines (Clark/Lake, Washington/Wells) & Morgan Pink/Green',
    color: 'from-blue-500/10 to-indigo-500/10 border-blue-300',
    venues: [
      'Silverstein Base Loop',
      'Chabad of the Loop & Downtown',
      'Metro Chicago Hillel Central',
      'Chicago Loop Synagogue',
    ],
    description:
      'Downtown gatherings, rooftop mixers, after-work drinks, and home-cooked dinners in Fulton Market, West Loop, and the Loop.',
  },
  {
    id: 'Wicker Park',
    name: 'Wicker Park',
    displayName: 'Wicker Park & Bucktown',
    tagline: 'Creative community, arts, social justice, and indie Shabbatot',
    transit: 'CTA Blue Line (Damen, Division, Western)',
    color: 'from-amber-500/10 to-orange-500/10 border-amber-300',
    venues: [
      'Moishe House Wicker Park',
      'Chabad Bucktown / Wicker Park',
      'JCUA (Jewish Council on Urban Affairs)',
    ],
    description:
      'Hip Northwest-side gatherings uniting arts, social action, creative Shabbat dinners, and backyard acoustic Havdalahs.',
  },
  {
    id: 'Streeterville',
    name: 'Streeterville',
    displayName: 'Streeterville & Gold Coast',
    tagline: 'Lakeside gatherings, medical/grad student socials, and mixers',
    transit: 'CTA Red Line (Chicago, Grand) & Lake Shore Drive Express buses',
    color: 'from-cyan-500/10 to-sky-500/10 border-cyan-300',
    venues: [
      'Moishe Pod Streeterville',
      'Chabad of Gold Coast & Downtown',
      'Feinberg & Northwestern Law Jewish Student Groups',
    ],
    description:
      'Lakeside brunches, grad student Shabbat dinners, and social meetups near the lakefront and Michigan Avenue.',
  },
  {
    id: 'Hyde Park',
    name: 'Hyde Park',
    displayName: 'Hyde Park & South Side',
    tagline: 'Intellectual salons, historic synagogues, and university community',
    transit: 'Metra Electric (55th-56th-57th St) & CTA #6 Jackson Park Express',
    color: 'from-purple-500/10 to-pink-500/10 border-purple-300',
    venues: [
      'KAM Isaiah Israel',
      'Congregation Rodfei Zedek',
      'UChicago Newberger Hillel',
    ],
    description:
      'Scholarly discussions, environmental food justice gardens, and intimate community gatherings around the University of Chicago.',
  },
  {
    id: 'Evanston',
    name: 'Evanston',
    displayName: 'Evanston, Skokie & North Shore',
    tagline: 'North suburban learning, kosher dining, and community centers',
    transit: 'CTA Purple Line (Davis) & Metra UP-North',
    color: 'from-rose-500/10 to-red-500/10 border-rose-300',
    venues: [
      'Chabad of Evanston',
      'Northwestern Fiedler Hillel',
      'North Suburban Synagogue Beth El',
      'NSL Chabad',
    ],
    description:
      'Vibrant college town and suburban Jewish life with extensive adult learning, holiday events, and regional community programs.',
  },
];

interface NeighborhoodGuideProps {
  events: CommunityEvent[];
  selectedNeighborhood: string;
  onSelectNeighborhood: (hood: string) => void;
}

export const NeighborhoodGuide: React.FC<NeighborhoodGuideProps> = ({
  events,
  selectedNeighborhood,
  onSelectNeighborhood,
}) => {
  // Compute event counts per neighborhood
  const countByHood = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of events) {
      if (e.neighborhood) {
        map[e.neighborhood] = (map[e.neighborhood] || 0) + 1;
      }
    }
    return map;
  }, [events]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <span>Chicago Jewish Neighborhood Guide &amp; Venues</span>
          </h3>
          <p className="text-xs text-slate-500">
            Explore where gatherings happen across the city. Click any neighborhood card to filter events.
          </p>
        </div>

        {selectedNeighborhood !== 'ALL' && (
          <button
            onClick={() => onSelectNeighborhood('ALL')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline self-start sm:self-auto"
          >
            Show All Neighborhoods
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CHICAGO_NEIGHBORHOODS.map((hood) => {
          const isSelected = selectedNeighborhood.toLowerCase() === hood.name.toLowerCase();
          const count = countByHood[hood.name] || 0;

          return (
            <div
              key={hood.id}
              onClick={() => onSelectNeighborhood(isSelected ? 'ALL' : hood.name)}
              className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between space-y-3 bg-white hover:shadow-md ${
                isSelected
                  ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{hood.displayName}</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{hood.tagline}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold flex-shrink-0 ${
                      count > 0
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count} {count === 1 ? 'event' : 'events'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {hood.description}
                </p>

                {/* Key Venues */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Key Community Hosts &amp; Venues:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {hood.venues.slice(0, 4).map((v) => (
                      <span
                        key={v}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium"
                      >
                        {v}
                      </span>
                    ))}
                    {hood.venues.length > 4 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-500 font-semibold">
                        +{hood.venues.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Transit Note & Filter Action */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1 text-slate-500 truncate max-w-[200px]" title={hood.transit}>
                  <Train className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                  <span className="truncate">{hood.transit.split('(')[0]}</span>
                </div>
                <span className={`font-bold inline-flex items-center gap-0.5 ${isSelected ? 'text-emerald-700' : 'text-slate-600'}`}>
                  <span>{isSelected ? 'Active Filter' : 'Filter Events'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
