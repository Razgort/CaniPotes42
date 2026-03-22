import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DogService } from './dog.service.js';
import type { JwtPayload } from '@org/api-core';

function createMockPrisma() {
  return {
    dog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

describe('DogService', () => {
  let service: DogService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const clubId = 'club-1';
  const userId = 'user-1';
  const dogId = 'dog-1';

  const mockUser: JwtPayload = {
    sub: userId,
    email: 'user@test.com',
    activeClubId: clubId,
    role: 'MEMBER',
  };

  const mockDog = {
    id: dogId,
    name: 'Rex',
    breed: 'Labrador',
    birthdate: new Date('2020-01-01'),
    chipNumber: '123456789',
    photoUrl: null,
    userId,
    clubId,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { firstName: 'Jean', lastName: 'Dupont' },
    vaccineRecords: [],
  };

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new DogService(mockPrisma as any);
  });

  describe('create', () => {
    it('should create a dog and return wrapped data', async () => {
      mockPrisma.dog.create.mockResolvedValue(mockDog);

      const result = await service.create({ name: 'Rex', breed: 'Labrador' }, mockUser);

      expect(result.data.id).toBe(dogId);
      expect(result.data.name).toBe('Rex');
      expect(result.data.userId).toBe(userId);
      expect(result.data.clubId).toBe(clubId);
    });

    it('should create dog with userId from JWT sub and clubId from activeClubId', async () => {
      mockPrisma.dog.create.mockResolvedValue(mockDog);

      await service.create({ name: 'Rex' }, mockUser);

      expect(mockPrisma.dog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            clubId,
            photoUrl: null,
          }),
        }),
      );
    });

    it('should convert birthdate string to Date', async () => {
      mockPrisma.dog.create.mockResolvedValue(mockDog);

      await service.create({ name: 'Rex', birthdate: '2020-01-01' }, mockUser);

      expect(mockPrisma.dog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            birthdate: new Date('2020-01-01'),
          }),
        }),
      );
    });

    it('should set optional fields to null when not provided', async () => {
      mockPrisma.dog.create.mockResolvedValue({ ...mockDog, breed: null, birthdate: null, chipNumber: null });

      await service.create({ name: 'Rex' }, mockUser);

      expect(mockPrisma.dog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            breed: null,
            birthdate: null,
            chipNumber: null,
          }),
        }),
      );
    });
  });

  describe('findAllForUser', () => {
    it('should return dogs scoped by userId and clubId', async () => {
      mockPrisma.dog.findMany.mockResolvedValue([mockDog]);
      mockPrisma.dog.count.mockResolvedValue(1);

      const result = await service.findAllForUser(userId, clubId);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(dogId);
      expect(result.meta.total).toBe(1);
      expect(mockPrisma.dog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, clubId },
        }),
      );
    });

    it('should return empty array when user has no dogs', async () => {
      mockPrisma.dog.findMany.mockResolvedValue([]);
      mockPrisma.dog.count.mockResolvedValue(0);

      const result = await service.findAllForUser(userId, clubId);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('findAllForClub', () => {
    it('should return all dogs in club', async () => {
      const anotherDog = { ...mockDog, id: 'dog-2', userId: 'user-2' };
      mockPrisma.dog.findMany.mockResolvedValue([mockDog, anotherDog]);
      mockPrisma.dog.count.mockResolvedValue(2);

      const result = await service.findAllForClub(clubId);

      expect(result.data).toHaveLength(2);
      expect(mockPrisma.dog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clubId } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return dog when found', async () => {
      mockPrisma.dog.findFirst.mockResolvedValue(mockDog);

      const result = await service.findOne(dogId, clubId);

      expect(result.data.id).toBe(dogId);
      expect(mockPrisma.dog.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: dogId, clubId } }),
      );
    });

    it('should throw NotFoundException when dog not found', async () => {
      mockPrisma.dog.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', clubId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update dog when caller is owner', async () => {
      mockPrisma.dog.findFirst.mockResolvedValueOnce({ userId }); // ownership check
      mockPrisma.dog.update.mockResolvedValue({ ...mockDog, name: 'Max' });

      const result = await service.update(dogId, userId, clubId, { name: 'Max' });

      expect(result.data.name).toBe('Max');
    });

    it('should throw ForbiddenException when caller is not owner', async () => {
      mockPrisma.dog.findFirst.mockResolvedValueOnce({ userId: 'other-user' });

      await expect(service.update(dogId, userId, clubId, { name: 'Max' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when dog does not exist', async () => {
      mockPrisma.dog.findFirst.mockResolvedValueOnce(null);

      await expect(service.update(dogId, userId, clubId, { name: 'Max' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should only update defined fields', async () => {
      mockPrisma.dog.findFirst.mockResolvedValueOnce({ userId });
      mockPrisma.dog.update.mockResolvedValue(mockDog);

      await service.update(dogId, userId, clubId, { breed: 'Golden' });

      expect(mockPrisma.dog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { breed: 'Golden' },
        }),
      );
    });
  });

  describe('updatePhoto', () => {
    it('should update photoUrl when caller is owner', async () => {
      const photoUrl = 'https://r2.example.com/photo.jpg';
      mockPrisma.dog.findFirst.mockResolvedValueOnce({ userId });
      mockPrisma.dog.update.mockResolvedValue({ ...mockDog, photoUrl });

      const result = await service.updatePhoto(dogId, userId, clubId, photoUrl);

      expect(result.data.photoUrl).toBe(photoUrl);
    });

    it('should throw ForbiddenException when not owner', async () => {
      mockPrisma.dog.findFirst.mockResolvedValueOnce({ userId: 'other-user' });

      await expect(
        service.updatePhoto(dogId, userId, clubId, 'https://url.com/photo.jpg'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete dog when caller is owner', async () => {
      mockPrisma.dog.findFirst.mockResolvedValueOnce({ userId });
      mockPrisma.dog.delete.mockResolvedValue(mockDog);

      await service.remove(dogId, userId, clubId);

      expect(mockPrisma.dog.delete).toHaveBeenCalledWith({ where: { id: dogId } });
    });

    it('should throw ForbiddenException when caller is not owner', async () => {
      mockPrisma.dog.findFirst.mockResolvedValueOnce({ userId: 'other-user' });

      await expect(service.remove(dogId, userId, clubId)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when dog does not exist', async () => {
      mockPrisma.dog.findFirst.mockResolvedValueOnce(null);

      await expect(service.remove(dogId, userId, clubId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPhotoUrl', () => {
    it('should return photoUrl when dog has photo', async () => {
      mockPrisma.dog.findFirst.mockResolvedValue({ photoUrl: 'https://url.com/photo.jpg' });

      const result = await service.getPhotoUrl(dogId, clubId);

      expect(result).toBe('https://url.com/photo.jpg');
    });

    it('should return null when dog has no photo', async () => {
      mockPrisma.dog.findFirst.mockResolvedValue({ photoUrl: null });

      const result = await service.getPhotoUrl(dogId, clubId);

      expect(result).toBeNull();
    });
  });

  describe('club scoping', () => {
    it('findOne should include clubId in WHERE to prevent cross-club access', async () => {
      mockPrisma.dog.findFirst.mockResolvedValue(null);

      await expect(service.findOne(dogId, 'other-club')).rejects.toThrow(NotFoundException);

      expect(mockPrisma.dog.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: dogId, clubId: 'other-club' } }),
      );
    });
  });
});
