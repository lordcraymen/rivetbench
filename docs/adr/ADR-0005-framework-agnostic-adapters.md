---
title: "ADR-0005: Framework-Agnostic Transport Adapters"
date: "2026-03-18"
status: accepted
tags:
  - architecture
  - hexagonal
  - adapters
  - middleware
  - embedding
modules:
  - src/adapters/
summary: >-
  Transport adapters produce mountable handlers rather than owning server lifecycle, enabling RivetBench to be embedded in existing Express, Hono, or Fastify applications.
supersedes:
  - "LEGACY-ADR-0001 (Dual Transport Architecture — infrastructure ownership)"
---

# Context

In the pre-hexagonal codebase:

- `createRestServer()` created and owned a Fastify instance. Users could access `server.fastify` but routes were already bound. There was no way to get the route handlers as middleware for an existing Express server.
- `createMcpServer()` created and owned a FastMCP instance. The transport choice (stdio/httpStream) was baked in at startup. Users couldn't mount `/mcp` on an existing HTTP server.
- Both adapters mixed "create infrastructure" with "register routes" with "start listening" in one function.

This prevented a common use case: embedding RivetBench in an existing application that already has its own HTTP server.

# Decision

**Adapters produce handlers/middleware. They do not own server lifecycle.**

### REST Adapter (Fastify)

```typescript
// Creates a Fastify plugin — can be registered on any Fastify instance
export function rivetBenchFastifyPlugin(
  fastify: FastifyInstance,
  options: { registry: EndpointRegistry; logger: LoggerPort },
): void {
  // Register /health, /tools, /rpc/:name routes on the passed-in instance
}

// Convenience: standalone server (creates its own Fastify)
export async function createStandaloneFastifyServer(options: ServerOptions) {
  const fastify = Fastify({ ... });
  rivetBenchFastifyPlugin(fastify, options);
  return fastify;
}
```

### MCP Adapter (FastMCP)

```typescript
// Creates tool registrations — can be attached to any FastMCP instance
export function registerMcpTools(
  mcp: FastMCP,
  options: { registry: EndpointRegistry; logger: LoggerPort },
): void {
  // Register tools on the passed-in FastMCP instance
}

// Convenience: standalone MCP server
export function createStandaloneMcpServer(options: McpServerOptions): McpServerHandle {
  const mcp = new FastMCP({ ... });
  registerMcpTools(mcp, options);
  return { start, stop, server: mcp };
}
```

### CLI Adapter

Already decoupled — takes `{ registry, config, streams }` as injection. No changes needed beyond routing through the application service.

### Future: Express/Hono Adapter

```typescript
// Express middleware
export function createRivetBenchRouter(options: RouterOptions): express.Router {
  const router = express.Router();
  router.post('/rpc/:name', async (req, res) => {
    const result = await invokeEndpoint(options.registry, req.params.name, req.body, options.logger);
    res.json(result.output);
  });
  return router;
}
```

# Consequences

**Positive**:
- Users can embed RivetBench routes in their existing server
- Server lifecycle (listen, shutdown) is the user's responsibility, not ours
- Standalone convenience wrappers still available for quick-start use cases
- New HTTP framework support requires only a thin adapter (~30 lines)

**Negative**:
- Adapter API changes from `createRestServer()` (returns server) to plugin/middleware pattern
- Users who relied on `server.fastify` may need to adapt
- Testing framework-specific adapters requires framework-specific test harnesses

# References

- [ADR-0001: Hexagonal Architecture](./ADR-0001-hexagonal-architecture.md)
- [ADR-0002: Application Service Layer](./ADR-0002-application-service-layer.md) — adapters delegate here
