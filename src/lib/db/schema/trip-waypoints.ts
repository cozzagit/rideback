import { pgTable, uuid, text, timestamp, integer, numeric, index } from 'drizzle-orm/pg-core';
import { trips } from './trips';

export const tripWaypoints = pgTable(
  'trip_waypoints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id').notNull().references(() => trips.id),
    position: integer('position').notNull(),
    address: text('address').notNull(),
    city: text('city').notNull(),
    lat: numeric('lat', { precision: 10, scale: 7 }).notNull(),
    lng: numeric('lng', { precision: 10, scale: 7 }).notNull(),
    routeFraction: numeric('route_fraction', { precision: 5, scale: 4 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('trip_waypoints_trip_id_idx').on(t.tripId),
  ],
);
