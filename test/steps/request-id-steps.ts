import { Given, When, Then } from '@cucumber/cucumber';
import { z } from 'zod';
import { RivetBenchWorld } from './world.js';
import { createRestServer } from '../../src/adapters/fastify/server.js';
import { loadConfig } from '../../src/config/index.js';
import { InMemoryEndpointRegistry } from '../../src/domain/registry.js';
import { makeEndpoint } from '../../src/domain/endpoint.js';
import { createTestLogger, noopLoggerPort } from '../helpers/test-logger.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Register a special endpoint that captures the requestId and returns it.
 * Shared across REST and (simulated) MCP scenarios.
 */
function createRequestIdRegistry(world: RivetBenchWorld) {
  const registry = new InMemoryEndpointRegistry();
  registry.register(makeEndpoint({
    name: 'capture-request-id',
    summary: 'Captures request ID from context',
    input: z.object({ test: z.string() }),
    output: z.object({ requestId: z.string().optional() }),
    handler: async ({ config }) => {
      if (config.requestId) {
        world.capturedRequestIds.push(config.requestId);
      }
      return { requestId: config.requestId };
    },
  }));
  return registry;
}

// ── Background ──────────────────────────────────────────────────────────

Given('an endpoint that captures the request ID from context', async function (this: RivetBenchWorld) {
  const config = loadConfig();
  const registry = createRequestIdRegistry(this);
  const server = await createRestServer({ registry, config, logger: createTestLogger(), loggerPort: noopLoggerPort });
  await server.fastify.listen({ host: '127.0.0.1', port: 0 });
  this.restServer = server.fastify;
  const address = server.fastify.server.address();
  if (address && typeof address === 'object') {
    this.restServerUrl = `http://127.0.0.1:${address.port}`;
  }
});

// ── When ────────────────────────────────────────────────────────────────

When('I call the endpoint via REST', async function (this: RivetBenchWorld) {
  if (!this.restServer) {
    throw new Error('REST server not running');
  }
  const res = await this.restServer.inject({
    method: 'POST',
    url: '/rpc/capture-request-id',
    payload: { test: 'rest-call' },
  });
  this.response = {
    statusCode: res.statusCode,
    body: res.json(),
    headers: res.headers as Record<string, unknown>,
  };
});

When('I call the endpoint via MCP', async function (this: RivetBenchWorld) {
  // MCP transport is simulated: we invoke the same handler with a UUID, just
  // as the real MCP server does (crypto.randomUUID()). A full stdio test
  // would require a child-process setup which is out of scope for BDD.
  if (!this.restServer) {
    throw new Error('REST server not running');
  }
  const res = await this.restServer.inject({
    method: 'POST',
    url: '/rpc/capture-request-id',
    payload: { test: 'mcp-call' },
  });
  this.response = {
    statusCode: res.statusCode,
    body: res.json(),
    headers: res.headers as Record<string, unknown>,
  };
});

When('I make multiple requests to the same endpoint', async function (this: RivetBenchWorld) {
  if (!this.restServer) {
    throw new Error('REST server not running');
  }
  // Reset so we only capture IDs from this batch
  this.capturedRequestIds = [];
  for (let i = 0; i < 3; i++) {
    await this.restServer.inject({
      method: 'POST',
      url: '/rpc/capture-request-id',
      payload: { test: `call-${i}` },
    });
    // The handler pushes IDs into capturedRequestIds automatically.
  }
});

When('I make a request via REST', async function (this: RivetBenchWorld) {
  if (!this.restServer) {
    throw new Error('REST server not running');
  }
  const res = await this.restServer.inject({
    method: 'POST',
    url: '/rpc/capture-request-id',
    payload: { test: 'format-rest' },
  });
  this.response = {
    statusCode: res.statusCode,
    body: res.json(),
    headers: res.headers as Record<string, unknown>,
  };
});

When('I make a request via MCP', async function (this: RivetBenchWorld) {
  // Simulated via the same REST call — UUID generation is identical.
  if (!this.restServer) {
    throw new Error('REST server not running');
  }
  await this.restServer.inject({
    method: 'POST',
    url: '/rpc/capture-request-id',
    payload: { test: 'format-mcp' },
  });
  // The handler pushes the captured ID into capturedRequestIds automatically.
});

// ── Then ────────────────────────────────────────────────────────────────

Then('the handler should receive a valid UUID request ID', function (this: RivetBenchWorld) {
  const body = this.response?.body as { requestId?: string } | undefined;
  this.expect(body).toBeDefined();
  this.expect(body!.requestId).toBeDefined();
  this.expect(body!.requestId!).toMatch(UUID_RE);
});

Then('the response should include the request ID', function (this: RivetBenchWorld) {
  const body = this.response?.body as { requestId?: string } | undefined;
  this.expect(body).toBeDefined();
  this.expect(body!.requestId).toBeDefined();
});

Then('each request should have a different request ID', function (this: RivetBenchWorld) {
  this.expect(this.capturedRequestIds.length).toBeGreaterThan(1);
  const unique = new Set(this.capturedRequestIds);
  this.expect(unique.size).toBe(this.capturedRequestIds.length);
});

Then('both request IDs should follow RFC 4122 UUID format', function (this: RivetBenchWorld) {
  this.expect(this.capturedRequestIds.length).toBeGreaterThan(0);
  for (const id of this.capturedRequestIds) {
    this.expect(id).toMatch(UUID_RE);
  }
});

Then('both request IDs should have the same structure', function (this: RivetBenchWorld) {
  for (const id of this.capturedRequestIds) {
    const parts = id.split('-').map((s: string) => s.length);
    this.expect(JSON.stringify(parts)).toBe(JSON.stringify([8, 4, 4, 4, 12]));
  }
});
