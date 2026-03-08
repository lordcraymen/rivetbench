# RivetBench

**RivetBench** is a lightweight TypeScript framework for building **triple‑exposed endpoints** that work over **REST**, **MCP (Model Context Protocol)**, and a **runtime‑generated CLI** — with **OpenAPI 3** documentation generated automatically.

Write an endpoint once — expose it everywhere.

---

## Features

* Unified endpoint definitions with **Zod** schemas for validation and typing
* **Three transports from one definition**: REST routes, MCP tools, and CLI commands
* **RPC over REST**: POST-only routes that dispatch by endpoint name (no resource modeling)
* **Runtime‑generated CLI** with named parameters, JSON input, and raw/JSON output modes
* Automatic generation of **OpenAPI 3** specs and built‑in **Swagger UI**
* **Dynamic tool notifications**: signal clients when the tool list changes at runtime
* **Tool enrichers**: transform the tool list per‑request based on session, transport, or app logic
* **REST ETag support**: conditional requests (`If-None-Match`) on the tool listing endpoint
* Type‑safe handlers shared across all transports
* **Production-ready error handling** with custom error classes and consistent responses
* **Structured logging** with Pino (MCP stdio-compatible)

---

## Tech Stack

* **Node.js 20+** / **TypeScript**
* **Fastify** for REST APIs
* **fastmcp** for MCP
* **Zod** + **zod‑to‑openapi** for schema generation
* **Pino** for structured logging
* **Vitest** + **Cucumber** for testing

---

## Project Layout

```
rivetbench/
├─ src/
│  ├─ core/                # framework core (endpoint factory, openapi, registry)
│  ├─ server/              # rest + mcp servers
│  ├─ endpoints/           # your endpoints live here
│  └─ config/              # environment and startup settings
├─ test/
│  └─ sample.test.ts
├─ package.json
└─ README.md
```

---

## Example Endpoint (RPC style)

```ts
import { z } from "zod";
import { makeEndpoint } from "../core/endpoint";

const EchoInput = z.object({ message: z.string() });
const EchoOutput = z.object({ echoed: z.string() });

export default makeEndpoint({
  name: "echo",
  summary: "Echo a message",
  input: EchoInput,
  output: EchoOutput,
  // handler is opaque; only input/output are exposed in MCP & OpenAPI
  handler: async ({ input }) => ({ echoed: input.message })
});
```

---

## Quick Start

```bash
npm install
npm run dev:rest     # Start REST + Swagger on :3000
npm run dev:mcp      # Start MCP server (stdio transport)
npm run dev:cli      # Launch the runtime-generated CLI
```

