import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemberController } from './member.controller.js';
import { MemberService } from './member.service.js';

describe('MemberController', () => {
  let controller: MemberController;
  let service: MemberService;

  const clubId = 'club-1';
  const jwtPayload = {
    sub: 'user-1',
    email: 'test@test.com',
    activeClubId: clubId,
    role: 'ADMIN' as const,
  };

  beforeEach(() => {
    const mockPrisma = {
      clubMember: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      user: { update: vi.fn() },
    };
    service = new MemberService(mockPrisma as any);
    controller = new MemberController(service);
  });

  describe('findAll', () => {
    it('should call service.findAll with correct params', async () => {
      const mockResult = {
        data: [],
        meta: { total: 0, page: 1, pageSize: 20 },
      };
      vi.spyOn(service, 'findAll').mockResolvedValue(mockResult);

      const result = await controller.findAll(clubId, jwtPayload, {
        page: 1,
        pageSize: 20,
      });

      expect(service.findAll).toHaveBeenCalledWith(
        clubId,
        { page: 1, pageSize: 20 },
        'ADMIN',
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with correct params', async () => {
      const mockMember = {
        id: 'member-1',
        userId: 'user-1',
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean@test.com',
        avatarUrl: null,
        role: 'MEMBER' as const,
        status: 'ACTIVE',
        suspendedAt: null,
        createdAt: new Date(),
      };
      vi.spyOn(service, 'findOne').mockResolvedValue(mockMember);

      const result = await controller.findOne(clubId, 'member-1');

      expect(service.findOne).toHaveBeenCalledWith(clubId, 'member-1');
      expect(result).toEqual(mockMember);
    });
  });

  describe('updateProfile', () => {
    it('should call service.updateProfile with user sub', async () => {
      const mockMember = {
        id: 'member-1',
        userId: 'user-1',
        firstName: 'Pierre',
        lastName: 'Dupont',
        email: 'jean@test.com',
        avatarUrl: null,
        role: 'MEMBER' as const,
        status: 'ACTIVE',
        suspendedAt: null,
        createdAt: new Date(),
      };
      vi.spyOn(service, 'updateProfile').mockResolvedValue(mockMember);

      const result = await controller.updateProfile(
        clubId,
        jwtPayload,
        'member-1',
        { firstName: 'Pierre' },
      );

      expect(service.updateProfile).toHaveBeenCalledWith(
        clubId,
        'member-1',
        'user-1',
        { firstName: 'Pierre' },
      );
      expect(result.firstName).toBe('Pierre');
    });
  });

  describe('updateRole', () => {
    it('should call service.updateRole with correct params', async () => {
      const mockResult = {
        id: 'member-1',
        userId: 'user-2',
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean@test.com',
        avatarUrl: null,
        role: 'ADMIN' as const,
        status: 'ACTIVE',
        suspendedAt: null,
        createdAt: new Date(),
      };
      vi.spyOn(service, 'updateRole').mockResolvedValue(mockResult);

      const result = await controller.updateRole(
        clubId,
        jwtPayload,
        'member-1',
        { role: 'ADMIN' as any },
      );

      expect(service.updateRole).toHaveBeenCalledWith(
        clubId,
        'member-1',
        'ADMIN',
        'user-1',
        'ADMIN',
      );
      expect(result.role).toBe('ADMIN');
    });
  });

  describe('removeMember', () => {
    it('should call service.removeMember with correct params', async () => {
      vi.spyOn(service, 'removeMember').mockResolvedValue(undefined);

      const result = await controller.removeMember(
        clubId,
        jwtPayload,
        'member-1',
      );

      expect(service.removeMember).toHaveBeenCalledWith(
        clubId,
        'member-1',
        'user-1',
        'ADMIN',
      );
      expect(result).toEqual({ message: 'Member removed' });
    });
  });

  describe('suspendMember', () => {
    it('should call service.suspendMember with correct params', async () => {
      const mockResult = {
        id: 'member-1',
        userId: 'user-2',
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean@test.com',
        avatarUrl: null,
        role: 'MEMBER' as const,
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        createdAt: new Date(),
      };
      vi.spyOn(service, 'suspendMember').mockResolvedValue(mockResult);

      const result = await controller.suspendMember(
        clubId,
        jwtPayload,
        'member-1',
        {},
      );

      expect(service.suspendMember).toHaveBeenCalledWith(
        clubId,
        'member-1',
        'user-1',
        'ADMIN',
      );
      expect(result.status).toBe('SUSPENDED');
    });
  });

  describe('unsuspendMember', () => {
    it('should call service.unsuspendMember with correct params', async () => {
      const mockResult = {
        id: 'member-1',
        userId: 'user-2',
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean@test.com',
        avatarUrl: null,
        role: 'MEMBER' as const,
        status: 'ACTIVE',
        suspendedAt: null,
        createdAt: new Date(),
      };
      vi.spyOn(service, 'unsuspendMember').mockResolvedValue(mockResult);

      const result = await controller.unsuspendMember(clubId, 'member-1');

      expect(service.unsuspendMember).toHaveBeenCalledWith(clubId, 'member-1');
      expect(result.status).toBe('ACTIVE');
    });
  });
});
