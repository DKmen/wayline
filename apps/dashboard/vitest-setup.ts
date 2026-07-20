import '@testing-library/jest-dom/vitest';
import { afterEach, expect } from 'vitest';
import { cleanup } from '@testing-library/react';
import { toHaveNoViolations } from 'jest-axe';

// RTL's auto-cleanup only registers itself against a GLOBAL afterEach, which we don't
// have (test.globals isn't enabled) — without this, each test in a file renders on top
// of the last one's un-unmounted DOM, causing "found multiple elements" failures.
afterEach(cleanup);

// jest-axe already exports { toHaveNoViolations: fn } shaped for expect.extend() directly
// (no extra wrapping) — but @types/jest-axe types that function for Jest's MatcherContext,
// not Vitest's. The runtime shape is call-compatible (both take `(received)` and return
// `{ pass, message }`); only the .d.ts written for Jest doesn't line up with Vitest's types.
expect.extend(toHaveNoViolations as unknown as Parameters<typeof expect.extend>[0]);
