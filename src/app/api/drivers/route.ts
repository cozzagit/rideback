import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { drivers } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { requireOperator } from '@/lib/auth/get-session';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-response';

export async function GET() {
  try {
    const session = await requireOperator();
    const companyId = session.user.companyId;

    if (!companyId) {
      return errorResponse('NO_COMPANY', 'Nessuna azienda associata', 400);
    }

    const results = await db
      .select()
      .from(drivers)
      .where(and(eq(drivers.companyId, companyId), isNull(drivers.deletedAt)));

    return successResponse(results);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse();
      if (error.message.includes('Forbidden')) return forbiddenResponse();
    }
    console.error('List drivers error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore nel recupero autisti', 500);
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
    const { firstName, lastName, phone, licenseNumber, licenseExpiry, photoUrl } = body;

    if (!firstName || !lastName || !licenseNumber) {
      return errorResponse('VALIDATION_ERROR', 'Nome, cognome e numero patente sono obbligatori');
    }

    const [newDriver] = await db
      .insert(drivers)
      .values({
        companyId,
        firstName,
        lastName,
        phone: phone || null,
        licenseNumber,
        licenseExpiry: licenseExpiry || null,
        photoUrl: photoUrl || null,
      })
      .returning();

    return successResponse(newDriver, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse();
      if (error.message.includes('Forbidden')) return forbiddenResponse();
    }
    console.error('Create driver error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore creazione autista', 500);
  }
}
