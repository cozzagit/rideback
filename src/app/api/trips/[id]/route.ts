import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { trips, companies, vehicles, drivers } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth, requireOperator } from '@/lib/auth/get-session';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from '@/lib/api-response';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();
    const { id } = await params;

    const [trip] = await db
      .select({
        id: trips.id,
        originAddress: trips.originAddress,
        originCity: trips.originCity,
        originLat: trips.originLat,
        originLng: trips.originLng,
        destinationAddress: trips.destinationAddress,
        destinationCity: trips.destinationCity,
        destinationLat: trips.destinationLat,
        destinationLng: trips.destinationLng,
        departureAt: trips.departureAt,
        estimatedArrivalAt: trips.estimatedArrivalAt,
        seatsAvailable: trips.seatsAvailable,
        seatsBooked: trips.seatsBooked,
        pricePerSeat: trips.pricePerSeat,
        status: trips.status,
        routeGeometry: trips.routeGeometry,
        routeDistanceKm: trips.routeDistanceKm,
        routeDurationMinutes: trips.routeDurationMinutes,
        allowsIntermediateStops: trips.allowsIntermediateStops,
        notes: trips.notes,
        companyId: trips.companyId,
        companyName: companies.name,
        companySlug: companies.slug,
        vehicleMake: vehicles.make,
        vehicleModel: vehicles.model,
        vehicleType: vehicles.vehicleType,
        vehicleColor: vehicles.color,
        vehicleAmenities: vehicles.amenities,
        driverFirstName: drivers.firstName,
        driverLastName: drivers.lastName,
        driverPhotoUrl: drivers.photoUrl,
      })
      .from(trips)
      .innerJoin(companies, eq(trips.companyId, companies.id))
      .innerJoin(vehicles, eq(trips.vehicleId, vehicles.id))
      .leftJoin(drivers, eq(trips.driverId, drivers.id))
      .where(and(eq(trips.id, id), isNull(trips.deletedAt)));

    if (!trip) {
      return notFoundResponse('Viaggio');
    }

    return successResponse(trip);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse();
    }
    console.error('Get trip error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore recupero viaggio', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireOperator();
    const { id } = await params;
    const companyId = session.user.companyId;

    const [trip] = await db
      .select()
      .from(trips)
      .where(and(eq(trips.id, id), eq(trips.companyId, companyId!), isNull(trips.deletedAt)));

    if (!trip) {
      return notFoundResponse('Viaggio');
    }

    const body = await request.json();
    const allowedFields = [
      'driverId', 'vehicleId', 'seatsAvailable', 'pricePerSeat',
      'allowsIntermediateStops', 'notes', 'status',
    ] as const;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const [updated] = await db
      .update(trips)
      .set(updateData)
      .where(eq(trips.id, id))
      .returning();

    return successResponse(updated);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse();
      if (error.message.includes('Forbidden')) return forbiddenResponse();
    }
    console.error('Update trip error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore aggiornamento viaggio', 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireOperator();
    const { id } = await params;
    const companyId = session.user.companyId;

    const [trip] = await db
      .select()
      .from(trips)
      .where(and(eq(trips.id, id), eq(trips.companyId, companyId!), isNull(trips.deletedAt)));

    if (!trip) {
      return notFoundResponse('Viaggio');
    }

    await db
      .update(trips)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        status: 'cancelled',
      })
      .where(eq(trips.id, id));

    return successResponse({ message: 'Viaggio cancellato' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse();
      if (error.message.includes('Forbidden')) return forbiddenResponse();
    }
    console.error('Delete trip error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore cancellazione viaggio', 500);
  }
}
