import { z } from 'zod';

export const createInvitationSchema = z.object({
  emails: z
    .array(z.string().email('Format d\'email invalide'))
    .min(1, 'Au moins un email requis')
    .max(10, 'Maximum 10 invitations à la fois'),
});

export const acceptInvitationSchema = z.object({
  token: z.string().uuid('Token d\'invitation invalide'),
});

export type CreateInvitation = z.infer<typeof createInvitationSchema>;
export type AcceptInvitation = z.infer<typeof acceptInvitationSchema>;
