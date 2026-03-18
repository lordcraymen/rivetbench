# RivetBench

**RivetBench** is a lightweight TypeScript framework for building **triple-exposed endpoints** that work over **REST**, **MCP (Model Context Protocol)**, and a **runtime-generated CLI** — with **OpenAPI 3** documentation generated automatically.

Write an endpoint once — expose it everywhere.

---

## Features

- Unified endpoint definitions with **Zod** schemas for validation and typing
- **Three transports from one definition**: REST routes, MCP tools, and CLI commands
- **RPC over REST**: POST-only routes dispatched by endpoint name (no resource modeling)
- **Runtime-generated CLI** with named parameters, JSON input, and raw/JSON output modes
- Automatic **OpenAPI 3** spec generation and built-in **Swagger UI**
- **HTTP Transport**: delegate a CLI or MCP adapter to a remote RivetBench server with optional auto-spawn
- **Dynamic tool notifications**: signal clients when the tool list changes at runtime
- **Tool enrichers**: transform the tool list per-request based on session, transport, or app logic
- **REST ETag support**: conditional requests (`If-None-Match`) on the tool listing endpoint
- **Dependency injection**: typed custom context injected into every handler via the registry
- **Production-ready error handling** with specific error classes and consistent responses
- **Structured logging** with Pino (MCP stdio-compatible)

---

## Install

```bash
npm install @lordcraymen/rivetbench
```

Requires **Node.js >= 20**.

---

## Quick Start

### Define an endpoint

```ts
import { z } from 'zod';
import { makeEndpoint } from '@lordcraymen/rivetbench';

export const echo = makeEndpoint({
  name: 'echo',
  summary: 'Echo a message',
  input:  z.object({ message: z.string() }),
  output: z.object({ echoed:  z.string() }),
  handler: async ({ input }) => ({ echoed: input.message }),
});
```

### Expose via REST + MCP + CLI

```ts
import {
  InMemoryEndpointRegistry,
  createRestServer,
  createCli,
  loadConfig,
} from '@lordcraymen/rivetbench';
import { createMcpHandler } from '@lordcraymen/rivetbench/mcp';
import { echo } from './endpoints/echo.js';

const registry = new InMemoryEndpointRegistry();
registry.register(echo);
const config = loadConfig();

// REST server (Swagger UI at http://localhost:3000/docs)
const rest = await createRestServer({ registry, config });
await rest.start();

// MCP handler (attach to your MCP transport)
const mcp = createMcpHandler({ registry, config });

// CLI
const cli = createCli({ registry, config });
await cli.run(process.argv.slice(2));
```

---

## Core Concepts

### Endpoint definition

```ts
import { makeEndpoint } from '@lordcraymen/rivetbench';

const greet = makeEndpoint({
  name: 'greet',            // unique name — REST route, MCP tool, CLI command
  summary: 'Greet a user',  // shown in OpenAPI, MCP tool list, and CLI help
  description: 'Optional longer description',
  input:  z.object({ name: z.string() }),
  output: z.object({ greeting: z.string() }),
  handler: async ({ input, config, ctx }) => ({ greeting: `Hello, ${input.name}!` }),
});
```

### Registry

```ts
import { InMemoryEndpointRegistry } from '@lordcraymen/rivetbench';

const registry = new InMemoryEndpointRegistry();
registry.register(greet);
registry.get('greet');
registry.list();
registry.listEnriched({ transportType: 'rest' });

registry.setContextFactory(() => ({ db: dbPool }));
registry.setToolEnricher((tools, ctx) => tools);
registry.signalToolsChanged();
registry.onToolsChanged(() => {});
// registry.etag    — current ETag string
// registry.version — monotonic version counter
```

### Dependency Injection

```ts
interface AppCtx { db: DatabasePool; }

const getUser = makeEndpoint<typeof Input, typeof Output, AppCtx>({
  name: 'get-user',
  summary: 'Get a user by id',
  input:  z.object({ id: z.string() }),
  output: z.object({ name: z.string() }),
  handler: async ({ input, ctx }) => ctx.db.findUser(input.id),
  //                          ^^^ fully typed as AppCtx
});

registry.setContextFactory(() => ({ db: dbPool }));
```

### Dynamic Tool Notifications

Signal connected clients when endpoint availability changes:

```ts
registry.signalToolsChanged();
```

| Transport | Mechanism |
|-----------|-----------|
| **MCP**   | `notifications/tools/list_changed` sent to all active sessions |
| **REST**  | `ETag` on `GET /tools`; clients use `If-None-Match` |
| **CLI**   | Each invocation always reads the current list (stateless) |

### Tool Enrichers

```ts
registry.setToolEnricher((tools, context) => {
  if (context.transportType === 'rest') {
    return tools.filter(t => !t.name.startsWith('internal-'));
  }
  return tools;
});
```

---

## HTTP Transport

`createHttpTransport` returns a `TransportPort` that delegates invocations to a running RivetBench REST server over HTTP. No external dependencies — uses `node:net` and the global `fetch` API.

```ts
import { createHttpTransport } from '@lordcraymen/rivetbench/http-transport';
```

**Remote-only** (server already running):
```ts
const transport = createHttpTransport({ url: 'http://localhost:3000' });
```

**Auto-spawn** (start the server process if the port is not open on first use):
```ts
import { spawn } from 'node:child_process';

const transport = createHttpTransport({
  url: 'http://localhost:3000',
  spawn: () => spawn('node', ['dist/server.js']),
  spawnTimeoutMs: 15_000, // default
  pollIntervalMs: 200,    // default
});
```

