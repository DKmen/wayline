import http from 'node:http';
import net from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { checkHttpService, checkTcpService } from './index';

function listen(server: http.Server | net.Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve(typeof address === 'object' && address ? address.port : 0);
    });
  });
}

describe('checkHttpService', () => {
  let server: http.Server | net.Server | undefined;

  afterEach(() => {
    server?.close();
    server = undefined;
  });

  it('reports ok:true when the service responds', async () => {
    server = http.createServer((_req, res) => res.end('ok'));
    const port = await listen(server);

    const result = await checkHttpService('test-http', `http://127.0.0.1:${port}/`);

    expect(result).toEqual({ name: 'test-http', ok: true });
  });

  it('reports ok:false with an error when nothing is listening', async () => {
    const result = await checkHttpService('test-http', 'http://127.0.0.1:1/');

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('reports ok:false rather than hanging when the server accepts but never responds', async () => {
    server = net.createServer((socket) => {
      // Accept the TCP connection but deliberately withhold any HTTP response.
      socket.on('error', () => {});
    });
    const port = await listen(server);

    const result = await checkHttpService('test-http', `http://127.0.0.1:${port}/`, 50);

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe('checkTcpService', () => {
  let server: net.Server | undefined;

  afterEach(() => {
    server?.close();
    server = undefined;
  });

  it('reports ok:true when the port accepts a connection', async () => {
    server = net.createServer();
    const port = await listen(server);

    const result = await checkTcpService('test-tcp', '127.0.0.1', port);

    expect(result).toEqual({ name: 'test-tcp', ok: true });
  });

  it('reports ok:false with an error when the port refuses the connection', async () => {
    const result = await checkTcpService('test-tcp', '127.0.0.1', 1);

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('reports a non-empty, meaningful error for a multi-address host like localhost', async () => {
    // Regression case: 'localhost' resolves to both ::1 and 127.0.0.1, so a fully-refused
    // connection comes back as a Node AggregateError whose own .message is empty — only
    // .code survives. A literal IP (the test above) doesn't exercise this path at all.
    const result = await checkTcpService('test-tcp', 'localhost', 1);

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.error).toMatch(/ECONNREFUSED/);
  });

  // The timeout path (connection neither succeeds nor errors) is covered separately in
  // stack-health-tcp-timeout.test.ts — it needs to mock node:net at module scope, which
  // would break these real-socket tests if done in the same file.
});
