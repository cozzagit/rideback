import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      userType: string;  // passenger, operator, admin
      companyId: string | null;
      name: string;
      email: string;
    };
  }
  interface User {
    id: string;
    userType: string;
    companyId: string | null;
    name: string;
    email: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Credenziali',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        const [user] = await db
          .select()
          .from(users)
          .where(and(eq(users.email, email), eq(users.isActive, true), isNull(users.deletedAt)));

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

        return {
          id: user.id,
          userType: user.userType,
          companyId: user.companyId,
          name: user.displayName,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    authorized() { return true; },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.userType = (user as any).userType;
        token.companyId = (user as any).companyId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.userType = token.userType as string;
      session.user.companyId = (token.companyId as string) || null;
      return session;
    },
  },
  pages: { signIn: '/login', error: '/login' },
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  useSecureCookies: false,
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
});
