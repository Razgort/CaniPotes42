import { z } from 'zod';
import { Role } from '../enums.js';

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(Role).optional().default(Role.MEMBER),
});

export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

export type InviteMember = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRole = z.infer<typeof updateMemberRoleSchema>;
