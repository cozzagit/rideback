import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { trips, companies, vehicles, drivers } from '@/lib/db/schema';
import { eq, and, isNull, gte, lt, desc } from 'drizzle-orm';
import { requireAuth, requireOperator } from '@/lib/auth/get-session';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '20');
    const date = searchParams.get('date');
    const offset = (page - 1) * perPage;

    const conditions = [isNull(trips.deletedAt)];

    // Operators see only their company's trips
    if (session.user.userType === 'operator' && session.user.companyId) {
      conditions.push(eq(trips.companyId, session.user.companyId));
    } else if (session.user.userType === 'passenger') {
      // Passengers see only scheduled trips
      conditions.push(eq(trips.status, 'scheduled'));
    }

    if (date) {
      const startOfDay = new Date(`${date}T00:00:00Z`);
      const endOfDay = new Date(`${date}T23:59:59Z`);
      conditions.push(gte(trips.departureAt, startOfDay));
      conditions.push(lt(trips.departureAt, endOfDay));
    }

    const results = await db
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
        status: trips.status,
        routeDistanceKm: trips.routeDistanceKm,
        routeDurationMinutes: trips.routeDurationMinutes,
        companyName: companies.name,
        vehicleMake: vehicles.make,
        vehicleModel: vehicles.model,
      })
      .from(trips)
      .innerJoin(companies, eq(trips.companyId, companies.id))
      .innerJoin(vehicles, eq(trips.vehicleId, vehicles.id))
      .where(and(...conditions))
      .orderBy(desc(trips.departureAt))
      .limit(perPage)
      .offset(offset);

    return successResponse(results);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse();
      if (error.message.includes('Forbidden')) return forbiddenResponse();
    }
    console.error('List trips error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore nel recupero viaggi', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireOperator();
    const companyId = session.user.companyId;

    if (!companyId) {
      return errorResponse('NO_COMPANY', 'Nessuna azienda associata', 400);
    }

    const body = await request.json();
    const {
      vehicleId, driverId,
      originAddress, originLat, originLng, originCity,
      destinationAddress, destinationLat, destinationLng, destinationCity,
      departureAt, seatsAvailable, pricePerSeat,
      allowsIntermediateStops, notes,
      recurrenceType, recurrenceEndDate,
    } = body;

    // Validate required fields
    if (!vehicleId || !originAddress || !originLat || !originLng || !originCity ||
        !destinationAddress || !destinationLat || !destinationLng || !destinationCity ||
        !departureAt || !seatsAvailable || !pricePerSeat) {
      return errorResponse('VALIDATION_ERROR', 'Campi obbligatori mancanti');
    }

    // Verify vehicle belongs to company
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.companyId, companyId), isNull(vehicles.deletedAt)));

    if (!vehicle) {
      return errorResponse('INVALID_VEHICLE', 'Veicolo non trovato o non appartenente alla tua azienda', 400);
    }

    // If driver specified, verify it belongs to company
    if (driverId) {
      const [driver] = await db
        .select()
        .from(drivers)
        .where(and(eq(drivers.id, driverId), eq(drivers.companyId, companyId), isNull(drivers.deletedAt)));

      if (!driver) {
        return errorResponse('INVALID_DRIVER', 'Autista non trovato o non appartenente alla tua azienda', 400);
      }
    }

    // Call Mapbox Directions API to get route geometry
    const token = process.env.MAPBOX_ACCESS_TOKEN;
    if (!token) {
      return errorResponse('CONFIG_ERROR', 'Mapbox token non configurato', 500);
    }

    const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${destinationLng},${destinationLat}?access_token=${token}&geometries=geojson&overview=full`;
    const directionsResponse = await fetch(directionsUrl);
    const directionsData = await directionsResponse.json();
    const route = directionsData.routes?.[0];

    if (!route) {
      return errorResponse('NO_ROUTE', 'Impossibile calcolare il percorso', 400);
    }

    const routeGeometry = route.geometry;
    const routeDistanceKm = (route.distance / 1000).toFixed(2);
    const routeDurationMinutes = Math.round(route.duration / 60);

    const departure = new Date(departureAt);
    const estimatedArrival = new Date(departure.getTime() + route.duration * 1000);

    const [newTrip] = await db
      .insert(trips)
      .values({
        companyId,
        vehicleId,
        driverId: driverId || null,
        originAddress,
        originLat: String(originLat),
        originLng: String(originLng),
        originCity,
        destinationAddress,
        destinationLat: String(destinationLat),
        destinationLng: String(destinationLng),
        destinationCity,
        routeGeometry,
        routeDistanceKm,
        routeDurationMinutes,
        departureAt: departure,
        estimatedArrivalAt: estimatedArrival,
        seatsAvailable,
        pricePerSeat,
        allowsIntermediateStops: allowsIntermediateStops ?? true,
        notes: notes || null,
        recurrenceType: recurrenceType || 'none',
        recurrenceEndDate: recurrenceEndDate || null,
      })
      .returning();

    return successResponse(newTrip, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse();
      if (error.message.includes('Forbidden')) return forbiddenResponse();
    }
    console.error('Create trip error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore creazione viaggio', 500);
  }
}
