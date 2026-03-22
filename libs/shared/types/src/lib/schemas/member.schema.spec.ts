import { describe, it, expect } from 'vitest';
import {
  inviteMemberSchema,
  updateMemberRoleSchema,
} from './member.schema.js';
import { Role } from '../enums.js';

describe('inviteMemberSchema', () => {
  it('should accept valid input with role', () => {
    const result = inviteMemberSchema.parse({
      email: 'user@example.com',
      role: Role.ADMIN,
    });
    expect(result.email).toBe('user@example.com');
    expect(result.role).toBe(Role.ADMIN);
  });

  it('should default role to MEMBER when omitted', () => {
    const result = inviteMemberSchema.parse({ email: 'user@example.com' });
    expect(result.role).toBe(Role.MEMBER);
  });

  it('should reject invalid email', () => {
    const result = inviteMemberSchema.safeParse({ email: 'bad' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid role', () => {
    const result = inviteMemberSchema.safeParse({
      email: 'user@example.com',
      role: 'SUPERADMIN',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateMemberRoleSchema', () => {
  it('should accept valid role', () => {
    const result = updateMemberRoleSchema.parse({ role: Role.OWNER });
    expect(result.role).toBe(Role.OWNER);
  });

  it('should reject missing role', () => {
    const result = updateMemberRoleSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject invalid role value', () => {
    const result = updateMemberRoleSchema.safeParse({ role: 'INVALID' });
    expect(result.success).toBe(false);
  });
});
