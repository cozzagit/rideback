import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { bookings, trips } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/get-session';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const [booking] = await db
      .select({
        id: bookings.id,
        status: bookings.status,
        passengerId: bookings.passengerId,
        seatsCount: bookings.seatsCount,
        tripId: bookings.tripId,
        companyId: trips.companyId,
        seatsBooked: trips.seatsBooked,
      })
      .from(bookings)
      .innerJoin(trips, eq(bookings.tripId, trips.id))
      .where(and(eq(bookings.id, id), isNull(bookings.deletedAt)));

    if (!booking) {
      return notFoundResponse('Prenotazione');
    }

    // Passenger can cancel their own, operator can cancel their company's
    const isPassenger = booking.passengerId === session.user.id;
    const isCompanyOperator = session.user.userType === 'operator' && session.user.companyId === booking.companyId;
    const isAdmin = session.user.userType === 'admin';

    if (!isPassenger && !isCompanyOperator && !isAdmin) {
      return forbiddenResponse();
    }

    if (booking.status === 'cancelled') {
      return errorResponse('ALREADY_CANCELLED', 'Prenotazione già cancellata', 400);
    }

    if (booking.status === 'completed') {
      return errorResponse('ALREADY_COMPLETED', 'Impossibile cancellare una prenotazione completata', 400);
    }

    const body = await request.json().catch(() => ({}));
    const cancellationReason = (body as { reason?: string }).reason || null;

    // Cancel the booking
    const [updated] = await db
      .update(bookings)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id))
      .returning();

    // Restore seats on the trip
    await db
      .update(trips)
      .set({
        seatsBooked: Math.max(0, booking.seatsBooked - booking.seatsCount),
        updatedAt: new Date(),
      })
      .where(eq(trips.id, booking.tripId));

    return successResponse(updated);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse();
      if (error.message.includes('Forbidden')) return forbiddenResponse();
    }
    console.error('Cancel booking error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore cancellazione prenotazione', 500);
  }
}
