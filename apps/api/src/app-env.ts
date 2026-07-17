import type { Role, Workspace } from '@wayline/shared-types';
import type { createAuth } from './lib/auth';
import type { ScopedDb } from './db/scoped';

type Auth = ReturnType<typeof createAuth>;

/** The signed-in Better Auth user as resolved by requireSession. */
export type SessionUser = Auth['$Infer']['Session']['user'];

/** Per-request tenancy context (docs/03-architecture.md §3.3) — resolved once by workspaceContext middleware. */
export type WorkspaceContext = {
  workspace: Workspace;
  role: Role;
  scoped: ScopedDb;
};

/** Hono environment carrying the typed per-request variables set by the middleware stack. */
export type AppEnv = {
  Variables: {
    user: SessionUser;
    workspaceCtx: WorkspaceContext;
  };
};
