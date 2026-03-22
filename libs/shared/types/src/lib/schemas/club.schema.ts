import { z } from 'zod';

export const federationEnum = z.enum(['FFSLC', 'CNEAC', 'OTHER', 'NONE']);
export type Federation = z.infer<typeof federationEnum>;

export const createClubSchema = z.object({
  name: z.string().min(2).max(100),
  federation: federationEnum,
  logo: z.string().url().optional(),
  contactEmail: z.string().email(),
  description: z.string().max(500).optional(),
});

export const updateClubSchema = createClubSchema.partial();

export type CreateClub = z.infer<typeof createClubSchema>;
export type UpdateClub = z.infer<typeof updateClubSchema>;
