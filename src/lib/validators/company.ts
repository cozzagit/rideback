import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().min(2).max(100),
  vatNumber: z.string().optional(),
  fiscalCode: z.string().optional(),
  nccLicenseNumber: z.string().min(1),
  nccLicenseExpiry: z.string().date().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  pecEmail: z.string().email().optional(),
  description: z.string().max(1000).optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
