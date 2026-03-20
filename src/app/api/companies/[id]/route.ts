import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { companies } from '@/lib/db/schema';
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

    const [company] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.id, id), isNull(companies.deletedAt)));

    if (!company) {
      return notFoundResponse('Azienda');
    }

    // Only owner or admin can view
    if (session.user.companyId !== company.id && session.user.userType !== 'admin') {
      return forbiddenResponse();
    }

    return successResponse(company);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse();
      if (error.message.includes('Forbidden')) return forbiddenResponse();
    }
    console.error('Get company error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore nel recupero azienda', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const [company] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.id, id), isNull(companies.deletedAt)));

    if (!company) {
      return notFoundResponse('Azienda');
    }

    // Only owner or admin can update
    if (session.user.companyId !== company.id && session.user.userType !== 'admin') {
      return forbiddenResponse();
    }

    const body = await request.json();
    const allowedFields = [
      'name', 'vatNumber', 'fiscalCode', 'nccLicenseNumber', 'nccLicenseExpiry',
      'address', 'city', 'province', 'region', 'postalCode',
      'phone', 'email', 'pecEmail', 'logoUrl', 'description',
    ] as const;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const [updated] = await db
      .update(companies)
      .set(updateData)
      .where(eq(companies.id, id))
      .returning();

    return successResponse(updated);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return unauthorizedResponse();
      if (error.message.includes('Forbidden')) return forbiddenResponse();
    }
    console.error('Update company error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore aggiornamento azienda', 500);
  }
}
