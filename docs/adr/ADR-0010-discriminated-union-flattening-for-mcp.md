---
title: "ADR-0010: Flatten Discriminated Unions for MCP Tool Schemas"
date: "2026-03-22"
status: accepted
tags:
  - mcp
  - schemas
  - zod
  - adapters
modules:
  - src/adapters/mcp/handler.ts
summary: >-
  Flatten Zod discriminated unions into a single object schema when registering MCP tools, so agents see all parameters instead of an empty schema.
supersedes: []
---

# Context

When an endpoint uses `z.discriminatedUnion()` as its input schema, MCP clients receive empty parameter definitions. The MCP SDK's `normalizeObjectSchema` only recognizes `z.object()` schemas (it checks for a `.shape` property). A `ZodDiscriminatedUnion` has no `.shape`, so `normalizeObjectSchema` falls back to `{ "type": "object", "properties": {}, "required": [] }`.

This means agents see zero parameters for any tool backed by a discriminated union and must guess invocation shape via trial-and-error. The MCP protocol has no `oneOf`/`anyOf` support in `inputSchema` — it expects a single flat JSON Schema object.

Discriminated unions are idiomatic Zod for multi-operation endpoints (e.g. a `command` tool with `kind: "upsert_nodes" | "remove" | ...`). Endpoint authors should not have to avoid them.

# Decision

Flatten `z.discriminatedUnion()` schemas into a single `z.object()` in `registerTools()` inside `src/adapters/mcp/handler.ts`, between reading `endpoint.input` and passing `inputSchema` to `mcp.registerTool()`.

Schema-kind detection is structural. It uses Zod's `_def.typeName` metadata and
guarded public fields rather than `instanceof`. Consumers can legitimately load
a separate physical copy of Zod, in which case class identity differs even when
both copies have the same version and schema semantics.

### Flattening rules

1. **Extract the discriminator** (e.g. `kind`) and list all literal values as `z.enum()`.
2. **Merge all variant properties** into one flat `z.object()`. Mark variant-specific fields as optional.
3. **Only the discriminator is required** in the flat schema (it appears in all variants by definition).
4. **Annotate variant-specific fields** with `.describe()` noting which discriminator value(s) they apply to.
5. **Validation still uses the original** `endpoint.input` schema, preserving precise error messages.

### Example

Input:
```typescript
z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("upsert_nodes"), nodes: z.array(...) }),
  z.object({ kind: z.literal("remove"), node_ids: z.array(...) }),
])
```

Flattened output passed to MCP:
```json
{
  "type": "object",
  "properties": {
    "kind": { "type": "string", "enum": ["upsert_nodes", "remove"] },
    "nodes": { "type": "array", "description": "Required when kind=upsert_nodes." },
    "node_ids": { "type": "array", "description": "Required when kind=remove." }
  },
  "required": ["kind"]
}
```

### Where to apply

```typescript
// In registerTools() — adapters/mcp/handler.ts
mcp.registerTool(endpoint.name, {
  description: endpoint.description || endpoint.summary,
  inputSchema: flattenForMcp(endpoint.input),
}, async (args) => { /* unchanged */ });
```

The REST/OpenAPI path is unaffected — flattening only applies to the MCP adapter.

### Rejected alternatives

- **Pass-through `oneOf` JSON Schema**: The MCP SDK's `normalizeObjectSchema` rejects it. Most MCP clients do not render `oneOf` schemas.
- **Separate MCP tool per variant**: Explodes tool count (e.g. 6 → 25 tools), cluttering the agent's tool list.
- **Rely on tool descriptions only**: Descriptions are unstructured text, heuristically parsed by agents, and often truncated by clients.

# Consequences

**Positive**:
- Agents see all parameters (discriminator enum, field names, types) before the first call
- Zero changes required from endpoint authors — existing `z.discriminatedUnion()` usage works as-is
- REST/OpenAPI path is unaffected — flattening only applies to the MCP adapter layer
- Backward compatible — schemas that are already `z.object()` pass through unchanged
- Consistent with OpenAI and Anthropic tool calling conventions (flat schemas with enum discriminators)

**Negative**:
- Loss of variant-level precision — the flat schema cannot express "field X is required when kind=Y"; agents see variant-specific fields as optional. Mitigated by `.describe()` annotations and original-schema validation.
- Potential field name collisions — if two variants share a field name with incompatible types, the flattened schema picks one. Rare in practice since discriminated unions typically use distinct field names per variant.
- Maintenance cost — the flattening logic must handle Zod edge cases (nested unions, `.transform()`, `.pipe()`). Requires thorough unit tests.
- Structural detection depends on stable Zod 3 schema metadata. Cross-installation
  regression tests protect this boundary.

# References

- [ADR-0003: Zod Schema as Domain Contract](./ADR-0003-zod-schema-domain-contract.md)
- [ADR-0005: Framework-Agnostic Transport Adapters](./ADR-0005-framework-agnostic-adapters.md)
- [ADR-0007: MCP Stdio Protocol Safety](./ADR-0007-mcp-stdio-protocol-safety.md)
