import React, { useEffect, useState } from 'react';
import { Flame, Moon, Sparkles, Calendar, ChevronRight, Check } from 'lucide-react';
import { getChicagoShabbatTimes, ShabbatInfo } from '../utils/shabbatTimes';

interface ShabbatTimesBannerProps {
  onFilterShabbat: () => void;
  isShabbatActive: boolean;
  shabbatCount: number;
}

export const ShabbatTimesBanner: React.FC<ShabbatTimesBannerProps> = ({
  onFilterShabbat,
  isShabbatActive,
  shabbatCount,
}) => {
  const [info, setInfo] = useState<ShabbatInfo | null>(null);

  useEffect(() => {
    getChicagoShabbatTimes().then(setInfo).catch(() => {});
  }, []);

  return (
    <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/70 p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Side: Candle Lighting & Havdalah Times */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100/80 text-amber-900 border border-amber-300/80">
              <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              <span>Chicago Shabbat Times</span>
            </span>
            {info?.parsha && (
              <span className="text-xs text-amber-800 font-semibold hidden sm:inline">
                • {info.parsha}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-xs">
            <div className="flex items-center gap-1.5 text-slate-800">
              <span className="text-slate-500 font-medium">Candle Lighting ({info?.fridayDateStr || 'Fri'}):</span>
              <strong className="text-amber-900 font-extrabold text-sm">
                {info?.candleLightingStr || '5:32 PM'}
              </strong>
            </div>

            <span className="text-slate-300 hidden sm:inline">•</span>

            <div className="flex items-center gap-1.5 text-slate-800">
              <span className="text-slate-500 font-medium">Havdalah ({info?.saturdayDateStr || 'Sat'}):</span>
              <strong className="text-indigo-900 font-extrabold text-sm">
                {info?.havdalahStr || '6:34 PM'}
              </strong>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Action Button to filter Shabbat Gatherings */}
        <button
          type="button"
          onClick={onFilterShabbat}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-xs whitespace-nowrap self-stretch md:self-auto justify-center ${
            isShabbatActive
              ? 'bg-amber-800 text-white shadow-amber-900/20'
              : 'bg-white hover:bg-amber-100/60 text-amber-900 border border-amber-300 hover:border-amber-400'
          }`}
        >
          {isShabbatActive ? (
            <>
              <Check className="w-3.5 h-3.5 text-amber-300 stroke-[3]" />
              <span>Showing Shabbat Gatherings ({shabbatCount})</span>
            </>
          ) : (
            <>
              <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              <span>Find Friday Dinners &amp; Shabbat ({shabbatCount})</span>
              <ChevronRight className="w-3.5 h-3.5 text-amber-700" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
