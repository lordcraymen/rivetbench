---
title: "ADR-0006: Structured Error Handling"
date: "2026-03-18"
status: accepted
tags:
  - architecture
  - error-handling
  - domain
modules:
  - src/domain/errors.ts
  - src/adapters/
summary: >-
  Domain defines a RivetBenchError hierarchy for business errors. Adapters map these to transport-specific responses. No transport types in the domain.
supersedes:
  - "LEGACY-ADR-0006 (Structured Error Handling)"
---

# Context

The pre-hexagonal codebase had the right error hierarchy (`RivetBenchError`, `ValidationError`, `EndpointNotFoundError`, etc.) but the error *handler* in `core/error-handler.ts` was coupled to Fastify types (`FastifyError`, `FastifyRequest`, `FastifyReply`). This made it impossible to reuse error mapping for Express or MCP.

# Decision

Split error handling into two concerns:

### 1. Domain Errors (`src/domain/errors.ts`)

Unchanged — `RivetBenchError` hierarchy with structured serialization:

```typescript
export class RivetBenchError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;
  toJSON(): { error: { name: string; code: string; message: string; details?: unknown } };
}

export class ValidationError extends RivetBenchError { /* 400 */ }
export class EndpointNotFoundError extends RivetBenchError { /* 404 */ }
export class InternalServerError extends RivetBenchError { /* 500 */ }
```

### 2. Adapter Error Mapping (per adapter)

Each adapter maps `RivetBenchError` to its transport format:

- **Fastify adapter**: `createFastifyErrorHandler()` returns a Fastify error handler that maps `RivetBenchError` → HTTP response
- **MCP adapter**: Catches errors and returns `{ isError: true, content: [{ text: error.toJSON() }] }`
- **CLI adapter**: Catches errors and writes `error.toJSON()` to stderr

The application service throws domain errors. Adapters catch and translate.

# Consequences

**Positive**:
- Domain errors are transport-agnostic — no Fastify types in `domain/`
- Each adapter owns its error presentation logic
- New transports implement their own error mapping without touching domain
- `toJSON()` provides a common serialization format for all adapters

**Negative**:
- Each adapter must implement error mapping (trivial — ~10 lines)
- Must ensure all adapters catch the same error types consistently

# References

- [ADR-0001: Hexagonal Architecture](./ADR-0001-hexagonal-architecture.md)
- [ADR-0002: Application Service Layer](./ADR-0002-application-service-layer.md) — where errors are thrown
