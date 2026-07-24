import { useState } from 'react';
import {
  createWorkspaceRequestSchema,
  workspaceSchema,
  type Workspace,
} from '@wayline/shared-types';
import { Button, Input } from '@wayline/ui';
import { ApiError, fetchJson } from '../../lib/api-client';
import { slugify } from '../../lib/slugify';

type Status = 'idle' | 'submitting' | 'error';

interface CreateWorkspaceFormProps {
  /** Called with the parsed workspace once creation succeeds — the caller owns the cache write. */
  onCreated: (workspace: Workspace) => void;
}

/** First-workspace creation form — the creator becomes its admin (docs/02 §2). */
export function CreateWorkspaceForm({ onCreated }: CreateWorkspaceFormProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [slugError, setSlugError] = useState('');

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(value);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage('');
    setSlugError('');

    const parsed = createWorkspaceRequestSchema.safeParse({ name, slug });
    if (!parsed.success) {
      setStatus('error');
      setErrorMessage('Enter a workspace name and a valid URL.');
      return;
    }

    setStatus('submitting');
    try {
      const data = await fetchJson<unknown>('/v1/workspaces', {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });
      onCreated(workspaceSchema.parse(data));
    } catch (error) {
      setStatus('error');
      if (error instanceof ApiError && error.status === 409) {
        setSlugError('That workspace URL is taken — try another.');
      } else {
        setErrorMessage("Couldn't create the workspace. Try again.");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-lg font-medium text-foreground">Create your workspace</p>
      <label htmlFor="workspace-name" className="text-sm text-muted-foreground">
        Workspace name
      </label>
      <Input
        id="workspace-name"
        required
        value={name}
        onChange={(event) => handleNameChange(event.target.value)}
        autoComplete="off"
      />
      <label htmlFor="workspace-slug" className="text-sm text-muted-foreground">
        Workspace URL
      </label>
      <Input
        id="workspace-slug"
        required
        value={slug}
        onChange={(event) => handleSlugChange(event.target.value)}
        aria-invalid={slugError ? true : undefined}
        autoComplete="off"
      />
      {slugError ? (
        <p role="alert" className="text-sm text-destructive">
          {slugError}
        </p>
      ) : null}
      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      <Button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Creating…' : 'Create workspace'}
      </Button>
    </form>
  );
}
