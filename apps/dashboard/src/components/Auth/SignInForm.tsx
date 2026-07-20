import { useState } from 'react';
import { Button, Input } from '@wayline/ui';
import { fetchJson } from '../../lib/api-client';

type Status = 'idle' | 'sending' | 'sent' | 'error';

interface SignInFormProps {
  /** Origin-relative path (e.g. from the sign-in route's `redirect` search param) the magic link should land on. */
  callbackPath: string;
}

/** Magic-link request form — logo, one email input, no passwords (docs/05 §57). */
export function SignInForm({ callbackPath }: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus('sending');

    try {
      await fetchJson('/api/auth/sign-in/magic-link', {
        method: 'POST',
        body: JSON.stringify({ email, callbackURL: `${window.location.origin}${callbackPath}` }),
      });
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return <p role="status">Check your email for a sign-in link.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-lg font-medium text-foreground">Wayline</p>
      <label htmlFor="email" className="text-sm text-muted-foreground">
        Email
      </label>
      <Input
        id="email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email"
      />
      {status === 'error' ? (
        <p role="alert" className="text-sm text-destructive">
          Couldn&apos;t send the sign-in link. Try again.
        </p>
      ) : null}
      <Button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Send sign-in link'}
      </Button>
    </form>
  );
}
