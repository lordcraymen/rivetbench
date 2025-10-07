---
title: "ADR-0002: RPC-over-REST Design Pattern"
date: "2025-10-07"
status: accepted
tags:
  - architecture
  - rest
  - rpc
  - api-design
modules:
  - src/server/rest.ts
  - src/core/
summary: >-
  Use RPC-over-REST pattern with POST-only endpoints dispatched by name rather than traditional RESTful resource modeling, optimizing for AI agent interaction and unified transport behavior.
---

# Context

Traditional REST APIs use resource-based URLs with HTTP verbs (GET, POST, PUT, DELETE) to model operations on resources. However, this approach creates challenges for our dual transport architecture:

1. **MCP Compatibility**: MCP tools are function calls, not resource operations
2. **Transport Parity**: REST resources don't map cleanly to MCP tools
3. **AI Agent Usage**: AI agents work better with explicit function calls than resource manipulation
4. **Complexity**: Resource modeling adds unnecessary complexity for simple function-based operations

Many modern APIs (JSON-RPC, GraphQL, gRPC) use function call patterns rather than resource modeling.

# Decision

Implement RPC-over-REST pattern where:

1. **POST-only Routes**: All endpoints use POST method (`POST /rpc/:name` or `POST /tools/:name`)
2. **Function Dispatch**: Route by endpoint name rather than HTTP verb + resource path
3. **Request Body Parameters**: All input via JSON request body, no URL parameters
4. **Stateless Operations**: Each call is self-contained with all required data
5. **Consistent Interface**: Same call pattern for all endpoints regardless of operation type

Example:
```
POST /rpc/echo
Content-Type: application/json

{ "message": "Hello World" }
```

# Consequences

## Positive

- **Transport Parity**: REST endpoints map directly to MCP tools (both are function calls)
- **AI-Friendly**: Clear function call semantics that AI agents understand naturally
- **Simplified Routing**: No need to design resource hierarchies or choose HTTP verbs
- **Consistent Interface**: Same call pattern for all operations
- **Stateless Design**: No server-side session management required
- **Cache-Friendly**: Can still use HTTP caching headers on POST responses when appropriate

## Negative

- **Non-RESTful**: Doesn't follow REST principles, may confuse developers expecting RESTful APIs
- **Limited HTTP Semantics**: Loses semantic meaning of HTTP verbs (GET for safe operations, etc.)
- **Caching Complexity**: POST requests aren't cached by default (though this can be addressed)
- **HTTP Tooling**: Some HTTP tools expect RESTful patterns for features like method override

## Mitigation

- Clear documentation explaining the RPC pattern and rationale
- Consistent endpoint naming and documentation
- Proper HTTP status codes and error handling despite POST-only design

# References

- JSON-RPC 2.0 Specification for RPC-over-HTTP precedent
- `src/server/rest.ts` - REST server implementation with RPC routing
- ADR-0001 - Dual Transport Architecture (provides context for this decision)