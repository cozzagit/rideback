'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, MapPin, ArrowRight, Clock, Car, Users, ChevronDown, ChevronUp,
  Minus, Plus, Navigation, Footprints, AlertTriangle, Check, Loader2,
} from 'lucide-react';
import { formatCurrency, formatTime, formatDuration } from '@/lib/utils';
import type { PricingBreakdown } from '@/lib/utils/pricing';

interface TripData {
  id: string;
  originCity: string;
  originAddress: string;
  originLat: number;
  originLng: number;
  destinationCity: string;
  destinationAddress: string;
  destinationLat: number;
  destinationLng: number;
  departureAt: string;
  estimatedArrivalAt: string;
  seatsAvailable: number;
  seatsBooked: number;
  pricePerSeat: number;
  companyName: string;
  vehicle: string;
  routeDistanceKm: number;
  routeDurationMinutes: number;
  routeColor?: string;
}

interface BookingPanelProps {
  trip: TripData | null;
  isOpen: boolean;
  onClose: () => void;
  /** Called when user sets a custom pickup point on the map */
  customPickup: { lat: number; lng: number; address?: string } | null;
  customDropoff: { lat: number; lng: number; address?: string } | null;
  onRequestPickupMode: () => void;
  onRequestDropoffMode: () => void;
  onClearPickup: () => void;
  onClearDropoff: () => void;
}

