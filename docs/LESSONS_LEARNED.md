# Lessons Learned

Update this file after every feature or refactor. Remove entries that are no longer relevant.

---

## March 2026 — Hexagonal Refactor (Phase 5: Shim Removal & DI Cleanup)

### Re-export shims served their purpose, then delete them

Shims (`src/server/`, `src/core/`, `src/cli/`) enabled a safe incremental migration. Once all imports pointed to `adapters/`, removing them was one `rm` command with zero test failures. Don't keep compatibility shims longer than one phase.

### Test helper for logger DI avoids coupling tests to Pino

Tests need a `PinoLogger` for Fastify internals but don't need actual output. A `test/helpers/test-logger.ts` with `createTestLogger()` (silent Pino) and `noopLoggerPort` keeps tests fast and decoupled. Prefer a shared test helper over duplicating logger setup in every test file.

### ESLint `no-restricted-imports` enforces hexagonal boundaries without plugins

Using `overrides` with `no-restricted-imports` per directory is enough to enforce the dependency rule (`domain/ → no adapters`). No need for `eslint-plugin-import` or similar — the built-in rule works with glob patterns.

---

## March 2026 — Hexagonal Refactor (Phase 4: Adapter Relocation)

### Composition root eliminates isMainModule hacks

Each adapter had `isMainModule` blocks with dynamic imports for self-starting. Moving bootstrap to `src/composition/standalone.ts` centralizes wiring and removes side effects from adapter modules.

### formatOutput should be exported from the adapter

The CLI's `formatOutput` was a private function that `format-output.test.ts` had to duplicate. Making it a named export from `adapters/cli/adapter.ts` enables direct testing.

---

## March 2026 — Hexagonal Refactor Planning

### Duplicated orchestration is the root cause

The validate → invoke → validate pipeline was copy-pasted across REST, MCP, and CLI. Extracting an application service (`invokeEndpoint`) eliminates divergence.

### Logger belongs behind a port interface

`core/logger.ts` directly depended on Pino. A `LoggerPort` interface lets each adapter bring its own logger while the application service stays decoupled.

---

## Maintenance

- Remove entries older than 6 months unless they describe a recurring issue
- Keep this file under 100 lines
- Focus on *why* decisions were made, not *what* was done
