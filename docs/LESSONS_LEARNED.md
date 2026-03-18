# Lessons Learned

Update this file after every feature or refactor. Remove entries that are no longer relevant.

---

## March 2026 — Phase 8: Decouple REST from Fastify

### OpenAPI generation is application-level, not adapter-level

The OpenAPI spec describes the endpoint surface in a standard format — the same role MCP plays for LLMs. It depends only on domain types (`AnyEndpointDefinition`) and belongs in `application/openapi.ts`, not inside a framework adapter.

### REST handler follows the same pattern as MCP handler

`createRestHandler()` returns a `handleRequest(req, res, body?)` that works on raw `IncomingMessage`/`ServerResponse`. Fastify delegates via `reply.hijack()`. An Express adapter would just call `handler.handleRequest(req, res, req.body)` — zero adaptation needed.

---

## March 2026 — Phase 7: Unified Server (MCP SDK)

### FastMCP owns its HTTP server — can't embed it

FastMCP (via `mcp-proxy`) calls `http.createServer()` + `.listen()` internally. To mount MCP as a sub-route on an existing server, use `@modelcontextprotocol/sdk` directly with `StreamableHTTPServerTransport`.

### MCP SDK requires per-session server instances

Each MCP session needs its own `McpServer` + `StreamableHTTPServerTransport` pair. Track sessions in a `Map<sessionId, {server, transport}>` and clean up on `transport.onclose`.

### Fastify `reply.hijack()` delegates to raw Node.js streams

`reply.hijack()` tells Fastify to stop managing the response. The MCP transport then writes directly to `reply.raw` (a Node.js `ServerResponse`). Works correctly with `fastify.inject()` for testing.

### MCP SDK Accept header is strict

The SDK requires both `application/json` AND `text/event-stream` in the Accept header. Returns 406 otherwise — even `*/*` doesn't satisfy it. Always responds with SSE format.

---

## March 2026 — Hexagonal Refactor (Phase 6: TransportPort & Plugin Pattern)

### Port types must be self-contained to satisfy lint boundaries

`src/ports/transport.ts` initially imported result types from `application/`. ESLint's `no-restricted-imports` rightly blocked this — ports can't depend on application. Define equivalent types inline in the port; TypeScript structural typing ensures the application implementation still satisfies the interface.

### Plugin pattern decouples adapter from server lifecycle

Exposing `rivetBenchPlugin(fastify, opts)` and `registerMcpTools(mcp, opts)` lets consumers embed RivetBench in their own Fastify/MCP instances. The convenience `createRestServer()` / `createMcpServer()` wrappers are just thin composition sugar on top.

### Fastify generic mismatch requires AnyFastifyInstance

`Fastify({ loggerInstance: pinoLogger })` returns a specialized generic that isn't assignable to the base `FastifyInstance`. Using `FastifyInstance<any, any, any, any>` (aliased as `AnyFastifyInstance`) avoids the type mismatch without losing runtime safety.

### ESLint `no-restricted-imports` enforces hexagonal boundaries without plugins

Using `overrides` with `no-restricted-imports` per directory is enough to enforce the dependency rule. No need for `eslint-plugin-import` — the built-in rule works with glob patterns.

---

## March 2026 — Hexagonal Refactor (Phases 1–5)

### Duplicated orchestration is the root cause

The validate → invoke → validate pipeline was copy-pasted across REST, MCP, and CLI. Extracting an application service (`invokeEndpoint`) eliminates divergence.

### Composition root eliminates isMainModule hacks

Each adapter had `isMainModule` blocks with dynamic imports for self-starting. Moving bootstrap to `src/composition/standalone.ts` centralizes wiring and removes side effects from adapter modules.

### Logger belongs behind a port interface

A `LoggerPort` interface lets each adapter bring its own logger while the application service stays decoupled. A shared `test/helpers/test-logger.ts` avoids coupling tests to Pino.

---

## Maintenance

- Remove entries older than 6 months unless they describe a recurring issue
- Keep this file under 100 lines
- Focus on *why* decisions were made, not *what* was done
