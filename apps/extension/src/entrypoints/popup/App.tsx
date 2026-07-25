import { useState } from 'react';
import { Button, EmptyState } from '@wayline/ui';
import { browser } from 'wxt/browser';
import { hostPermissionPatternFor } from '../../utils/hostPermissionPattern';
import type { StartRecordingResult } from '../background';

type Status = 'idle' | 'starting' | 'unsupported-page' | 'needs-permission' | 'permission-denied';

type ActiveTab = { id: number; url: string };

async function requestStart(tabId: number, url: string): Promise<StartRecordingResult> {
  return (await browser.runtime.sendMessage({
    type: 'start-recording',
    tabId,
    url,
  })) as StartRecordingResult;
}

function statusFor(result: StartRecordingResult): Status {
  if (result.ok) return 'idle';
  return result.reason === 'permission-missing' ? 'needs-permission' : 'unsupported-page';
}

/** Popup — start/pause/finish, sign-in state (docs/06-extension-spec.md §1). Sign-in and pause/finish land with the auth bridge and capture-engine tickets; this is the start-recording scaffold. */
export function App() {
  const [status, setStatus] = useState<Status>('idle');
  const [tab, setTab] = useState<ActiveTab | null>(null);

  async function handleStart() {
    setStatus('starting');
    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.id || !activeTab.url) {
      setStatus('unsupported-page');
      return;
    }

    setTab({ id: activeTab.id, url: activeTab.url });
    const result = await requestStart(activeTab.id, activeTab.url);
    setStatus(statusFor(result));
  }

  async function handleAllow() {
    if (!tab) return;

    const pattern = hostPermissionPatternFor(tab.url);
    const granted = pattern ? await browser.permissions.request({ origins: [pattern] }) : false;

    if (!granted) {
      setStatus('permission-denied');
      return;
    }

    setStatus('starting');
    const result = await requestStart(tab.id, tab.url);
    setStatus(statusFor(result));
  }

  if (status === 'unsupported-page') {
    return <EmptyState title="This page can't be recorded" description="Try a different tab." />;
  }

  if (status === 'needs-permission' || status === 'permission-denied') {
    return (
      <div style={{ padding: 16 }}>
        <p>Wayline needs access to this site</p>
        <p>
          While you're recording, Wayline captures the page URL, clicks, and screenshots. It never
          reads what you type, and nothing is sold or shared.
        </p>
        {status === 'permission-denied' && (
          <p>Permission was denied — try again when you're ready.</p>
        )}
        <Button onClick={handleAllow}>Allow</Button>
      </div>
    );
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
