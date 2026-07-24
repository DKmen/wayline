import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { CreateWorkspaceForm } from './CreateWorkspaceForm';

afterEach(() => {
  vi.unstubAllGlobals();
});

const workspaceBody = {
  id: '018f4f9e-7a3b-7c4d-9e1f-2a3b4c5d6e7f',
  name: 'Acme',
  slug: 'acme',
  plan: 'free',
};

describe('CreateWorkspaceForm', () => {
  it('auto-fills the slug from the name until the slug is edited directly', async () => {
    vi.stubGlobal('fetch', vi.fn());
    render(<CreateWorkspaceForm onCreated={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Workspace name'), 'Acme Corp');
    expect(screen.getByLabelText('Workspace URL')).toHaveValue('acme-corp');

    await userEvent.clear(screen.getByLabelText('Workspace URL'));
    await userEvent.type(screen.getByLabelText('Workspace URL'), 'custom-slug');
    await userEvent.type(screen.getByLabelText('Workspace name'), '!');
    expect(screen.getByLabelText('Workspace URL')).toHaveValue('custom-slug');
  });

  it('calls onCreated with the parsed workspace on a valid submit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(workspaceBody), { status: 201 })),
    );
    const onCreated = vi.fn();
    render(<CreateWorkspaceForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Workspace name'), 'Acme');
    await userEvent.click(screen.getByRole('button', { name: /create workspace/i }));

    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledWith(workspaceBody));
  });

  it('shows an inline slug error on a 409 and does not call onCreated', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 409 })));
    const onCreated = vi.fn();
    render(<CreateWorkspaceForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Workspace name'), 'Acme');
    await userEvent.click(screen.getByRole('button', { name: /create workspace/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/is taken/i);
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('shows a generic form error on a non-409 API failure and does not call onCreated', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));
    const onCreated = vi.fn();
    render(<CreateWorkspaceForm onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Workspace name'), 'Acme');
    await userEvent.click(screen.getByRole('button', { name: /create workspace/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't create the workspace/i);
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('blocks submission client-side for an invalid slug, without calling fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<CreateWorkspaceForm onCreated={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Workspace name'), 'Acme');
    await userEvent.clear(screen.getByLabelText('Workspace URL'));
    await userEvent.type(screen.getByLabelText('Workspace URL'), 'UPPER CASE');
    await userEvent.click(screen.getByRole('button', { name: /create workspace/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/enter a workspace name/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<CreateWorkspaceForm onCreated={vi.fn()} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
