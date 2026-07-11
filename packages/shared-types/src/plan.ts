import { z } from 'zod';

/** Workspace billing plan (docs/00-product-brief.md §4) — drives entitlement limits, never the reverse. */
export const planSchema = z.enum(['free', 'pro', 'team']);
export type Plan = z.infer<typeof planSchema>;
