/**
 * Server adapter load benchmark + smoke test
 *
 * Compares throughput across:
 *   1. In-process      — direct function call, no network
 *   2. Node.js http    — plain createServer(), no framework
 *   3. Express 5       — express@5 + json() middleware
 *   4. Fastify 5       — fastify@5 + reply.hijack() delegate
 *   5. Hono            — @hono/node-server + native Hono routing
 *   6. Koa 2           — koa + @koa/bodyparser middleware
 *
 * Each bench iteration fires CONCURRENCY requests in parallel.
 * Every request gets a unique payload (monotonic counter in the message),
 * so no HTTP-level caching can flatten the numbers. Each response is
 * validated against the expected value — this makes every iteration a
 * smoke test as well as a perf measurement.
 *
 * Transports are created once in beforeAll (construction cost is excluded).
 *
 * Run: npm run bench
 */

import http, { type Server } from 'node:http';
import { describe, bench, beforeAll, afterAll, expect } from 'vitest';
import { z } from 'zod';
import express from 'express';
import Fastify from 'fastify';
import Koa from 'koa';
import { bodyParser as koaBodyParser } from '@koa/bodyparser';
import { Hono } from 'hono';
import { createAdaptorServer } from '@hono/node-server';
import { InMemoryEndpointRegistry } from '../../domain/registry.js';
import { makeEndpoint } from '../../domain/endpoint.js';
import { createTransportPort } from '../../application/create-transport-port.js';
import { createRestHandler } from '../rest/handler.js';
import { noopLoggerPort } from '../../__test-helpers__/test-logger.js';
import { createHttpTransport, type HttpTransportOptions } from './index.js';
import type { TransportPort } from '../../ports/transport.js';

// ---------------------------------------------------------------------------
// Load parameters
// ---------------------------------------------------------------------------

/** Number of requests fired in parallel per bench iteration. */
const CONCURRENCY = 20;

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const registry = new InMemoryEndpointRegistry();
registry.register(
  makeEndpoint({
    name: 'echo',
    summary: 'Echo',
    input: z.object({ message: z.string() }),
    output: z.object({ echoed: z.string() }),
    handler: async ({ input }) => ({ echoed: input.message }),
  }),
);

const inProcessTransport = createTransportPort(registry, noopLoggerPort);
const application = { name: 'bench', version: '0.0.0' };

// Ports — kept far from typical dev ports to avoid conflicts
const PORT_NODE     = 3910;
const PORT_EXPRESS  = 3911;
const PORT_FASTIFY  = 3912;
const PORT_HONO     = 3913;
const PORT_KOA      = 3914;

// ---------------------------------------------------------------------------
// Server factories
// ---------------------------------------------------------------------------

async function startNodeServer(): Promise<Server> {
  const handler = createRestHandler({ transport: inProcessTransport, registry, logger: noopLoggerPort, application });

  const server = http.createServer((req, res) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => { raw += chunk; });
    req.on('end', () => {
      const body = raw ? JSON.parse(raw) : undefined;
      void handler.handleRequest(req, res, body);
    });
  });

  return new Promise((resolve) => {
    server.listen(PORT_NODE, '127.0.0.1', () => resolve(server));
  });
}

async function startExpressServer(): Promise<Server> {
  const handler = createRestHandler({ transport: inProcessTransport, registry, logger: noopLoggerPort, application });
  const app = express();
  app.use(express.json());
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.all('/*splat', (req, res) => handler.handleRequest(req, res, req.body));

  return new Promise((resolve) => {
    const server = app.listen(PORT_EXPRESS, '127.0.0.1', () => resolve(server));
  });
}

async function startFastifyServer(): Promise<{ close: () => Promise<void> }> {
  const handler = createRestHandler({ transport: inProcessTransport, registry, logger: noopLoggerPort, application });
  const fastify = Fastify({ logger: false });

  const delegate = async (
    request: { raw: import('node:http').IncomingMessage; body: unknown },
    reply: { raw: import('node:http').ServerResponse; hijack: () => void },
  ) => {
    reply.hijack();
    await handler.handleRequest(request.raw, reply.raw, request.body);
  };

  fastify.post('/rpc/:name', delegate);
  fastify.get('/tools', delegate);
  fastify.get('/health', delegate);

  await fastify.listen({ port: PORT_FASTIFY, host: '127.0.0.1' });
  return { close: () => fastify.close() };
}

