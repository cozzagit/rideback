import { z } from 'zod';

export const createBookingSchema = z.object({
  tripId: z.string().uuid(),
  seatsCount: z.number().int().min(1).max(8).default(1),
  boardingWaypointId: z.string().uuid().optional(),
  alightingWaypointId: z.string().uuid().optional(),
  passengerNotes: z.string().max(500).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
