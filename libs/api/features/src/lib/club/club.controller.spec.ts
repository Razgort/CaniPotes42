import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClubController } from './club.controller.js';
import { ClubService } from './club.service.js';
import { R2Service } from '../document/r2.service.js';

function createMockClubService() {
  return {
    createClub: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    updateLogo: vi.fn(),
    getLogo: vi.fn(),
  };
}

function createMockR2Service() {
  return {
    upload: vi.fn(),
    delete: vi.fn(),
    getSignedUrl: vi.fn(),
  };
}

function createMockFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'logo.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: 1024,
    buffer: Buffer.from('fake-image'),
    destination: '',
    filename: '',
    path: '',
    stream: null as never,
    ...overrides,
  };
}

describe('ClubController', () => {
  let controller: ClubController;
  let clubService: ReturnType<typeof createMockClubService>;
  let r2Service: ReturnType<typeof createMockR2Service>;

  const clubId = 'club-123';
  const clubData = {
    id: clubId,
    name: 'Club Canin',
    federation: 'FFSLC',
    logo: null,
    contactEmail: 'contact@club.fr',
    description: 'Un super club',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clubService = createMockClubService();
    r2Service = createMockR2Service();
    controller = new ClubController(
      clubService as unknown as ClubService,
      r2Service as unknown as R2Service,
    );
  });

  describe('create', () => {
    it('should call clubService.createClub and return club with accessToken', async () => {
      const mockResult = {
        club: {
          id: 'club-uuid-1',
          name: "Cani'potes 42",
          federation: 'FFSLC',
          logo: null,
          contactEmail: 'contact@canipotes42.fr',
          description: 'Club de cani-cross',
          createdAt: new Date(),
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };
      clubService.createClub.mockResolvedValue(mockResult);

      const mockRes = { cookie: vi.fn() } as any;
      const dto = {
        name: "Cani'potes 42",
        federation: 'FFSLC' as const,
        contactEmail: 'contact@canipotes42.fr',
      };
      const user = {
        sub: 'user-uuid-1',
        email: 'aude@example.com',
        activeClubId: null,
        role: null,
      };

      const result = await controller.create(dto, user, mockRes);

      expect(clubService.createClub).toHaveBeenCalledWith(dto, user);
      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('id', 'club-uuid-1');
      expect(mockRes.cookie).toHaveBeenCalled();
    });
  });

  describe('getSettings', () => {
    it('should return club data for OWNER', async () => {
      clubService.findOne.mockResolvedValue(clubData);

      const result = await controller.getSettings(clubId);

      expect(result).toEqual(clubData);
      expect(clubService.findOne).toHaveBeenCalledWith(clubId);
    });

    it('should propagate NotFoundException when club not found', async () => {
      clubService.findOne.mockRejectedValue(new NotFoundException('Club not found'));

      await expect(controller.getSettings(clubId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update club settings', async () => {
      const dto = { name: 'Nouveau Nom' };
      const updated = { ...clubData, name: 'Nouveau Nom' };
      clubService.update.mockResolvedValue(updated);

      const result = await controller.update(clubId, dto);

      expect(result).toEqual(updated);
      expect(clubService.update).toHaveBeenCalledWith(clubId, dto);
    });

    it('should propagate NotFoundException', async () => {
      clubService.update.mockRejectedValue(new NotFoundException('Club not found'));

      await expect(controller.update(clubId, { name: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadLogo', () => {
    it('should upload logo and return updated club', async () => {
      const file = createMockFile();
      clubService.getLogo.mockResolvedValue(null);
      r2Service.upload.mockResolvedValue('https://r2.example.com/signed-url');
      clubService.updateLogo.mockResolvedValue({
        id: clubId,
        logo: 'https://r2.example.com/signed-url',
      });

      const result = await controller.uploadLogo(clubId, file);

      expect(r2Service.upload).toHaveBeenCalledWith(
        `clubs/${clubId}/logo/logo.png`,
        file.buffer,
        'image/png',
      );
      expect(clubService.updateLogo).toHaveBeenCalledWith(clubId, 'https://r2.example.com/signed-url');
      expect(result).toEqual({ id: clubId, logo: 'https://r2.example.com/signed-url' });
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(controller.uploadLogo(clubId, undefined as never)).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid MIME type', async () => {
      const file = createMockFile({ mimetype: 'image/gif' });
      await expect(controller.uploadLogo(clubId, file)).rejects.toThrow(BadRequestException);
    });

    it('should reject file exceeding 2MB', async () => {
      const file = createMockFile({ size: 3 * 1024 * 1024 });
      await expect(controller.uploadLogo(clubId, file)).rejects.toThrow(BadRequestException);
    });

    it('should delete old logo from R2 before uploading new one', async () => {
      const file = createMockFile();
      clubService.getLogo.mockResolvedValue('https://r2.example.com/clubs/club-123/logo/old.png');
      r2Service.upload.mockResolvedValue('https://r2.example.com/signed-url');
      clubService.updateLogo.mockResolvedValue({ id: clubId, logo: 'https://r2.example.com/signed-url' });

      await controller.uploadLogo(clubId, file);

      expect(r2Service.delete).toHaveBeenCalledWith('clubs/club-123/logo/old.png');
    });

    it('should not throw if old logo R2 delete fails', async () => {
      const file = createMockFile();
      clubService.getLogo.mockResolvedValue('https://r2.example.com/old.png');
      r2Service.delete.mockRejectedValue(new Error('R2 error'));
      r2Service.upload.mockResolvedValue('https://r2.example.com/signed-url');
      clubService.updateLogo.mockResolvedValue({ id: clubId, logo: 'https://r2.example.com/signed-url' });

      const result = await controller.uploadLogo(clubId, file);
      expect(result).toBeDefined();
    });

    it('should accept JPEG files', async () => {
      const file = createMockFile({ mimetype: 'image/jpeg', originalname: 'logo.jpg' });
      clubService.getLogo.mockResolvedValue(null);
      r2Service.upload.mockResolvedValue('https://r2.example.com/url');
      clubService.updateLogo.mockResolvedValue({ id: clubId, logo: 'https://r2.example.com/url' });

      await expect(controller.uploadLogo(clubId, file)).resolves.toBeDefined();
    });

    it('should accept WebP files', async () => {
      const file = createMockFile({ mimetype: 'image/webp', originalname: 'logo.webp' });
      clubService.getLogo.mockResolvedValue(null);
      r2Service.upload.mockResolvedValue('https://r2.example.com/url');
      clubService.updateLogo.mockResolvedValue({ id: clubId, logo: 'https://r2.example.com/url' });

      await expect(controller.uploadLogo(clubId, file)).resolves.toBeDefined();
    });
  });
});
