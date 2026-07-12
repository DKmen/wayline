import net from 'node:net';
import { describe, expect, it, vi } from 'vitest';

// A connection attempt that never fires 'connect' or 'error' simulates a network black
// hole (e.g. a filtered port) — the bounded timer must resolve it regardless. Node's
// `net` module can't be spied on directly (ESM namespaces aren't configurable), so this
// case gets its own file with a module-level mock rather than living alongside the
// real-socket tests in stack-health.test.ts.
vi.mock('node:net', async (importOriginal) => {
  const actual = await importOriginal<typeof net>();
  return {
    ...actual,
    default: {
      ...actual,
      createConnection: () => new actual.Socket(),
    },
  };
});

describe('checkTcpService timeout handling', () => {
  it('reports ok:false rather than hanging when the connection neither succeeds nor errors', async () => {
    const { checkTcpService } = await import('./index');

    const result = await checkTcpService('test-tcp', '127.0.0.1', 65000, 20);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/timed out/i);
  });
});
