import { z } from 'zod';
import { registerSchema } from '@org/types';

export const registerWithConsentSchema = registerSchema.extend({
  acceptPrivacyNotice: z.literal(true, {
    error: 'Vous devez accepter la politique de confidentialite',
  }),
  acceptOptionalData: z.boolean().default(false),
});

export type RegisterWithConsent = z.infer<typeof registerWithConsentSchema>;
export type RegisterWithConsentInput = z.input<typeof registerWithConsentSchema>;
