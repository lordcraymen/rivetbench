/**
 * HTTP Transport Adapter
 *
 * A {@link TransportPort} implementation that delegates invocations to a
 * running RivetBench REST server over HTTP. Uses the global `fetch` API
 * (Node.js ≥ 18) and `node:net` for port probing — no external dependencies.
 *
 * Two modes:
 *
 * **Remote-only** — point at a server that is already running:
 * ```typescript
 * const transport = createHttpTransport({ url: 'http://localhost:3000' });
 * ```
 *
 * **Auto-spawn** — start a server on first use if the port is not open:
 * ```typescript
 * import { spawn } from 'node:child_process';
 *
 * const transport = createHttpTransport({
 *   url: 'http://localhost:3000',
 *   spawn: () => spawn('node', ['dist/server.js']),
 * });
 * // First invocation checks the port, spawns if needed, waits for ready,
 * // then proceeds. Subsequent calls skip the check (fast path).
 * ```
 *
 * ADR-0004: Depends on TransportPort — no framework coupling.
 * ADR-0005: No external dependencies — built-ins only.
 */

import { createConnection } from 'node:net';
import type { ChildProcess } from 'node:child_process';
import type { TransportPort, TransportInvocationResult, TransportEndpointSummary } from '../../ports/transport.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HttpTransportOptions {
  /**
   * Base URL of the running RivetBench REST server.
   * @example 'http://localhost:3000'
   */
  url: string;

  /**
   * Optional factory that spawns the server process.
   * Called once if the server port is not yet open on first invocation.
   * The returned `ChildProcess` handle is kept alive for the transport lifetime.
   */
  spawn?: () => ChildProcess;

  /**
   * How long (ms) to wait for a spawned server to become ready.
   * @default 15000
   */
  spawnTimeoutMs?: number;

  /**
   * Poll interval (ms) when waiting for the spawned port to open.
   * @default 200
   */
  pollIntervalMs?: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parsePort(url: string): number {
  const parsed = new URL(url);
  if (parsed.port) return parseInt(parsed.port, 10);
  return parsed.protocol === 'https:' ? 443 : 80;
}

function parseHost(url: string): string {
  return new URL(url).hostname;
}

function isPortOpen(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = createConnection({ host, port }, () => {
      sock.destroy();
      resolve(true);
    });
    sock.on('error', () => {
      sock.destroy();
      resolve(false);
    });
    sock.setTimeout(500, () => {
      sock.destroy();
      resolve(false);
    });
  });
}

async function waitForPort(
  host: string,
  port: number,
  timeoutMs: number,
  pollIntervalMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isPortOpen(host, port)) return;
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  throw new Error(
    `[http-transport] Server did not become ready on ${host}:${port} within ${timeoutMs}ms`,
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a {@link TransportPort} that delegates to a RivetBench REST server
 * over HTTP. Optionally spawns the server process if not yet running.
 *
 * @param options - See {@link HttpTransportOptions}.
 * @returns A `TransportPort` compatible with CLI, MCP, and other adapters.
 *
 * @example
 * ```typescript
 * import { spawn } from 'node:child_process';
 * import { createHttpTransport } from '@lordcraymen/rivetbench/http-transport';
 *
 * const transport = createHttpTransport({
 *   url: 'http://localhost:3000',
 *   spawn: () => spawn('node', ['dist/server.js']),
 * });
 *
 * const cli = createCli({ registry, config, transport });
 * await cli.run(process.argv.slice(2));
 * ```
 */
export function createHttpTransport(options: HttpTransportOptions): TransportPort {
  const { url, spawn: spawnFn, spawnTimeoutMs = 15_000, pollIntervalMs = 200 } = options;
  const baseUrl = url.replace(/\/$/, '');
  const host = parseHost(baseUrl);
  const port = parsePort(baseUrl);

  let ready: Promise<void> | null = null;
  let childProcess: ChildProcess | null = null;

  function ensureReady(): Promise<void> {
    if (ready) return ready;

    ready = (async () => {
      if (!spawnFn) return; // assume server is already running

      const open = await isPortOpen(host, port);
      if (open) return; // already listening — skip spawn

      childProcess = spawnFn();
      await waitForPort(host, port, spawnTimeoutMs, pollIntervalMs);
    })();

    return ready;
  }

  async function invoke(
    name: string,
    rawInput: unknown,
    invokeOptions?: { requestId?: string },
  ): Promise<TransportInvocationResult> {
    await ensureReady();

    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (invokeOptions?.requestId) {
      headers['x-request-id'] = invokeOptions.requestId;
    }

    const res = await fetch(`${baseUrl}/rpc/${encodeURIComponent(name)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(rawInput ?? {}),
    });

    const body = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      // Surface the server-side error as a plain Error so callers can handle it.
      // The full error payload is attached for downstream formatting.
      const err = new Error(
        typeof body['error'] === 'object' && body['error'] !== null
          ? String((body['error'] as Record<string, unknown>)['message'] ?? res.statusText)
          : res.statusText,
      );
      (err as Error & { serverError: unknown }).serverError = body['error'];
      throw err;
    }

    const requestId =
      res.headers.get('x-request-id') ?? invokeOptions?.requestId ?? crypto.randomUUID();

    return { requestId, output: body };
  }

  function list(context: { sessionId?: string; transportType: 'rest' | 'mcp' | 'cli' }): TransportEndpointSummary[] {
    // list() is synchronous in TransportPort, but HTTP is async.
    // We throw a clear error here — callers that need async listing should use
    // the /tools HTTP endpoint directly, or use in-process transport for list.
    void context;
    throw new Error(
      '[http-transport] list() is not supported synchronously over HTTP. ' +
      'Use the in-process transport or fetch /tools directly.',
    );
  }

  return {
    invoke,
    list,
    /** Clean up the spawned child process if one was started. */
    [Symbol.dispose]() {
      childProcess?.kill();
    },
  } as TransportPort & { [Symbol.dispose](): void };
}
