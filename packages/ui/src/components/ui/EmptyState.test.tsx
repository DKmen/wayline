import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the title, description, and action', () => {
    render(
      <EmptyState
        title="No flows yet"
        description="Flow capture is coming soon."
        action={<button type="button">Record a flow</button>}
      />,
    );

    expect(screen.getByText('No flows yet')).toBeInTheDocument();
    expect(screen.getByText('Flow capture is coming soon.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record a flow' })).toBeInTheDocument();
  });

  it('renders with only the required title when description and action are omitted', () => {
    render(<EmptyState title="No flows yet" />);

    expect(screen.getByText('No flows yet')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <EmptyState title="No flows yet" description="Flow capture is coming soon." />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
