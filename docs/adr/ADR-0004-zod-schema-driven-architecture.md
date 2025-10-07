---
title: "ADR-0004: Zod Schema-Driven Architecture"
date: "2025-10-07"
status: accepted
tags:
  - architecture
  - validation
  - schemas
  - type-safety
  - openapi
modules:
  - src/core/endpoint.ts
  - src/core/openapi.ts
summary: >-
  Use Zod schemas as the single source of truth for input/output validation, TypeScript types, OpenAPI documentation, and MCP tool definitions across all transports.
---

# Context

A dual transport architecture requires consistent validation and documentation across REST and MCP. Traditional approaches might use:

1. **Manual Type Definitions**: Separate TypeScript interfaces, validation logic, and documentation
2. **Multiple Schema Systems**: Different validation for REST vs MCP
3. **Documentation Drift**: Hand-written OpenAPI specs that get out of sync with code
4. **Validation Inconsistency**: Different validation rules between transports

This leads to maintenance overhead, bugs from inconsistency, and documentation that becomes stale.

# Decision

Use Zod as the single source of truth for all schema concerns:

1. **Unified Schema Definition**: Single Zod schema defines input/output structure
2. **Automatic Type Generation**: TypeScript types derived from Zod schemas
3. **Runtime Validation**: Same schemas validate requests in both REST and MCP
4. **OpenAPI Generation**: `zod-to-json-schema` generates OpenAPI documentation automatically
5. **MCP Tool Definition**: Zod schemas generate MCP tool input/output specifications
6. **Compile-Time Safety**: TypeScript enforces schema contracts at compile time

Example endpoint definition:
```typescript
const EchoInput = z.object({ message: z.string() });
const EchoOutput = z.object({ echoed: z.string() });

export default makeEndpoint({
  name: "echo",
  summary: "Echo a message",
  input: EchoInput,
  output: EchoOutput,
  handler: async ({ input }) => ({ echoed: input.message })
});
```

# Consequences

## Positive

- **Single Source of Truth**: Schema defined once, used everywhere
- **Automatic Documentation**: OpenAPI specs generated automatically and stay in sync
- **Type Safety**: Compile-time guarantees that handlers match schemas
- **Runtime Safety**: Automatic validation prevents invalid data from reaching handlers
- **Transport Consistency**: Identical validation across REST and MCP
- **Developer Experience**: Auto-completion and type checking in handlers
- **Schema Evolution**: Changes to schemas automatically propagate to docs and validation

## Negative

- **Zod Dependency**: Tied to Zod library (though it's well-maintained and stable)
- **Schema Complexity**: Complex validation rules require learning Zod syntax
- **Bundle Size**: Zod adds runtime overhead for schema parsing
- **Migration Effort**: Existing validation logic must be converted to Zod schemas

## Implementation Details

- All endpoints must define `input` and `output` Zod schemas
- Handlers receive typed `input` parameter matching schema
- Handler return type must match `output` schema (enforced by TypeScript)
- OpenAPI generation happens at server startup from registered endpoints
- MCP tool definitions generated dynamically from the same schemas

# References

- [Zod Documentation](https://zod.dev/)
- [zod-to-json-schema](https://github.com/StefanTerdell/zod-to-json-schema)
- `src/core/endpoint.ts` - Endpoint definition with Zod schemas
- `src/core/openapi.ts` - OpenAPI generation from Zod schemas
- `src/endpoints/echo.ts` - Example endpoint implementation