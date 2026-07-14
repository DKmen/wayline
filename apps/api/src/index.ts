import { serve } from '@hono/node-server';
import { createApp } from './app';
import { createAuth } from './lib/auth';
import { createDb } from './db/client';
import { createMailer } from './lib/mailer';
import { env } from './env';

const db = createDb(env.DATABASE_URL);
const mailer = createMailer({ host: env.SMTP_HOST, port: env.SMTP_PORT, from: env.SMTP_FROM });
const auth = createAuth({ db, mailer, secret: env.BETTER_AUTH_SECRET, baseURL: env.APP_URL });
const app = createApp(auth, db);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`apps/api listening on http://localhost:${info.port}`);
});
