import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignInForm } from './SignInForm';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SignInForm', () => {
  it('shows a confirmation once the magic-link request succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: true }), { status: 200 })),
    );

    render(<SignInForm callbackPath="/" />);
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send sign-in link/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/check your email/i);
  });

  it('sends callbackURL built from the given callback path, not always "/"', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ status: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<SignInForm callbackPath="/settings" />);
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send sign-in link/i }));

    await screen.findByRole('status');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { callbackURL: string };
    expect(body.callbackURL).toBe(`${window.location.origin}/settings`);
  });

  it('shows an alert when the API rejects the request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 429 })));

    render(<SignInForm callbackPath="/" />);
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send sign-in link/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't send/i);
  });

  it('is submittable via keyboard alone', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: true }), { status: 200 })),
    );

    render(<SignInForm callbackPath="/" />);
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com{Enter}');

    expect(await screen.findByRole('status')).toBeInTheDocument();
  });
});
