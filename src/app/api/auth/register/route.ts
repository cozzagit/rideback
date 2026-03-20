import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users, companies } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { generateSlug } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, displayName, phone, userType, company } = body;

    // Basic validation
    if (!email || !password || !displayName || !userType) {
      return errorResponse('VALIDATION_ERROR', 'Email, password, displayName e userType sono obbligatori');
    }

    if (!['passenger', 'operator'].includes(userType)) {
      return errorResponse('VALIDATION_ERROR', 'userType deve essere "passenger" o "operator"');
    }

    if (password.length < 12) {
      return errorResponse('VALIDATION_ERROR', 'La password deve avere almeno 12 caratteri');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, normalizedEmail), isNull(users.deletedAt)));

    if (existingUser) {
      return errorResponse('DUPLICATE_EMAIL', 'Email già registrata', 409);
    }

    // If operator, validate and create company first
    let companyId: string | null = null;

    if (userType === 'operator') {
      if (!company?.name || !company?.nccLicenseNumber) {
        return errorResponse(
          'VALIDATION_ERROR',
          'Per gli operatori, nome azienda e numero licenza NCC sono obbligatori',
        );
      }

      const slug = generateSlug(company.name);

      const [newCompany] = await db
        .insert(companies)
        .values({
          name: company.name,
          slug,
          nccLicenseNumber: company.nccLicenseNumber,
          email: normalizedEmail,
          phone: phone || null,
        })
        .returning({ id: companies.id });

      companyId = newCompany.id;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        passwordHash,
        displayName,
        phone: phone || null,
        userType,
        companyId,
      })
      .returning({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        phone: users.phone,
        userType: users.userType,
        companyId: users.companyId,
        createdAt: users.createdAt,
      });

    return successResponse(newUser, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse('INTERNAL_ERROR', 'Errore durante la registrazione', 500);
  }
}
