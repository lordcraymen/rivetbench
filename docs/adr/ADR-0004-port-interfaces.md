---
title: "ADR-0004: Port Interfaces for Infrastructure Abstraction"
date: "2026-03-18"
status: accepted
tags:
  - architecture
  - hexagonal
  - ports
  - dependency-inversion
modules:
  - src/ports/
summary: >-
  Define port interfaces (LoggerPort, ContextFactory) so the application layer depends on abstractions, not concrete infrastructure like Pino or FastMCP.
---

# Context

In the pre-hexagonal codebase:

- `core/logger.ts` directly imported and instantiated Pino, making the core depend on a specific logging library
- MCP couldn't use the Pino logger (FastMCP provides its own `context.log`)
- `core/error-handler.ts` depended on `FastifyError`, `FastifyRequest`, `FastifyReply` — Fastify types inside "core"
- Testing required real Pino instances or complex mocking

The lack of abstraction boundaries meant infrastructure leaked into every layer.

# Decision

Define **port interfaces** in `src/ports/` that the application layer depends on:

### LoggerPort (driven port)

```typescript
// src/ports/logger.ts
export interface LoggerPort {
  info(msg: string, context?: Record<string, unknown>): void;
  warn(msg: string, context?: Record<string, unknown>): void;
  error(msg: string, context?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): LoggerPort;
}
```

Implementations:
- `adapters/pino/logger.ts` — wraps Pino (production)
- `test/helpers/test-logger.ts` — no-op logger (tests)
- Console adapter — `console.error()` wrapper (MCP stdio fallback)

### ContextFactory (driven port)

Already exists as a type in `domain/endpoint.ts`. The registry holds the factory and adapters invoke it through the application service.

Port interfaces are **minimal**. They expose only what the application service actually calls — no framework-specific methods leak through.

# Consequences

**Positive**:
- Application service is testable with a no-op logger (no Pino dependency)
- MCP adapter can provide its own logger implementation using `context.log`
- New logging backends (Winston, Bunyan) require only a new adapter
- Fastify types no longer appear in domain or application code

**Negative**:
- One more interface to maintain per infrastructure concern
- Adapter authors must implement the port interface

# References

- [ADR-0001: Hexagonal Architecture](./ADR-0001-hexagonal-architecture.md)
- SOLID DIP: "Depend on abstractions, not concretions"
