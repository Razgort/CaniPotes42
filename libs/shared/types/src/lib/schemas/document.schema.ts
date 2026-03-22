import { z } from 'zod';
import { DocumentType } from '../enums.js';

export const uploadDocumentSchema = z.object({
  type: z.nativeEnum(DocumentType),
  expiryDate: z.string().date().optional(),
  associatedDogId: z.string().uuid().optional(),
});

export type UploadDocument = z.infer<typeof uploadDocumentSchema>;
