import { pgTable, uuid, text, timestamp, integer, numeric, jsonb, index } from 'drizzle-orm/pg-core';
import { bookingStatusEnum } from './enums';
import { trips } from './trips';
import { users } from './users';
import { tripWaypoints } from './trip-waypoints';

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id').notNull().references(() => trips.id),
    passengerId: uuid('passenger_id').notNull().references(() => users.id),
    seatsCount: integer('seats_count').notNull().default(1),
    boardingWaypointId: uuid('boarding_waypoint_id').references(() => tripWaypoints.id),
    alightingWaypointId: uuid('alighting_waypoint_id').references(() => tripWaypoints.id),
    pickupLat: numeric('pickup_lat', { precision: 10, scale: 7 }),
    pickupLng: numeric('pickup_lng', { precision: 10, scale: 7 }),
    pickupAddress: text('pickup_address'),
    dropoffLat: numeric('dropoff_lat', { precision: 10, scale: 7 }),
    dropoffLng: numeric('dropoff_lng', { precision: 10, scale: 7 }),
    dropoffAddress: text('dropoff_address'),
    priceTotal: integer('price_total').notNull(),
    priceBreakdown: jsonb('price_breakdown'),
    status: bookingStatusEnum('status').notNull().default('pending'),
    passengerNotes: text('passenger_notes'),
    operatorNotes: text('operator_notes'),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('bookings_trip_id_idx').on(t.tripId),
    index('bookings_passenger_id_idx').on(t.passengerId),
    index('bookings_status_idx').on(t.status),
    index('bookings_deleted_at_idx').on(t.deletedAt),
  ],
);
