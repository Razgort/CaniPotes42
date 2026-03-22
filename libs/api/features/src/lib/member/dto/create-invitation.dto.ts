import { createInvitationSchema } from '@org/types';
import { z } from 'zod';

export { createInvitationSchema };
export type CreateInvitationDto = z.infer<typeof createInvitationSchema>;
