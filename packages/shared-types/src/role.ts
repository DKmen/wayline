import { z } from 'zod';

/** Workspace membership role (docs/02-product-spec.md §2) — governs what a member can do within one workspace. */
export const roleSchema = z.enum(['viewer', 'creator', 'admin']);
export type Role = z.infer<typeof roleSchema>;
