# Lessons Learned

Update this file after every feature or refactor. Remove entries that are no longer relevant.

---

## March 2026 — Hexagonal Refactor (Phase 4: Adapter Relocation)

### Re-export shims enable incremental migration

When moving files (e.g. `server/rest.ts` → `adapters/fastify/server.ts`), leaving a re-export in the old location prevents breaking external consumers. The old files are deprecated but functional. This let us move all files while keeping 155 tests + 51 BDD steps green throughout.

### Composition root eliminates isMainModule hacks

Each adapter had `isMainModule` blocks with dynamic imports for self-starting. Moving bootstrap to `src/composition/standalone.ts` centralizes wiring and removes side effects from adapter modules.

### formatOutput should be exported from the adapter

The CLI's `formatOutput` was a private function that `format-output.test.ts` had to duplicate. Making it a named export from `adapters/cli/adapter.ts` enables direct testing.

---

## March 2026 — Hexagonal Refactor Planning

### Duplicated orchestration is the root cause

The validate → invoke → validate pipeline was copy-pasted across REST (`rest.ts`), MCP (`mcp.ts`), and CLI (`cli/index.ts`). Each copy diverged slightly (REST uses Fastify's `request.id`, MCP generates its own UUID, CLI uses `randomUUID()`). Extracting an application service eliminates this.

### Error handler was coupled to Fastify

`core/error-handler.ts` imported `FastifyError`, `FastifyRequest`, `FastifyReply` — making it impossible to reuse for other HTTP frameworks. Error *mapping* belongs in the adapter, not the domain.

### OpenAPI generation is adapter-specific

`core/openapi.ts` generates REST-specific documentation. It should live in `adapters/fastify/`, not in the domain.

### Logger belongs behind a port interface

`core/logger.ts` directly depends on Pino. The MCP adapter can't use it (FastMCP has its own logging). A `LoggerPort` interface lets each adapter bring its own logger while the application service stays decoupled.

### CLI cold start is a real problem for heavy context factories

The CLI creates a fresh process, fresh registry, and fresh context for every invocation. For lightweight endpoints this is fine, but if `ContextFactory` initializes database pools or gRPC channels, the startup cost dominates execution time.

### Bug found: double handleCall in CLI

`cli/index.ts` line 167-168 calls `handleCall()` twice for every `call` command. This is a copy-paste bug.

---

## Maintenance

- Remove entries older than 6 months unless they describe a recurring issue
- Keep this file under 100 lines
- Focus on *why* decisions were made, not *what* was done
