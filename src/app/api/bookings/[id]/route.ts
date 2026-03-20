import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { bookings, trips, companies, vehicles } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/get-session';
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
    const session = await requireAuth();
    const { id } = await params;

    const [booking] = await db
      .select({
        id: bookings.id,
        tripId: bookings.tripId,
        passengerId: bookings.passengerId,
        seatsCount: bookings.seatsCount,
        priceTotal: bookings.priceTotal,
        status: bookings.status,
        passengerNotes: bookings.passengerNotes,
        operatorNotes: bookings.operatorNotes,
        confirmedAt: bookings.confirmedAt,
        cancelledAt: bookings.cancelledAt,
        cancellationReason: bookings.cancellationReason,
        createdAt: bookings.createdAt,
        originCity: trips.originCity,
        originAddress: trips.originAddress,
        destinationCity: trips.destinationCity,
        destinationAddress: trips.destinationAddress,
        departureAt: trips.departureAt,
        estimatedArrivalAt: trips.estimatedArrivalAt,
        companyId: trips.companyId,
        companyName: companies.name,
        vehicleMake: vehicles.make,
        vehicleModel: vehicles.model,
      })
      .from(bookings)
      .innerJoin(trips, eq(bookings.tripId, trips.id))
      .innerJoin(companies, eq(trips.companyId, companies.id))
      .innerJoin(vehicles, eq(trips.vehicleId, vehicles.id))
      .where(and(eq(bookings.id, id), isNull(bookings.deletedAt)));

    if (!booking) {
      return notFoundResponse('Prenotazione');
    }

    // Passenger can see their own, operator can see their company's
    const isPassenger = booking.passengerId === session.user.id;
    const isCompanyOperator = session.user.userType === 'operator' && session.user.companyId === booking.companyId;
    const isAdmin = session.user.userType === 'admin';

    if (!isPassenger && !isCompanyOperator && !isAdmin) {
      return forbiddenResponse();
    }

    return successResponse(booking);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }
    console.error('Get booking error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore recupero prenotazione', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const [booking] = await db
      .select({
        id: bookings.id,
        passengerId: bookings.passengerId,
        tripId: bookings.tripId,
        companyId: trips.companyId,
      })
      .from(bookings)
      .innerJoin(trips, eq(bookings.tripId, trips.id))
      .where(and(eq(bookings.id, id), isNull(bookings.deletedAt)));

    if (!booking) {
      return notFoundResponse('Prenotazione');
    }

    // Only operator of the company or admin can update status
    const isCompanyOperator = session.user.userType === 'operator' && session.user.companyId === booking.companyId;
    const isAdmin = session.user.userType === 'admin';

    if (!isCompanyOperator && !isAdmin) {
      return forbiddenResponse();
    }

    const body = await request.json();
    const allowedFields = ['status', 'operatorNotes'] as const;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const [updated] = await db
      .update(bookings)
      .set(updateData)
      .where(eq(bookings.id, id))
      .returning();

    return successResponse(updated);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse();
      if (error.message.includes('Forbidden')) return forbiddenResponse();
    }
    console.error('Update booking error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore aggiornamento prenotazione', 500);
  }
}
