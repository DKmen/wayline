import { and, asc, eq, isNull, lt, or, sql } from 'drizzle-orm';
import type { DbExecutor, ScopedDb } from './scoped';
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

/**
 * Every live workspace a user belongs to, with their role in each — the other sanctioned
 * unscoped read alongside findMembershipWithWorkspace, scoped by user instead of workspace
 * because it's the bootstrap query a workspace-scoped read doesn't exist to run yet.
 * Ordered oldest-membership-first: there's no workspace-switcher UI yet, so this is the
 * deterministic stand-in for "active workspace" until one exists.
 */
export async function listMembershipsForUser(db: DbExecutor, userId: string) {
  return db
    .select({
      role: workspaceMembers.role,
      workspace: {
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        plan: workspaces.plan,
      },
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(and(eq(workspaceMembers.userId, userId), isNull(workspaces.deletedAt)))
    .orderBy(asc(workspaceMembers.createdAt));
}

/** Bumps the member's last_active_at if it's null or older than the throttle window. */
export async function touchLastActiveAt(scoped: ScopedDb, userId: string) {
  const staleBefore = new Date(Date.now() - LAST_ACTIVE_THROTTLE_MS);

  await scoped.update(
    workspaceMembers,
    { lastActiveAt: sql`now()` },
    and(
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
