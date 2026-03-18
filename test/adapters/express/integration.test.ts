import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { z } from 'zod';
import express from 'express';
import type { Server } from 'node:http';
import { InMemoryEndpointRegistry } from '../../../src/domain/registry.js';
import { makeEndpoint } from '../../../src/domain/endpoint.js';
import { createRestHandler } from '../../../src/adapters/rest/handler.js';
import { createMcpHandler, mcpOpenApiPaths } from '../../../src/adapters/mcp/handler.js';
import { createTransportPort } from '../../../src/application/create-transport-port.js';
import { noopLoggerPort } from '../../helpers/test-logger.js';

/**
 * Integration test: Express app serving SPA + RivetBench REST at /api + MCP at /mcp.
 *
 * Proves that the framework-agnostic handlers compose correctly on a non-Fastify
 * server with consumer-owned routes (static files, SPA) alongside RivetBench.
 */
describe('Express Integration (SPA + REST + MCP)', () => {
  let server: Server;
  let baseUrl: string;

  const registry = new InMemoryEndpointRegistry();
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
  registry.register(
    makeEndpoint({
      name: 'uppercase',
      summary: 'Uppercase endpoint',
      input: z.object({ text: z.string() }),
      output: z.object({ result: z.string() }),
      handler: async ({ input }) => ({ result: input.text.toUpperCase() }),
    }),
  );

  const transport = createTransportPort(registry, noopLoggerPort);
  const application = { name: 'TestApp', version: '1.0.0', description: 'Express integration test' };

  // REST handler mounted at /api — basePath reflects public URL in OpenAPI
  const restHandler = createRestHandler({
    transport,
    registry,
    logger: noopLoggerPort,
    application,
    basePath: '/api',
    extraPaths: mcpOpenApiPaths('/mcp'),
  });

  const mcpHandler = createMcpHandler({
    transport,
    registry,
    logger: noopLoggerPort,
    application,
  });

  beforeAll(async () => {
    const app = express();
    app.use(express.json());

    // Consumer-owned SPA route — serves HTML at root
    app.get('/', (_req, res) => {
      res.type('html').send('<!DOCTYPE html><html><body><h1>My SPA</h1></body></html>');
    });

    // Consumer-owned static asset simulation
    app.get('/assets/style.css', (_req, res) => {
      res.type('css').send('body { color: red; }');
    });

    // RivetBench REST tools at /api/*
    // Express strips the /api prefix when using app.use('/api', handler),
    // so the handler sees /health, /tools, /rpc/:name etc.
    app.use('/api', (req, res) => {
      restHandler.handleRequest(req, res, req.body);
    });

    // RivetBench MCP at /mcp
    app.all('/mcp', (req, res) => {
      mcpHandler.handleRequest(req, res, req.body);
    });

    // Start on random port
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = server.address();
    if (typeof addr === 'object' && addr) {
      baseUrl = `http://127.0.0.1:${addr.port}`;
    }
  });

  afterAll(async () => {
    await mcpHandler.close();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  // -----------------------------------------------------------------------
  // Consumer routes (SPA + static assets)
  // -----------------------------------------------------------------------

  describe('SPA and static assets (consumer-owned)', () => {
    it('GET / returns HTML', async () => {
      const res = await fetch(`${baseUrl}/`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
      const body = await res.text();
      expect(body).toContain('<h1>My SPA</h1>');
    });

    it('GET /assets/style.css returns CSS', async () => {
      const res = await fetch(`${baseUrl}/assets/style.css`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/css');
    });
  });

  // -----------------------------------------------------------------------
  // REST tools at /api
  // -----------------------------------------------------------------------

  describe('REST at /api', () => {
    it('GET /api/health returns ok', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: 'ok' });
    });

    it('GET /api/tools returns endpoint list', async () => {
      const res = await fetch(`${baseUrl}/api/tools`);
      expect(res.status).toBe(200);
      const tools = await res.json();
      expect(tools).toHaveLength(2);
      expect(tools.map((t: { name: string }) => t.name).sort()).toEqual(['echo', 'uppercase']);
    });

    it('GET /api/tools includes ETag header', async () => {
      const res = await fetch(`${baseUrl}/api/tools`);
      expect(res.headers.get('etag')).toBeDefined();
      expect(res.headers.get('cache-control')).toBe('no-cache');
    });

    it('POST /api/rpc/echo invokes the endpoint', async () => {
      const res = await fetch(`${baseUrl}/api/rpc/echo`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'hello express' }),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ echoed: 'hello express' });
    });

    it('POST /api/rpc/uppercase invokes the endpoint', async () => {
      const res = await fetch(`${baseUrl}/api/rpc/uppercase`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'hello' }),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ result: 'HELLO' });
    });

    it('POST /api/rpc/echo with invalid input returns 400', async () => {
      const res = await fetch(`${baseUrl}/api/rpc/echo`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: '' }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/rpc/nonexistent returns 404', async () => {
      const res = await fetch(`${baseUrl}/api/rpc/nonexistent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.code).toBe('ENDPOINT_NOT_FOUND');
    });
  });

  // -----------------------------------------------------------------------
  // OpenAPI document (unified surface topology)
  // -----------------------------------------------------------------------

  describe('OpenAPI (unified topology)', () => {
    it('GET /api/openapi.json returns OpenAPI 3.0.3 document', async () => {
      const res = await fetch(`${baseUrl}/api/openapi.json`);
      expect(res.status).toBe(200);
      const doc = await res.json();
      expect(doc.openapi).toBe('3.0.3');
      expect(doc.info.title).toBe('TestApp');
    });

    it('OpenAPI paths include /api/rpc/* (basePath-prefixed)', async () => {
      const res = await fetch(`${baseUrl}/api/openapi.json`);
      const doc = await res.json();
      expect(doc.paths).toHaveProperty('/api/rpc/echo');
      expect(doc.paths).toHaveProperty('/api/rpc/uppercase');
      // Should NOT have unprefixed paths
      expect(doc.paths).not.toHaveProperty('/rpc/echo');
    });

    it('OpenAPI paths include /mcp (MCP topology entry)', async () => {
      const res = await fetch(`${baseUrl}/api/openapi.json`);
      const doc = await res.json();
      expect(doc.paths).toHaveProperty('/mcp');
      const mcpPath = doc.paths['/mcp'];
      expect(mcpPath.post).toBeDefined();
      expect(mcpPath.post.summary).toContain('MCP');
      expect(mcpPath.get).toBeDefined();
      expect(mcpPath.delete).toBeDefined();
    });

    it('MCP path description references REST tool equivalence', async () => {
      const res = await fetch(`${baseUrl}/api/openapi.json`);
      const doc = await res.json();
      const description = doc.paths['/mcp'].post.description;
      expect(description).toContain('REST');
      expect(description).toContain('/rpc/');
    });
  });

  // -----------------------------------------------------------------------
  // MCP at /mcp
  // -----------------------------------------------------------------------

  describe('MCP at /mcp', () => {
    it('POST /mcp initializes MCP session', async () => {
      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0.0' },
          },
        }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/event-stream');
      const body = await res.text();
      expect(body).toContain('"protocolVersion"');
      expect(body).toContain('"serverInfo"');
      expect(res.headers.get('mcp-session-id')).toBeDefined();
    });

    it('GET /mcp without session returns 400', async () => {
      const res = await fetch(`${baseUrl}/mcp`);
      expect(res.status).toBe(400);
    });

    it('POST /mcp without Accept: text/event-stream returns 406', async () => {
      const res = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0.0' },
          },
        }),
      });

      expect(res.status).toBe(406);
    });
  });
});
