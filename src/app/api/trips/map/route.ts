import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { trips, companies, vehicles } from '@/lib/db/schema';
import { eq, and, gte, lt, isNull } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date');
  if (!date) {
    return errorResponse('MISSING_DATE', 'Il parametro date è obbligatorio');
  }

  const startOfDay = new Date(`${date}T00:00:00Z`);
  const endOfDay = new Date(`${date}T23:59:59Z`);

  const results = await db
    .select({
      id: trips.id,
      originCity: trips.originCity,
      originAddress: trips.originAddress,
      destinationCity: trips.destinationCity,
      destinationAddress: trips.destinationAddress,
      originLat: trips.originLat,
      originLng: trips.originLng,
      destinationLat: trips.destinationLat,
      destinationLng: trips.destinationLng,
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

  const featureCollection = {
    type: 'FeatureCollection' as const,
    features: results.map((trip) => ({
      type: 'Feature' as const,
      geometry: trip.routeGeometry as GeoJSON.LineString,
      properties: {
        id: trip.id,
        originCity: trip.originCity,
        originAddress: trip.originAddress,
        originLat: trip.originLat,
        originLng: trip.originLng,
        destinationCity: trip.destinationCity,
        destinationAddress: trip.destinationAddress,
        destinationLat: trip.destinationLat,
        destinationLng: trip.destinationLng,
        departureAt: trip.departureAt,
        estimatedArrivalAt: trip.estimatedArrivalAt,
        seatsAvailable: trip.seatsAvailable,
        seatsBooked: trip.seatsBooked,
        pricePerSeat: trip.pricePerSeat,
        routeDistanceKm: trip.routeDistanceKm,
        routeDurationMinutes: trip.routeDurationMinutes,
        companyName: trip.companyName,
        vehicle: `${trip.vehicleMake} ${trip.vehicleModel}`,
      },
    })),
  };

  return successResponse(featureCollection);
}
