import { acceptInvitationSchema } from '@org/types';
import { z } from 'zod';

export { acceptInvitationSchema };
export type AcceptInvitationDto = z.infer<typeof acceptInvitationSchema>;
