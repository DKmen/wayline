import { and, eq, isNull, lt, or, sql } from 'drizzle-orm';
import type { DbExecutor } from './scoped';
import { users, workspaceMembers, workspaces } from './schema';

/** Only bump last_active_at when it's stale — docs/04 §2 mandates a throttled write, not one per request. */
const LAST_ACTIVE_THROTTLE_MS = 5 * 60 * 1000;

/**
 * Resolves a user's membership plus its live (non-deleted) workspace in one query.
 * This is the single sanctioned unscoped read of workspace_members: it IS the scoping
 * bootstrap that every scopedDb call downstream depends on, so it cannot itself be scoped.
 */
export async function findMembershipWithWorkspace(
  db: DbExecutor,
  workspaceId: string,
  userId: string,
) {
  const [row] = await db
    .select({
      role: workspaceMembers.role,
      lastActiveAt: workspaceMembers.lastActiveAt,
      workspace: {
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        plan: workspaces.plan,
      },
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
        isNull(workspaces.deletedAt),
      ),
    );

  return row ?? null;
}

/** Bumps the member's last_active_at if it's null or older than the throttle window. */
export async function touchLastActiveAt(db: DbExecutor, workspaceId: string, userId: string) {
  const staleBefore = new Date(Date.now() - LAST_ACTIVE_THROTTLE_MS);

  await db
    .update(workspaceMembers)
    .set({ lastActiveAt: sql`now()` })
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
        or(isNull(workspaceMembers.lastActiveAt), lt(workspaceMembers.lastActiveAt, staleBefore)),
      ),
    );
}

/**
 * Members of one workspace joined with their user identity for the members list.
 * Lives here (not in a route) so the workspace_id filter stays next to the scoping
 * bootstrap — the join needs users, which scopedDb's single-table API can't reach.
 */
export async function listMembersWithUsers(db: DbExecutor, workspaceId: string) {
  return db
    .select({
      userId: workspaceMembers.userId,
      name: users.name,
      email: users.email,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId));
}
