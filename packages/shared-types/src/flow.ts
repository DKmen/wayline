import { z } from 'zod';

/** Flow lifecycle (docs/04-data-model.md §3) — draft_local until first publish, then published/archived. */
export const flowStatusSchema = z.enum(['draft_local', 'published', 'archived']);
export type FlowStatus = z.infer<typeof flowStatusSchema>;

/** Flow wire shape (docs/04-data-model.md §3) — the library's row shape once flow creation ships. */
export const flowSchema = z
  .object({
    id: z.string().uuid(),
    workspaceId: z.string().uuid(),
    createdBy: z.string().min(1),
    title: z.string().min(1),
    status: flowStatusSchema,
    currentVersionId: z.string().uuid().nullable(),
  })
  .strict();
export type Flow = z.infer<typeof flowSchema>;

/** Response body for GET /v1/workspaces/:workspaceId/flows. */
export const flowListResponseSchema = z
  .object({
    flows: z.array(flowSchema),
  })
  .strict();
export type FlowListResponse = z.infer<typeof flowListResponseSchema>;
