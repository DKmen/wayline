import { useState } from 'react';
import { Button, EmptyState } from '@wayline/ui';
import { browser } from 'wxt/browser';
import type { StartRecordingResult } from '../background';

type Status = 'idle' | 'starting' | 'unsupported-page';

/** Popup — start/pause/finish, sign-in state (docs/06-extension-spec.md §1). Sign-in and pause/finish land with the auth bridge and capture-engine tickets; this is the start-recording scaffold. */
export function App() {
  const [status, setStatus] = useState<Status>('idle');

  async function handleStart() {
    setStatus('starting');
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) {
      setStatus('unsupported-page');
      return;
    }

    const result = (await browser.runtime.sendMessage({
      type: 'start-recording',
      tabId: tab.id,
      url: tab.url,
    })) as StartRecordingResult;

    setStatus(result.ok ? 'idle' : 'unsupported-page');
  }

  if (status === 'unsupported-page') {
    return <EmptyState title="This page can't be recorded" description="Try a different tab." />;
  }

  return (
    <div style={{ padding: 16 }}>
      <p>Wayline</p>
      <Button onClick={handleStart} disabled={status === 'starting'}>
        {status === 'starting' ? 'Starting…' : 'Start recording'}
      </Button>
    </div>
  );
}
