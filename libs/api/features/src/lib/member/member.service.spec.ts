import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@org/types';
import { MemberService } from './member.service.js';

function createMockPrisma() {
  return {
    clubMember: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  };
}

describe('MemberService', () => {
  let service: MemberService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const clubId = 'club-1';
  const userId = 'user-1';
  const memberId = 'member-1';

  const mockMember = {
    id: memberId,
    role: 'MEMBER',
    status: 'ACTIVE',
    suspendedAt: null,
    createdAt: new Date(),
    user: {
      id: userId,
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean@test.com',
      avatarUrl: null,
    },
  };

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new MemberService(mockPrisma as any);
  });

  describe('findAll', () => {
    it('should list members scoped by clubId', async () => {
      mockPrisma.clubMember.findMany.mockResolvedValue([mockMember]);
      mockPrisma.clubMember.count.mockResolvedValue(1);

      const result = await service.findAll(
        clubId,
        { page: 1, pageSize: 20 },
        'MEMBER',
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].firstName).toBe('Jean');
      expect(result.meta).toEqual({ total: 1, page: 1, pageSize: 20 });
      expect(mockPrisma.clubMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clubId } }),
      );
    });

    it('should apply search filter for ADMIN role', async () => {
      mockPrisma.clubMember.findMany.mockResolvedValue([]);
      mockPrisma.clubMember.count.mockResolvedValue(0);

      await service.findAll(
        clubId,
        { search: 'Jean', page: 1, pageSize: 20 },
        'ADMIN',
      );

      expect(mockPrisma.clubMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clubId,
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('should ignore search/filter for MEMBER role', async () => {
      mockPrisma.clubMember.findMany.mockResolvedValue([]);
      mockPrisma.clubMember.count.mockResolvedValue(0);

      await service.findAll(
        clubId,
        { search: 'Jean', role: 'ADMIN' as any, page: 1, pageSize: 20 },
        'MEMBER',
      );

      expect(mockPrisma.clubMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clubId } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a member by id scoped by clubId', async () => {
      mockPrisma.clubMember.findFirst.mockResolvedValue(mockMember);

      const result = await service.findOne(clubId, memberId);

      expect(result.firstName).toBe('Jean');
      expect(mockPrisma.clubMember.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: memberId, clubId } }),
      );
    });

    it('should throw NotFoundException if member not found', async () => {
      mockPrisma.clubMember.findFirst.mockResolvedValue(null);

      await expect(service.findOne(clubId, 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update own profile', async () => {
      mockPrisma.clubMember.findFirst
        .mockResolvedValueOnce({ userId })
        .mockResolvedValueOnce(mockMember);
      mockPrisma.user.update.mockResolvedValue(mockMember.user);

      const result = await service.updateProfile(clubId, memberId, userId, {
        firstName: 'Pierre',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: { firstName: 'Pierre' },
        }),
      );
      expect(result.firstName).toBe('Jean');
    });

    it('should reject update for another user', async () => {
      mockPrisma.clubMember.findFirst.mockResolvedValue({
        userId: 'other-user',
      });

      await expect(
        service.updateProfile(clubId, memberId, userId, {
          firstName: 'Pierre',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if member not found', async () => {
      mockPrisma.clubMember.findFirst.mockResolvedValue(null);

      await expect(
        service.updateProfile(clubId, memberId, userId, {
          firstName: 'Pierre',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateRole', () => {
    it('should allow owner to promote member to admin', async () => {
      mockPrisma.clubMember.findFirst
        .mockResolvedValueOnce({ id: memberId, userId: 'user-2', role: 'MEMBER' })
        .mockResolvedValueOnce({ ...mockMember, role: 'ADMIN' });
      mockPrisma.clubMember.update.mockResolvedValue({});

      const result = await service.updateRole(clubId, memberId, Role.ADMIN, userId, 'OWNER');

      expect(mockPrisma.clubMember.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { role: Role.ADMIN },
      });
      expect(result).toBeDefined();
    });

    it('should reject promotion to OWNER', async () => {
      await expect(
        service.updateRole(clubId, memberId, Role.OWNER, userId, 'OWNER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject changing the owner role', async () => {
      mockPrisma.clubMember.findFirst.mockResolvedValue({
        id: 'owner-member', userId: 'owner-user', role: 'OWNER',
      });

      await expect(
        service.updateRole(clubId, 'owner-member', Role.MEMBER, userId, 'OWNER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject admin self-demotion', async () => {
      mockPrisma.clubMember.findFirst.mockResolvedValue({
        id: memberId, userId, role: 'ADMIN',
      });

      await expect(
        service.updateRole(clubId, memberId, Role.MEMBER, userId, 'ADMIN'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to promote member to admin', async () => {
      mockPrisma.clubMember.findFirst
        .mockResolvedValueOnce({ id: memberId, userId: 'user-2', role: 'MEMBER' })
        .mockResolvedValueOnce({ ...mockMember, role: 'ADMIN' });
      mockPrisma.clubMember.update.mockResolvedValue({});

      const result = await service.updateRole(clubId, memberId, Role.ADMIN, userId, 'ADMIN');
      expect(result).toBeDefined();
    });

    it('should allow admin to demote another admin to member', async () => {
      mockPrisma.clubMember.findFirst
        .mockResolvedValueOnce({ id: memberId, userId: 'user-2', role: 'ADMIN' })
        .mockResolvedValueOnce({ ...mockMember, role: 'MEMBER' });
      mockPrisma.clubMember.update.mockResolvedValue({});

      const result = await service.updateRole(clubId, memberId, Role.MEMBER, userId, 'ADMIN');
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if member not found', async () => {
      mockPrisma.clubMember.findFirst.mockResolvedValue(null);

      await expect(
        service.updateRole(clubId, 'bad-id', Role.ADMIN, userId, 'OWNER'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeMember', () => {
    it('should remove a member', async () => {
      mockPrisma.clubMember.findFirst.mockResolvedValue({
        id: memberId, userId: 'user-2', role: 'MEMBER',
      });
      mockPrisma.clubMember.delete.mockResolvedValue({});

      await service.removeMember(clubId, memberId, userId, 'OWNER');

      expect(mockPrisma.clubMember.delete).toHaveBeenCalledWith({
        where: { id: memberId },
      });
    });

    it('should block removal of sole owner', async () => {
      mockPrisma.clubMember.findFirst.mockResolvedValue({
        id: memberId, userId, role: 'OWNER',
      });
      mockPrisma.clubMember.count.mockResolvedValue(1);

      await expect(
        service.removeMember(clubId, memberId, 'other-user', 'OWNER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should block admin from removing owner', async () => {
      mockPrisma.clubMember.findFirst.mockResolvedValue({
        id: memberId, userId: 'owner-user', role: 'OWNER',
      });

      await expect(
        service.removeMember(clubId, memberId, userId, 'ADMIN'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if member not found', async () => {
      mockPrisma.clubMember.findFirst.mockResolvedValue(null);

      await expect(
        service.removeMember(clubId, 'bad-id', userId, 'OWNER'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('suspendMember', () => {
    it('should suspend a member', async () => {
      mockPrisma.clubMember.findFirst
        .mockResolvedValueOnce({ id: memberId, userId: 'user-2', role: 'MEMBER', status: 'ACTIVE' })
        .mockResolvedValueOnce({ ...mockMember, status: 'SUSPENDED', suspendedAt: new Date() });
      mockPrisma.clubMember.update.mockResolvedValue({});

      const result = await service.suspendMember(clubId, memberId, userId, 'OWNER');

      expect(mockPrisma.clubMember.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { status: 'SUSPENDED', suspendedAt: expect.any(Date) },
      });
      expect(result).toBeDefined();
    });

    it('should block suspension of owner', async () => {
      mockPrisma.clubMember.findFirst.mockResolvedValue({
        id: memberId, userId: 'owner-user', role: 'OWNER', status: 'ACTIVE',
      });

      await expect(
        service.suspendMember(clubId, memberId, userId, 'OWNER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should block self-suspension', async () => {
      mockPrisma.clubMember.findFirst.mockResolvedValue({
        id: memberId, userId, role: 'MEMBER', status: 'ACTIVE',
      });

      await expect(
        service.suspendMember(clubId, memberId, userId, 'OWNER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject if already suspended', async () => {
      mockPrisma.clubMember.findFirst.mockResolvedValue({
        id: memberId, userId: 'user-2', role: 'MEMBER', status: 'SUSPENDED',
      });

      await expect(
        service.suspendMember(clubId, memberId, userId, 'OWNER'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if member not found', async () => {
      mockPrisma.clubMember.findFirst.mockResolvedValue(null);

      await expect(
        service.suspendMember(clubId, 'bad-id', userId, 'OWNER'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('unsuspendMember', () => {
    it('should unsuspend a suspended member', async () => {
      mockPrisma.clubMember.findFirst
        .mockResolvedValueOnce({ id: memberId, status: 'SUSPENDED' })
        .mockResolvedValueOnce({ ...mockMember, status: 'ACTIVE', suspendedAt: null });
      mockPrisma.clubMember.update.mockResolvedValue({});

      const result = await service.unsuspendMember(clubId, memberId);

      expect(mockPrisma.clubMember.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: { status: 'ACTIVE', suspendedAt: null },
      });
      expect(result).toBeDefined();
    });

    it('should reject if member is not suspended', async () => {
      mockPrisma.clubMember.findFirst.mockResolvedValue({
        id: memberId, status: 'ACTIVE',
      });

      await expect(
        service.unsuspendMember(clubId, memberId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if member not found', async () => {
      mockPrisma.clubMember.findFirst.mockResolvedValue(null);

      await expect(
        service.unsuspendMember(clubId, 'bad-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
