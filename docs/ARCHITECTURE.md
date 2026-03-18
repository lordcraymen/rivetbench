# RivetBench Architecture — Hexagonal (Ports & Adapters)

This document describes the **target architecture** for RivetBench following hexagonal principles. It supersedes the previous layered architecture from v0.3.0 (see git tag `v0.3.0` / commit `2cb15ca`).

## Overview

RivetBench adopts a **hexagonal architecture** (also known as *Ports & Adapters*) to decouple business logic from infrastructure. The key principle: **the domain never depends on the outside world — the outside world depends on the domain**.

```
                    ┌─────────────────────────────────────────────┐
                    │              Composition Root                │
                    │  (wires ports to adapters at startup)        │
                    └──────┬──────────────┬──────────────┬────────┘
                           │              │              │
              ┌────────────▼──┐   ┌───────▼───────┐  ┌──▼─────────────┐
              │  Fastify       │   │  MCP SDK       │  │  CLI            │
              │  Adapter       │   │  Handler       │  │  Adapter        │
              │  (REST + MCP)  │   │  (driven)      │  │  (driven)       │
              └────────┬───────┘   └───────┬───────┘  └──┬──────────────┘
                       │                   │              │
              ─────────▼───────────────────▼──────────────▼──────────────
              │              PORT: TransportPort                         │
              │  invoke(name, rawInput) → Result                        │
              ──────────────────────────┬────────────────────────────────
                                        │
                          ┌─────────────▼──────────────┐
                          │    Application Service      │
                          │    invokeEndpoint()         │
                          │    listEndpoints()          │
                          └─────────────┬──────────────┘
                                        │
                          ┌─────────────▼──────────────┐
                          │         Domain              │
                          │  EndpointDefinition         │
                          │  EndpointRegistry           │
                          │  Zod schemas                │
                          │  Error classes              │
                          └─────────────┬──────────────┘
                                        │
              ──────────────────────────┬────────────────────────────────
              │           PORT: LoggerPort                               │
              │  info() / warn() / error()                               │
              ──────────────────────────┬────────────────────────────────
                                        │
                          ┌─────────────▼──────────────┐
                          │    Pino Adapter              │
                          │    (implements LoggerPort)   │
                          └────────────────────────────┘
```

## Layers

### 1. Domain (`src/domain/`)

Pure business logic with **zero infrastructure dependencies**. This layer defines *what* an endpoint is and how endpoints are organised, but knows nothing about HTTP, MCP, or CLI.

| Module | Responsibility |
|--------|---------------|
| `endpoint.ts` | `EndpointDefinition`, `makeEndpoint()`, Zod schema types |
| `registry.ts` | `EndpointRegistry` interface, `InMemoryEndpointRegistry` |
| `errors.ts` | `RivetBenchError` hierarchy (domain errors only) |

**Rules**:
- No `import` from `adapters/`, `application/`, or `ports/` is allowed
- No Node.js built-ins except `crypto` (for UUIDs)
- All types are defined here; other layers depend on these types

### 2. Application (`src/application/`)

Use cases that orchestrate domain objects. This is the **single place** where the validate → invoke → validate pipeline lives. All transports call into this layer instead of reimplementing the flow.

| Module | Responsibility |
|--------|---------------|
| `invoke-endpoint.ts` | Resolve endpoint, validate input, call handler, validate output |
| `list-endpoints.ts` | List and enrich endpoints for a given transport context |

**The critical abstraction** — today this pipeline is duplicated across REST, MCP, and CLI:

