import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/get-session';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response';

export async function GET() {
  try {
    const session = await requireAuth();

    const results = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, session.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    return successResponse(results);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return unauthorizedResponse();
    }
    console.error('List notifications error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore nel recupero notifiche', 500);
  }
}