### REST Server
Swagger UI → [http://localhost:3000/docs](http://localhost:3000/docs)

### MCP Server

**stdio transport (default)**:
```bash
npm run dev:mcp
```

**HTTP Stream transport (TCP)**:
```bash
RIVETBENCH_MCP_TRANSPORT=tcp RIVETBENCH_MCP_PORT=3001 npm run dev:mcp
```

The MCP server exposes all registered endpoints as MCP tools with automatic schema validation.

### CLI

The CLI inspects the endpoint registry at startup so that available commands always mirror the REST and MCP transports. It provides flexible input methods and output formatting:

#### Input Methods

**Named Parameters** (recommended for most use cases):
```bash
# String parameters
npm run dev:cli -- call echo -message "Hello World"

# Automatic type parsing for numbers and booleans  
npm run dev:cli -- call myfunc -count 42 -enabled true -rate 3.14

# JSON objects and arrays as parameter values
npm run dev:cli -- call complexFunc -config '{"timeout": 30}' -tags '["web", "api"]'
```

**JSON Input** (for complex nested objects):
```bash
npm run dev:cli -- call echo --params-json '{"message": "Hello World"}'
```

#### Output Formatting

**JSON Output** (default):
```bash
npm run dev:cli -- call echo -message "Hello"
# Output: {"echoed": "Hello"}
```

**Raw Output** (for scripting and simple values):
```bash
npm run dev:cli -- call echo -message "Hello" --raw
# Output: Hello

npm run dev:cli -- call uppercase -text "world" --raw
# Output: WORLD
```

Raw output automatically extracts simple values from single-property objects. Complex objects fall back to JSON formatting even in raw mode.

**Note**: CLI flags use double dashes (`--`) and endpoint parameters use single dash (`-`) to avoid naming collisions.

#### Basic Commands

```bash
# List registered endpoints
npm run dev:cli -- list

# Get help
npm run dev:cli -- --help  # Show detailed CLI usage and examples
npm run dev:cli            # Also shows help when no command provided
```

---

## Dynamic Tool Notifications

When your tool list changes at runtime (feature flags, RBAC, database‑driven endpoints), RivetBench can signal connected clients:

```ts
// Signal all transports that the tool list has changed
registry.signalToolsChanged();
```

| Transport | Notification mechanism |
|-----------|------------------------|
| **MCP**   | `notifications/tools/list_changed` sent to all active sessions automatically |
| **REST**  | `GET /tools` returns an `ETag`; clients use `If-None-Match` for cache validation |
| **CLI**   | Each invocation always sees the current tool list (no persistent session needed) |

### Tool Enrichers

Optionally transform the tool list before serving — filter, annotate, or rewrite based on per‑request context:

```ts
registry.setToolEnricher((tools, context) => {
  // context.transportType is 'rest' | 'mcp' | 'cli'
  // context.sessionId is available for MCP/REST
  if (context.transportType === 'rest') {
    return tools.filter(t => !t.name.startsWith('internal-'));
  }
  return tools;
});
```

---

## Programmatic Config Overrides

`loadConfig()` accepts an optional `DeepPartial<ServerConfig>` that is deep-merged on top of the env-var defaults. Overrides always win:

```ts
import { loadConfig } from '@lordcraymen/rivetbench';

// Default: reads env vars only
const cfg1 = loadConfig();

// Override application name and MCP transport — everything else stays default
const cfg2 = loadConfig({
  application: { name: 'my-app' },
  mcp: { transport: 'stdio' },
});
```

This is especially useful when embedding RivetBench as a library dependency, where env-var mutation is undesirable.

---

## Custom Handler Context (Dependency Injection)

Endpoints can receive a typed custom context object via the `ctx` field in &ZeroWidthSpace;`EndpointContext`. Register a context factory on the registry and all transports (REST, MCP, CLI) will call it automatically on every request:

```ts
import { z } from 'zod';
import { makeEndpoint, InMemoryEndpointRegistry } from '@lordcraymen/rivetbench';

// 1. Define your context type
interface AppCtx {
  db: DatabasePool;
  relay: RelayService;
}

// 2. Use it in endpoint definitions
const getState = makeEndpoint<
  typeof StateInput,
  typeof StateOutput,
  AppCtx
>({
  name: 'getState',
  summary: 'Get current state',
  input: StateInput,
  output: StateOutput,
  handler: async ({ input, ctx }) => ctx.relay.dispatch('getState'),
  //                       ^^^ fully typed as AppCtx
});

// 3. Wire up the factory at registry level
const registry = new InMemoryEndpointRegistry();
registry.register(getState);
registry.setContextFactory(() => ({
  db: dbPool,
  relay: relayInstance,
}));
```

Endpoints that don't need custom context work exactly as before — `ctx` defaults to `undefined` and can be ignored.

---

## API Reference

### `makeEndpoint(definition): EndpointDefinition`

Creates a type-safe endpoint definition. This is the primary entry point for defining endpoints that are automatically exposed via REST, MCP, and CLI.

```ts
import { makeEndpoint } from '@lordcraymen/rivetbench';
import { z } from 'zod';

const greet = makeEndpoint({
  name: 'greet',              // unique endpoint name
  summary: 'Greet a user',    // short description (used in OpenAPI + MCP)
  description: 'Optional longer description',
  input: z.object({ name: z.string() }),
  output: z.object({ greeting: z.string() }),
  handler: async ({ input, config, ctx }) => ({
    greeting: `Hello, ${input.name}!`,
  }),
});
```

**Type parameters:**
- `TInput` — Zod schema for the endpoint input
- `TOutput` — Zod schema for the endpoint output
- `TCtx` — Optional user-provided context type (defaults to `undefined`)

### `EndpointDefinition<TInput, TOutput, TCtx>`

The interface returned by `makeEndpoint`. Key fields:

| Field         | Type                                        | Description                     |
|---------------|---------------------------------------------|---------------------------------|
| `name`        | `string`                                    | Unique endpoint name            |
| `summary`     | `string`                                    | Short description               |
| `description` | `string?`                                   | Optional long description       |
| `input`       | `TInput` (Zod schema)                       | Input validation schema         |
| `output`      | `TOutput` (Zod schema)                      | Output validation schema        |
| `handler`     | `(ctx: EndpointContext) => Promise<TOutput>` | Async handler function          |

### `EndpointContext<TInput, TOutput, TCtx>`

The context object received by every endpoint handler:

| Field    | Type                    | Description                                         |
|----------|-------------------------|-----------------------------------------------------|
| `input`  | `z.infer<TInput>`       | Validated and parsed input data                     |
| `config` | `EndpointRuntimeConfig` | Runtime config (includes `requestId?: string`)      |
| `ctx`    | `TCtx`                  | User-provided custom context (`undefined` by default) |

### `InMemoryEndpointRegistry`

Default in-memory registry that stores endpoint definitions and manages tool lifecycle:

```ts
import { InMemoryEndpointRegistry } from '@lordcraymen/rivetbench';

const registry = new InMemoryEndpointRegistry();

registry.register(greet);             // register an endpoint
registry.get('greet');                // lookup by name
registry.list();                      // all registered endpoints
registry.listEnriched({ transportType: 'rest' }); // enriched tool list

registry.setContextFactory(() => ({   // DI: inject custom context
  db: dbPool,
}));
registry.setToolEnricher((tools, ctx) => tools); // per-request tool filtering
registry.signalToolsChanged();        // notify connected clients
registry.onToolsChanged(() => { });   // subscribe to changes
registry.etag;                        // current ETag string
registry.version;                     // monotonic version counter
```

### `loadConfig(overrides?): ServerConfig`

Loads configuration from environment variables, optionally deep-merged with programmatic overrides:

```ts
import { loadConfig } from '@lordcraymen/rivetbench';

const config = loadConfig();                          // env-var defaults only
const config2 = loadConfig({ rest: { port: 4000 } }); // override REST port
```

**`ServerConfig` shape:**
```ts
interface ServerConfig {
  rest:        { host: string; port: number };
  mcp:         { transport: 'stdio' | 'tcp'; port?: number };
  application: { name: string; version: string; description?: string };
  logging:     { level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'; pretty: boolean };
  environment: 'development' | 'production' | 'test';
}
```

### `createRestServer(options): Promise<{ fastify, start() }>`

Creates a Fastify-based REST server with Swagger UI, ETag caching, and error handling:

```ts
import { createRestServer, loadConfig, InMemoryEndpointRegistry } from '@lordcraymen/rivetbench';

const config = loadConfig();
const registry = new InMemoryEndpointRegistry();
registry.register(greet);

const server = await createRestServer({ registry, config });

// server.fastify — the underlying Fastify instance (for custom routes, plugins, etc.)
// server.start() — binds to config.rest.host:config.rest.port and returns the Fastify instance
await server.start();
```

**Options:** `{ registry: EndpointRegistry; config: ServerConfig }`  
**Returns:** `{ fastify: FastifyInstance; start(): Promise<FastifyInstance> }`

### `startMcpServer(options): Promise<FastMCP>`

Starts an MCP server exposing all registered endpoints as MCP tools:

```ts
import { startMcpServer, loadConfig, InMemoryEndpointRegistry } from '@lordcraymen/rivetbench';

const config = loadConfig({ mcp: { transport: 'stdio' } });
const registry = new InMemoryEndpointRegistry();
registry.register(greet);

const mcp = await startMcpServer({ registry, config });
```

**Options:** `{ registry: EndpointRegistry; config: ServerConfig }`  
**Returns:** `FastMCP` instance

### Complete Programmatic Embedding Example

```ts
import { z } from 'zod';
import {
  makeEndpoint,
  InMemoryEndpointRegistry,
  createRestServer,
  startMcpServer,
  loadConfig,
} from '@lordcraymen/rivetbench';

// 1. Define endpoints
const greet = makeEndpoint({
  name: 'greet',
  summary: 'Greet a user',
  input: z.object({ name: z.string() }),
  output: z.object({ greeting: z.string() }),
  handler: async ({ input }) => ({ greeting: `Hello, ${input.name}!` }),
});

// 2. Create registry and register endpoints
const registry = new InMemoryEndpointRegistry();
registry.register(greet);

// 3. Load config with programmatic overrides
const config = loadConfig({
  application: { name: 'my-app', version: '1.0.0' },
  rest: { port: 4000 },
});

// 4. Start REST server (Swagger UI at http://localhost:4000/docs)
const rest = await createRestServer({ registry, config });
await rest.start();

// 5. Optionally start MCP server alongside REST
const mcpConfig = loadConfig({
  ...config,
  mcp: { transport: 'tcp', port: 4001 },
});
await startMcpServer({ registry, config: mcpConfig });
```

### Sub-Export: `@lordcraymen/rivetbench/core`

For modules that only define endpoints, import from the lightweight `core` sub-export. This avoids pulling in Fastify, fastmcp, and Pino as transitive dependencies:

```ts
// Only imports endpoint factory, registry, and error classes — no transport deps
import { makeEndpoint, type EndpointDefinition } from '@lordcraymen/rivetbench/core';
```

**Included in `core`:** `makeEndpoint`, `EndpointDefinition`, `EndpointContext`, `EndpointHandler`, `AnyEndpointDefinition`, `EndpointRuntimeConfig`, `ContextFactory`, `EndpointRegistry`, `InMemoryEndpointRegistry`, `ToolEnricher`, `ToolEnricherContext`, `ToolsChangedListener`, and all error classes (`RivetBenchError`, `ValidationError`, `EndpointNotFoundError`, `InternalServerError`, `ConfigurationError`, `isRivetBenchError`, `toRivetBenchError`).

**NOT in `core`:** `createRestServer`, `startMcpServer`, `loadConfig`, `createLogger`, `createCli`.

---

## RPC‑over‑REST semantics

* **POST‑only**: Each call is `POST /rpc/:name` (default) or `POST /tools/:name`.
* **Stateless**: All data comes from the request body; no server session required.
* **Opaque handler**: Only the Zod input/output are published (MCP & OpenAPI). The implementation never leaks.
* **OpenAPI**: Paths are generated for each endpoint as `POST /rpc/{name}` with `requestBody` = input schema and response = output schema.
* **MCP parity**: The same definition becomes an MCP tool with matching input/output JSON Schema.

### Optional conventions

* **Idempotency**: Support `Idempotency-Key` header for safe retries of POST.
* **Long‑running jobs**: If needed, return an `operationId` in the output; a separate `status` endpoint/tool can be defined like any other RPC (kept optional).

---

## Documentation

- **[Development Workflow](WORKFLOW.md)** - Daily workflow, branch management, and best practices
- **[Error Handling & Logging](docs/ERROR_HANDLING.md)** - Error classes, logging configuration, and best practices
- **[MCP Implementation Guide](docs/MCP_GUIDE.md)** - Complete guide to MCP server usage, configuration, and integration
- **[BDD Testing Guide](docs/BDD_TESTING.md)** - Cucumber/BDD testing documentation and examples
- **[Contributing](CONTRIBUTING.md)** - Development workflow, branch strategy, and contribution guidelines
- **[Roadmap](ROADMAP.md)** - Feature plans and development priorities

---

## Transports at a Glance

| Capability | REST | MCP | CLI |
|---|---|---|---|
| Input validation (Zod) | Yes | Yes | Yes |
| Output validation (Zod) | Yes | Yes | Yes |
| Request ID tracing | Yes | Yes | Yes |
| Error handling | Structured JSON | Structured JSON | Stderr + exit code |
| Tool discovery | `GET /tools`, OpenAPI | `tools/list` | `rivetbench list` |
| Change notification | ETag / `If-None-Match` | `notifications/tools/list_changed` | N/A (stateless) |
| Tool enricher | Yes | Yes | Yes |

---

## License

MIT

---

**RivetBench** — forge and test your API connections.

