import { type LatLng, haversineDistance, findRouteFraction } from './geo';

export interface PricingInput {
  /** Base price per seat in cents */
  basePricePerSeat: number;
  /** Number of seats requested */
  seatsCount: number;
  /** Route geometry (GeoJSON LineString) */
  routeGeometry: GeoJSON.LineString;
  /** Route total distance in km */
  routeDistanceKm: number;
  /** Custom pickup point (null = trip origin) */
  pickup: LatLng | null;
  /** Custom dropoff point (null = trip destination) */
  dropoff: LatLng | null;
}

export interface PricingBreakdown {
  /** Base price for full route (1 seat) */
  basePrice: number;
  /** Fraction of route: 0-1 for boarding point */
  pickupFraction: number;
  /** Fraction of route: 0-1 for alighting point */
  dropoffFraction: number;
  /** Percentage of route traveled (0-100) */
  routePercent: number;
  /** Distance from pickup to nearest route point, in meters */
  pickupDetourM: number;
  /** Distance from dropoff to nearest route point, in meters */
  dropoffDetourM: number;
  /** Discount for partial route (negative cents) */
  partialDiscount: number;
  /** Surcharge for pickup detour (positive cents) */
  detourSurcharge: number;
  /** Price per seat after adjustments */
  pricePerSeat: number;
  /** Total price for all seats */
  totalPrice: number;
  /** Number of seats */
  seatsCount: number;
  /** Human-readable breakdown items */
  items: PricingItem[];
}

export interface PricingItem {
  label: string;
  amount: number;
  type: 'base' | 'discount' | 'surcharge' | 'total';
}

/** Detour distance thresholds and surcharges */
const DETOUR_FREE_M = 500;        // < 500m: free (walking distance)
const DETOUR_SMALL_M = 2000;      // 500m - 2km: small surcharge
const DETOUR_MEDIUM_M = 5000;     // 2km - 5km: medium surcharge
const DETOUR_SMALL_CENTS = 500;   // +€5
const DETOUR_MEDIUM_CENTS = 1000; // +€10
const MIN_ROUTE_PERCENT = 25;     // Minimum 25% of route (floor)

/**
 * Find the nearest point on a route to a given point.
 * Returns { fraction, distanceM, snappedPoint }.
 */
export function findNearestOnRoute(
  point: LatLng,
  routeGeometry: GeoJSON.LineString,
): { fraction: number; distanceM: number; snappedPoint: LatLng } {
  const coords = routeGeometry.coordinates;
  let minDist = Infinity;
  let minIndex = 0;

  for (let i = 0; i < coords.length; i++) {
    const d = haversineDistance(point, { lat: coords[i][1], lng: coords[i][0] });
    if (d < minDist) {
      minDist = d;
      minIndex = i;
    }
  }

  const fraction = coords.length > 1 ? minIndex / (coords.length - 1) : 0;
  const snapped = coords[minIndex];

  return {
    fraction,
    distanceM: Math.round(minDist * 1000),
    snappedPoint: { lat: snapped[1], lng: snapped[0] },
  };
}

/**
 * Calculate detour surcharge based on distance from route.
 */
export function calcDetourSurcharge(detourM: number): number {
  if (detourM <= DETOUR_FREE_M) return 0;
  if (detourM <= DETOUR_SMALL_M) return DETOUR_SMALL_CENTS;
  if (detourM <= DETOUR_MEDIUM_M) return DETOUR_MEDIUM_CENTS;
  return -1; // Too far — not available
}

/**
 * Calculate complete pricing breakdown for a booking.
 */
export function calculatePricing(input: PricingInput): PricingBreakdown {
  const { basePricePerSeat, seatsCount, routeGeometry, routeDistanceKm, pickup, dropoff } = input;

  // Determine pickup/dropoff fractions and detour distances
  let pickupFraction = 0;
  let dropoffFraction = 1;
  let pickupDetourM = 0;
  let dropoffDetourM = 0;

  if (pickup) {
    const nearest = findNearestOnRoute(pickup, routeGeometry);
    pickupFraction = nearest.fraction;
    pickupDetourM = nearest.distanceM;
  }

  if (dropoff) {
    const nearest = findNearestOnRoute(dropoff, routeGeometry);
    dropoffFraction = nearest.fraction;
    dropoffDetourM = nearest.distanceM;
  }

  // Ensure pickup < dropoff
  if (pickupFraction >= dropoffFraction) {
    dropoffFraction = 1;
  }

  // Route percentage
  const routePercent = Math.round((dropoffFraction - pickupFraction) * 100);
  const effectivePercent = Math.max(routePercent, MIN_ROUTE_PERCENT);

  // Partial route discount
  const fullPrice = basePricePerSeat;
  const partialPrice = Math.round(fullPrice * (effectivePercent / 100));
  const partialDiscount = partialPrice - fullPrice; // negative or zero

  // Detour surcharge (only pickup detour charges — dropoff detour is usually the same direction)
  const detourSurcharge = Math.max(0, calcDetourSurcharge(pickupDetourM)) +
    Math.max(0, calcDetourSurcharge(dropoffDetourM));

  // Final price per seat
  const pricePerSeat = Math.max(partialPrice + detourSurcharge, Math.round(fullPrice * 0.25));
  const totalPrice = pricePerSeat * seatsCount;

  // Build human-readable items
  const items: PricingItem[] = [
    { label: 'Tariffa base', amount: fullPrice, type: 'base' },
  ];

  if (partialDiscount < 0) {
    items.push({
      label: `Tratta parziale (${routePercent}% del percorso)`,
      amount: partialDiscount,
      type: 'discount',
    });
  }

  if (detourSurcharge > 0) {
    const detourLabels: string[] = [];
    if (pickupDetourM > DETOUR_FREE_M) {
      detourLabels.push(`pickup ${(pickupDetourM / 1000).toFixed(1)}km fuori rotta`);
    }
    if (dropoffDetourM > DETOUR_FREE_M) {
      detourLabels.push(`dropoff ${(dropoffDetourM / 1000).toFixed(1)}km fuori rotta`);
    }
    items.push({
      label: `Deviazione (${detourLabels.join(', ')})`,
      amount: detourSurcharge,
      type: 'surcharge',
    });
  }

  if (seatsCount > 1) {
    items.push({
      label: `${seatsCount} posti × ${formatCentsShort(pricePerSeat)}`,
      amount: totalPrice,
      type: 'total',
    });
  }

  items.push({
    label: 'Totale',
    amount: totalPrice,
    type: 'total',
  });

  return {
    basePrice: fullPrice,
    pickupFraction,
    dropoffFraction,
    routePercent,
    pickupDetourM,
    dropoffDetourM,
    partialDiscount,
    detourSurcharge,
    pricePerSeat,
    totalPrice,
    seatsCount,
    items,
  };
}

function formatCentsShort(cents: number): string {
  return `€${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

/**
 * Check if a detour is feasible (within max distance).
 */
export function isDetourFeasible(detourM: number): boolean {
  return detourM <= DETOUR_MEDIUM_M;
}
