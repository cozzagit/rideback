import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { bookings, trips, companies, vehicles } from '@/lib/db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/get-session';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response';
import { calculatePricing, isDetourFeasible } from '@/lib/utils/pricing';

export async function GET() {
  try {
    const session = await requireAuth();

    const results = await db
      .select({
        id: bookings.id,
        tripId: bookings.tripId,
        seatsCount: bookings.seatsCount,
        priceTotal: bookings.priceTotal,
        priceBreakdown: bookings.priceBreakdown,
        pickupAddress: bookings.pickupAddress,
        dropoffAddress: bookings.dropoffAddress,
        status: bookings.status,
        passengerNotes: bookings.passengerNotes,
        operatorNotes: bookings.operatorNotes,
        confirmedAt: bookings.confirmedAt,
        cancelledAt: bookings.cancelledAt,
        createdAt: bookings.createdAt,
        originCity: trips.originCity,
        destinationCity: trips.destinationCity,
        departureAt: trips.departureAt,
        companyName: companies.name,
        vehicleMake: vehicles.make,
        vehicleModel: vehicles.model,
      })
      .from(bookings)
      .innerJoin(trips, eq(bookings.tripId, trips.id))
      .innerJoin(companies, eq(trips.companyId, companies.id))
      .innerJoin(vehicles, eq(trips.vehicleId, vehicles.id))
      .where(and(eq(bookings.passengerId, session.user.id), isNull(bookings.deletedAt)))
      .orderBy(desc(bookings.createdAt));

    return successResponse(results);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }
    console.error('List bookings error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore nel recupero prenotazioni', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    if (session.user.userType !== 'passenger') {
      return errorResponse('FORBIDDEN', 'Solo i passeggeri possono prenotare', 403);
    }

    const body = await request.json();
    const {
      tripId,
      seatsCount = 1,
      pickupLat,
      pickupLng,
      pickupAddress,
      dropoffLat,
      dropoffLng,
      dropoffAddress,
      passengerNotes,
    } = body;

    if (!tripId) {
      return errorResponse('VALIDATION_ERROR', 'tripId è obbligatorio');
    }

    if (seatsCount < 1 || seatsCount > 8) {
      return errorResponse('VALIDATION_ERROR', 'Numero posti non valido (1-8)');
    }

    // Fetch the trip
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(eq(trips.id, tripId), eq(trips.status, 'scheduled'), isNull(trips.deletedAt)));

    if (!trip) {
      return errorResponse('TRIP_NOT_FOUND', 'Viaggio non trovato o non disponibile', 404);
    }

    // Check available seats
    const availableSeats = trip.seatsAvailable - trip.seatsBooked;
    if (seatsCount > availableSeats) {
      return errorResponse('NO_SEATS', `Solo ${availableSeats} posti disponibili`, 400);
    }

    // Build pricing input
    const pickup = pickupLat != null && pickupLng != null
      ? { lat: parseFloat(pickupLat), lng: parseFloat(pickupLng) }
      : null;
    const dropoff = dropoffLat != null && dropoffLng != null
      ? { lat: parseFloat(dropoffLat), lng: parseFloat(dropoffLng) }
      : null;

    const routeGeometry = trip.routeGeometry as GeoJSON.LineString;

    // Validate detour feasibility
    if (pickup && !isDetourFeasible(
      (await import('@/lib/utils/pricing')).findNearestOnRoute(pickup, routeGeometry).distanceM
    )) {
      return errorResponse('DETOUR_TOO_FAR', 'Punto di salita troppo lontano dal percorso (max 5 km)', 400);
    }
    if (dropoff && !isDetourFeasible(
      (await import('@/lib/utils/pricing')).findNearestOnRoute(dropoff, routeGeometry).distanceM
    )) {
      return errorResponse('DETOUR_TOO_FAR', 'Punto di discesa troppo lontano dal percorso (max 5 km)', 400);
    }

    // Calculate pricing
    const breakdown = calculatePricing({
      basePricePerSeat: trip.pricePerSeat,
      seatsCount,
      routeGeometry,
      routeDistanceKm: parseFloat(trip.routeDistanceKm),
      pickup,
      dropoff,
    });

    // Create booking
    const [newBooking] = await db
      .insert(bookings)
      .values({
        tripId,
        passengerId: session.user.id,
        seatsCount,
        pickupLat: pickup ? String(pickup.lat) : null,
        pickupLng: pickup ? String(pickup.lng) : null,
        pickupAddress: pickupAddress || null,
        dropoffLat: dropoff ? String(dropoff.lat) : null,
        dropoffLng: dropoff ? String(dropoff.lng) : null,
        dropoffAddress: dropoffAddress || null,
        priceTotal: breakdown.totalPrice,
        priceBreakdown: breakdown,
        passengerNotes: passengerNotes || null,
      })
      .returning();

    // Update seats booked
    await db
      .update(trips)
      .set({
        seatsBooked: trip.seatsBooked + seatsCount,
        updatedAt: new Date(),
      })
      .where(eq(trips.id, tripId));

    return successResponse({
      ...newBooking,
      pricing: breakdown,
    }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }
    console.error('Create booking error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore creazione prenotazione', 500);
  }
}
