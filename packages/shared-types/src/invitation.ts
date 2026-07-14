import { z } from 'zod';
import { roleSchema } from './role';

/** Invitation wire shape (docs/04-data-model.md §2) — single-use, 7-day expiry; create/accept/revoke flows ship after S1. */
export const invitationSchema = z
  .object({
    id: z.string().uuid(),
    workspaceId: z.string().uuid(),
    email: z.string().email(),
    role: roleSchema,
    invitedBy: z.string().min(1),
    expiresAt: z.string().datetime(),
    acceptedAt: z.string().datetime().nullable(),
    revokedAt: z.string().datetime().nullable(),
  })
  .strict();
export type Invitation = z.infer<typeof invitationSchema>;
