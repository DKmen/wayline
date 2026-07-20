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

    render(<SignInForm />);
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send sign-in link/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/check your email/i);
  });

  it('shows an alert when the API rejects the request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 429 })));

    render(<SignInForm />);
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send sign-in link/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't send/i);
  });

  it('is submittable via keyboard alone', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: true }), { status: 200 })),
    );

    render(<SignInForm />);
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com{Enter}');

    expect(await screen.findByRole('status')).toBeInTheDocument();
  });
});
