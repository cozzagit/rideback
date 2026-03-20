import { z } from 'zod';

export const createTripSchema = z.object({
  vehicleId: z.string().uuid(),
  driverId: z.string().uuid().optional(),
  originAddress: z.string().min(1),
  originLat: z.number().min(-90).max(90),
  originLng: z.number().min(-180).max(180),
  originCity: z.string().min(1),
  destinationAddress: z.string().min(1),
  destinationLat: z.number().min(-90).max(90),
  destinationLng: z.number().min(-180).max(180),
  destinationCity: z.string().min(1),
  departureAt: z.string().datetime(),
  seatsAvailable: z.number().int().min(1).max(8),
  pricePerSeat: z.number().int().min(1000), // cents, min €10
  allowsIntermediateStops: z.boolean().default(true),
  notes: z.string().optional(),
  recurrenceType: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
  recurrenceEndDate: z.string().date().optional(),
});

export const searchTripsSchema = z.object({
  date: z.string().date(),
  originLat: z.number().optional(),
  originLng: z.number().optional(),
  destinationLat: z.number().optional(),
  destinationLng: z.number().optional(),
  minLat: z.number().optional(),
  minLng: z.number().optional(),
  maxLat: z.number().optional(),
  maxLng: z.number().optional(),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type SearchTripsInput = z.infer<typeof searchTripsSchema>;