export function BookingPanel({
  trip,
  isOpen,
  onClose,
  customPickup,
  customDropoff,
  onRequestPickupMode,
  onRequestDropoffMode,
  onClearPickup,
  onClearDropoff,
}: BookingPanelProps) {
  const [seats, setSeats] = useState(1);
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const fetchRef = useRef(0);

  const seatsLeft = trip ? trip.seatsAvailable - trip.seatsBooked : 0;

  // Fetch pricing when trip, pickup, dropoff, or seats change
  useEffect(() => {
    if (!trip || !isOpen) return;

    const fetchId = ++fetchRef.current;
    setPricingLoading(true);

    const params = new URLSearchParams({ seats: String(seats) });
    if (customPickup) {
      params.set('pickupLat', String(customPickup.lat));
      params.set('pickupLng', String(customPickup.lng));
    }
    if (customDropoff) {
      params.set('dropoffLat', String(customDropoff.lat));
      params.set('dropoffLng', String(customDropoff.lng));
    }

    fetch(`/api/trips/${trip.id}/pricing?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (fetchId !== fetchRef.current) return;
        if (json.data) {
          setPricing(json.data);
          setBookingError(null);
        } else if (json.error) {
          setBookingError(json.error.message);
          setPricing(null);
        }
      })
      .catch(() => {
        if (fetchId === fetchRef.current) setBookingError('Errore calcolo prezzo');
      })
      .finally(() => {
        if (fetchId === fetchRef.current) setPricingLoading(false);
      });
  }, [trip, isOpen, seats, customPickup, customDropoff]);

  // Reset state when trip changes
  useEffect(() => {
    setSeats(1);
    setBookingSuccess(false);
    setBookingError(null);
    setShowDetails(false);
  }, [trip?.id]);

  const handleBook = useCallback(async () => {
    if (!trip || !pricing) return;
    setBooking(true);
    setBookingError(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: trip.id,
          seatsCount: seats,
          pickupLat: customPickup?.lat,
          pickupLng: customPickup?.lng,
          pickupAddress: customPickup?.address || undefined,
          dropoffLat: customDropoff?.lat,
          dropoffLng: customDropoff?.lng,
          dropoffAddress: customDropoff?.address || undefined,
        }),
      });
      const json = await res.json();
      if (json.error) {
        setBookingError(json.error.message);
      } else {
        setBookingSuccess(true);
      }
    } catch {
      setBookingError('Errore nella prenotazione');
    } finally {
      setBooking(false);
    }
  }, [trip, pricing, seats, customPickup, customDropoff]);

  if (!trip || !isOpen) return null;

  const duration = trip.routeDurationMinutes;

  return (
    <>
      {/* Desktop panel */}
      <div className="hidden lg:flex absolute top-0 right-0 bottom-0 w-[420px] z-30 animate-slide-in-right">
        <div className="h-full w-full bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h2 className="text-base font-bold text-white">Prenota viaggio</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {bookingSuccess ? (
              <SuccessView onClose={onClose} />
            ) : (
              <>
                {/* Trip summary */}
                <TripSummary trip={trip} duration={duration} />

                {/* Pickup / Dropoff */}
                <div className="px-5 py-4 border-b border-slate-800/50">
                  <PickupDropoffSection
                    trip={trip}
                    customPickup={customPickup}
                    customDropoff={customDropoff}
                    pricing={pricing}
                    onRequestPickupMode={onRequestPickupMode}
                    onRequestDropoffMode={onRequestDropoffMode}
                    onClearPickup={onClearPickup}
                    onClearDropoff={onClearDropoff}
                  />
                </div>

                {/* Seats */}
                <div className="px-5 py-4 border-b border-slate-800/50">
                  <SeatsPicker seats={seats} setSeats={setSeats} max={seatsLeft} />
                </div>

                {/* Price breakdown */}
                <div className="px-5 py-4">
                  <PriceSection
                    pricing={pricing}
                    loading={pricingLoading}
                    showDetails={showDetails}
                    onToggleDetails={() => setShowDetails(!showDetails)}
                  />
                </div>
              </>
            )}
          </div>

          {/* Book CTA */}
          {!bookingSuccess && (
            <div className="px-5 py-4 border-t border-slate-800 bg-slate-950">
              {bookingError && (
                <div className="flex items-center gap-2 mb-3 text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                  <AlertTriangle size={14} />
                  {bookingError}
                </div>
              )}
              <button
                onClick={handleBook}
                disabled={booking || !pricing || pricingLoading || seatsLeft < 1}
                className="w-full py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {booking ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    Prenota {seats} {seats === 1 ? 'posto' : 'posti'}
                    {pricing && (
                      <span className="ml-1 font-extrabold">&middot; {formatCurrency(pricing.totalPrice)}</span>
                    )}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 animate-slide-up">
        <div className="bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 rounded-t-2xl max-h-[85vh] flex flex-col overflow-hidden">
          {/* Handle + Header */}
          <div className="flex flex-col items-center pt-2 pb-3 px-4 border-b border-slate-800/50">
            <div className="w-10 h-1 rounded-full bg-slate-700 mb-3" />
            <div className="flex items-center justify-between w-full">
              <h2 className="text-sm font-bold text-white">Prenota viaggio</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {bookingSuccess ? (
              <SuccessView onClose={onClose} />
            ) : (
              <>
                <TripSummary trip={trip} duration={duration} />
                <div className="px-4 py-3 border-b border-slate-800/50">
                  <PickupDropoffSection
                    trip={trip}
                    customPickup={customPickup}
                    customDropoff={customDropoff}
                    pricing={pricing}
                    onRequestPickupMode={onRequestPickupMode}
                    onRequestDropoffMode={onRequestDropoffMode}
                    onClearPickup={onClearPickup}
                    onClearDropoff={onClearDropoff}
                  />
                </div>
                <div className="px-4 py-3 border-b border-slate-800/50">
                  <SeatsPicker seats={seats} setSeats={setSeats} max={seatsLeft} />
                </div>
                <div className="px-4 py-3">
                  <PriceSection
                    pricing={pricing}
                    loading={pricingLoading}
                    showDetails={showDetails}
                    onToggleDetails={() => setShowDetails(!showDetails)}
                  />
                </div>
              </>
            )}
          </div>

          {!bookingSuccess && (
            <div className="px-4 py-3 border-t border-slate-800 bg-slate-950 safe-area-pb">
              {bookingError && (
                <div className="flex items-center gap-2 mb-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                  <AlertTriangle size={14} />
                  {bookingError}
                </div>
              )}
              <button
                onClick={handleBook}
                disabled={booking || !pricing || pricingLoading || seatsLeft < 1}
                className="w-full py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {booking ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    Prenota &middot; {pricing ? formatCurrency(pricing.totalPrice) : '...'}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function TripSummary({ trip, duration }: { trip: TripData; duration: number }) {
  return (
    <div className="px-5 py-4 border-b border-slate-800/50">
      {/* Route */}
      <div className="flex items-center gap-2 mb-3">
        {trip.routeColor && (
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: trip.routeColor }} />
        )}
        <span className="text-sm font-bold text-white">{trip.originCity}</span>
        <ArrowRight className="h-3.5 w-3.5 text-slate-600 shrink-0" />
        <span className="text-sm font-bold text-white">{trip.destinationCity}</span>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {formatTime(trip.departureAt)} &middot; {formatDuration(duration)}
        </span>
        <span className="flex items-center gap-1">
          <Car size={12} />
          {trip.vehicle}
        </span>
        <span className="flex items-center gap-1">
          <Users size={12} />
          {trip.seatsAvailable - trip.seatsBooked} posti liberi
        </span>
      </div>

      <div className="mt-2 text-[11px] text-slate-600">{trip.companyName}</div>
    </div>
  );
}

function PickupDropoffSection({
  trip,
  customPickup,
  customDropoff,
  pricing,
  onRequestPickupMode,
  onRequestDropoffMode,
  onClearPickup,
  onClearDropoff,
}: {
  trip: TripData;
  customPickup: BookingPanelProps['customPickup'];
  customDropoff: BookingPanelProps['customDropoff'];
  pricing: PricingBreakdown | null;
  onRequestPickupMode: () => void;
  onRequestDropoffMode: () => void;
  onClearPickup: () => void;
  onClearDropoff: () => void;
}) {
  const pickupDetourM = pricing?.pickupDetourM ?? 0;
  const dropoffDetourM = pricing?.dropoffDetourM ?? 0;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dove sali e scendi</p>

      {/* Pickup */}
      <div className="flex items-start gap-3">
        <div className="mt-1 w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-500 mb-0.5">Salita</div>
          {customPickup ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-white truncate">
                {customPickup.address || `${customPickup.lat.toFixed(4)}, ${customPickup.lng.toFixed(4)}`}
              </span>
              <button onClick={onClearPickup} className="text-slate-500 hover:text-red-400 shrink-0">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="text-sm text-white">{trip.originAddress}</div>
          )}
          {customPickup && pickupDetourM > 0 && (
            <div className="flex items-center gap-1 mt-1 text-[10px]">
              {pickupDetourM <= 500 ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Footprints size={10} /> {pickupDetourM}m a piedi dalla rotta
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <Navigation size={10} /> Deviazione {(pickupDetourM / 1000).toFixed(1)}km
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={onRequestPickupMode}
          className="text-xs text-amber-500 hover:text-amber-400 font-medium shrink-0 mt-1"
        >
          {customPickup ? 'Cambia' : 'Personalizza'}
        </button>
      </div>

      {/* Vertical line */}
      <div className="ml-3 border-l-2 border-dashed border-slate-700 h-3" />

      {/* Dropoff */}
      <div className="flex items-start gap-3">
        <div className="mt-1 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-500 mb-0.5">Discesa</div>
          {customDropoff ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-white truncate">
                {customDropoff.address || `${customDropoff.lat.toFixed(4)}, ${customDropoff.lng.toFixed(4)}`}
              </span>
              <button onClick={onClearDropoff} className="text-slate-500 hover:text-red-400 shrink-0">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="text-sm text-white">{trip.destinationAddress}</div>
          )}
          {customDropoff && dropoffDetourM > 0 && (
            <div className="flex items-center gap-1 mt-1 text-[10px]">
              {dropoffDetourM <= 500 ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Footprints size={10} /> {dropoffDetourM}m a piedi dalla rotta
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <Navigation size={10} /> Deviazione {(dropoffDetourM / 1000).toFixed(1)}km
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={onRequestDropoffMode}
          className="text-xs text-amber-500 hover:text-amber-400 font-medium shrink-0 mt-1"
        >
          {customDropoff ? 'Cambia' : 'Personalizza'}
        </button>
      </div>

      {/* Smart tip */}
      {!customPickup && !customDropoff && (
        <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2 text-[11px] text-amber-500/80">
          Sali a un punto intermedio? Il prezzo scende in automatico in base alla tratta.
        </div>
      )}
    </div>
  );
}

function SeatsPicker({ seats, setSeats, max }: { seats: number; setSeats: (n: number) => void; max: number }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Posti</p>
        <p className="text-xs text-slate-600 mt-0.5">{max} disponibili</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSeats(Math.max(1, seats - 1))}
          disabled={seats <= 1}
          className="w-8 h-8 rounded-lg border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Minus size={14} />
        </button>
        <span className="text-lg font-bold text-white w-6 text-center">{seats}</span>
        <button
          onClick={() => setSeats(Math.min(max, seats + 1))}
          disabled={seats >= max}
          className="w-8 h-8 rounded-lg border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function PriceSection({
  pricing,
  loading,
  showDetails,
  onToggleDetails,
}: {
  pricing: PricingBreakdown | null;
  loading: boolean;
  showDetails: boolean;
  onToggleDetails: () => void;
}) {
  if (loading || !pricing) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 size={14} className="animate-spin text-slate-500" />
        <span className="text-xs text-slate-500">Calcolo prezzo...</span>
      </div>
    );
  }

  const hasAdjustments = pricing.partialDiscount < 0 || pricing.detourSurcharge > 0;

  return (
    <div>
      {/* Main price */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-2xl font-extrabold text-amber-500">{formatCurrency(pricing.totalPrice)}</span>
          {pricing.seatsCount > 1 && (
            <span className="text-xs text-slate-500 ml-2">
              ({formatCurrency(pricing.pricePerSeat)}/posto)
            </span>
          )}
        </div>
        {hasAdjustments && (
          <button
            onClick={onToggleDetails}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
          >
            Dettaglio
            {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {/* Savings badge */}
      {pricing.partialDiscount < 0 && (
        <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">
          Risparmi {formatCurrency(Math.abs(pricing.partialDiscount))} con tratta parziale
        </div>
      )}

      {/* Breakdown */}
      {showDetails && (
        <div className="mt-3 space-y-2 text-xs border-t border-slate-800 pt-3">
          {pricing.items
            .filter((item) => item.type !== 'total')
            .map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-slate-400">{item.label}</span>
                <span
                  className={
                    item.type === 'discount'
                      ? 'text-emerald-400 font-semibold'
                      : item.type === 'surcharge'
                        ? 'text-amber-400 font-semibold'
                        : 'text-slate-300'
                  }
                >
                  {item.type === 'discount' ? '' : item.type === 'surcharge' ? '+' : ''}
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 font-bold">
            <span className="text-slate-300">Totale</span>
            <span className="text-amber-500">{formatCurrency(pricing.totalPrice)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SuccessView({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
        <Check size={32} className="text-emerald-500" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">Prenotazione inviata!</h3>
      <p className="text-sm text-slate-400 mb-6 max-w-xs">
        L&apos;operatore NCC riceverà la tua richiesta e la confermerà a breve.
      </p>
      <div className="flex gap-3">
        <a
          href="/my-bookings"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
        >
          Le mie prenotazioni
        </a>
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl text-sm font-medium border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}
