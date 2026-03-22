import { loginSchema } from '@org/types';
import { z } from 'zod';

export { loginSchema };
export type LoginDto = z.infer<typeof loginSchema>;
