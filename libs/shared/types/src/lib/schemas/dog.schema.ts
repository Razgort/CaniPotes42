import { z } from 'zod';

export const createDogSchema = z.object({
  name: z.string().min(1).max(100),
  breed: z.string().max(100).optional(),
  birthdate: z.string().date().optional(),
  chipNumber: z.string().max(50).optional(),
  photo: z.string().url().optional(),
});

export const updateDogSchema = createDogSchema.partial();

export type CreateDog = z.infer<typeof createDogSchema>;
export type UpdateDog = z.infer<typeof updateDogSchema>;
