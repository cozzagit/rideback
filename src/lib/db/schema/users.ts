import { pgTable, uuid, text, timestamp, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { userTypeEnum } from './enums';
import { companies } from './companies';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    passwordHash: text('password_hash'),
    displayName: text('display_name').notNull(),
    phone: text('phone'),
    avatarUrl: text('avatar_url'),
    userType: userTypeEnum('user_type').notNull().default('passenger'),
    companyId: uuid('company_id').references(() => companies.id),
    isActive: boolean('is_active').notNull().default(true),
    isSuperAdmin: boolean('is_super_admin').notNull().default(false),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('users_email_unique').on(t.email),
    index('users_company_id_idx').on(t.companyId),
    index('users_deleted_at_idx').on(t.deletedAt),
  ],
);
