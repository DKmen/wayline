import { z } from 'zod';
import { planSchema, type Plan } from './plan';

const analyticsLevelSchema = z.enum(['basic', 'steps', 'compliance']);
const renderPrioritySchema = z.enum(['normal', 'high']);

/** One plan's full entitlement set (docs/04-data-model.md §5) — never construct this by hand outside ENTITLEMENTS. */
export const entitlementSetSchema = z
  .object({
    maxPublishedFlows: z.number().positive(),
    // Team's creator limit is per-seat, not fixed — resolved against the workspace's
    // purchased seat count (subscriptions.seats), not a static number.
    maxCreators: z.union([z.number().int().positive(), z.literal('seats')]),
    analyticsLevel: analyticsLevelSchema,
    customBranding: z.boolean(),
    versionHistory: z.boolean(),
    renderPriority: renderPrioritySchema,
  })
  .strict();
export type EntitlementSet = z.infer<typeof entitlementSetSchema>;
export type EntitlementKey = keyof EntitlementSet;

/**
 * The single versioned source of truth for plan limits — every consumer (API entitlement
 * checks, dashboard usage meters, upgrade prompts) must read from here, never hardcode a limit.
 */
export const ENTITLEMENTS = {
  free: {
    maxPublishedFlows: 3,
    maxCreators: 1,
    analyticsLevel: 'basic',
    customBranding: false,
    versionHistory: false,
    renderPriority: 'normal',
  },
  pro: {
    maxPublishedFlows: Number.POSITIVE_INFINITY,
    maxCreators: 3,
    analyticsLevel: 'steps',
    customBranding: true,
    versionHistory: true,
    renderPriority: 'high',
  },
  team: {
    maxPublishedFlows: Number.POSITIVE_INFINITY,
    maxCreators: 'seats',
    analyticsLevel: 'compliance',
    customBranding: true,
    versionHistory: true,
    renderPriority: 'high',
  },
} as const satisfies Record<Plan, EntitlementSet>;

/** Reads one entitlement value for a plan; throws rather than returning undefined for an invalid plan. */
export function getEntitlement<Key extends EntitlementKey>(
  plan: Plan,
  key: Key,
): EntitlementSet[Key] {
  const validatedPlan = planSchema.parse(plan);
  return ENTITLEMENTS[validatedPlan][key];
}
