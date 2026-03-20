import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { trips, companies, vehicles } from '@/lib/db/schema';
import { eq, and, gte, lt, isNull } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { isPointNearRoute, type LatLng } from '@/lib/utils/geo';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const originLat = searchParams.get('originLat');
  const originLng = searchParams.get('originLng');
  const destinationLat = searchParams.get('destinationLat');
  const destinationLng = searchParams.get('destinationLng');
  const date = searchParams.get('date');

  if (!originLat || !originLng || !destinationLat || !destinationLng || !date) {
    return errorResponse(
      'MISSING_PARAMS',
      'Parametri obbligatori: originLat, originLng, destinationLat, destinationLng, date',
    );
  }

  const origin: LatLng = { lat: parseFloat(originLat), lng: parseFloat(originLng) };
  const destination: LatLng = { lat: parseFloat(destinationLat), lng: parseFloat(destinationLng) };

  const startOfDay = new Date(`${date}T00:00:00Z`);
  const endOfDay = new Date(`${date}T23:59:59Z`);

  // Fetch all scheduled trips for that date
  const allTrips = await db
    .select({
      id: trips.id,
      originCity: trips.originCity,
      originAddress: trips.originAddress,
      destinationCity: trips.destinationCity,
      destinationAddress: trips.destinationAddress,
      departureAt: trips.departureAt,
      estimatedArrivalAt: trips.estimatedArrivalAt,
      seatsAvailable: trips.seatsAvailable,
      seatsBooked: trips.seatsBooked,
      pricePerSeat: trips.pricePerSeat,
      routeGeometry: trips.routeGeometry,
      routeDistanceKm: trips.routeDistanceKm,
      routeDurationMinutes: trips.routeDurationMinutes,
      companyName: companies.name,
      vehicleMake: vehicles.make,
      vehicleModel: vehicles.model,
    })
    .from(trips)
    .innerJoin(companies, eq(trips.companyId, companies.id))
    .innerJoin(vehicles, eq(trips.vehicleId, vehicles.id))
    .where(
      and(
        eq(trips.status, 'scheduled'),
        gte(trips.departureAt, startOfDay),
        lt(trips.departureAt, endOfDay),
        isNull(trips.deletedAt),
      )
    );

  // Filter: route must pass near both origin and destination
  const matchingTrips = allTrips.filter((trip) => {
    const routeGeometry = trip.routeGeometry as GeoJSON.LineString;
    const nearOrigin = isPointNearRoute(origin, routeGeometry, 15);
    const nearDestination = isPointNearRoute(destination, routeGeometry, 15);
    return nearOrigin && nearDestination;
  });

  const results = matchingTrips.map((trip) => ({
    id: trip.id,
    originCity: trip.originCity,
    originAddress: trip.originAddress,
    destinationCity: trip.destinationCity,
    destinationAddress: trip.destinationAddress,
    departureAt: trip.departureAt,
    estimatedArrivalAt: trip.estimatedArrivalAt,
    seatsAvailable: trip.seatsAvailable - trip.seatsBooked,
    pricePerSeat: trip.pricePerSeat,
    routeDistanceKm: trip.routeDistanceKm,
    routeDurationMinutes: trip.routeDurationMinutes,
    companyName: trip.companyName,
    vehicle: `${trip.vehicleMake} ${trip.vehicleModel}`,
  }));

  return successResponse(results);
}
