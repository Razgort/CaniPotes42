import { z } from 'zod';
import { DocumentType } from '../enums.js';

export const uploadDocumentSchema = z.object({
  type: z.nativeEnum(DocumentType),
  expiryDate: z.string().date().optional(),
  associatedDogId: z.string().uuid().optional(),
});

export type UploadDocument = z.infer<typeof uploadDocumentSchema>;

export const expiryStatusSchema = z.enum(['valid', 'expiring', 'expired']);
export type ExpiryStatus = z.infer<typeof expiryStatusSchema>;

export const listDocumentsQuerySchema = z.object({
  search: z.string().optional(),
  type: z.string().optional(),
  status: expiryStatusSchema.optional(),
});

export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;

export const documentResponseSchema = z.object({
  id: z.string().uuid(),
  clubId: z.string().uuid(),
  userId: z.string().uuid(),
  dogId: z.string().uuid().nullable(),
  type: z.string(),
  fileName: z.string(),
  fileUrl: z.string(),
  expiryDate: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  expiryStatus: expiryStatusSchema.nullable(),
  memberName: z.string().optional(),
  dogName: z.string().nullable(),
});

export type DocumentResponse = z.infer<typeof documentResponseSchema>;
