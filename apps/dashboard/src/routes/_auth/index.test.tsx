import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../hooks/use-session', () => ({
  useSession: vi.fn(),
}));

const { useSession } = await import('../../hooks/use-session');
const { Route } = await import('./index');

const DashboardHome = Route.options.component!;

describe('DashboardHome', () => {
  it('greets the signed-in user by email once the session resolves', () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        session: { expiresAt: '2026-08-01T00:00:00.000Z' },
        user: { id: 'u1', email: 'ada@example.com', name: 'Ada' },
      },
    } as ReturnType<typeof useSession>);

    render(<DashboardHome />);

    expect(screen.getByText('Welcome, ada@example.com')).toBeInTheDocument();
  });

  it('shows a bare "Welcome" if the session is momentarily unavailable', () => {
    vi.mocked(useSession).mockReturnValue({ data: null } as ReturnType<typeof useSession>);

    render(<DashboardHome />);

    expect(screen.getByText('Welcome')).toBeInTheDocument();
  });
});
