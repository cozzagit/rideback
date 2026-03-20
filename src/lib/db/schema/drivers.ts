import { pgTable, uuid, text, timestamp, boolean, index, date } from 'drizzle-orm/pg-core';
import { companies } from './companies';
import { users } from './users';

export const drivers = pgTable(
  'drivers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id').notNull().references(() => companies.id),
    userId: uuid('user_id').references(() => users.id),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    phone: text('phone'),
    licenseNumber: text('license_number').notNull(),
    licenseExpiry: date('license_expiry'),
    photoUrl: text('photo_url'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('drivers_company_id_idx').on(t.companyId),
    index('drivers_user_id_idx').on(t.userId),
    index('drivers_deleted_at_idx').on(t.deletedAt),
  ],
);
