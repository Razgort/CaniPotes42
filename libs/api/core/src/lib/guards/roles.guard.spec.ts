import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RolesGuard } from './roles.guard.js';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

function createMockContext(clubRole?: string): ExecutionContext {
  const request = { clubRole };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => vi.fn(),
    getClass: () => Object,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when no roles are required', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = createMockContext('MEMBER');

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when roles array is empty', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    const ctx = createMockContext('MEMBER');

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when user has a required role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'OWNER']);
    const ctx = createMockContext('ADMIN');

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should reject when user role does not match required roles', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'OWNER']);
    const ctx = createMockContext('MEMBER');

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should reject when user has no role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const ctx = createMockContext(undefined);

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