async function startHonoServer(): Promise<Server> {
  const app = new Hono();

  app.post('/rpc/:name', async (c) => {
    const name = c.req.param('name');
    const body = await c.req.json<unknown>();
    try {
      const result = await inProcessTransport.invoke(name, body, {
        requestId: c.req.header('x-request-id') ?? crypto.randomUUID(),
      });
      return c.json(result.output);
    } catch (err) {
      return c.json({ error: { message: String(err) } }, 422);
    }
  });

  const server = createAdaptorServer(app);
  return new Promise((resolve) => {
    server.listen(PORT_HONO, () => resolve(server as Server));
  });
}

async function startKoaServer(): Promise<Server> {
  const handler = createRestHandler({ transport: inProcessTransport, registry, logger: noopLoggerPort, application });
  const app = new Koa();
  app.use(koaBodyParser());
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.use(async (ctx) => {
    await handler.handleRequest(ctx.req, ctx.res, ctx.request.body);
    ctx.respond = false;
  });

  return new Promise((resolve) => {
    const server = app.listen(PORT_KOA, '127.0.0.1', () => resolve(server));
  });
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

let nodeServer: Server;
let expressServer: Server;
let fastifyHandle: { close: () => Promise<void> };
let honoServer: Server;
let koaServer: Server;

// HTTP transports — created once; construction cost excluded from bench
let tNode: TransportPort;
let tExpress: TransportPort;
let tFastify: TransportPort;
let tHono: TransportPort;
let tKoa: TransportPort;

function makeHttpTransport(port: number): TransportPort {
  return createHttpTransport({ url: `http://127.0.0.1:${port}` } satisfies HttpTransportOptions);
}

beforeAll(async () => {
  [nodeServer, expressServer, fastifyHandle, honoServer, koaServer] = await Promise.all([
    startNodeServer(),
    startExpressServer(),
    startFastifyServer(),
    startHonoServer(),
    startKoaServer(),
  ]);

  tNode    = makeHttpTransport(PORT_NODE);
  tExpress = makeHttpTransport(PORT_EXPRESS);
  tFastify = makeHttpTransport(PORT_FASTIFY);
  tHono    = makeHttpTransport(PORT_HONO);
  tKoa     = makeHttpTransport(PORT_KOA);
});

afterAll(async () => {
  await Promise.all([
    new Promise<void>((r) => nodeServer.close(() => r())),
    new Promise<void>((r) => expressServer.close(() => r())),
    fastifyHandle.close(),
    new Promise<void>((r) => honoServer.close(() => r())),
    new Promise<void>((r) => koaServer.close(() => r())),
  ]);
});

// ---------------------------------------------------------------------------
// Load helpers
// ---------------------------------------------------------------------------

/** Monotonic counter — unique per request across all bench iterations. */
let seq = 0;

/**
 * Fire CONCURRENCY requests in parallel, each with a unique payload.
 * Validates that every response echoes back exactly what was sent
 * (smoke-test guarantee: no caching, no short-circuiting).
 */
async function loadBurst(t: TransportPort): Promise<void> {
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      const id = ++seq;
      const msg = `req-${id}`;
      const result = await t.invoke('echo', { message: msg });
      // Response correctness check — fails the bench if the server misbehaves
      expect((result.output as { echoed: string }).echoed).toBe(msg);
    }),
  );
}

// ---------------------------------------------------------------------------
// Benchmarks — CONCURRENCY parallel requests per iteration
// ---------------------------------------------------------------------------

describe(`endpoint invoke — ${CONCURRENCY} concurrent requests per iteration`, () => {
  bench('1. in-process (no network)', async () => {
    await loadBurst(inProcessTransport);
  });

  bench('2. Node.js http (no framework)', async () => {
    await loadBurst(tNode);
  });

  bench('3. Express 5', async () => {
    await loadBurst(tExpress);
  });

  bench('4. Fastify 5', async () => {
    await loadBurst(tFastify);
  });

  bench('5. Hono (native routing)', async () => {
    await loadBurst(tHono);
  });

  bench('6. Koa 2', async () => {
    await loadBurst(tKoa);
  });
});