```typescript
// Before: duplicated in rest.ts, mcp.ts, cli/index.ts
const parsedInput = endpoint.input.safeParse(rawInput);
const result = await endpoint.handler({ input: parsedInput.data, config: { requestId }, ctx });
const output = endpoint.output.parse(result);

// After: single application service
export async function invokeEndpoint(
  registry: EndpointRegistry,
  name: string,
  rawInput: unknown,
  logger: LoggerPort,
): Promise<InvocationResult> {
  const endpoint = registry.get(name);
  if (!endpoint) throw new EndpointNotFoundError(name);

  const requestId = crypto.randomUUID();
  const parsed = endpoint.input.safeParse(rawInput);
  if (!parsed.success) {
    throw new ValidationError('Invalid endpoint input', {
      endpoint: name,
      issues: parsed.error.format(),
    });
  }

  const result = await endpoint.handler({
    input: parsed.data,
    config: { requestId },
    ctx: registry.createContext(),
  });

  return {
    requestId,
    output: endpoint.output.parse(result),
  };
}
```

### 3. Ports (`src/ports/`)

Interfaces that define the **contract** between the application core and the outside world. Ports are split into two categories:

**Driving ports** (primary — the outside world calls *in*):
- `TransportPort` — how a transport adapter invokes an endpoint

**Driven ports** (secondary — the core calls *out*):
- `LoggerPort` — structured logging interface
- `ContextFactory` — user-provided context for handler injection

```typescript
// src/ports/logger.ts
export interface LoggerPort {
  info(msg: string, context?: Record<string, unknown>): void;
  warn(msg: string, context?: Record<string, unknown>): void;
  error(msg: string, context?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): LoggerPort;
}
```

### 4. Adapters (`src/adapters/`)

Infrastructure implementations of ports. Each adapter is a **plugin** — you can swap Fastify for Express without touching domain or application code.

| Adapter | Port | Framework |
|---------|------|-----------|
| `adapters/fastify/` | TransportPort (driving) | Fastify (REST + MCP) |
| `adapters/express/` | TransportPort (driving) | Express *(future)* |
| `adapters/mcp/` | TransportPort (driving) | @modelcontextprotocol/sdk |
| `adapters/cli/` | TransportPort (driving) | Node.js process |
| `adapters/pino/` | LoggerPort (driven) | Pino |

**Key design**: adapters do **not** own server lifecycle. They produce middleware/handlers that can be mounted on an existing server:

```typescript
// Standalone (current behavior)
const app = Fastify();
registerRivetBenchRoutes(app, { registry, logger });
await app.listen({ port: 3000 });

// Embedded in existing Express app
const app = express();
app.use('/api', createRivetBenchExpressRouter({ registry, logger }));
app.listen(3000);

// MCP mounted on existing Fastify server (current behavior)
const app = Fastify();
await app.register(rivetBenchPlugin, { registry, logger }); // REST + MCP at /mcp
```

### 5. Composition Root (`src/composition/`)

The only place where concrete implementations are wired together. No business logic lives here.

```typescript
// src/composition/standalone.ts
import { loadConfig } from '../config/index.js';
import { createDefaultRegistry } from '../endpoints/index.js';
import { createPinoLogger } from '../adapters/pino/logger.js';
import { createFastifyServer } from '../adapters/fastify/server.js';

const config = loadConfig();
const logger = createPinoLogger(config);
const registry = createDefaultRegistry();

const server = createFastifyServer({ registry, config, logger });
await server.start();
```

### 6. Config (`src/config/`)

Configuration loading from environment variables. Sits outside the hexagon — consumed by the composition root and passed down as parameters.

### 7. Endpoints (`src/endpoints/`)

User-defined endpoint implementations. These are pure domain objects — they import only from `src/domain/` and `zod`.

---

## Target Directory Structure

