import { pgTable, uuid, text, timestamp, boolean, index, integer, numeric, jsonb, date } from 'drizzle-orm/pg-core';
import { tripStatusEnum, recurrenceTypeEnum } from './enums';
import { companies } from './companies';
import { drivers } from './drivers';
import { vehicles } from './vehicles';

export const trips = pgTable(
  'trips',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id').notNull().references(() => companies.id),
    driverId: uuid('driver_id').references(() => drivers.id),
    vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
    originAddress: text('origin_address').notNull(),
    originLat: numeric('origin_lat', { precision: 10, scale: 7 }).notNull(),
    originLng: numeric('origin_lng', { precision: 10, scale: 7 }).notNull(),
    originCity: text('origin_city').notNull(),
    destinationAddress: text('destination_address').notNull(),
    destinationLat: numeric('destination_lat', { precision: 10, scale: 7 }).notNull(),
    destinationLng: numeric('destination_lng', { precision: 10, scale: 7 }).notNull(),
    destinationCity: text('destination_city').notNull(),
    routeGeometry: jsonb('route_geometry').notNull(),
    routeDistanceKm: numeric('route_distance_km', { precision: 8, scale: 2 }).notNull(),
    routeDurationMinutes: integer('route_duration_minutes').notNull(),
    departureAt: timestamp('departure_at', { withTimezone: true }).notNull(),
    estimatedArrivalAt: timestamp('estimated_arrival_at', { withTimezone: true }).notNull(),
    seatsAvailable: integer('seats_available').notNull(),
    seatsBooked: integer('seats_booked').notNull().default(0),
    pricePerSeat: integer('price_per_seat').notNull(),
    allowsIntermediateStops: boolean('allows_intermediate_stops').notNull().default(true),
    notes: text('notes'),
    status: tripStatusEnum('status').notNull().default('scheduled'),
    recurrenceType: recurrenceTypeEnum('recurrence_type').notNull().default('none'),
    recurrenceParentId: uuid('recurrence_parent_id'),
    recurrenceEndDate: date('recurrence_end_date'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('trips_company_id_idx').on(t.companyId),
    index('trips_driver_id_idx').on(t.driverId),
    index('trips_vehicle_id_idx').on(t.vehicleId),
    index('trips_departure_at_idx').on(t.departureAt),
    index('trips_status_idx').on(t.status),
    index('trips_origin_city_idx').on(t.originCity),
    index('trips_destination_city_idx').on(t.destinationCity),
    index('trips_status_departure_idx').on(t.status, t.departureAt),
    index('trips_deleted_at_idx').on(t.deletedAt),
  ],
);
