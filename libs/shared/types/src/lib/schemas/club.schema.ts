import { z } from 'zod';

export const createClubSchema = z.object({
  name: z.string().min(1).max(100),
  federation: z.string().min(1),
  logo: z.string().url().optional(),
  contactEmail: z.string().email(),
  description: z.string().max(500).optional(),
});

export const updateClubSchema = createClubSchema.partial();

export type CreateClub = z.infer<typeof createClubSchema>;
export type UpdateClub = z.infer<typeof updateClubSchema>;