```
src/
├── domain/                    # Inner hexagon — pure business logic
│   ├── endpoint.ts            # EndpointDefinition, makeEndpoint()
│   ├── registry.ts            # EndpointRegistry interface + InMemoryEndpointRegistry
│   └── errors.ts              # RivetBenchError hierarchy
│
├── application/               # Use cases — orchestration layer
│   ├── invoke-endpoint.ts     # validate → call → validate pipeline
│   ├── list-endpoints.ts      # list + enrich endpoints
│   └── create-transport-port.ts # Factory wiring app services → TransportPort
│
├── ports/                     # Port interfaces
│   ├── logger.ts              # LoggerPort interface
│   └── transport.ts           # TransportPort interface (driving port)
│
├── adapters/                  # Infrastructure implementations
│   ├── fastify/               # Fastify REST adapter
│   │   ├── server.ts          # createFastifyServer()
│   │   ├── error-handler.ts   # Fastify-specific error mapping
│   │   └── openapi.ts         # OpenAPI generation (Fastify-specific)
│   ├── mcp/                   # MCP SDK adapter (mounted on Fastify at /mcp)
│   │   └── handler.ts         # createMcpHandler()
│   ├── cli/                   # CLI adapter
│   │   ├── adapter.ts         # createCli()
│   │   └── arg-parser.ts      # CLI argument parsing
│   └── pino/                  # Pino logger adapter
│       └── logger.ts          # createPinoLogger() implements LoggerPort
│
├── config/                    # Configuration loading
│   └── index.ts               # loadConfig()
│
├── composition/               # Wiring / entry points
│   └── standalone.ts          # Full standalone server
│
├── endpoints/                 # User-defined endpoints
│   ├── index.ts               # createDefaultRegistry()
│   ├── echo.ts
│   ├── uppercase.ts
│   └── myfunc.ts
│
├── index.ts                   # Public API exports
└── core.ts                    # Lightweight sub-export (domain only)
```

## Dependency Rule

Dependencies flow **inward only**:

```
adapters → ports → application → domain
                                   ↑
composition ────────────────────────┘ (wires everything)
config ─────────────────────────────┘ (read at composition time)
```

**Forbidden**:
- `domain/` importing from `application/`, `ports/`, `adapters/`, or `config/`
- `application/` importing from `adapters/`
- `ports/` importing from `adapters/`

**Allowed**:
- `adapters/` importing from `ports/`, `application/`, `domain/`
- `application/` importing from `domain/`, `ports/`
- `composition/` importing from everything (it's the wiring layer)

## SOLID Principles (Hexagonal Edition)

### SRP — Single Responsibility
Each layer has one job: domain defines contracts, application orchestrates, ports declare interfaces, adapters implement infrastructure.

### OCP — Open/Closed
Adding a new transport (e.g. gRPC) means adding a new adapter — no changes to domain or application.

### LSP — Liskov Substitution
Any adapter implementing `LoggerPort` can replace Pino without breaking the application service.

### ISP — Interface Segregation
`LoggerPort` is a minimal interface. Transports implement only what they need.

### DIP — Dependency Inversion
The application service depends on `LoggerPort` (abstraction), not on Pino (concrete). The composition root wires the concrete to the abstract.

## Migration Path (Complete)

All migration steps have been completed across Phases 1–7:

1. ~~Extract application service~~ — `src/application/invoke-endpoint.ts` + `list-endpoints.ts` ✅
2. ~~Extract logger port~~ — `LoggerPort` in `src/ports/logger.ts`, Pino adapter ✅
3. ~~Move domain types~~ — `src/domain/{endpoint,registry,errors}.ts` ✅
4. ~~Relocate adapters~~ — `src/adapters/{fastify,fastmcp,cli,pino}/` ✅
5. ~~Extract composition root~~ — `src/composition/standalone.ts` ✅
6. ~~Decouple error handler~~ — `adapters/fastify/error-handler.ts` uses `LoggerPort` ✅
7. ~~Move OpenAPI~~ — `adapters/fastify/openapi.ts` ✅
8. ~~TransportPort driving interface~~ — `src/ports/transport.ts` + plugin pattern for all adapters ✅
9. ~~CLI arg-parser extraction~~ — `src/adapters/cli/arg-parser.ts` (ADR-0009) ✅
10. ~~Replace FastMCP with MCP SDK~~ — `src/adapters/mcp/handler.ts`, unified server serves REST + MCP (ADR-0005) ✅
