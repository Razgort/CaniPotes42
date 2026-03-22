import { z } from 'zod';
import { PaymentProvider } from '../enums.js';

export const createLicenseTypeSchema = z.object({
  name: z.string().min(1).max(200),
  amount: z.number().positive().int(),
  season: z.string().min(1).max(20),
  paymentProvider: z.nativeEnum(PaymentProvider),
});

export const updateLicenseTypeSchema = createLicenseTypeSchema.partial();

export const initiatePaymentSchema = z.object({
  licenseTypeId: z.string().uuid(),
});

export const licenseStatusQuerySchema = z.object({
  season: z.string().optional(),
  status: z.enum(['ALL', 'PAID', 'PENDING', 'UNPAID']).optional().default('ALL'),
  provider: z.enum(['ALL', 'STRIPE', 'HELLOASSO']).optional().default('ALL'),
  search: z.string().optional(),
});

export const paymentHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  season: z.string().optional(),
});

export const helloAssoWebhookSchema = z.object({
  eventType: z.string(),
  data: z.object({
    checkoutIntentId: z.string(),
    state: z.enum(['Authorized', 'Refused', 'Refunded']),
    amount: z.number().optional(),
    date: z.string().optional(),
  }),
});

export type HelloAssoWebhook = z.infer<typeof helloAssoWebhookSchema>;

export type CreateLicenseType = z.infer<typeof createLicenseTypeSchema>;
export type UpdateLicenseType = z.infer<typeof updateLicenseTypeSchema>;
export type InitiatePayment = z.infer<typeof initiatePaymentSchema>;
export type LicenseStatusQuery = z.infer<typeof licenseStatusQuerySchema>;
export type PaymentHistoryQuery = z.infer<typeof paymentHistoryQuerySchema>;

export interface PaymentSessionResponse {
  sessionUrl: string;
  paymentId: string;
}
