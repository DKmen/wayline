import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const tabsQuery = vi.fn();
const sendMessage = vi.fn();

vi.mock('wxt/browser', () => ({
  browser: {
    tabs: { query: tabsQuery },
    runtime: { sendMessage },
  },
}));

const { App } = await import('./App');

afterEach(() => {
  vi.clearAllMocks();
});

describe('popup App', () => {
  it('starts recording on a normal page', async () => {
    tabsQuery.mockResolvedValue([{ id: 7, url: 'https://example.com/' }]);
    sendMessage.mockResolvedValue({ ok: true });

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /start recording/i }));

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'start-recording',
      tabId: 7,
      url: 'https://example.com/',
    });
    expect(await screen.findByRole('button', { name: /start recording/i })).toBeInTheDocument();
  });

  it('shows the unsupported-page empty state for a restricted page', async () => {
    tabsQuery.mockResolvedValue([{ id: 7, url: 'chrome://extensions/' }]);
    sendMessage.mockResolvedValue({ ok: false, reason: 'unsupported-page' });

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /start recording/i }));

    expect(await screen.findByText("This page can't be recorded")).toBeInTheDocument();
  });

  it('shows the unsupported-page empty state when there is no active tab to query', async () => {
    tabsQuery.mockResolvedValue([]);

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /start recording/i }));

    expect(await screen.findByText("This page can't be recorded")).toBeInTheDocument();
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
