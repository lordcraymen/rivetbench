/**
 * Unit tests for createHttpTransport
 *
 * Strategy: stub global `fetch` and `node:net` to avoid real network calls.
 * The spawn path is tested via a mock that resolves immediately (port "already open").
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import { createHttpTransport } from './index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOkResponse(body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function makeErrorResponse(body: unknown, status = 422): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createHttpTransport', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('invoke', () => {
    it('POSTs to /rpc/:name with JSON body', async () => {
      fetchSpy.mockResolvedValueOnce(makeOkResponse({ echoed: 'hello' }));
      const transport = createHttpTransport({ url: 'http://localhost:3000' });

      await transport.invoke('echo', { message: 'hello' });

      expect(fetchSpy).toHaveBeenCalledOnce();
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('http://localhost:3000/rpc/echo');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toEqual({ message: 'hello' });
    });

    it('returns TransportInvocationResult with output and requestId', async () => {
      fetchSpy.mockResolvedValueOnce(
        makeOkResponse({ echoed: 'hello' }, { 'x-request-id': 'req-abc' }),
      );
      const transport = createHttpTransport({ url: 'http://localhost:3000' });

      const result = await transport.invoke('echo', { message: 'hello' });

      expect(result.output).toEqual({ echoed: 'hello' });
      expect(result.requestId).toBe('req-abc');
    });

    it('uses provided requestId in request header', async () => {
      fetchSpy.mockResolvedValueOnce(makeOkResponse({ echoed: 'hi' }));
      const transport = createHttpTransport({ url: 'http://localhost:3000' });

      await transport.invoke('echo', { message: 'hi' }, { requestId: 'my-id' });

      const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)['x-request-id']).toBe('my-id');
    });

    it('falls back to generated requestId when server does not echo one', async () => {
      fetchSpy.mockResolvedValueOnce(makeOkResponse({ echoed: 'hi' }));
      const transport = createHttpTransport({ url: 'http://localhost:3000' });

      const result = await transport.invoke('echo', { message: 'hi' }, { requestId: 'fallback' });

      expect(result.requestId).toBe('fallback');
    });

    it('URL-encodes endpoint name with special characters', async () => {
      fetchSpy.mockResolvedValueOnce(makeOkResponse({}));
      const transport = createHttpTransport({ url: 'http://localhost:3000' });

      await transport.invoke('my func', {});

      const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('http://localhost:3000/rpc/my%20func');
    });

    it('strips trailing slash from base URL', async () => {
      fetchSpy.mockResolvedValueOnce(makeOkResponse({}));
      const transport = createHttpTransport({ url: 'http://localhost:3000/' });

      await transport.invoke('echo', {});

      const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('http://localhost:3000/rpc/echo');
    });

    it('throws an Error when server responds with non-2xx', async () => {
      fetchSpy.mockResolvedValueOnce(
        makeErrorResponse({
          error: { name: 'ValidationError', code: 'VALIDATION_ERROR', message: 'Bad input' },
        }),
      );
      const transport = createHttpTransport({ url: 'http://localhost:3000' });

      await expect(transport.invoke('echo', {})).rejects.toThrow('Bad input');
    });

    it('attaches serverError to thrown error', async () => {
      const errorPayload = { name: 'ValidationError', code: 'VALIDATION_ERROR', message: 'Bad input' };
      fetchSpy.mockResolvedValueOnce(makeErrorResponse({ error: errorPayload }));
      const transport = createHttpTransport({ url: 'http://localhost:3000' });

      const err = await transport.invoke('echo', {}).catch((e: unknown) => e);
      expect((err as Record<string, unknown>)['serverError']).toEqual(errorPayload);
    });

    it('sends empty object as body when rawInput is undefined', async () => {
      fetchSpy.mockResolvedValueOnce(makeOkResponse({}));
      const transport = createHttpTransport({ url: 'http://localhost:3000' });

      await transport.invoke('echo', undefined);

      const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(init.body as string)).toEqual({});
    });
  });

  describe('list', () => {
    it('throws synchronously — HTTP list is not supported', () => {
      const transport = createHttpTransport({ url: 'http://localhost:3000' });

      expect(() =>
        transport.list({ transportType: 'rest' }),
      ).toThrow(/list\(\) is not supported synchronously/);
    });
  });

  describe('spawn option', () => {
    it('skips spawn when port is already open', async () => {
      // Start a real mini server so the port probe succeeds
      const PORT = 39_091;
      const miniServer = http.createServer((_req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ echoed: 'real' }));
      });
      await new Promise<void>((r) => miniServer.listen(PORT, '127.0.0.1', r));

      try {
        const spawnFn = vi.fn();
        const transport = createHttpTransport({
          url: `http://127.0.0.1:${PORT}`,
          spawn: spawnFn,
        });

        // The port is open, so spawn should never be called
        fetchSpy.mockResolvedValueOnce(makeOkResponse({ echoed: 'real' }));
        await transport.invoke('echo', {});

        expect(spawnFn).not.toHaveBeenCalled();
      } finally {
        await new Promise<void>((r) => miniServer.close(() => r()));
      }
    });
  });
});
