import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// RTL's auto-cleanup only registers itself against a GLOBAL afterEach, which we don't
// have (test.globals isn't enabled) — without this, each test in a file renders on top
// of the last one's un-unmounted DOM, causing "found multiple elements" failures.
afterEach(cleanup);
