import { pgEnum } from 'drizzle-orm/pg-core';

export const userTypeEnum = pgEnum('user_type', ['passenger', 'operator', 'admin']);
export const companyStatusEnum = pgEnum('company_status', ['pending', 'verified', 'suspended']);
export const vehicleTypeEnum = pgEnum('vehicle_type', ['sedan', 'van', 'minibus']);
export const tripStatusEnum = pgEnum('trip_status', ['scheduled', 'active', 'completed', 'cancelled']);
export const bookingStatusEnum = pgEnum('booking_status', ['pending', 'confirmed', 'cancelled', 'completed', 'no_show']);
export const recurrenceTypeEnum = pgEnum('recurrence_type', ['none', 'daily', 'weekly', 'monthly']);
