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

