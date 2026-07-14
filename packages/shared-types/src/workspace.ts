import { z } from 'zod';
import { planSchema } from './plan';

/** URL-safe workspace slug (docs/04-data-model.md §2) — lowercase alphanumerics with inner hyphens, 2–63 chars. */
export const workspaceSlugSchema = z
  .string()
  .min(2)
  .max(63)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/);

/** Workspace wire shape (docs/04-data-model.md §2) — the tenant boundary every scoped query hangs off. */
export const workspaceSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1).max(120),
    slug: workspaceSlugSchema,
    plan: planSchema,
  })
  .strict();
export type Workspace = z.infer<typeof workspaceSchema>;

/** Request body for creating a workspace — the creator becomes its first admin (docs/02-product-spec.md §2). */
export const createWorkspaceRequestSchema = z
  .object({
    name: z.string().min(1).max(120),
    slug: workspaceSlugSchema,
  })
  .strict();
export type CreateWorkspaceRequest = z.infer<typeof createWorkspaceRequestSchema>;
