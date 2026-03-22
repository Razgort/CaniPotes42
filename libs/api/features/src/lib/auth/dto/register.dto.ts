import { registerSchema } from '@org/types';
import { z } from 'zod';

export const registerWithConsentSchema = registerSchema.extend({
  acceptPrivacyNotice: z.literal(true, {
    error: 'Vous devez accepter la politique de confidentialite',
  }),
  acceptOptionalData: z.boolean().default(false),
});

export type RegisterWithConsent = z.infer<typeof registerWithConsentSchema>;
