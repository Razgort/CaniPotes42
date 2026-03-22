import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DocumentService } from './document.service.js';
import { DocumentType } from '@org/types';

function createMockPrisma() {
  return {
    document: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    dog: {
      findFirst: vi.fn(),
    },
  };
}

function createMockR2() {
  return {
    upload: vi.fn().mockResolvedValue('https://signed.url/file'),
    delete: vi.fn().mockResolvedValue(undefined),
    getSignedUrl: vi.fn().mockResolvedValue('https://signed.url/file'),
  };
}

function createMockFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'test.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024 * 100, // 100KB
    buffer: Buffer.from('test'),
    destination: '',
    filename: 'test.pdf',
    path: '',
    stream: null as any,
    ...overrides,
  };
}

describe('DocumentService', () => {
  let service: DocumentService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let r2: ReturnType<typeof createMockR2>;

  const clubId = 'club-uuid-123';
  const userId = 'user-uuid-456';
  const dogId = 'dog-uuid-789';

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createMockPrisma();
    r2 = createMockR2();
    service = new DocumentService(prisma as never, r2 as never);
  });

  // --- Upload tests ---

  describe('upload', () => {
    it('should reject invalid MIME types', async () => {
      const file = createMockFile({ mimetype: 'image/gif' });
      await expect(
        service.upload({ clubId, userId, file, type: DocumentType.LICENSE }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject files exceeding 5MB', async () => {
      const file = createMockFile({ size: 6 * 1024 * 1024 });
      await expect(
        service.upload({ clubId, userId, file, type: DocumentType.LICENSE }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject files exceeding 5MB with French error message', async () => {
      const file = createMockFile({ size: 6 * 1024 * 1024 });
      await expect(
        service.upload({ clubId, userId, file, type: DocumentType.LICENSE }),
      ).rejects.toThrow('Le fichier est trop volumineux (max 5 Mo)');
    });

    it('should reject dogId not belonging to this club', async () => {
      prisma.dog.findFirst.mockResolvedValue(null);
      const file = createMockFile();
      await expect(
        service.upload({ clubId, userId, file, type: DocumentType.HEALTH_RECORD, dogId }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should upload document and return formatted result', async () => {
      const file = createMockFile();
      const mockDoc = {
        id: 'doc-uuid-001',
        type: DocumentType.LICENSE,
        fileName: 'test.pdf',
        fileUrl: `${clubId}/documents/${userId}/1234-test.pdf`,
        expiryDate: null,
        dogId: null,
        dog: null,
        user: { id: userId, firstName: 'Jean', lastName: 'Dupont' },
        createdAt: new Date('2026-03-22T10:00:00Z'),
      };

      prisma.document.create.mockResolvedValue(mockDoc);
      r2.upload.mockResolvedValue('https://signed.url/doc');
      r2.getSignedUrl.mockResolvedValue('https://signed.url/doc');

      const result = await service.upload({
        clubId,
        userId,
        file,
        type: DocumentType.LICENSE,
      });

      expect(r2.upload).toHaveBeenCalledWith(
        expect.stringContaining(`${clubId}/documents/${userId}/`),
        file.buffer,
        file.mimetype,
      );
      expect(prisma.document.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ clubId, userId, type: DocumentType.LICENSE }),
        }),
      );
      expect(result.id).toBe('doc-uuid-001');
      expect(result.fileUrl).toBe('https://signed.url/doc');
    });

    it('should store R2 key in fileUrl, not signed URL', async () => {
      const file = createMockFile();
      prisma.document.create.mockResolvedValue({
        id: 'doc-uuid-001',
        type: DocumentType.LICENSE,
        fileName: 'test.pdf',
        fileUrl: `${clubId}/documents/${userId}/1234-test.pdf`,
        expiryDate: null,
        dogId: null,
        dog: null,
        user: { id: userId, firstName: 'Jean', lastName: 'Dupont' },
        createdAt: new Date(),
      });
      r2.getSignedUrl.mockResolvedValue('https://signed.url/doc');

      await service.upload({ clubId, userId, file, type: DocumentType.LICENSE });

      // Confirm that what's passed to document.create is the R2 key, not a URL
      const createCall = prisma.document.create.mock.calls[0][0];
      expect(createCall.data.fileUrl).toMatch(
        new RegExp(`^${clubId}/documents/${userId}/`),
      );
      expect(createCall.data.fileUrl).not.toContain('https://');
    });

    it('should associate document to dog when dogId provided', async () => {
      const file = createMockFile();
      prisma.dog.findFirst.mockResolvedValue({ id: dogId });
      prisma.document.create.mockResolvedValue({
        id: 'doc-uuid-002',
        type: DocumentType.VACCINE_CERTIFICATE,
        fileName: 'vaccine.pdf',
        fileUrl: `${clubId}/documents/${userId}/1234-vaccine.pdf`,
        expiryDate: new Date('2027-01-01'),
        dogId,
        dog: { id: dogId, name: 'Rex' },
        user: { id: userId, firstName: 'Jean', lastName: 'Dupont' },
        createdAt: new Date(),
      });
      r2.getSignedUrl.mockResolvedValue('https://signed.url/vaccine');

      const result = await service.upload({
        clubId,
        userId,
        file,
        type: DocumentType.VACCINE_CERTIFICATE,
        dogId,
      });

      expect(result.dogId).toBe(dogId);
      expect(prisma.document.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ dogId }),
        }),
      );
    });
  });

  // --- findAll tests ---

  describe('findAll', () => {
    it('should scope query to userId for regular members (tenant isolation)', async () => {
      prisma.document.findMany.mockResolvedValue([]);
      prisma.document.count.mockResolvedValue(0);

      await service.findAll(clubId, userId, 'MEMBER', {});

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clubId, userId }),
        }),
      );
    });

    it('should NOT restrict to userId for admin role', async () => {
      prisma.document.findMany.mockResolvedValue([]);
      prisma.document.count.mockResolvedValue(0);

      await service.findAll(clubId, userId, 'ADMIN', {});

      const callArgs = prisma.document.findMany.mock.calls[0][0];
      expect(callArgs.where.clubId).toBe(clubId);
      expect(callArgs.where.userId).toBeUndefined();
    });

    it('should always scope by clubId regardless of role', async () => {
      prisma.document.findMany.mockResolvedValue([]);
      prisma.document.count.mockResolvedValue(0);

      await service.findAll(clubId, userId, 'OWNER', {});

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clubId }),
        }),
      );
    });

    it('should filter by dogId when provided', async () => {
      prisma.document.findMany.mockResolvedValue([]);
      prisma.document.count.mockResolvedValue(0);

      await service.findAll(clubId, userId, 'MEMBER', { dogId });

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ dogId }),
        }),
      );
    });

    it('should generate signed URLs on-the-fly for listed documents', async () => {
      const mockDocs = [
        {
          id: 'doc-1',
          type: DocumentType.LICENSE,
          fileName: 'license.pdf',
          fileUrl: `${clubId}/documents/${userId}/1234-license.pdf`,
          expiryDate: null,
          dogId: null,
          dog: null,
          user: { id: userId, firstName: 'Jean', lastName: 'Dupont' },
          createdAt: new Date(),
        },
      ];
      prisma.document.findMany.mockResolvedValue(mockDocs);
      prisma.document.count.mockResolvedValue(1);
      r2.getSignedUrl.mockResolvedValue('https://signed.url/license');

      const result = await service.findAll(clubId, userId, 'MEMBER', {});

      expect(r2.getSignedUrl).toHaveBeenCalledWith(mockDocs[0].fileUrl);
      expect(result.data[0].fileUrl).toBe('https://signed.url/license');
    });
  });

  // --- computeExpiryStatus tests ---

  describe('computeExpiryStatus', () => {
    it('should return null for null expiryDate', () => {
      expect(service.computeExpiryStatus(null)).toBeNull();
    });

    it('should return "expired" for past dates', () => {
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday
      expect(service.computeExpiryStatus(past)).toBe('expired');
    });

    it('should return "expiring" for dates within 30 days', () => {
      const soon = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days from now
      expect(service.computeExpiryStatus(soon)).toBe('expiring');
    });

    it('should return "valid" for dates more than 30 days away', () => {
      const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days from now
      expect(service.computeExpiryStatus(future)).toBe('valid');
    });

    it('should return "expiring" for exactly 30 days from now', () => {
      const exactly30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      expect(service.computeExpiryStatus(exactly30)).toBe('expiring');
    });
  });

  // --- findOne tests ---

  describe('findOne', () => {
    it('should throw NotFoundException when document not found', async () => {
      prisma.document.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('doc-uuid-001', clubId, userId, 'MEMBER'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return document with expiry status for member', async () => {
      const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      const mockDoc = {
        id: 'doc-uuid-001',
        type: DocumentType.LICENSE,
        fileName: 'license.pdf',
        fileUrl: `${clubId}/documents/${userId}/license.pdf`,
        expiryDate: futureDate,
        dogId: null,
        dog: null,
        user: { id: userId, firstName: 'Jean', lastName: 'Dupont' },
        createdAt: new Date(),
      };
      prisma.document.findFirst.mockResolvedValue(mockDoc);
      r2.getSignedUrl.mockResolvedValue('https://signed.url/license');

      const result = await service.findOne('doc-uuid-001', clubId, userId, 'MEMBER');

      expect(result.id).toBe('doc-uuid-001');
      expect(result.expiryStatus).toBe('valid');
      expect(result.memberName).toBeUndefined(); // not admin
    });

    it('should include memberName for admin callers', async () => {
      const mockDoc = {
        id: 'doc-uuid-002',
        type: DocumentType.REGISTRATION_FORM,
        fileName: 'form.pdf',
        fileUrl: `${clubId}/documents/other-user/form.pdf`,
        expiryDate: null,
        dogId: null,
        dog: null,
        user: { id: 'other-user', firstName: 'Marie', lastName: 'Martin' },
        createdAt: new Date(),
      };
      prisma.document.findFirst.mockResolvedValue(mockDoc);
      r2.getSignedUrl.mockResolvedValue('https://signed.url/form');

      const result = await service.findOne('doc-uuid-002', clubId, userId, 'ADMIN');

      expect(result.memberName).toBe('Marie Martin');
      expect(result.expiryStatus).toBeNull();
    });

    it('should restrict member to their own documents', async () => {
      prisma.document.findFirst.mockResolvedValue(null);

      await service.findOne('doc-uuid-001', clubId, userId, 'MEMBER').catch(() => {});

      expect(prisma.document.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId }),
        }),
      );
    });

    it('should allow admin to access any club document', async () => {
      prisma.document.findFirst.mockResolvedValue(null);

      await service.findOne('doc-uuid-001', clubId, userId, 'ADMIN').catch(() => {});

      const callArgs = prisma.document.findFirst.mock.calls[0][0];
      expect(callArgs.where.userId).toBeUndefined();
    });
  });

  // --- findAll with search and status filter tests ---

  describe('findAll with search and status filters', () => {
    it('should include expiryStatus in findAll results', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const mockDocs = [
        {
          id: 'doc-1',
          type: DocumentType.LICENSE,
          fileName: 'license.pdf',
          fileUrl: `${clubId}/documents/${userId}/license.pdf`,
          expiryDate: pastDate,
          dogId: null,
          dog: null,
          user: { id: userId, firstName: 'Jean', lastName: 'Dupont' },
          createdAt: new Date(),
        },
      ];
      prisma.document.findMany.mockResolvedValue(mockDocs);
      prisma.document.count.mockResolvedValue(1);
      r2.getSignedUrl.mockResolvedValue('https://signed.url/doc');

      const result = await service.findAll(clubId, userId, 'MEMBER', {});

      expect(result.data[0].expiryStatus).toBe('expired');
    });

    it('should filter by expiry status', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      const mockDocs = [
        {
          id: 'doc-1',
          type: DocumentType.LICENSE,
          fileName: 'expired.pdf',
          fileUrl: `${clubId}/documents/${userId}/expired.pdf`,
          expiryDate: pastDate,
          dogId: null,
          dog: null,
          user: { id: userId, firstName: 'Jean', lastName: 'Dupont' },
          createdAt: new Date(),
        },
        {
          id: 'doc-2',
          type: DocumentType.HEALTH_RECORD,
          fileName: 'valid.pdf',
          fileUrl: `${clubId}/documents/${userId}/valid.pdf`,
          expiryDate: futureDate,
          dogId: null,
          dog: null,
          user: { id: userId, firstName: 'Jean', lastName: 'Dupont' },
          createdAt: new Date(),
        },
      ];
      prisma.document.findMany.mockResolvedValue(mockDocs);
      r2.getSignedUrl.mockResolvedValue('https://signed.url/doc');

      const result = await service.findAll(clubId, userId, 'MEMBER', { status: 'expired' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('doc-1');
    });

    it('should filter by member name search (admin only)', async () => {
      const mockDocs = [
        {
          id: 'doc-1',
          type: DocumentType.LICENSE,
          fileName: 'a.pdf',
          fileUrl: `${clubId}/documents/user1/a.pdf`,
          expiryDate: null,
          dogId: null,
          dog: null,
          user: { id: 'user1', firstName: 'Jean', lastName: 'Dupont' },
          createdAt: new Date(),
        },
        {
          id: 'doc-2',
          type: DocumentType.HEALTH_RECORD,
          fileName: 'b.pdf',
          fileUrl: `${clubId}/documents/user2/b.pdf`,
          expiryDate: null,
          dogId: null,
          dog: null,
          user: { id: 'user2', firstName: 'Marie', lastName: 'Martin' },
          createdAt: new Date(),
        },
      ];
      prisma.document.findMany.mockResolvedValue(mockDocs);
      r2.getSignedUrl.mockResolvedValue('https://signed.url/doc');

      const result = await service.findAll(clubId, userId, 'ADMIN', { search: 'jean' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].memberName).toBe('Jean Dupont');
    });
  });

  // --- delete tests ---

  describe('delete', () => {
    it('should throw NotFoundException for document not in club', async () => {
      prisma.document.findFirst.mockResolvedValue(null);

      await expect(
        service.delete(clubId, 'doc-id', userId, 'MEMBER'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for member trying to delete another member doc', async () => {
      prisma.document.findFirst.mockResolvedValue({
        id: 'doc-id',
        clubId,
        userId: 'other-user-id',
        fileUrl: `${clubId}/documents/other/file.pdf`,
      });

      await expect(
        service.delete(clubId, 'doc-id', userId, 'MEMBER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow member to delete their own document', async () => {
      prisma.document.findFirst.mockResolvedValue({
        id: 'doc-id',
        clubId,
        userId,
        fileUrl: `${clubId}/documents/${userId}/file.pdf`,
      });
      prisma.document.delete.mockResolvedValue({});

      await service.delete(clubId, 'doc-id', userId, 'MEMBER');

      expect(r2.delete).toHaveBeenCalledWith(`${clubId}/documents/${userId}/file.pdf`);
      expect(prisma.document.delete).toHaveBeenCalledWith({ where: { id: 'doc-id' } });
    });

    it('should allow admin to delete any club document', async () => {
      prisma.document.findFirst.mockResolvedValue({
        id: 'doc-id',
        clubId,
        userId: 'another-user',
        fileUrl: `${clubId}/documents/another-user/file.pdf`,
      });
      prisma.document.delete.mockResolvedValue({});

      await service.delete(clubId, 'doc-id', userId, 'ADMIN');

      expect(prisma.document.delete).toHaveBeenCalled();
    });
  });
});
