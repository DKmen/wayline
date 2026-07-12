import net from 'node:net';

export interface ServiceCheckResult {
  name: string;
  ok: boolean;
  error?: string | undefined;
}

const DEFAULT_TIMEOUT_MS = 2000;

// Node wraps a multi-address host's (e.g. 'localhost' resolving to both ::1 and
// 127.0.0.1) fully-failed connection attempt in an AggregateError whose own top-level
// `.message` is empty — the real reason only survives on `.code`.
function describeConnectionError(error: NodeJS.ErrnoException): string | undefined {
  return error.message || error.code;
}

/**
 * Checks that an HTTP-speaking service responds at all — reachability only, not a
 * specific status code, since some stand-ins (e.g. ElasticMQ's SQS-compatible API)
 * legitimately return non-2xx for a bare health probe.
 */
export async function checkHttpService(
  name: string,
  url: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<ServiceCheckResult> {
  try {
    await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return { name, ok: true };
  } catch (error) {
    // fetch/AbortSignal.timeout always reject with an Error subclass (TypeError, DOMException).
    return { name, ok: false, error: (error as Error).message };
  }
}

/** Checks that a raw TCP port accepts a connection — used for services with no HTTP surface (Postgres). */
export async function checkTcpService(
  name: string,
  host: string,
  port: number,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<ServiceCheckResult> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });

    // A filtered/black-holed port sends neither a SYN-ACK nor a RST — without this
    // timer the OS-level TCP timeout (which can run to minutes) would decide instead.
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ name, ok: false, error: `timed out connecting to ${host}:${port}` });
    }, timeoutMs);

    socket.once('connect', () => {
      clearTimeout(timer);
      socket.end();
      resolve({ name, ok: true });
    });

    socket.once('error', (error) => {
      clearTimeout(timer);
      resolve({ name, ok: false, error: describeConnectionError(error) });
    });
  });
}
