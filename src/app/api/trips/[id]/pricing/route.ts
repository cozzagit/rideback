import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { trips } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import { calculatePricing, isDetourFeasible } from '@/lib/utils/pricing';

/**
 * GET /api/trips/[id]/pricing?pickupLat=...&pickupLng=...&dropoffLat=...&dropoffLng=...&seats=1
 *
 * Returns a real-time pricing breakdown for a given trip + custom pickup/dropoff.
 * No auth required — pricing is public info.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const url = request.nextUrl;

    const pickupLat = url.searchParams.get('pickupLat');
    const pickupLng = url.searchParams.get('pickupLng');
    const dropoffLat = url.searchParams.get('dropoffLat');
    const dropoffLng = url.searchParams.get('dropoffLng');
    const seatsCount = Math.max(1, Math.min(8, parseInt(url.searchParams.get('seats') || '1', 10)));

    // Fetch trip
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(eq(trips.id, id), isNull(trips.deletedAt)));

    if (!trip) {
      return notFoundResponse('Viaggio');
    }

    const routeGeometry = trip.routeGeometry as GeoJSON.LineString;
    const pickup = pickupLat && pickupLng
      ? { lat: parseFloat(pickupLat), lng: parseFloat(pickupLng) }
      : null;
    const dropoff = dropoffLat && dropoffLng
      ? { lat: parseFloat(dropoffLat), lng: parseFloat(dropoffLng) }
      : null;

    // Check detour feasibility
    if (pickup) {
      const { findNearestOnRoute } = await import('@/lib/utils/pricing');
      const nearest = findNearestOnRoute(pickup, routeGeometry);
      if (!isDetourFeasible(nearest.distanceM)) {
        return errorResponse(
          'DETOUR_TOO_FAR',
          'Il punto di salita è troppo lontano dal percorso (max 5 km)',
          400,
        );
      }
    }
    if (dropoff) {
      const { findNearestOnRoute } = await import('@/lib/utils/pricing');
      const nearest = findNearestOnRoute(dropoff, routeGeometry);
      if (!isDetourFeasible(nearest.distanceM)) {
        return errorResponse(
          'DETOUR_TOO_FAR',
          'Il punto di discesa è troppo lontano dal percorso (max 5 km)',
          400,
        );
      }
    }

    const breakdown = calculatePricing({
      basePricePerSeat: trip.pricePerSeat,
      seatsCount,
      routeGeometry,
      routeDistanceKm: parseFloat(trip.routeDistanceKm),
      pickup,
      dropoff,
    });

    return successResponse({
      tripId: id,
      ...breakdown,
      seatsAvailable: trip.seatsAvailable - trip.seatsBooked,
    });
  } catch (error) {
    console.error('Pricing calculation error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore calcolo prezzo', 500);
  }
}
