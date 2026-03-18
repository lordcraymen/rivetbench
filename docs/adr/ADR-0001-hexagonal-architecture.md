---
title: "ADR-0001: Hexagonal Architecture (Ports & Adapters)"
date: "2026-03-18"
status: accepted
tags:
  - architecture
  - hexagonal
  - ports-and-adapters
modules:
  - src/domain/
  - src/application/
  - src/ports/
  - src/adapters/
summary: >-
  Adopt hexagonal architecture to decouple domain logic from infrastructure, enabling transport adapters to be swapped or composed without touching business logic.
supersedes:
  - "LEGACY-ADR-0001 (Dual Transport Architecture)"
  - "LEGACY-ADR-0003 (Dependency Injection Pattern)"
  - "LEGACY-ADR-0007 (Transport Parity Requirements)"
---

# Context

RivetBench exposes endpoints over REST (Fastify), MCP (FastMCP), and CLI. In the original architecture:

- Each transport re-implemented the validate → invoke → validate pipeline
- Infrastructure (Fastify, FastMCP) was created and owned by the server modules
- It was impossible to mount RivetBench routes on an existing HTTP server
- The error handler in `core/` depended on Fastify types
- The logger in `core/` depended on Pino directly
- Adding a new transport meant duplicating orchestration logic

These coupling issues made it difficult to embed RivetBench as middleware, swap HTTP frameworks, or test transports in isolation.

# Decision

Adopt **hexagonal architecture** (Ports & Adapters) with five layers:

1. **Domain** (`src/domain/`) — Pure business types: `EndpointDefinition`, `EndpointRegistry`, error classes. Zero infrastructure imports.

2. **Application** (`src/application/`) — Use cases that orchestrate domain objects. Single `invokeEndpoint()` function used by all transports.

3. **Ports** (`src/ports/`) — Interfaces defining the contract between core and infrastructure. Driving ports (transports call in) and driven ports (core calls out to logger, context factory).

4. **Adapters** (`src/adapters/`) — Concrete implementations: Fastify, FastMCP, CLI, Pino. Each adapter is a plugin that can be replaced.

5. **Composition Root** (`src/composition/`) — Wires ports to adapters at startup. The only place that knows about all concrete types.

**Dependency rule**: Dependencies flow inward only. Domain depends on nothing. Application depends on domain and ports. Adapters depend on ports, application, and domain. Composition root depends on everything.

# Consequences

**Positive**:
- New transports (Express, Hono, gRPC) require only a new adapter, no domain changes
- RivetBench routes can be mounted on an existing server as middleware
- The application service is tested once and trusted by all transports
- Infrastructure can be swapped (Pino → Winston) without touching domain
- Transport parity is enforced structurally (all adapters call the same use case)

**Negative**:
- More files and directories than the flat structure
- Indirection through port interfaces adds a navigation cost
- Requires disciplined import boundaries (enforceable via ESLint)

# References

- Alistair Cockburn, "Hexagonal Architecture" (2005)
- See [ARCHITECTURE.md](../ARCHITECTURE.md) for the complete layer descriptions and target directory structure
