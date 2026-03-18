---
title: "ADR-0008: RPC-over-REST Design Pattern"
date: "2026-03-18"
status: accepted
tags:
  - architecture
  - rest
  - rpc
  - api-design
modules:
  - src/adapters/fastify/
summary: >-
  Use RPC-over-REST with POST-only endpoints dispatched by name (POST /rpc/:name) rather than traditional RESTful resource modelling, optimising for transport parity with MCP tools.
supersedes:
  - "LEGACY-ADR-0002 (RPC-over-REST Design Pattern)"
---

# Context

Traditional REST models resources (GET /users/:id, PUT /users/:id). MCP models tools (function calls by name with JSON input). These paradigms don't map naturally to each other.

RivetBench's primary goal is transport parity — the same endpoint should behave identically whether called via HTTP or MCP. This favours RPC semantics over resource semantics.

# Decision

**POST-only RPC pattern**:

```
POST /rpc/{endpoint-name}
Content-Type: application/json

{ "message": "Hello" }
```

All endpoints are dispatched by name. All input is in the JSON body. All responses are JSON. No GET, PUT, DELETE, or query parameters.

### Routes in the Fastify adapter

| Route | Purpose |
|-------|---------|
| `POST /rpc/:name` | Invoke endpoint by name |
| `GET /tools` | List available endpoints (with ETag) |
| `GET /health` | Health check |
| `GET /docs` | Swagger UI |

### Why not traditional REST?

- MCP tools are function calls — RPC maps 1:1
- Endpoint handlers are request/response functions, not CRUD operations
- POST-only avoids method semantics that don't apply
- Simpler routing: one route pattern for all endpoints

# Consequences

**Positive**:
- 1:1 mapping between HTTP calls and MCP tool calls
- AI agents can use the same mental model for both transports
- Simplified adapter: one route, one handler pattern
- OpenAPI docs still generated from Zod schemas

**Negative**:
- Not RESTful — may confuse developers expecting resource-oriented APIs
- POST-only means HTTP caching is harder (mitigated by ETag on /tools)
- Browser testing requires POST tools (no simple URL navigation)

# References

- [ADR-0003: Zod Schema as Domain Contract](./ADR-0003-zod-schema-domain-contract.md)
- [ADR-0005: Framework-Agnostic Adapters](./ADR-0005-framework-agnostic-adapters.md)
