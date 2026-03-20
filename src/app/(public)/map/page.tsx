'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { MapContainer } from '@/components/map/map-container';
import { DaySlider } from '@/components/map/day-slider';
import { SearchPanel } from '@/components/map/search-panel';
import { TripRouteLayer, ROUTE_COLORS } from '@/components/map/trip-route-layer';
import { TripPopup } from '@/components/map/trip-popup';
import { BookingPanel } from '@/components/map/booking-panel';
import { TripCard } from '@/components/trips/trip-card';
import { TopBar } from '@/components/layout/top-bar';
import { Spinner } from '@/components/ui/spinner';
import { Route } from 'lucide-react';

type PickupDropoff = { lat: number; lng: number; address?: string } | null;
type MapClickMode = 'none' | 'pickup' | 'dropoff';

export default function MapPage() {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [trips, setTrips] = useState<any>({ type: 'FeatureCollection', features: [] });
  const [loading, setLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [hoveredTripId, setHoveredTripId] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Popup state (quick info on click)
  const [popupTrip, setPopupTrip] = useState<any>(null);
  const [popupLngLat, setPopupLngLat] = useState<mapboxgl.LngLat | null>(null);

  // Booking panel state
  const [bookingTrip, setBookingTrip] = useState<any>(null);
  const [customPickup, setCustomPickup] = useState<PickupDropoff>(null);
  const [customDropoff, setCustomDropoff] = useState<PickupDropoff>(null);
  const [mapClickMode, setMapClickMode] = useState<MapClickMode>('none');

  // Markers for custom pickup/dropoff
  const pickupMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const dropoffMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const isBookingOpen = !!bookingTrip;

  // ── Auto-scroll sidebar ────────────────────────────────────────────────
  useEffect(() => {
    if (!hoveredTripId || !sidebarRef.current) return;
    const el = sidebarRef.current.querySelector(`[data-trip-id="${hoveredTripId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [hoveredTripId]);

  // ── Fetch trips ────────────────────────────────────────────────────────
  const fetchTrips = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/map?date=${date}`);
      const json = await res.json();
      setTrips(json.data || { type: 'FeatureCollection', features: [] });
    } catch (err) {
      console.error('Failed to fetch trips:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips(selectedDate);
  }, [selectedDate, fetchTrips]);

  const handleMapReady = useCallback((mapInstance: mapboxgl.Map) => {
    setMap(mapInstance);
  }, []);

  // ── Trip click → open booking panel ────────────────────────────────────
  const handleTripClick = useCallback((tripId: string, _lngLat: mapboxgl.LngLat) => {
    const feature = trips.features.find((f: any) => f.properties.id === tripId);
    if (!feature) return;

    const idx = trips.features.indexOf(feature);
    const p = feature.properties;

    setBookingTrip({
      id: p.id,
      originCity: p.originCity,
      originAddress: p.originAddress || p.originCity,
      originLat: parseFloat(p.originLat),
      originLng: parseFloat(p.originLng),
      destinationCity: p.destinationCity,
      destinationAddress: p.destinationAddress || p.destinationCity,
      destinationLat: parseFloat(p.destinationLat),
      destinationLng: parseFloat(p.destinationLng),
      departureAt: p.departureAt,
      estimatedArrivalAt: p.estimatedArrivalAt,
      seatsAvailable: typeof p.seatsAvailable === 'string' ? parseInt(p.seatsAvailable) : p.seatsAvailable,
      seatsBooked: typeof p.seatsBooked === 'string' ? parseInt(p.seatsBooked) : (p.seatsBooked || 0),
      pricePerSeat: typeof p.pricePerSeat === 'string' ? parseInt(p.pricePerSeat) : p.pricePerSeat,
      companyName: p.companyName,
      vehicle: p.vehicle,
      routeDistanceKm: parseFloat(p.routeDistanceKm || '0'),
      routeDurationMinutes: typeof p.routeDurationMinutes === 'string' ? parseInt(p.routeDurationMinutes) : (p.routeDurationMinutes || 0),
      routeColor: ROUTE_COLORS[idx % ROUTE_COLORS.length],
    });
    setCustomPickup(null);
    setCustomDropoff(null);
    setMapClickMode('none');
    setPopupTrip(null);
    setPopupLngLat(null);
  }, [trips]);

  // ── Sidebar card click → same as trip click ────────────────────────────
  const handleCardClick = useCallback((feature: any, index: number) => {
    const props = feature.properties;
    // Get coordinates midpoint for zoom
    const coords = feature.geometry.coordinates;
    const mid = coords[Math.floor(coords.length / 2)];
    const lngLat = new mapboxgl.LngLat(mid[0], mid[1]);
    handleTripClick(props.id, lngLat);

    // Zoom to trip route
    if (map) {
      const bounds = new mapboxgl.LngLatBounds();
      coords.forEach((c: number[]) => bounds.extend(c as [number, number]));
      map.fitBounds(bounds, { padding: { top: 80, bottom: 80, left: 420, right: 450 }, maxZoom: 12 });
    }
  }, [handleTripClick, map]);

  // ── Close booking panel ────────────────────────────────────────────────
  const closeBooking = useCallback(() => {
    setBookingTrip(null);
    setCustomPickup(null);
    setCustomDropoff(null);
    setMapClickMode('none');
    pickupMarkerRef.current?.remove();
    pickupMarkerRef.current = null;
    dropoffMarkerRef.current?.remove();
    dropoffMarkerRef.current = null;
  }, []);

  // ── Map click for custom pickup/dropoff ────────────────────────────────
  useEffect(() => {
    if (!map || mapClickMode === 'none') return;

    const handleClick = async (e: mapboxgl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;

      // Reverse geocode for address
      let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      try {
        const res = await fetch(
          `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&language=it&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
        );
        const data = await res.json();
        const feat = data.features?.[0];
        if (feat) {
          address = feat.properties?.full_address || feat.properties?.name || address;
        }
      } catch { /* keep coordinate fallback */ }

      const point = { lat, lng, address };

      if (mapClickMode === 'pickup') {
        setCustomPickup(point);

        // Update marker
        pickupMarkerRef.current?.remove();
        const el = document.createElement('div');
        el.innerHTML = '<div style="width:20px;height:20px;border-radius:50%;background:#f59e0b;border:3px solid #0f172a;box-shadow:0 2px 8px rgba(245,158,11,0.4)"></div>';
        pickupMarkerRef.current = new mapboxgl.Marker({ element: el, draggable: true })
          .setLngLat([lng, lat])
          .addTo(map);
        pickupMarkerRef.current.on('dragend', () => {
          const pos = pickupMarkerRef.current!.getLngLat();
          setCustomPickup({ lat: pos.lat, lng: pos.lng, address: `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}` });
        });
      } else {
        setCustomDropoff(point);

        dropoffMarkerRef.current?.remove();
        const el = document.createElement('div');
        el.innerHTML = '<div style="width:20px;height:20px;border-radius:50%;background:#10b981;border:3px solid #0f172a;box-shadow:0 2px 8px rgba(16,185,129,0.4)"></div>';
        dropoffMarkerRef.current = new mapboxgl.Marker({ element: el, draggable: true })
          .setLngLat([lng, lat])
          .addTo(map);
        dropoffMarkerRef.current.on('dragend', () => {
          const pos = dropoffMarkerRef.current!.getLngLat();
          setCustomDropoff({ lat: pos.lat, lng: pos.lng, address: `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}` });
        });
      }

      setMapClickMode('none');
    };

    map.getCanvas().style.cursor = 'crosshair';
    map.once('click', handleClick);

    return () => {
      map.getCanvas().style.cursor = '';
      map.off('click', handleClick);
    };
  }, [map, mapClickMode]);

  // ── Search ─────────────────────────────────────────────────────────────
  const handleSearch = useCallback(async (origin?: { lat: number; lng: number }, destination?: { lat: number; lng: number }) => {
    if (!origin && !destination) {
      fetchTrips(selectedDate);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ date: selectedDate });
      if (origin) {
        params.set('originLat', origin.lat.toString());
        params.set('originLng', origin.lng.toString());
      }
      if (destination) {
        params.set('destinationLat', destination.lat.toString());
        params.set('destinationLng', destination.lng.toString());
      }
      const res = await fetch(`/api/trips/search?${params}`);
      const json = await res.json();

      const features = (json.data || []).map((trip: any) => ({
        type: 'Feature',
        geometry: trip.routeGeometry,
        properties: {
          id: trip.id,
          originCity: trip.originCity,
          destinationCity: trip.destinationCity,
          departureAt: trip.departureAt,
          estimatedArrivalAt: trip.estimatedArrivalAt,
          seatsAvailable: trip.seatsAvailable - trip.seatsBooked,
          pricePerSeat: trip.pricePerSeat,
          companyName: trip.companyName,
          vehicle: `${trip.vehicleMake} ${trip.vehicleModel}`,
        },
      }));

      setTrips({ type: 'FeatureCollection', features });
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, fetchTrips]);

  const tripCount = trips.features.length;

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      <TopBar />

      {/* Day slider */}
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm px-2 py-2">
        <DaySlider selectedDate={selectedDate} onDateChange={setSelectedDate} />
      </div>

      {/* Map + sidebar */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Sidebar - trip list (desktop only, hidden when booking panel is open) */}
        {!isBookingOpen && (
          <div className="hidden lg:flex flex-col w-96 border-r border-slate-800 bg-slate-950/50 transition-all duration-300">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white">
                {loading ? 'Caricamento...' : `${tripCount} ${tripCount === 1 ? 'viaggio' : 'viaggi'} disponibili`}
              </h3>
            </div>
            <div ref={sidebarRef} className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Spinner />
                </div>
              )}
              {!loading && tripCount === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Route className="h-12 w-12 text-slate-700 mb-3" />
                  <p className="text-sm text-slate-500">Nessun viaggio per questa data</p>
                  <p className="text-xs text-slate-600 mt-1">Prova a selezionare un altro giorno</p>
                </div>
              )}
              {!loading && trips.features.map((f: any, i: number) => (
                <div
                  key={f.properties.id}
                  data-trip-id={f.properties.id}
                  onClick={() => handleCardClick(f, i)}
                  className="cursor-pointer"
                >
                  <TripCard
                    trip={f.properties}
                    compact
                    routeColor={ROUTE_COLORS[i % ROUTE_COLORS.length]}
                    isHovered={hoveredTripId === f.properties.id}
                    onMouseEnter={() => setHoveredTripId(f.properties.id)}
                    onMouseLeave={() => setHoveredTripId(null)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer onMapReady={handleMapReady} />

          <TripRouteLayer
            map={map}
            trips={trips}
            hoveredTripId={hoveredTripId || bookingTrip?.id}
            onTripClick={handleTripClick}
            onTripHover={setHoveredTripId}
          />
          <TripPopup
            map={map}
            trip={popupTrip}
            lngLat={popupLngLat}
            onClose={() => { setPopupTrip(null); setPopupLngLat(null); }}
          />

          <SearchPanel
            onSearch={handleSearch}
            isOpen={searchOpen}
            onToggle={() => setSearchOpen(!searchOpen)}
          />

          {/* Map click mode indicator */}
          {mapClickMode !== 'none' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/30 animate-pulse">
                <div className={`w-3 h-3 rounded-full ${mapClickMode === 'pickup' ? 'bg-amber-800' : 'bg-emerald-600'}`} />
                Clicca sulla mappa per scegliere il punto di {mapClickMode === 'pickup' ? 'salita' : 'discesa'}
                <button
                  onClick={() => setMapClickMode('none')}
                  className="ml-1 px-2 py-0.5 rounded bg-amber-600/50 hover:bg-amber-600 text-amber-950 text-[10px] font-bold"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}

          {/* Trip count badge (mobile) */}
          {!isBookingOpen && (
            <div className="md:hidden absolute top-4 left-4 z-10">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-sm border border-slate-800 text-xs text-slate-300">
                <Route className="h-3.5 w-3.5 text-amber-500" />
                {loading ? '...' : `${tripCount} viaggi`}
              </div>
            </div>
          )}

          {/* Loading overlay */}
          {loading && (
            <div className="absolute top-4 right-4 z-10">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-sm border border-slate-800">
                <Spinner size="sm" />
                <span className="text-xs text-slate-400">Caricamento...</span>
              </div>
            </div>
          )}

          {/* Booking panel */}
          <BookingPanel
            trip={bookingTrip}
            isOpen={isBookingOpen}
            onClose={closeBooking}
            customPickup={customPickup}
            customDropoff={customDropoff}
            onRequestPickupMode={() => setMapClickMode('pickup')}
            onRequestDropoffMode={() => setMapClickMode('dropoff')}
            onClearPickup={() => {
              setCustomPickup(null);
              pickupMarkerRef.current?.remove();
              pickupMarkerRef.current = null;
            }}
            onClearDropoff={() => {
              setCustomDropoff(null);
              dropoffMarkerRef.current?.remove();
              dropoffMarkerRef.current = null;
            }}
          />
        </div>
      </div>
    </div>
  );
}
