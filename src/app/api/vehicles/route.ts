import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { vehicles } from '@/lib/db/schema';
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
      .from(vehicles)
      .where(and(eq(vehicles.companyId, companyId), isNull(vehicles.deletedAt)));

    return successResponse(results);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse();
      if (error.message.includes('Forbidden')) return forbiddenResponse();
    }
    console.error('List vehicles error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore nel recupero veicoli', 500);
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
    const { vehicleType, make, model, year, color, licensePlate, seatsTotal, photoUrl, amenities } = body;

    if (!vehicleType || !make || !model || !licensePlate || !seatsTotal) {
      return errorResponse('VALIDATION_ERROR', 'Tipo veicolo, marca, modello, targa e posti sono obbligatori');
    }

    if (!['sedan', 'van', 'minibus'].includes(vehicleType)) {
      return errorResponse('VALIDATION_ERROR', 'Tipo veicolo non valido');
    }

    const [newVehicle] = await db
      .insert(vehicles)
      .values({
        companyId,
        vehicleType,
        make,
        model,
        year: year || null,
        color: color || null,
        licensePlate,
        seatsTotal,
        photoUrl: photoUrl || null,
        amenities: amenities || [],
      })
      .returning();

    return successResponse(newVehicle, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse();
      if (error.message.includes('Forbidden')) return forbiddenResponse();
    }
    console.error('Create vehicle error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore creazione veicolo', 500);
  }
}
