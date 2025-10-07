---
title: "ADR-0001: Dual Transport Architecture (REST + MCP)"
date: "2025-10-07"
status: accepted
tags:
  - architecture
  - transport
  - mcp
  - rest
modules:
  - src/server/
  - src/core/
summary: >-
  Implement unified endpoints that can be exposed over both REST HTTP and MCP (Model Context Protocol) transports, enabling AI agents and traditional HTTP clients to use the same business logic.
---

# Context

RivetBench needs to serve both traditional HTTP clients (web apps, APIs) and AI agents that use the Model Context Protocol (MCP). Maintaining separate implementations for each transport would lead to:

- Code duplication and maintenance overhead
- Inconsistent behavior between transports
- Increased development complexity
- Potential for bugs due to diverging implementations

The goal is to write endpoint logic once and expose it through multiple transports with identical behavior and validation.

# Decision

Implement a dual transport architecture where:

1. **Unified Endpoint Definitions**: Single endpoint definitions using Zod schemas work across both transports
2. **Transport-Specific Servers**: Separate server implementations (`src/server/rest.ts`, `src/server/mcp.ts`) handle protocol-specific concerns
3. **Shared Business Logic**: Same handler functions and validation logic used by both transports
4. **Schema-Driven**: Zod schemas drive OpenAPI generation for REST and tool definitions for MCP
5. **Transport Parity**: Both transports provide identical validation, error handling, and request tracking

# Consequences

## Positive

- **Write Once, Deploy Everywhere**: Single endpoint definition works across transports
- **Consistent Behavior**: Same validation, error handling, and business logic everywhere
- **Reduced Maintenance**: Changes to business logic automatically apply to both transports
- **AI-First Design**: Native support for AI agents via MCP while maintaining HTTP compatibility
- **Schema-Driven Documentation**: OpenAPI and MCP tool schemas generated automatically

## Negative

- **Increased Initial Complexity**: More complex server setup compared to single-transport solutions
- **Transport Constraints**: Must design endpoints to work within constraints of both protocols
- **Testing Overhead**: Must test both transports for every endpoint
- **Dependencies**: Requires both Fastify (REST) and fastmcp (MCP) libraries

# References

- [MCP Specification](https://modelcontextprotocol.io/)
- `src/server/rest.ts` - REST server implementation
- `src/server/mcp.ts` - MCP server implementation
- `src/core/endpoint.ts` - Unified endpoint definitions