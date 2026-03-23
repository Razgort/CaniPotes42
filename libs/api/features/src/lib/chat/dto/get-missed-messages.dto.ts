import { z } from 'zod';

export const getMissedMessagesQuerySchema = z.object({
  since: z
    .string({ required_error: 'Le paramètre "since" est requis' })
    .datetime({ message: 'Le paramètre "since" doit être une date ISO8601 valide' }),
});

export type GetMissedMessagesQuery = z.infer<typeof getMissedMessagesQuerySchema>;
