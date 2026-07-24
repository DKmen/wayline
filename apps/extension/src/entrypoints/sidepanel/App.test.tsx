import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('sidepanel App', () => {
  it('shows the no-active-walkthrough empty state', () => {
    render(<App />);

    expect(screen.getByText('No active walkthrough yet')).toBeInTheDocument();
  });
});
