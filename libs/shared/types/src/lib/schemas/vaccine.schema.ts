import { z } from 'zod';

export const createVaccineSchema = z.object({
  vaccineName: z.string().min(1).max(200),
  dateAdministered: z.string().date(),
  expiryDate: z.string().date(),
});

export type CreateVaccine = z.infer<typeof createVaccineSchema>;
