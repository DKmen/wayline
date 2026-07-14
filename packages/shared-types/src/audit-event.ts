import { z } from 'zod';

/** Auditable actions (docs/04-data-model.md §5) — member/role/invitation/workspace changes, written from day one. */
export const auditActionSchema = z.enum([
  'workspace.created',
  'member.added',
  'member.role_changed',
  'member.removed',
  'invitation.created',
  'invitation.accepted',
  'invitation.revoked',
]);
export type AuditAction = z.infer<typeof auditActionSchema>;

/** Audit-log event wire shape — actorId is nullable because audit retention outlives account deletion (docs/09 §3). */
export const auditEventSchema = z
  .object({
    workspaceId: z.string().uuid(),
    actorId: z.string().min(1).nullable(),
    action: auditActionSchema,
    targetType: z.string().min(1),
    targetId: z.string().nullable(),
    meta: z.record(z.string(), z.unknown()),
  })
  .strict();
export type AuditEvent = z.infer<typeof auditEventSchema>;
