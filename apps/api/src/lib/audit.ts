import type { AuditAction } from '@wayline/shared-types';
import { auditLog } from '../db/schema';
import type { ScopedDb } from '../db/scoped';

/** Writes one audit-log row through the scope helper — docs/04 §5: write it from day one. */
export async function recordAuditEvent(
  scoped: ScopedDb,
  event: {
    actorId: string | null;
    action: AuditAction;
    targetType: string;
    targetId?: string;
    meta?: Record<string, unknown>;
  },
) {
  await scoped.insert(auditLog, [
    {
      actorId: event.actorId,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId ?? null,
      meta: event.meta ?? {},
    },
  ]);
}
