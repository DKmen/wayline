import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PendingFallback } from './PendingFallback';

describe('PendingFallback', () => {
  it('announces the loading state via role="status"', () => {
    render(<PendingFallback />);

    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
  });
});
