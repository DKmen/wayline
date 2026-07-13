import nodemailer from 'nodemailer';

export type MailerConfig = { host: string; port: number; from: string };
export type MailMessage = { to: string; subject: string; html: string };
export type Mailer = { send(message: MailMessage): Promise<void> };

/**
 * SMTP mailer — points at Mailpit locally (docs/08-local-dev.md §2) and any SMTP-
 * compatible relay in other environments. The `transportFactory` param exists purely
 * so tests can inject a fake transport instead of opening a real socket.
 */
export function createMailer(
  config: MailerConfig,
  transportFactory: typeof nodemailer.createTransport = nodemailer.createTransport,
): Mailer {
  const transport = transportFactory({ host: config.host, port: config.port, secure: false });

  return {
    async send(message) {
      await transport.sendMail({ from: config.from, ...message });
    },
  };
}
