---
title: "ADR-0011: MCP Structured Output Contracts"
date: "2026-10-10"
status: accepted
tags:
  - mcp
  - schemas
  - structured-content
  - compatibility
modules:
  - src/adapters/mcp/tool-registration.ts
  - src/adapters/mcp/flatten-for-mcp.ts
summary: >-
  Advertise object-compatible endpoint output schemas through MCP and return validated structuredContent alongside a JSON text fallback.
supersedes: []
---

# Context

Every RivetBench endpoint already declares and validates a Zod output schema,
but the MCP adapter exposed results only as JSON-encoded text. Agents could not
discover the output contract through `tools/list`, and MCP clients could not
consume results through the protocol's `structuredContent` field.

MCP structured output requires an object-shaped output schema. RivetBench also
supports endpoints whose outputs are primitives or arrays, which cannot be
advertised directly under that constraint.

# Decision

For every object-compatible endpoint output:

1. Register the endpoint schema as the MCP tool's `outputSchema`.
2. Return the validated endpoint result as `structuredContent`.
3. Also return the existing pretty-printed JSON text content for compatibility
   with clients that do not yet consume structured output.

Discriminated-union outputs use the same MCP flattening rules as inputs.
Primitive and array outputs remain text-only and omit `outputSchema`; RivetBench
does not invent a transport-specific wrapper that would differ from the endpoint
contract.

Error results remain `{ isError: true, content: [...] }`. The advertised output
schema describes successful results and must not constrain structured domain
errors.

# Consequences

**Positive**:

- Agents discover input and output contracts before invoking a tool.
- Structured-capable clients receive native objects without parsing text.
- Existing clients retain the JSON text representation.
- Runtime output validation remains centralized in `invokeEndpoint()`.

**Negative**:

- Primitive and array outputs cannot use structured output without a future,
  explicitly versioned wrapper contract.
- MCP responses carry both structured data and a text rendering.

# References

- [ADR-0003: Zod Schema as Domain Contract](./ADR-0003-zod-schema-domain-contract.md)
- [ADR-0006: Structured Error Handling](./ADR-0006-structured-error-handling.md)
- [ADR-0010: Discriminated Union Flattening](./ADR-0010-discriminated-union-flattening-for-mcp.md)
