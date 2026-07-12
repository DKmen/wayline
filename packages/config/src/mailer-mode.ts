import { z } from 'zod';

/** Which mailer an app talks to (docs/08-local-dev.md §4) — smtp locally (Mailpit), ses when deployed. */
export const mailerModeSchema = z.enum(['smtp', 'ses']);
export type MailerMode = z.infer<typeof mailerModeSchema>;
