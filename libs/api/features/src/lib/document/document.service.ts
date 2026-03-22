import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@org/api-core';
import { DocumentType } from '@org/types';
import type { ExpiryStatus } from '@org/types';
import { R2Service } from './r2.service.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface UploadDocumentParams {
  clubId: string;
  userId: string;
  file: Express.Multer.File;
  type: DocumentType;
  expiryDate?: string;
  dogId?: string;
}

export interface ListDocumentsQuery {
  dogId?: string;
  type?: DocumentType;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ExpiryStatus;
}

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) {}

  async upload(params: UploadDocumentParams) {
    const { clubId, userId, file, type, expiryDate, dogId } = params;

    // Server-side validation (NFR13)
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Type de fichier invalide. Types acceptés : JPEG, PNG, WebP, PDF',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('Le fichier est trop volumineux (max 5 Mo)');
    }

    // Verify dog belongs to this club if provided
    if (dogId) {
      const dog = await (this.prisma as any).dog.findFirst({
        where: { id: dogId, clubId },
        select: { id: true },
      });
      if (!dog) {
        throw new NotFoundException('Chien introuvable dans ce club');
      }
    }

    // Generate tenant-scoped R2 key
    const safeFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${clubId}/documents/${userId}/${Date.now()}-${safeFileName}`;

    // Upload to R2 — returns signed URL
    await this.r2.upload(key, file.buffer, file.mimetype);

    // Parse optional expiry date
    const parsedExpiry = expiryDate ? new Date(expiryDate) : null;

    // Create Document record — store R2 key as fileUrl, not the signed URL
    const doc = await (this.prisma as any).document.create({
      data: {
        clubId,
        userId,
        dogId: dogId ?? null,
        type,
        fileName: file.originalname,
        fileUrl: key, // store R2 key, generate signed URLs on-the-fly
        expiryDate: parsedExpiry,
      },
    });

    // Generate signed URL to return to client
    const signedUrl = await this.r2.getSignedUrl(key);

    this.logger.log(`Document uploaded: ${doc.id} by user ${userId} in club ${clubId}`);

    return this.formatDocument(doc, signedUrl);
  }

  computeExpiryStatus(expiryDate: Date | null): ExpiryStatus | null {
    if (!expiryDate) return null;
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (expiryDate < now) return 'expired';
    if (expiryDate <= thirtyDaysFromNow) return 'expiring';
    return 'valid';
  }

  async findAll(
    clubId: string,
    userId: string,
    callerRole: string,
    query: ListDocumentsQuery,
  ) {
    const { dogId, type, page = 1, pageSize = 20, search, status } = query;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { clubId };

    // Members only see their own documents; admins/owners see all
    if (callerRole === 'MEMBER') {
      where['userId'] = userId;
    }

    if (dogId) {
      where['dogId'] = dogId;
    }

    if (type) {
      where['type'] = type;
    }

    const isAdmin = callerRole === 'ADMIN' || callerRole === 'OWNER';

    // Search by member name (admin-only, in-memory after fetch)
    const applySearch = isAdmin && !!search;
    // Status filter: fetch all then filter in-memory (needed to compute status after DB fetch)
    const applyStatusFilter = !!status;

    // Fetch without pagination limit when filtering in-memory to get accurate results
    const shouldFetchAll = applySearch || applyStatusFilter;

    const documents = await (this.prisma as any).document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...(shouldFetchAll ? {} : { skip, take: pageSize }),
      include: {
        dog: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Generate signed URLs on-the-fly for each document
    let documentsWithUrls = await Promise.all(
      documents.map(async (doc: any) => {
        const signedUrl = await this.r2.getSignedUrl(doc.fileUrl);
        return this.formatDocument(doc, signedUrl, isAdmin);
      }),
    );

    // Apply in-memory search filter (admin only)
    if (applySearch) {
      const searchLower = search!.toLowerCase();
      documentsWithUrls = documentsWithUrls.filter(
        (d: any) =>
          d.memberName?.toLowerCase().includes(searchLower) ||
          d.type.toLowerCase().includes(searchLower),
      );
    }

    // Apply expiry status filter
    if (applyStatusFilter) {
      documentsWithUrls = documentsWithUrls.filter(
        (d: any) => d.expiryStatus === status,
      );
    }

    const total = shouldFetchAll
      ? documentsWithUrls.length
      : await (this.prisma as any).document.count({ where });

    // Apply pagination after in-memory filtering
    const paginatedDocs = shouldFetchAll
      ? documentsWithUrls.slice(skip, skip + pageSize)
      : documentsWithUrls;

    return {
      data: paginatedDocs,
      meta: { total, page, pageSize },
    };
  }

  async findOne(
    documentId: string,
    clubId: string,
    userId: string,
    callerRole: string,
  ) {
    const isAdmin = callerRole === 'ADMIN' || callerRole === 'OWNER';
    const where: Record<string, unknown> = { id: documentId, clubId };
    if (!isAdmin) {
      where['userId'] = userId;
    }

    const doc = await (this.prisma as any).document.findFirst({
      where,
      include: {
        dog: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!doc) throw new NotFoundException('Document introuvable');

    const signedUrl = await this.r2.getSignedUrl(doc.fileUrl);
    return this.formatDocument(doc, signedUrl, isAdmin);
  }

  async getDocumentKey(
    documentId: string,
    clubId: string,
    userId: string,
    callerRole: string,
  ): Promise<string> {
    const isAdmin = callerRole === 'ADMIN' || callerRole === 'OWNER';
    const where: Record<string, unknown> = { id: documentId, clubId };
    if (!isAdmin) {
      where['userId'] = userId;
    }

    const doc = await (this.prisma as any).document.findFirst({
      where,
      select: { fileUrl: true, fileName: true },
    });

    if (!doc) throw new NotFoundException('Document introuvable');
    return doc.fileUrl; // R2 key stored in fileUrl field
  }

  async delete(clubId: string, documentId: string, userId: string, callerRole: string) {
    const doc = await (this.prisma as any).document.findFirst({
      where: { id: documentId, clubId },
    });

    if (!doc) {
      throw new NotFoundException('Document introuvable');
    }

    // Members can only delete their own documents
    if (callerRole === 'MEMBER' && doc.userId !== userId) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres documents');
    }

    // Delete from R2 first
    try {
      await this.r2.delete(doc.fileUrl);
    } catch {
      this.logger.warn(`Failed to delete R2 object for document ${documentId}`);
    }

    // Delete Prisma record
    await (this.prisma as any).document.delete({ where: { id: documentId } });

    this.logger.log(`Document deleted: ${documentId} by user ${userId}`);
  }

  private formatDocument(doc: any, signedUrl: string, isAdmin = false) {
    return {
      id: doc.id,
      type: doc.type,
      fileName: doc.fileName,
      fileUrl: signedUrl,
      expiryDate: doc.expiryDate ?? null,
      expiryStatus: this.computeExpiryStatus(doc.expiryDate ?? null),
      dogId: doc.dogId ?? null,
      dogName: doc.dog?.name ?? null,
      dog: doc.dog ?? null,
      user: doc.user
        ? {
            id: doc.user.id,
            firstName: doc.user.firstName,
            lastName: doc.user.lastName,
          }
        : null,
      memberName: isAdmin && doc.user ? `${doc.user.firstName} ${doc.user.lastName}` : undefined,
      createdAt: doc.createdAt,
    };
  }
}
