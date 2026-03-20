import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { vehicles } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { requireOperator } from '@/lib/auth/get-session';
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
    const session = await requireOperator();
    const { id } = await params;
    const companyId = session.user.companyId;

    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, id), eq(vehicles.companyId, companyId!), isNull(vehicles.deletedAt)));

    if (!vehicle) {
      return notFoundResponse('Veicolo');
    }

    return successResponse(vehicle);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse();
      if (error.message.includes('Forbidden')) return forbiddenResponse();
    }
    console.error('Get vehicle error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore recupero veicolo', 500);
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

    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, id), eq(vehicles.companyId, companyId!), isNull(vehicles.deletedAt)));

    if (!vehicle) {
      return notFoundResponse('Veicolo');
    }

    const body = await request.json();
    const allowedFields = [
      'vehicleType', 'make', 'model', 'year', 'color',
      'licensePlate', 'seatsTotal', 'photoUrl', 'amenities', 'isActive',
    ] as const;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const [updated] = await db
      .update(vehicles)
      .set(updateData)
      .where(eq(vehicles.id, id))
      .returning();

    return successResponse(updated);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse();
      if (error.message.includes('Forbidden')) return forbiddenResponse();
    }
    console.error('Update vehicle error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore aggiornamento veicolo', 500);
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

    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, id), eq(vehicles.companyId, companyId!), isNull(vehicles.deletedAt)));

    if (!vehicle) {
      return notFoundResponse('Veicolo');
    }

    await db
      .update(vehicles)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(vehicles.id, id));

    return successResponse({ message: 'Veicolo eliminato' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse();
      if (error.message.includes('Forbidden')) return forbiddenResponse();
    }
    console.error('Delete vehicle error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore eliminazione veicolo', 500);
  }
}
