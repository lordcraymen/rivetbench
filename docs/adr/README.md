# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) documenting the key architectural choices made in RivetBench.

## Overview

ADRs capture the context, decision, and consequences of important architectural choices. They help developers understand why certain patterns were chosen and maintain consistency across the codebase.

## Current Decisions

See [ACTIVE.md](./ACTIVE.md) for a summary of all active architectural decisions, or browse individual ADR files:

- **ADR-0001**: [Dual Transport Architecture (REST + MCP)](./ADR-0001-dual-transport-architecture.md) - Core architectural pattern enabling both HTTP and MCP transports
- **ADR-0002**: [RPC-over-REST Design Pattern](./ADR-0002-rpc-over-rest-design.md) - POST-only endpoint design optimized for AI agents
- **ADR-0003**: [Dependency Injection Pattern](./ADR-0003-dependency-injection-pattern.md) - Configuration management and SOLID compliance
- **ADR-0004**: [Zod Schema-Driven Architecture](./ADR-0004-zod-schema-driven-architecture.md) - Single source of truth for validation and types
- **ADR-0005**: [MCP Stdio Logging Constraints](./ADR-0005-mcp-stdio-logging-constraints.md) - Protocol safety for MCP stdio transport
- **ADR-0006**: [Structured Error Handling](./ADR-0006-structured-error-handling.md) - Consistent error responses across transports
- **ADR-0007**: [Transport Parity Requirements](./ADR-0007-transport-parity-requirements.md) - Identical behavior across REST and MCP

## Adding New ADRs

Use the ADR toolkit to manage decisions:

```bash
# Create new ADR from template
cp docs/adr/templates/ADR-0000-template.md docs/adr/ADR-00XX-your-decision.md

# Build index and digest after adding/updating ADRs
npx adrx build

# Validate all ADRs
npx adrx check
```

Recommended naming scheme: `ADR-XXXX-short-description.md` where `XXXX` is a zero-padded sequence.
