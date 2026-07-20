import { createEnv } from '@wayline/config';
import { z } from 'zod';

const schema = z.object({
  // Empty default = same-origin, proxied through Vite's dev server / a same-origin
  // production deploy (see D1 in the WAYLI-29 plan) — set only if the API is genuinely
  // cross-origin.
  VITE_API_URL: z.string().default(''),
});

/** Zod-validated import.meta.env for apps/dashboard — boot fails loudly on an invalid var. */
export const env = createEnv(schema, import.meta.env as unknown as NodeJS.ProcessEnv);
export type Env = z.infer<typeof schema>;
