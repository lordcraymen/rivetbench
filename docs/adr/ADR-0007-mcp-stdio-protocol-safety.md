---
title: "ADR-0007: MCP Stdio Protocol Safety"
date: "2026-03-18"
status: accepted
tags:
  - architecture
  - mcp
  - stdio
  - logging
  - protocol
modules:
  - src/adapters/fastmcp/
  - src/ports/logger.ts
summary: >-
  Restrict all diagnostic output to stderr when running MCP in stdio mode. No console.log() in MCP adapter code. Use LoggerPort for safe, transport-aware logging.
supersedes:
  - "LEGACY-ADR-0005 (MCP Stdio Logging Constraints)"
---

# Context

MCP stdio transport uses `stdout` exclusively for JSON-RPC protocol messages. Any other output on `stdout` (e.g. `console.log()`, Pino default destination) corrupts the protocol stream and breaks the client connection.

# Decision

### Rules

1. **Never** use `console.log()`, `console.info()`, or `console.warn()` in MCP adapter code — they write to `stdout`
2. Use `console.error()` for diagnostic output (writes to `stderr`)
3. The MCP adapter receives a `LoggerPort` implementation that routes to `stderr`
4. The Pino adapter is pre-configured to write to `stderr` (fd 2)
5. Third-party libraries that write to `stdout` are disqualified from MCP adapter use

### How the hexagonal architecture helps

With `LoggerPort`, the MCP adapter doesn't care *which* logger is used — only that it doesn't touch `stdout`. The composition root wires a stderr-safe implementation:

```typescript
// Composition root for MCP
const logger = createPinoLogger(config); // Already stderr-only
const mcp = createStandaloneMcpServer({ registry, config, logger });
```

### Audit checklist for MCP-touching code

- [ ] No `console.log()` or `console.info()`
- [ ] Logger output goes to `stderr`
- [ ] Third-party deps don't write to `stdout`
- [ ] Test: pipe MCP stdio through JSON parser — no parse errors

# Consequences

**Positive**:
- Protocol integrity: JSON-RPC stream stays clean
- LoggerPort makes the constraint enforceable via DI
- MCP clients (Claude, Cursor, etc.) get reliable connections

**Negative**:
- Development confusion: `console.log()` is a natural instinct
- Requires lint rule or code review discipline
- Some npm packages may write to stdout unexpectedly

# References

- [MCP Specification — Transports](https://spec.modelcontextprotocol.io/specification/basic/transports/)
- [MCP_GUIDE.md](../MCP_GUIDE.md)
- [ADR-0004: Port Interfaces](./ADR-0004-port-interfaces.md) — LoggerPort
