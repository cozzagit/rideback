import { pgTable, uuid, text, timestamp, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { bookings } from './bookings';
import { users } from './users';
import { companies } from './companies';
import { drivers } from './drivers';

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id').notNull().references(() => bookings.id),
    reviewerId: uuid('reviewer_id').notNull().references(() => users.id),
    companyId: uuid('company_id').notNull().references(() => companies.id),
    driverId: uuid('driver_id').references(() => drivers.id),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('reviews_booking_id_unique').on(t.bookingId),
    index('reviews_company_id_idx').on(t.companyId),
    index('reviews_driver_id_idx').on(t.driverId),
    index('reviews_reviewer_id_idx').on(t.reviewerId),
  ],
);
