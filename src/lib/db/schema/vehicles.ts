import { pgTable, uuid, text, timestamp, boolean, index, uniqueIndex, integer, jsonb } from 'drizzle-orm/pg-core';
import { vehicleTypeEnum } from './enums';
import { companies } from './companies';

export const vehicles = pgTable(
  'vehicles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id').notNull().references(() => companies.id),
    vehicleType: vehicleTypeEnum('vehicle_type').notNull(),
    make: text('make').notNull(),
    model: text('model').notNull(),
    year: integer('year'),
    color: text('color'),
    licensePlate: text('license_plate').notNull(),
    seatsTotal: integer('seats_total').notNull(),
    photoUrl: text('photo_url'),
    amenities: jsonb('amenities').notNull().default([]),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('vehicles_company_id_idx').on(t.companyId),
    uniqueIndex('vehicles_license_plate_unique').on(t.licensePlate),
    index('vehicles_deleted_at_idx').on(t.deletedAt),
  ],
);
