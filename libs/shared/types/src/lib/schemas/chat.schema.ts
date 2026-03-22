import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  imageUrl: z.string().url().optional(),
  channelId: z.string().uuid(),
});

export type SendMessage = z.infer<typeof sendMessageSchema>;
