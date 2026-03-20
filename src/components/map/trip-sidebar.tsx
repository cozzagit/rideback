'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Clock,
  MapPin,
  Car,
  Users,
} from 'lucide-react';

interface TripCard {
  id: string;
  originCity: string;
  destinationCity: string;
  departureAt: string;
  estimatedArrivalAt: string;
  seatsAvailable: number;
  pricePerSeat: number;
  companyName: string;
  vehicle: string;
}

interface TripSidebarProps {
  trips: TripCard[];
  selectedTripId?: string | null;
  onTripSelect?: (trip: TripCard) => void;
  isLoading?: boolean;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function SeatIndicator({ available }: { available: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${
            i < available ? 'bg-amber-400' : 'bg-slate-700'
          }`}
        />
      ))}
    </div>
  );
}

function TripCardComponent({
  trip,
  isSelected,
  onClick,
  index,
}: {
  trip: TripCard;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 animate-fade-in ${
        isSelected
          ? 'bg-slate-800/80 border-amber-500/50 shadow-lg shadow-amber-500/10'
          : 'bg-slate-800/40 border-slate-700/30 hover:border-amber-500/30 hover:bg-slate-800/60'
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Route */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        <span className="text-sm font-bold text-white">
          {trip.originCity}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
          className="shrink-0"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-bold text-white">
          {trip.destinationCity}
        </span>
      </div>

      {/* Time + Vehicle row */}
      <div className="flex items-center gap-4 mb-3 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {formatTime(trip.departureAt)} — {formatTime(trip.estimatedArrivalAt)}
        </span>
        <span className="flex items-center gap-1">
          <Car size={12} />
          {trip.vehicle}
        </span>
      </div>

      {/* Bottom row: price + seats + company */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-extrabold text-amber-400">
            {formatPrice(trip.pricePerSeat)}
          </span>
          <span className="text-[10px] text-slate-600 uppercase">/posto</span>
        </div>

        <div className="flex items-center gap-2">
          <SeatIndicator available={trip.seatsAvailable} />
          <span className="text-xs text-slate-500">
            {trip.seatsAvailable} {trip.seatsAvailable === 1 ? 'posto' : 'posti'}
          </span>
        </div>
      </div>

      {/* Company name */}
      <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-1">
        <Users size={10} />
        {trip.companyName}
      </div>
    </button>
  );
}

export default function TripSidebar({
  trips,
  selectedTripId,
  onTripSelect,
  isLoading,
}: TripSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to selected trip
  useEffect(() => {
    if (selectedTripId && sidebarRef.current) {
      const el = sidebarRef.current.querySelector(
        `[data-trip-id="${selectedTripId}"]`,
      );
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedTripId]);

  if (trips.length === 0 && !isLoading) return null;

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:block absolute top-4 right-4 bottom-20 w-96 z-20">
        <div className="h-full bg-slate-900/85 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl shadow-black/50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-700/40">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Viaggi disponibili</h2>
              <span className="text-xs text-amber-400 font-semibold">
                {trips.length}
              </span>
            </div>
          </div>

          {/* Trip list */}
          <div
            ref={sidebarRef}
            className="flex-1 overflow-y-auto p-3 space-y-2"
            style={{ scrollbarWidth: 'thin' }}
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-500">Caricamento viaggi...</p>
              </div>
            ) : (
              trips.map((trip, i) => (
                <div key={trip.id} data-trip-id={trip.id}>
                  <TripCardComponent
                    trip={trip}
                    isSelected={selectedTripId === trip.id}
                    onClick={() => onTripSelect?.(trip)}
                    index={i}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <div
        className={`md:hidden fixed bottom-20 left-0 right-0 z-20 transition-all duration-300 ${
          isExpanded ? 'max-h-[60vh]' : 'max-h-[72px]'
        }`}
      >
        <div className="bg-slate-900/90 backdrop-blur-xl border-t border-slate-700/50 rounded-t-2xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden h-full">
          {/* Drag handle + header */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between shrink-0"
          >
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-amber-400" />
              <span className="text-sm font-bold text-white">
                {trips.length} {trips.length === 1 ? 'viaggio' : 'viaggi'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {!isExpanded && trips.length > 0 && (
                <span className="text-xs text-slate-500">
                  da{' '}
                  <span className="text-amber-400 font-semibold">
                    {formatPrice(
                      Math.min(...trips.map((t) => t.pricePerSeat)),
                    )}
                  </span>
                </span>
              )}
              {isExpanded ? (
                <ChevronDown size={16} className="text-slate-400" />
              ) : (
                <ChevronUp size={16} className="text-slate-400" />
              )}
            </div>
          </button>

          {/* Drag indicator */}
          <div className="flex justify-center -mt-1 mb-1">
            <div className="w-8 h-1 rounded-full bg-slate-700" />
          </div>

          {/* Trip cards */}
          {isExpanded && (
            <div
              className="flex-1 overflow-y-auto p-3 space-y-2"
              style={{ scrollbarWidth: 'thin' }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                trips.map((trip, i) => (
                  <div key={trip.id} data-trip-id={trip.id}>
                    <TripCardComponent
                      trip={trip}
                      isSelected={selectedTripId === trip.id}
                      onClick={() => onTripSelect?.(trip)}
                      index={i}
                    />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
