import { z } from 'zod';

/** The subset of Better Auth's user record the dashboard actually consumes. */
export const sessionUserSchema = z
  .object({
    id: z.string().min(1),
    email: z.string().email(),
    name: z.string().nullable(),
  })
  .passthrough();
export type SessionUser = z.infer<typeof sessionUserSchema>;

/** The subset of Better Auth's session record the dashboard actually consumes. */
export const sessionInfoSchema = z
  .object({
    expiresAt: z.string(),
  })
  .passthrough();
export type SessionInfo = z.infer<typeof sessionInfoSchema>;

/**
 * GET /api/auth/get-session response — Better Auth returns `{ session, user }` while
 * signed in, or a bare `null` once the session cookie is missing or expired. `.passthrough()`
 * on the nested objects tolerates the rest of Better Auth's own wire shape, which this
 * app doesn't own and shouldn't have to hand-mirror in full.
 */
export const sessionResponseSchema = z
  .object({ session: sessionInfoSchema, user: sessionUserSchema })
  .nullable();
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

/** Request body for POST /api/auth/sign-in/magic-link. */
export const magicLinkRequestSchema = z
  .object({
    email: z.string().email(),
    callbackURL: z.string().min(1),
  })
  .strict();
export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;
