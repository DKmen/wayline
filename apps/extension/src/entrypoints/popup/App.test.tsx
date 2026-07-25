import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const tabsQuery = vi.fn();
const sendMessage = vi.fn();
const permissionsRequest = vi.fn();

vi.mock('wxt/browser', () => ({
  browser: {
    tabs: { query: tabsQuery },
    runtime: { sendMessage },
    permissions: { request: permissionsRequest },
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

  it('shows the permission disclosure card and starts recording after the user allows', async () => {
    tabsQuery.mockResolvedValue([{ id: 7, url: 'https://example.com/' }]);
    sendMessage
      .mockResolvedValueOnce({ ok: false, reason: 'permission-missing' })
      .mockResolvedValueOnce({ ok: true });
    permissionsRequest.mockResolvedValue(true);

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /start recording/i }));

    expect(await screen.findByText('Wayline needs access to this site')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /allow/i }));

    expect(permissionsRequest).toHaveBeenCalledWith({ origins: ['https://example.com/*'] });
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole('button', { name: /start recording/i })).toBeInTheDocument();
  });

  it('shows a denial message and does not retry when the permission request is refused', async () => {
    tabsQuery.mockResolvedValue([{ id: 7, url: 'https://example.com/' }]);
    sendMessage.mockResolvedValue({ ok: false, reason: 'permission-missing' });
    permissionsRequest.mockResolvedValue(false);

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /start recording/i }));
    await userEvent.click(screen.getByRole('button', { name: /allow/i }));

    expect(await screen.findByText(/permission was denied/i)).toBeInTheDocument();
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });
});
