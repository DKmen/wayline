import { recordAuditEvent } from '../lib/audit';
import { ConflictError } from '../lib/errors';
import { workspaceMembers, workspaces } from './schema';
import { scopedDb, type DbExecutor } from './scoped';

/** Postgres unique_violation — the only insert failure we translate into a client-facing 409. */
const UNIQUE_VIOLATION = '23505';

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { code?: unknown; cause?: unknown };
  return candidate.code === UNIQUE_VIOLATION || isUniqueViolation(candidate.cause);
}

/**
 * Creates a workspace with its creator as first admin plus the audit trail, atomically —
 * docs/02 §2: the first user of a workspace is its admin. Non-tenant workspace insert and
 * scoped member/audit inserts share one transaction so a slug conflict leaves no orphans.
 */
export async function createWorkspaceWithAdmin(
  db: DbExecutor,
  input: { name: string; slug: string; userId: string },
) {
  try {
    return await db.transaction(async (tx) => {
      const [workspace] = await tx
        .insert(workspaces)
        .values({ name: input.name, slug: input.slug })
        .returning();

      const scoped = scopedDb(tx, workspace!.id);
      await scoped.insert(workspaceMembers, [{ userId: input.userId, role: 'admin' }]);
      await recordAuditEvent(scoped, {
        actorId: input.userId,
        action: 'workspace.created',
        targetType: 'workspace',
        targetId: workspace!.id,
      });
      await recordAuditEvent(scoped, {
        actorId: input.userId,
        action: 'member.added',
        targetType: 'member',
        targetId: input.userId,
        meta: { role: 'admin' },
      });

      return workspace!;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ConflictError('workspace slug already taken');
    throw error;
  }
}
