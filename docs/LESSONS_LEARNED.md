# Lessons Learned

Update this file after every feature or refactor. Remove entries that are no longer relevant.

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
