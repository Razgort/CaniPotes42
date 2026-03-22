import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClubGuard } from './club.guard.js';
import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

function createMockContext(user: unknown): ExecutionContext {
  const request = { user };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => vi.fn(),
    }),
    getClass: () => Object,
    getHandler: () => vi.fn(),
    getArgs: () => [request],
    getArgByIndex: (index: number) => [request][index],
    switchToRpc: () => ({} as any),
    switchToWs: () => ({} as any),
    getType: () => 'http' as const,
  } as unknown as ExecutionContext;
}

describe('ClubGuard', () => {
  let guard: ClubGuard;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      clubMember: {
        findFirst: vi.fn(),
      },
    };
    guard = new ClubGuard(mockPrisma);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should reject when no activeClubId in JWT', async () => {
    const ctx = createMockContext({ sub: 'user-1', email: 'a@b.com' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should reject when user is not a member of the club', async () => {
    const ctx = createMockContext({
      sub: 'user-1',
      email: 'a@b.com',
      activeClubId: 'club-1',
      role: 'MEMBER',
    });
    mockPrisma.clubMember.findFirst.mockResolvedValue(null);

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should allow access and inject clubId/clubRole when user is a member', async () => {
    const request = {
      user: {
        sub: 'user-1',
        email: 'a@b.com',
        activeClubId: 'club-1',
        role: 'ADMIN',
      },
    } as any;

    const ctx = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    mockPrisma.clubMember.findFirst.mockResolvedValue({ role: 'ADMIN', status: 'ACTIVE' });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.clubId).toBe('club-1');
    expect(request.clubRole).toBe('ADMIN');
  });

  it('should reject suspended members with ForbiddenException', async () => {
    const request = {
      user: {
        sub: 'user-1',
        email: 'a@b.com',
        activeClubId: 'club-1',
        role: 'MEMBER',
      },
    } as any;

    const ctx = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    mockPrisma.clubMember.findFirst.mockResolvedValue({ role: 'MEMBER', status: 'SUSPENDED' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should query ClubMember with correct userId and clubId', async () => {
    const request = {
      user: {
        sub: 'user-123',
        email: 'a@b.com',
        activeClubId: 'club-456',
        role: 'MEMBER',
      },
    } as any;

    const ctx = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    mockPrisma.clubMember.findFirst.mockResolvedValue({ role: 'MEMBER', status: 'ACTIVE' });

    await guard.canActivate(ctx);

    expect(mockPrisma.clubMember.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-123', clubId: 'club-456' },
      select: { role: true, status: true },
    });
  });
});
