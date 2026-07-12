import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Button } from './Button';

describe('Button', () => {
  it('fires onClick when enabled', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Save
      </Button>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Button>Save</Button>);

    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders as its child element when asChild is set, instead of a <button>', () => {
    render(
      <Button asChild>
        <a href="/flows/123">Open flow</a>
      </Button>,
    );

    const link = screen.getByRole('link', { name: 'Open flow' });
    expect(link.tagName).toBe('A');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
