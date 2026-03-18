import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { InMemoryEndpointRegistry } from '../../../src/domain/registry.js';
import { makeEndpoint } from '../../../src/domain/endpoint.js';
import { createRestHandler, type RestHandler } from '../../../src/adapters/rest/handler.js';
import { createTransportPort } from '../../../src/application/create-transport-port.js';
import { noopLoggerPort } from '../../helpers/test-logger.js';
import type { IncomingMessage, ServerResponse } from 'node:http';

// ---------------------------------------------------------------------------
// Test helpers — lightweight fakes for raw Node.js http types
// ---------------------------------------------------------------------------

function fakeReq(
  method: string,
  url: string,
  headers?: Record<string, string>,
): IncomingMessage {
  return {
    method,
    url,
    headers: { host: 'localhost', ...headers },
  } as unknown as IncomingMessage;
}

function fakeRes(): ServerResponse & {
  written: { statusCode: number; headers: Record<string, string>; body: string };
} {
  const res = {
    written: { statusCode: 200, headers: {}, body: '' },
    writeHead(code: number, headers?: Record<string, string>) {
      res.written.statusCode = code;
      if (headers) res.written.headers = { ...res.written.headers, ...headers };
      return res;
    },
    end(body?: string) {
      if (body) res.written.body = body;
      return res;
    },
    setHeader() {
      return res;
    },
    getHeader() {
      return undefined;
    },
    headersSent: false,
  } as unknown as ServerResponse & {
    written: { statusCode: number; headers: Record<string, string>; body: string };
  };
  return res;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('REST Handler (framework-agnostic)', () => {
  let registry: InMemoryEndpointRegistry;
  let handler: RestHandler;

  beforeEach(() => {
    registry = new InMemoryEndpointRegistry();

    registry.register(
      makeEndpoint({
        name: 'echo',
        summary: 'Echo endpoint',
        description: 'Echoes back the message',
        input: z.object({ message: z.string().min(1) }),
        output: z.object({ echoed: z.string() }),
        handler: async ({ input }) => ({ echoed: input.message }),
      }),
    );

    const transport = createTransportPort(registry, noopLoggerPort);

    handler = createRestHandler({
      transport,
      registry,
      logger: noopLoggerPort,
      application: { name: 'TestApp', version: '1.0.0', description: 'Test' },
    });
  });

  it('returns an object with handleRequest and getOpenApiDocument', () => {
    expect(typeof handler.handleRequest).toBe('function');
    expect(typeof handler.getOpenApiDocument).toBe('function');
  });

  describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
      const req = fakeReq('GET', '/health');
      const res = fakeRes();

      await handler.handleRequest(req, res);

      expect(res.written.statusCode).toBe(200);
      expect(JSON.parse(res.written.body)).toEqual({ status: 'ok' });
    });
  });

  describe('GET /tools', () => {
    it('returns the registered endpoint list', async () => {
      const req = fakeReq('GET', '/tools');
      const res = fakeRes();

      await handler.handleRequest(req, res);

      expect(res.written.statusCode).toBe(200);
      const body = JSON.parse(res.written.body);
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({ name: 'echo', summary: 'Echo endpoint' });
    });

    it('includes ETag and Cache-Control headers', async () => {
      const req = fakeReq('GET', '/tools');
      const res = fakeRes();

      await handler.handleRequest(req, res);

      expect(res.written.headers['etag']).toBeDefined();
      expect(res.written.headers['cache-control']).toBe('no-cache');
    });

    it('returns 304 when If-None-Match matches ETag', async () => {
      // First request to get the ETag
      const res1 = fakeRes();
      await handler.handleRequest(fakeReq('GET', '/tools'), res1);
      const etag = res1.written.headers['etag'];

      // Second request with matching ETag
      const req2 = fakeReq('GET', '/tools', { 'if-none-match': etag });
      const res2 = fakeRes();
      await handler.handleRequest(req2, res2);

      expect(res2.written.statusCode).toBe(304);
    });

    it('returns 200 when If-None-Match does not match', async () => {
      const req = fakeReq('GET', '/tools', { 'if-none-match': '"stale"' });
      const res = fakeRes();

      await handler.handleRequest(req, res);

      expect(res.written.statusCode).toBe(200);
    });
  });

  describe('POST /rpc/:name', () => {
    it('invokes the endpoint and returns the output', async () => {
      const req = fakeReq('POST', '/rpc/echo');
      const res = fakeRes();

      await handler.handleRequest(req, res, { message: 'hello' });

      expect(res.written.statusCode).toBe(200);
      expect(JSON.parse(res.written.body)).toEqual({ echoed: 'hello' });
    });

    it('returns 400 for invalid input', async () => {
      const req = fakeReq('POST', '/rpc/echo');
      const res = fakeRes();

      await handler.handleRequest(req, res, { message: '' });

      expect(res.written.statusCode).toBe(400);
      const body = JSON.parse(res.written.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 for unknown endpoint', async () => {
      const req = fakeReq('POST', '/rpc/nonexistent');
      const res = fakeRes();

      await handler.handleRequest(req, res, {});

      expect(res.written.statusCode).toBe(404);
      const body = JSON.parse(res.written.body);
      expect(body.error.code).toBe('ENDPOINT_NOT_FOUND');
    });

    it('returns 404 when endpoint name is missing', async () => {
      const req = fakeReq('POST', '/rpc/');
      const res = fakeRes();

      await handler.handleRequest(req, res);

      expect(res.written.statusCode).toBe(404);
    });
  });

  describe('GET /openapi.json', () => {
    it('returns a valid OpenAPI 3.0.3 document', async () => {
      const req = fakeReq('GET', '/openapi.json');
      const res = fakeRes();

      await handler.handleRequest(req, res);

      expect(res.written.statusCode).toBe(200);
      const doc = JSON.parse(res.written.body);
      expect(doc.openapi).toBe('3.0.3');
      expect(doc.info.title).toBe('TestApp');
      expect(doc.paths).toHaveProperty('/rpc/echo');
    });

    it('matches the document returned by getOpenApiDocument()', async () => {
      const req = fakeReq('GET', '/openapi.json');
      const res = fakeRes();

      await handler.handleRequest(req, res);

      expect(JSON.parse(res.written.body)).toEqual(handler.getOpenApiDocument());
    });
  });

  describe('unknown routes', () => {
    it('returns 404 for unrecognised paths', async () => {
      const req = fakeReq('GET', '/nonexistent');
      const res = fakeRes();

      await handler.handleRequest(req, res);

      expect(res.written.statusCode).toBe(404);
      const body = JSON.parse(res.written.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 for wrong method on known path', async () => {
      const req = fakeReq('DELETE', '/health');
      const res = fakeRes();

      await handler.handleRequest(req, res);

      expect(res.written.statusCode).toBe(404);
    });
  });

  describe('x-request-id propagation', () => {
    it('uses x-request-id header when provided', async () => {
      const req = fakeReq('POST', '/rpc/echo', { 'x-request-id': 'custom-id-123' });
      const res = fakeRes();

      await handler.handleRequest(req, res, { message: 'hi' });

      expect(res.written.statusCode).toBe(200);
    });
  });
});
