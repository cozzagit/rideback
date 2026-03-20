import { NextResponse } from 'next/server';

export function successResponse(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(code: string, message: string, status = 400) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function unauthorizedResponse() {
  return errorResponse('UNAUTHORIZED', 'Autenticazione richiesta', 401);
}

export function forbiddenResponse() {
  return errorResponse('FORBIDDEN', 'Accesso negato', 403);
}

export function notFoundResponse(resource = 'Risorsa') {
  return errorResponse('NOT_FOUND', `${resource} non trovata`, 404);
}
