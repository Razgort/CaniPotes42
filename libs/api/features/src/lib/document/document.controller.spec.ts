import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { DocumentController } from './document.controller.js';
import { DocumentType } from '@org/types';

function createMockDocumentService() {
  return {
    upload: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    getDocumentKey: vi.fn(),
    delete: vi.fn(),
  };
}

function createMockR2Service() {
  return {
    getSignedUrl: vi.fn().mockResolvedValue('https://signed.url/download'),
  };
}

const mockUser = {
  sub: 'user-uuid-456',
  email: 'user@example.com',
  activeClubId: 'club-uuid-123',
  role: 'MEMBER',
};

describe('DocumentController', () => {
  let controller: DocumentController;
  let service: ReturnType<typeof createMockDocumentService>;
  let r2: ReturnType<typeof createMockR2Service>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createMockDocumentService();
    r2 = createMockR2Service();
    controller = new DocumentController(service as never, r2 as never);
  });

  describe('upload', () => {
    it('should throw if no file provided', async () => {
      await expect(
        controller.upload('club-uuid-123', mockUser as never, null as any, DocumentType.LICENSE),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if invalid document type provided', async () => {
      const file = { originalname: 'test.pdf', mimetype: 'application/pdf', buffer: Buffer.from('x'), size: 100 } as Express.Multer.File;
      await expect(
        controller.upload('club-uuid-123', mockUser as never, file, 'INVALID_TYPE'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delegate to service with correct params', async () => {
      const file = { originalname: 'test.pdf', mimetype: 'application/pdf', buffer: Buffer.from('x'), size: 100 } as Express.Multer.File;
      const expected = { id: 'doc-1', type: DocumentType.LICENSE, fileName: 'test.pdf' };
      service.upload.mockResolvedValue(expected);

      const result = await controller.upload(
        'club-uuid-123',
        mockUser as never,
        file,
        DocumentType.LICENSE,
        undefined,
        '2027-06-01',
      );

      expect(service.upload).toHaveBeenCalledWith({
        clubId: 'club-uuid-123',
        userId: mockUser.sub,
        file,
        type: DocumentType.LICENSE,
        expiryDate: '2027-06-01',
        dogId: undefined,
      });
      expect(result).toEqual(expected);
    });

    it('should pass dogId when provided', async () => {
      const file = { originalname: 'cert.pdf', mimetype: 'application/pdf', buffer: Buffer.from('x'), size: 100 } as Express.Multer.File;
      service.upload.mockResolvedValue({ id: 'doc-2' });

      await controller.upload(
        'club-uuid-123',
        mockUser as never,
        file,
        DocumentType.VACCINE_CERTIFICATE,
        'dog-uuid-789',
      );

      expect(service.upload).toHaveBeenCalledWith(
        expect.objectContaining({ dogId: 'dog-uuid-789' }),
      );
    });
  });

  describe('findAll', () => {
    it('should delegate to service with club/user context', async () => {
      const expected = { data: [], meta: { total: 0, page: 1, pageSize: 20 } };
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(
        'club-uuid-123',
        mockUser as never,
        { page: 1, pageSize: 20 },
      );

      expect(service.findAll).toHaveBeenCalledWith(
        'club-uuid-123',
        mockUser.sub,
        mockUser.role,
        { page: 1, pageSize: 20 },
      );
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should delegate to service with club/user/role context', async () => {
      const expected = { id: 'doc-1', type: DocumentType.LICENSE, fileName: 'a.pdf', expiryStatus: 'valid' };
      service.findOne.mockResolvedValue(expected);

      const result = await controller.findOne('club-uuid-123', mockUser as never, 'doc-id-1');

      expect(service.findOne).toHaveBeenCalledWith('doc-id-1', 'club-uuid-123', mockUser.sub, mockUser.role);
      expect(result).toEqual(expected);
    });
  });

  describe('getDownloadUrl', () => {
    it('should return signed download URL', async () => {
      service.getDocumentKey.mockResolvedValue('club-uuid-123/documents/user/file.pdf');
      r2.getSignedUrl.mockResolvedValue('https://r2.example.com/signed-url');

      const result = await controller.getDownloadUrl('club-uuid-123', mockUser as never, 'doc-id-1');

      expect(service.getDocumentKey).toHaveBeenCalledWith('doc-id-1', 'club-uuid-123', mockUser.sub, mockUser.role);
      expect(r2.getSignedUrl).toHaveBeenCalledWith('club-uuid-123/documents/user/file.pdf', 3600);
      expect(result).toEqual({ data: { url: 'https://r2.example.com/signed-url' } });
    });
  });

  describe('remove', () => {
    it('should delegate delete to service', async () => {
      service.delete.mockResolvedValue(undefined);

      await controller.remove('club-uuid-123', mockUser as never, 'doc-id-1');

      expect(service.delete).toHaveBeenCalledWith(
        'club-uuid-123',
        'doc-id-1',
        mockUser.sub,
        mockUser.role,
      );
    });
  });
});
