---
title: "ADR-0005: MCP Stdio Logging Constraints"
date: "2025-10-07"
status: accepted
tags:
  - architecture
  - logging
  - mcp
  - stdio
  - protocol
modules:
  - src/core/logger.ts
  - src/server/mcp.ts
summary: >-
  Restrict all diagnostic output to stderr when running MCP in stdio mode to prevent corruption of JSON-RPC protocol stream on stdout.
---

# Context

The Model Context Protocol (MCP) can use stdio transport where the server communicates with clients via stdin/stdout using JSON-RPC messages. In this mode:

1. **stdout is Reserved**: Used exclusively for JSON-RPC protocol messages
2. **Protocol Corruption**: Any non-JSON-RPC output to stdout breaks the protocol
3. **Debugging Needs**: Developers still need logging and diagnostic output during development
4. **Library Logging**: Third-party libraries might log to stdout unexpectedly

Example of the problem:
```typescript
// ❌ BREAKS MCP stdio protocol
console.log('Debug info');     // Goes to stdout
console.info('Information');    // Goes to stdout  
console.warn('Warning');        // Goes to stdout
logger.info('Application log'); // Might go to stdout
```

When this happens, MCP clients receive malformed JSON and the protocol fails.

# Decision

Implement strict logging constraints for MCP stdio mode:

1. **stderr Only**: All diagnostic output must go to stderr in MCP stdio mode
2. **No stdout Logging**: Never use `console.log()`, `console.info()`, `console.warn()` in MCP code
3. **Safe Alternatives**: Use `console.error()` or FastMCP context logging for diagnostics
4. **Transport Detection**: Logger configuration must detect transport mode
5. **Library Configuration**: Configure third-party libraries to avoid stdout

Safe patterns:
```typescript
// ✅ SAFE for MCP stdio
console.error('Debug info');    // stderr
context.log.info('Info');       // FastMCP → stderr
logger.error('Error details');   // Configured to stderr
```

# Consequences

## Positive

- **Protocol Integrity**: MCP stdio transport works reliably
- **Debugging Support**: Developers can still access diagnostic information via stderr
- **Production Safety**: No accidental protocol corruption in production
- **Client Compatibility**: Works with all MCP clients expecting clean stdout JSON

## Negative

- **Development Confusion**: Developers must remember not to use `console.log()`
- **Library Risk**: Third-party libraries might still log to stdout unexpectedly
- **Debugging Overhead**: Must use stderr-based tools or MCP client logs for debugging
- **Platform Differences**: stderr handling varies across operating systems

## Implementation Guidelines

- **Code Reviews**: Check for `console.log()` usage in MCP-related code
- **Linting Rules**: Consider ESLint rule to prevent `console.log()` in MCP modules
- **Documentation**: Clear warnings about stdio constraints in developer docs
- **Testing**: Test MCP stdio mode with verbose logging to catch violations

# References

- [MCP Specification - Transport Layer](https://modelcontextprotocol.io/specification/protocol/)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- `src/server/mcp.ts` - MCP server implementation
- Agent policy `[LOG-01]`, `[LOG-02]`, `[LOG-03]` in `AGENTS.MD`
- `docs/LESSONS_LEARNED.md` - MCP Stdio Logging section