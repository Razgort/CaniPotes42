import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { DogController } from './dog.controller.js';
import type { JwtPayload } from '@org/api-core';

function createMockDogService() {
  return {
    create: vi.fn(),
    findAllForUser: vi.fn(),
    findAllForClub: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    getPhotoUrl: vi.fn(),
    updatePhoto: vi.fn(),
  };
}

function createMockR2Service() {
  return {
    upload: vi.fn(),
    delete: vi.fn(),
    getSignedUrl: vi.fn(),
  };
}

describe('DogController', () => {
  let controller: DogController;
  let dogService: ReturnType<typeof createMockDogService>;
  let r2Service: ReturnType<typeof createMockR2Service>;

  const clubId = 'club-1';
  const userId = 'user-1';
  const dogId = 'dog-1';

  const mockUser: JwtPayload = {
    sub: userId,
    email: 'user@test.com',
    activeClubId: clubId,
    role: 'MEMBER',
  };

  const mockDogResponse = {
    data: {
      id: dogId,
      name: 'Rex',
      breed: 'Labrador',
      birthdate: null,
      chipNumber: null,
      photoUrl: null,
      userId,
      clubId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  beforeEach(() => {
    dogService = createMockDogService();
    r2Service = createMockR2Service();
    controller = new DogController(dogService as any, r2Service as any);
  });

  describe('create', () => {
    it('should call dogService.create and return result', async () => {
      dogService.create.mockResolvedValue(mockDogResponse);

      const result = await controller.create({ name: 'Rex' }, mockUser);

      expect(result).toEqual(mockDogResponse);
      expect(dogService.create).toHaveBeenCalledWith({ name: 'Rex' }, mockUser);
    });
  });

  describe('findAll', () => {
    it('should call findAllForUser by default', async () => {
      dogService.findAllForUser.mockResolvedValue({ data: [mockDogResponse.data], meta: { total: 1 } });

      await controller.findAll(clubId, mockUser);

      expect(dogService.findAllForUser).toHaveBeenCalledWith(userId, clubId);
      expect(dogService.findAllForClub).not.toHaveBeenCalled();
    });

    it('should call findAllForClub when all=true query param is set', async () => {
      dogService.findAllForClub.mockResolvedValue({ data: [], meta: { total: 0 } });

      await controller.findAll(clubId, mockUser, 'true');

      expect(dogService.findAllForClub).toHaveBeenCalledWith(clubId);
      expect(dogService.findAllForUser).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return dog detail', async () => {
      dogService.findOne.mockResolvedValue(mockDogResponse);

      const result = await controller.findOne(clubId, dogId);

      expect(result).toEqual(mockDogResponse);
      expect(dogService.findOne).toHaveBeenCalledWith(dogId, clubId);
    });
  });

  describe('update', () => {
    it('should call dogService.update with correct params', async () => {
      dogService.update.mockResolvedValue({ data: { ...mockDogResponse.data, breed: 'Golden' } });

      await controller.update(clubId, mockUser, dogId, { breed: 'Golden' });

      expect(dogService.update).toHaveBeenCalledWith(dogId, userId, clubId, { breed: 'Golden' });
    });
  });

  describe('remove', () => {
    it('should call dogService.remove with correct params', async () => {
      dogService.remove.mockResolvedValue(undefined);

      await controller.remove(clubId, mockUser, dogId);

      expect(dogService.remove).toHaveBeenCalledWith(dogId, userId, clubId);
    });
  });

  describe('uploadPhoto', () => {
    it('should throw BadRequestException when no file provided', async () => {
      await expect(
        controller.uploadPhoto(clubId, mockUser, dogId, undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should upload photo to R2 and update dog', async () => {
      const mockFile = {
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('fake-image'),
        size: 1024,
      } as Express.Multer.File;

      dogService.getPhotoUrl.mockResolvedValue(null);
      r2Service.upload.mockResolvedValue('https://r2.example.com/photo.jpg');
      dogService.updatePhoto.mockResolvedValue({
        data: { ...mockDogResponse.data, photoUrl: 'https://r2.example.com/photo.jpg' },
      });

      const result = await controller.uploadPhoto(clubId, mockUser, dogId, mockFile);

      expect(r2Service.upload).toHaveBeenCalledWith(
        `clubs/${clubId}/dogs/${dogId}/photo.jpg`,
        mockFile.buffer,
        'image/jpeg',
      );
      expect(dogService.updatePhoto).toHaveBeenCalledWith(
        dogId,
        userId,
        clubId,
        'https://r2.example.com/photo.jpg',
      );
      expect(result.data.photoUrl).toBe('https://r2.example.com/photo.jpg');
    });

    it('should delete old photo from R2 before uploading new one', async () => {
      const mockFile = {
        originalname: 'new-photo.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('new-image'),
        size: 1024,
      } as Express.Multer.File;

      dogService.getPhotoUrl.mockResolvedValue('https://r2.example.com/clubs/club-1/dogs/dog-1/photo.jpg');
      r2Service.delete.mockResolvedValue(undefined);
      r2Service.upload.mockResolvedValue('https://r2.example.com/new-photo.jpg');
      dogService.updatePhoto.mockResolvedValue(mockDogResponse);

      await controller.uploadPhoto(clubId, mockUser, dogId, mockFile);

      expect(r2Service.delete).toHaveBeenCalledWith('clubs/club-1/dogs/dog-1/photo.jpg');
    });
  });
});
