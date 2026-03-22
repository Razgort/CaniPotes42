import { z } from 'zod';
import { Role } from '../enums.js';

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(Role).optional().default(Role.MEMBER),
});

export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

export const suspendMemberSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
});

export const findMembersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type InviteMember = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRole = z.infer<typeof updateMemberRoleSchema>;
export type SuspendMember = z.infer<typeof suspendMemberSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type FindMembersQuery = z.infer<typeof findMembersQuerySchema>;
