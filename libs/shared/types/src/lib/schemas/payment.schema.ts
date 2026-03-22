import { z } from 'zod';

export const createLicenseTypeSchema = z.object({
  name: z.string().min(1).max(200),
  amount: z.number().positive().int(),
  season: z.string().min(1).max(20),
});

export const initiatePaymentSchema = z.object({
  licenseTypeId: z.string().uuid(),
});

export type CreateLicenseType = z.infer<typeof createLicenseTypeSchema>;
export type InitiatePayment = z.infer<typeof initiatePaymentSchema>;
