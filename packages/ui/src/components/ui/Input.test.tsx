import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Input } from './Input';

describe('Input', () => {
  it('forwards typed input to onChange', async () => {
    const onChange = vi.fn();
    render(<Input aria-label="Workspace name" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Workspace name'), 'Acme');

    expect(onChange).toHaveBeenCalledTimes(4);
  });

  it('does not accept input when disabled', async () => {
    const onChange = vi.fn();
    render(<Input aria-label="Workspace name" onChange={onChange} disabled />);

    await userEvent.type(screen.getByLabelText('Workspace name'), 'Acme');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Input aria-label="Workspace name" />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
