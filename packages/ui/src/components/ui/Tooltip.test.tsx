import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './Tooltip';

function renderTooltip() {
  return render(
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>Helpful detail</TooltipContent>
      </Tooltip>
    </TooltipProvider>,
  );
}

describe('Tooltip', () => {
  it('is not rendered until the trigger is interacted with', () => {
    renderTooltip();

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('opens on keyboard focus, proving it is keyboard-accessible', async () => {
    renderTooltip();

    await userEvent.tab();

    // Radix renders the tooltip text twice (a visible bubble + a visually-hidden
    // role="tooltip" span for screen readers) — query the ARIA role for a single match.
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Helpful detail');
  });

  it('has no accessibility violations once open', async () => {
    renderTooltip();
    await userEvent.tab();
    await screen.findByRole('tooltip');

    // Tooltip content portals to document.body, so the whole body (not just the RTL
    // container) has to be checked — but axe's 'region' rule expects full-page landmark
    // structure (<main>/<nav>/etc.), which is meaningless for an isolated component
    // fixture with no page around it. That's a page-level concern, not this component's.
    expect(
      await axe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
