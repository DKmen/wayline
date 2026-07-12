import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders the requested variant on data-variant', () => {
    render(<Badge variant="warning">2 warnings</Badge>);

    expect(screen.getByText('2 warnings')).toHaveAttribute('data-variant', 'warning');
  });

  it('falls back to the default variant when none is given', () => {
    render(<Badge>Draft</Badge>);

    expect(screen.getByText('Draft')).toHaveAttribute('data-variant', 'default');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Badge>Draft</Badge>);

    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders as its child element when asChild is set, instead of a <span>', () => {
    render(
      <Badge asChild>
        <a href="/flows/123">Published v3</a>
      </Badge>,
    );

    expect(screen.getByRole('link', { name: 'Published v3' }).tagName).toBe('A');
  });
});
