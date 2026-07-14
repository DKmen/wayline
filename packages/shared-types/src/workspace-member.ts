import { z } from 'zod';
import { roleSchema } from './role';

/** Workspace membership wire shape (docs/04-data-model.md §2) — links a Better Auth user to one workspace with a role. */
export const workspaceMemberSchema = z
  .object({
    workspaceId: z.string().uuid(),
    userId: z.string().min(1),
    role: roleSchema,
  })
  .strict();
export type WorkspaceMember = z.infer<typeof workspaceMemberSchema>;

/** One row of the members list — membership plus the joined user identity shown in the UI. */
export const memberListItemSchema = z
  .object({
    userId: z.string().min(1),
    name: z.string(),
    email: z.string().email(),
    role: roleSchema,
  })
  .strict();
export type MemberListItem = z.infer<typeof memberListItemSchema>;

/** Response body for GET /v1/workspaces/:workspaceId/members. */
export const memberListResponseSchema = z
  .object({
    members: z.array(memberListItemSchema),
  })
  .strict();
export type MemberListResponse = z.infer<typeof memberListResponseSchema>;
