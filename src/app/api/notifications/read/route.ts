import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/get-session';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response';

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json().catch(() => ({}));
    const { notificationIds } = body as { notificationIds?: string[] };

    const now = new Date();

    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      // Mark specific notifications as read
      await db
        .update(notifications)
        .set({ readAt: now })
        .where(
          and(
            eq(notifications.userId, session.user.id),
            inArray(notifications.id, notificationIds),
            isNull(notifications.readAt),
          )
        );
    } else {
      // Mark all unread notifications as read
      await db
        .update(notifications)
        .set({ readAt: now })
        .where(
          and(
            eq(notifications.userId, session.user.id),
            isNull(notifications.readAt),
          )
        );
    }

    return successResponse({ message: 'Notifiche segnate come lette' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }
    console.error('Mark notifications read error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore aggiornamento notifiche', 500);
  }
}
