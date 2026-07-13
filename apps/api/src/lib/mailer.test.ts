import { describe, expect, it, vi } from 'vitest';
import { createMailer } from './mailer';

describe('createMailer', () => {
  it('sends mail through the configured transport with the configured from address', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: 'abc' });
    const transportFactory = vi.fn().mockReturnValue({ sendMail });

    const mailer = createMailer(
      { host: 'localhost', port: 1025, from: 'Wayline <no-reply@wayline.app>' },
      transportFactory,
    );
    await mailer.send({ to: 'person@example.com', subject: 'Sign in', html: '<p>link</p>' });

    expect(transportFactory).toHaveBeenCalledWith({ host: 'localhost', port: 1025, secure: false });
    expect(sendMail).toHaveBeenCalledWith({
      from: 'Wayline <no-reply@wayline.app>',
      to: 'person@example.com',
      subject: 'Sign in',
      html: '<p>link</p>',
    });
  });

  it('propagates a transport failure instead of swallowing it', async () => {
    const sendMail = vi.fn().mockRejectedValue(new Error('smtp connection refused'));
    const transportFactory = vi.fn().mockReturnValue({ sendMail });

    const mailer = createMailer(
      { host: 'localhost', port: 1025, from: 'Wayline <no-reply@wayline.app>' },
      transportFactory,
    );

    await expect(
      mailer.send({ to: 'person@example.com', subject: 'Sign in', html: '<p>link</p>' }),
    ).rejects.toThrow('smtp connection refused');
  });
});
