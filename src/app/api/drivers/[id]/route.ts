import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { drivers } from '@/lib/db/schema';
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

    const [driver] = await db
      .select()
      .from(drivers)
      .where(and(eq(drivers.id, id), eq(drivers.companyId, companyId!), isNull(drivers.deletedAt)));

    if (!driver) {
      return notFoundResponse('Autista');
    }

    return successResponse(driver);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse();
      if (error.message.includes('Forbidden')) return forbiddenResponse();
    }
    console.error('Get driver error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore recupero autista', 500);
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

    const [driver] = await db
      .select()
      .from(drivers)
      .where(and(eq(drivers.id, id), eq(drivers.companyId, companyId!), isNull(drivers.deletedAt)));

    if (!driver) {
      return notFoundResponse('Autista');
    }

    const body = await request.json();
    const allowedFields = ['firstName', 'lastName', 'phone', 'licenseNumber', 'licenseExpiry', 'photoUrl', 'isActive'] as const;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const [updated] = await db
      .update(drivers)
      .set(updateData)
      .where(eq(drivers.id, id))
      .returning();

    return successResponse(updated);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse();
      if (error.message.includes('Forbidden')) return forbiddenResponse();
    }
    console.error('Update driver error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore aggiornamento autista', 500);
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

    const [driver] = await db
      .select()
      .from(drivers)
      .where(and(eq(drivers.id, id), eq(drivers.companyId, companyId!), isNull(drivers.deletedAt)));

    if (!driver) {
      return notFoundResponse('Autista');
    }

    await db
      .update(drivers)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(drivers.id, id));

    return successResponse({ message: 'Autista eliminato' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse();
      if (error.message.includes('Forbidden')) return forbiddenResponse();
    }
    console.error('Delete driver error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore eliminazione autista', 500);
  }
}