**Use with CLI** (stateful server with runtime-generated CLI):
```ts
import { createCli, loadConfig, InMemoryEndpointRegistry } from '@lordcraymen/rivetbench';
import { createHttpTransport } from '@lordcraymen/rivetbench/http-transport';
import { spawn } from 'node:child_process';

const transport = createHttpTransport({
  url: 'http://localhost:3000',
  spawn: () => spawn('node', ['dist/server.js']),
});

const cli = createCli({ registry, config, transport });
await cli.run(process.argv.slice(2));
```

`Symbol.dispose` is implemented — using `using` or an explicit `.dispose()` kills the spawned child process on cleanup.

---

## CLI

```bash
# List registered endpoints
rivetbench list

# Call with named parameters
rivetbench call echo -message "Hello World"

# Automatic type parsing for numbers and booleans
rivetbench call myfunc -count 42 -enabled true

# JSON input for complex objects
rivetbench call complexFunc --params-json '{"config": {"timeout": 30}}'

# Raw output — extracts single-property values for scripting
rivetbench call uppercase -text "world" --raw
# Output: WORLD
```

> CLI flags use `--` (double dash); endpoint parameters use `-` (single dash) to avoid collisions.

---

## Sub-path Exports

| Import path | Contents |
|-------------|----------|
| `@lordcraymen/rivetbench` | Full bundle — all adapters |
| `@lordcraymen/rivetbench/core` | `makeEndpoint`, `InMemoryEndpointRegistry`, error classes (no transport deps) |
| `@lordcraymen/rivetbench/fastify` | `createRestServer`, `rivetBenchPlugin` |
| `@lordcraymen/rivetbench/rest` | `createRestHandler` (framework-agnostic) |
| `@lordcraymen/rivetbench/mcp` | `createMcpHandler`, `mcpOpenApiPaths` |
| `@lordcraymen/rivetbench/cli` | `createCli` |
| `@lordcraymen/rivetbench/openapi` | `buildOpenApiDocument` |
| `@lordcraymen/rivetbench/pino` | `createLogger`, `createPinoLoggerPort` |
| `@lordcraymen/rivetbench/http-transport` | `createHttpTransport` |

---

## Configuration

`loadConfig(overrides?)` reads environment variables and deep-merges optional programmatic overrides:

```ts
const config = loadConfig({ rest: { port: 4000 } });
```

| Env var | Default | Description |
|---------|---------|-------------|
| `RIVETBENCH_REST_HOST` | `0.0.0.0` | REST listen host |
| `RIVETBENCH_REST_PORT` | `3000` | REST listen port |
| `RIVETBENCH_MCP_TRANSPORT` | `stdio` | `stdio` or `tcp` |
| `RIVETBENCH_MCP_PORT` | `3001` | MCP TCP port |
| `RIVETBENCH_APP_NAME` | `rivetbench` | Application name |
| `RIVETBENCH_APP_VERSION` | `1.0.0` | Application version |
| `RIVETBENCH_LOG_LEVEL` | `info` | Pino log level |
| `RIVETBENCH_LOG_PRETTY` | `false` | Pretty-print logs |
| `NODE_ENV` | `development` | Sets `environment` field |

---

## Benchmark

In-process vs HTTP server adapters (20 concurrent requests per iteration, unique payloads, response-validated):

| Transport | ops/sec |
|-----------|--------:|
| In-process | ~3,595 |
| Koa | ~101 |
| Fastify | ~88 |
| Hono | ~79 |
| Node `http` | ~70 |
| Express | ~62 |

Run: `npm run bench`

---

## Transports at a Glance

| Capability | REST | MCP | CLI |
|---|---|---|---|
| Input validation (Zod) | ✅ | ✅ | ✅ |
| Output validation (Zod) | ✅ | ✅ | ✅ |
| Request ID tracing | ✅ | ✅ | ✅ |
| Error handling | Structured JSON | Structured JSON | Stderr + exit code |
| Tool discovery | `GET /tools`, OpenAPI | `tools/list` | `rivetbench list` |
| Change notification | ETag / `If-None-Match` | `notifications/tools/list_changed` | N/A (stateless) |
| Tool enricher | ✅ | ✅ | ✅ |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         Adapters                             │
│  REST (Fastify)  │  MCP Handler  │  CLI  │  HTTP Transport  │
└──────────┬───────────────┬────────────────────────┬──────────┘
           │               │                        │
┌──────────▼───────────────▼────────────────────────▼──────────┐
│                     Application Layer                         │
│         invokeEndpoint · listEndpoints · createTransportPort  │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                       Domain Layer                            │
│     makeEndpoint · InMemoryEndpointRegistry · Errors         │
└──────────────────────────────────────────────────────────────┘
         ↑                                       ↑
   TransportPort                            LoggerPort
  (ports/transport)                       (ports/logger)
```

Hexagonal architecture (ADR-0001). Domain has zero framework dependencies. Adapters depend on domain types — never the reverse. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## RPC-over-REST semantics

- **POST-only**: every call is `POST /rpc/:name`
- **Stateless**: all data comes from the request body; no server session
- **Opaque handler**: only the Zod input/output are published; implementation never leaks
- **OpenAPI**: each endpoint becomes `POST /rpc/{name}` with request body = input schema
- **MCP parity**: same definition becomes an MCP tool with matching JSON Schema

---

## License

MIT
