import { createEnv, mailerModeSchema } from '@wayline/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().url(),
  MAILER: mailerModeSchema,
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_FROM: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  APP_URL: z.string().url(),
  DASHBOARD_URL: z.string().url(),
});

/** Zod-validated process env for apps/api — boot fails loudly on a missing/invalid var. */
export const env = createEnv(schema);
export type Env = z.infer<typeof schema>;
