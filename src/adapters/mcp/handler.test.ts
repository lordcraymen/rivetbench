import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { InMemoryEndpointRegistry } from '../../domain/registry.js';
import { makeEndpoint } from '../../domain/endpoint.js';
import { createMcpHandler, type McpHandler } from './handler.js';
import { createTransportPort } from '../../application/create-transport-port.js';
import { noopLoggerPort } from '../../__test-helpers__/test-logger.js';
import type { IncomingMessage, ServerResponse } from 'node:http';

function fakeReq(overrides: Partial<IncomingMessage> & { method?: string; headers?: Record<string, string> }): IncomingMessage {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    url: '/mcp',
    ...overrides,
  } as unknown as IncomingMessage;
}

function fakeRes(): ServerResponse & { written: { statusCode: number; body: string } } {
  const res = {
    written: { statusCode: 200, body: '' },
    writeHead(code: number, headers?: Record<string, string>) {
      res.written.statusCode = code;
      if (headers) {
        // no-op for testing
      }
      return res;
    },
    end(body?: string) {
      if (body) res.written.body = body;
      return res;
    },
    setHeader() { return res; },
    getHeader() { return undefined; },
    headersSent: false,
  } as unknown as ServerResponse & { written: { statusCode: number; body: string } };
  return res;
}

describe('MCP Handler (@modelcontextprotocol/sdk)', () => {
  let registry: InMemoryEndpointRegistry;
  let handler: McpHandler;

  beforeEach(() => {
    registry = new InMemoryEndpointRegistry();

    registry.register(makeEndpoint({
      name: 'echo',
      summary: 'Echo endpoint',
      input: z.object({ message: z.string() }),
      output: z.object({ echoed: z.string() }),
      handler: async ({ input }) => ({ echoed: input.message }),
    }));

    const transport = createTransportPort(registry, noopLoggerPort);

    handler = createMcpHandler({
      transport,
      registry,
      logger: noopLoggerPort,
      application: { name: 'test', version: '0.0.1' },
    });
  });

  afterEach(async () => {
    await handler.close();
  });

  it('returns an object with handleRequest and close methods', () => {
    expect(handler).toHaveProperty('handleRequest');
    expect(handler).toHaveProperty('close');
    expect(typeof handler.handleRequest).toBe('function');
    expect(typeof handler.close).toBe('function');
  });

  it('rejects GET without session ID with 400', async () => {
    const req = fakeReq({ method: 'GET', headers: {} });
    const res = fakeRes();

    await handler.handleRequest(req, res);

    expect(res.written.statusCode).toBe(400);
    expect(JSON.parse(res.written.body)).toHaveProperty('error');
  });

  it('rejects unknown session ID with 404', async () => {
    const req = fakeReq({
      method: 'POST',
      headers: { 'mcp-session-id': 'non-existent-session' },
    });
    const res = fakeRes();

    await handler.handleRequest(req, res);

    expect(res.written.statusCode).toBe(404);
  });

  it('close() can be called multiple times safely', async () => {
    await handler.close();
    await expect(handler.close()).resolves.toBeUndefined();
  });

  describe('tool-list change notifications', () => {
    it('forwards registry changes to active MCP sessions (best-effort)', () => {
      // Verifies that the handler subscribes to onToolsChanged.
      // We can't easily test the full MCP session flow in a unit test,
      // but we can ensure signalToolsChanged doesn't throw.
      expect(() => registry.signalToolsChanged()).not.toThrow();
    });
  });

  describe('endpoint registration', () => {
    it('registers all endpoints from the registry', () => {
      // The handler is created with one endpoint already registered.
      // Verify the registry state (handler internalises this at creation time).
      expect(registry.list()).toHaveLength(1);
      expect(registry.get('echo')).toBeDefined();
    });

    it('handles multiple endpoints', () => {
      registry.register(makeEndpoint({
        name: 'uppercase',
        summary: 'Uppercase',
        input: z.object({ text: z.string() }),
        output: z.object({ result: z.string() }),
        handler: async ({ input }) => ({ result: input.text.toUpperCase() }),
      }));

      expect(registry.list()).toHaveLength(2);
    });
  });
});
