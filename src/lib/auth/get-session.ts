import { auth } from './index';

export async function getSession() {
  return await auth();
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireOperator() {
  const session = await requireAuth();
  if (session.user.userType !== 'operator' && session.user.userType !== 'admin') {
    throw new Error('Forbidden: operator access required');
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.userType !== 'admin') {
    throw new Error('Forbidden: admin access required');
  }
  return session;
}
