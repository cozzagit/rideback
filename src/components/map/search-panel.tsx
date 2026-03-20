'use client';

import { useState, useCallback } from 'react';
import { Search, MapPin, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  placeName: string;
  center: [number, number];
  text: string;
}

interface SearchPanelProps {
  onSearch: (origin?: { lat: number; lng: number }, destination?: { lat: number; lng: number }) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function SearchPanel({ onSearch, isOpen, onToggle }: SearchPanelProps) {
  const [originQuery, setOriginQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [originResults, setOriginResults] = useState<SearchResult[]>([]);
  const [destResults, setDestResults] = useState<SearchResult[]>([]);
  const [selectedOrigin, setSelectedOrigin] = useState<SearchResult | null>(null);
  const [selectedDest, setSelectedDest] = useState<SearchResult | null>(null);
  const [activeField, setActiveField] = useState<'origin' | 'destination' | null>(null);

  const geocode = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (query.length < 3) return [];
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  }, []);

  const handleOriginChange = async (value: string) => {
    setOriginQuery(value);
    setSelectedOrigin(null);
    if (value.length >= 3) {
      const results = await geocode(value);
      setOriginResults(results);
      setActiveField('origin');
    } else {
      setOriginResults([]);
    }
  };

  const handleDestChange = async (value: string) => {
    setDestQuery(value);
    setSelectedDest(null);
    if (value.length >= 3) {
      const results = await geocode(value);
      setDestResults(results);
      setActiveField('destination');
    } else {
      setDestResults([]);
    }
  };

  const selectOrigin = (result: SearchResult) => {
    setSelectedOrigin(result);
    setOriginQuery(result.text);
    setOriginResults([]);
    setActiveField(null);
    // Trigger search if both are selected
    if (selectedDest) {
      onSearch(
        { lat: result.center[1], lng: result.center[0] },
        { lat: selectedDest.center[1], lng: selectedDest.center[0] }
      );
    }
  };

  const selectDest = (result: SearchResult) => {
    setSelectedDest(result);
    setDestQuery(result.text);
    setDestResults([]);
    setActiveField(null);
    if (selectedOrigin) {
      onSearch(
        { lat: selectedOrigin.center[1], lng: selectedOrigin.center[0] },
        { lat: result.center[1], lng: result.center[0] }
      );
    }
  };

  const clearSearch = () => {
    setOriginQuery('');
    setDestQuery('');
    setSelectedOrigin(null);
    setSelectedDest(null);
    setOriginResults([]);
    setDestResults([]);
    onSearch();
  };

  return (
    <>
      {/* Desktop search panel */}
      <div className={cn(
        'hidden md:block absolute top-4 left-4 z-10 w-96',
        'rounded-2xl border border-slate-800 bg-slate-950/90 backdrop-blur-xl shadow-2xl shadow-black/30',
        'transition-all duration-300'
      )}>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Search className="h-4 w-4 text-amber-500" />
              Cerca viaggio
            </h2>
            {(selectedOrigin || selectedDest) && (
              <button onClick={clearSearch} className="text-xs text-slate-500 hover:text-white">
                Pulisci
              </button>
            )}
          </div>

          {/* Origin */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
            </div>
            <input
              type="text"
              placeholder="Da dove parti?"
              value={originQuery}
              onChange={(e) => handleOriginChange(e.target.value)}
              onFocus={() => originResults.length > 0 && setActiveField('origin')}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/50 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            {activeField === 'origin' && originResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-slate-700 bg-slate-900 shadow-xl z-20 max-h-48 overflow-y-auto">
                {originResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => selectOrigin(r)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white text-left"
                  >
                    <MapPin className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{r.placeName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Connector line */}
          <div className="flex items-center justify-center">
            <div className="h-4 w-px bg-slate-700 ml-[18px]" />
          </div>

          {/* Destination */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
            </div>
            <input
              type="text"
              placeholder="Dove vai?"
              value={destQuery}
              onChange={(e) => handleDestChange(e.target.value)}
              onFocus={() => destResults.length > 0 && setActiveField('destination')}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/50 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            {activeField === 'destination' && destResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-slate-700 bg-slate-900 shadow-xl z-20 max-h-48 overflow-y-auto">
                {destResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => selectDest(r)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white text-left"
                  >
                    <MapPin className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{r.placeName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search - collapsed button / expandable bottom sheet */}
      <div className="md:hidden">
        {!isOpen ? (
          <button
            onClick={onToggle}
            className="absolute bottom-24 left-4 right-4 z-10 flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-slate-700 bg-slate-950/90 backdrop-blur-xl shadow-2xl"
          >
            <Search className="h-5 w-5 text-amber-500" />
            <span className="text-sm text-slate-400">Dove vuoi andare?</span>
          </button>
        ) : (
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-slate-800 bg-slate-950 shadow-2xl animate-slide-up safe-area-bottom">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-slate-700" />
            </div>

            <div className="px-4 pb-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">Cerca viaggio</h2>
                <button onClick={onToggle} className="p-1.5 rounded-lg text-slate-500 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Origin */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                </div>
                <input
                  type="text"
                  placeholder="Da dove parti?"
                  value={originQuery}
                  onChange={(e) => handleOriginChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/50 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none"
                />
                {activeField === 'origin' && originResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-slate-700 bg-slate-900 shadow-xl z-20 max-h-36 overflow-y-auto">
                    {originResults.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => selectOrigin(r)}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 text-left"
                      >
                        <MapPin className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                        <span className="truncate">{r.placeName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Destination */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </div>
                <input
                  type="text"
                  placeholder="Dove vai?"
                  value={destQuery}
                  onChange={(e) => handleDestChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/50 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none"
                />
                {activeField === 'destination' && destResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-slate-700 bg-slate-900 shadow-xl z-20 max-h-36 overflow-y-auto">
                    {destResults.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => selectDest(r)}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 text-left"
                      >
                        <MapPin className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                        <span className="truncate">{r.placeName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default SearchPanel;
