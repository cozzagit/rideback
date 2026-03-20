import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { bookings, trips } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { requireOperator } from '@/lib/auth/get-session';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from '@/lib/api-response';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireOperator();
    const { id } = await params;

    const [booking] = await db
      .select({
        id: bookings.id,
        status: bookings.status,
        companyId: trips.companyId,
      })
      .from(bookings)
      .innerJoin(trips, eq(bookings.tripId, trips.id))
      .where(and(eq(bookings.id, id), isNull(bookings.deletedAt)));

    if (!booking) {
      return notFoundResponse('Prenotazione');
    }

    // Verify the operator owns this company's trip
    if (session.user.companyId !== booking.companyId && session.user.userType !== 'admin') {
      return forbiddenResponse();
    }

    if (booking.status !== 'pending') {
      return errorResponse(
        'INVALID_STATUS',
        `Impossibile confermare una prenotazione con stato "${booking.status}"`,
        400,
      );
    }

    const [updated] = await db
      .update(bookings)
      .set({
        status: 'confirmed',
        confirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id))
      .returning();

    return successResponse(updated);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse();
      if (error.message.includes('Forbidden')) return forbiddenResponse();
    }
    console.error('Confirm booking error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore conferma prenotazione', 500);
  }
}
