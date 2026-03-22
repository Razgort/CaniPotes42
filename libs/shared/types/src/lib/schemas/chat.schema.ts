import { z } from 'zod';

// ─── Channel ─────────────────────────────────────────────────────────────────

export const channelSchema = z.object({
  id: z.string().uuid(),
  clubId: z.string().uuid(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Channel = z.infer<typeof channelSchema>;

// ─── Message ─────────────────────────────────────────────────────────────────

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  channelId: z.string().uuid(),
});

export type SendMessage = z.infer<typeof sendMessageSchema>;

export const chatMessageSchema = z.object({
  id: z.string().uuid(),
  channelId: z.string().uuid(),
  content: z.string(),
  imageUrl: z.string().url().nullable().optional(),
  userId: z.string().uuid(),
  senderName: z.string(),
  senderAvatar: z.string().url().nullable().optional(),
  createdAt: z.string(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

// ─── Gateway Events ───────────────────────────────────────────────────────────

export const wsJoinChannelSchema = z.object({
  channelId: z.string().uuid(),
});

export type WsJoinChannel = z.infer<typeof wsJoinChannelSchema>;

export const wsSendMessageSchema = z.object({
  channelId: z.string().uuid(),
  content: z.string().min(1).max(4000),
});

export type WsSendMessage = z.infer<typeof wsSendMessageSchema>;
