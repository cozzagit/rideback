import { db } from '@/lib/db';
import { companies } from '@/lib/db/schema';
import { isNull } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth/get-session';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-response';

export async function GET() {
  try {
    const session = await requireAdmin();

    const results = await db
      .select()
      .from(companies)
      .where(isNull(companies.deletedAt));

    return successResponse(results);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse();
      if (error.message.includes('Forbidden')) return forbiddenResponse();
    }
    console.error('List companies error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore nel recupero delle aziende', 500);
  }
}
