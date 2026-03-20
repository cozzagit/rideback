'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { createRoot } from 'react-dom/client';
import { MapPin, Clock, Users, Car, ArrowRight } from 'lucide-react';
import { formatCurrency, formatTime } from '@/lib/utils';

interface TripPopupProps {
  map: mapboxgl.Map | null;
  trip: {
    id: string;
    originCity: string;
    destinationCity: string;
    departureAt: string;
    seatsAvailable: number;
    pricePerSeat: number;
    companyName: string;
    vehicle: string;
  } | null;
  lngLat: mapboxgl.LngLat | null;
  onClose: () => void;
}

function PopupContent({ trip }: { trip: TripPopupProps['trip'] }) {
  if (!trip) return null;
  return (
    <div className="p-4 min-w-[240px]">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-sm font-semibold text-white">{trip.originCity}</span>
        <ArrowRight className="h-3 w-3 text-slate-600" />
        <MapPin className="h-3.5 w-3.5 text-emerald-500" />
        <span className="text-sm font-semibold text-white">{trip.destinationCity}</span>
      </div>
      <div className="space-y-1.5 text-xs text-slate-400 mb-3">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" /> {formatTime(trip.departureAt)}
        </div>
        <div className="flex items-center gap-1.5">
          <Car className="h-3 w-3" /> {trip.vehicle}
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-3 w-3" /> {trip.seatsAvailable} {trip.seatsAvailable === 1 ? 'posto' : 'posti'}
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-slate-700">
        <div>
          <span className="text-base font-bold text-amber-500">{formatCurrency(trip.pricePerSeat)}</span>
          <span className="text-xs text-slate-500 ml-1">/posto</span>
        </div>
        <a
          href={`/trips/${trip.id}`}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
        >
          Dettagli
        </a>
      </div>
      <div className="mt-2 text-[11px] text-slate-500">{trip.companyName}</div>
    </div>
  );
}

export function TripPopup({ map, trip, lngLat, onClose }: TripPopupProps) {
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  useEffect(() => {
    if (!map || !trip || !lngLat) {
      popupRef.current?.remove();
      return;
    }

    popupRef.current?.remove();

    const container = document.createElement('div');
    const root = createRoot(container);
    root.render(<PopupContent trip={trip} />);

    popupRef.current = new mapboxgl.Popup({ closeButton: true, maxWidth: '320px', offset: 15 })
      .setLngLat(lngLat)
      .setDOMContent(container)
      .addTo(map);

    popupRef.current.on('close', onClose);

    return () => {
      popupRef.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, trip, lngLat, onClose]);

  return null;
}

export default TripPopup;
