# Lessons Learned

Update this file after every feature or refactor. Remove entries that are no longer relevant.

---

## March 2026 — Stdio Facade Shutdown: Wait for Child Exit

### `process.exit()` after `child.kill()` is a race condition

Sending SIGTERM to a child process and immediately calling `process.exit(0)` races: the parent exits before the child processes the signal. The child keeps running, holding the port open. Fix: listen for the child's `exit` event *before* sending SIGTERM, and only call `process.exit()` in the handler. Add a SIGKILL timeout to prevent hangs.

### Re-entrant shutdown guards prevent double-exit

Signal handlers (SIGINT, SIGTERM, stdin `end`/`close`) can fire concurrently. Without a `shuttingDown` guard, the shutdown path executes multiple times — potentially sending duplicate signals or calling `process.exit()` with conflicting codes.

### Composition roots need graceful shutdown too

`standalone.ts` had no signal handling — Node.js default terminates the process without running Fastify's `onClose` hooks, leaving MCP sessions and TCP ports unclean. Always register SIGINT/SIGTERM in scripts that own long-running servers.

---

## v0.9.0 — Sub-path Exports, Test Co-location & CLI Cold Start

### Sub-path exports enable tree-shaking without a monorepo

Adding `"./fastify"`, `"./rest"`, `"./mcp"`, `"./cli"`, `"./openapi"`, `"./pino"` to `package.json` exports lets consumers import only what they need. Combined with `"sideEffects": false`, bundlers can tree-shake unused adapters. This avoids premature monorepo complexity — split into packages at v1.0 if needed.

### Co-locating tests with source simplifies future package splits

Moving unit tests next to their source files (`src/domain/endpoint.test.ts` alongside `src/domain/endpoint.ts`) means each directory is self-contained and can be extracted into a separate package without hunting for tests in a mirror tree. BDD features stay in `test/features/` since they span multiple modules.

### CLI cold start is tsx overhead, not module loading

Measured ~850ms via `npx tsx` vs ~89ms via compiled `node dist/`. The lazy dynamic import pattern in the CLI adapter was already correct — no heavy deps (Fastify/Pino/MCP SDK) loaded at startup. The 10x overhead is tsx's JIT TypeScript transpilation. For production CLI usage, recommend running the compiled JS directly.

---

## March 2026 — Phase 9: Unified OpenAPI Topology + Express Integration

### OpenAPI describes HTTP surface topology, not protocol internals

The OpenAPI doc describes what URLs the server responds to and how.  `/mcp` is a topology entry — POST/GET/DELETE — just like a file server endpoint would be.  Individual MCP tools are discoverable through the MCP protocol (`tools/list`), not enumerated in OpenAPI.  A description note links the two surfaces.

### `basePath` keeps OpenAPI paths honest when mounted at a sub-path

When `app.use('/api', handler)` strips the prefix, the handler doesn't know its public URL.  A `basePath` option ensures `/api/rpc/echo` appears in the doc, not `/rpc/echo`.

### Express `app.use()` strips the mount prefix from `req.url`

Express rewrites `req.url` to remove the mount path.  The REST handler parses `req.url` internally, so `/api/rpc/echo` becomes `/rpc/echo` — no handler changes needed.  This is the intended Express behavior and the reason the framework-agnostic handler works without adaptation.

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
