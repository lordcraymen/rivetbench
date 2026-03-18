---
title: "ADR-0003: Zod Schema as Domain Contract"
date: "2026-03-18"
status: accepted
tags:
  - architecture
  - validation
  - schemas
  - type-safety
modules:
  - src/domain/endpoint.ts
summary: >-
  Use Zod schemas as the single source of truth for input/output validation, TypeScript types, OpenAPI generation, and MCP tool definitions across all transports.
supersedes:
  - "LEGACY-ADR-0004 (Zod Schema-Driven Architecture)"
---

# Context

Dual transports need consistent validation and documentation. Maintaining separate schemas per transport leads to drift, inconsistency, and duplicated type definitions.

# Decision

Every endpoint declares its input and output contract as **Zod schemas**:

```typescript
const EchoInput = z.object({ message: z.string().min(1) });
const EchoOutput = z.object({ echoed: z.string() });

export const echoEndpoint = makeEndpoint({
  name: 'echo',
  summary: 'Echo a message',
  input: EchoInput,
  output: EchoOutput,
  handler: async ({ input }) => ({ echoed: input.message }),
});
```

From these schemas, the system derives:
- **TypeScript types** via `z.infer<>` (compile-time safety)
- **Runtime validation** via `.safeParse()` / `.parse()` (in the application service)
- **OpenAPI documentation** via `zod-to-json-schema` (in the Fastify adapter)
- **MCP tool definitions** via Zod's `StandardSchemaV1` compatibility (in the FastMCP adapter)

Zod schemas are **domain objects** — they live in `src/domain/endpoint.ts` and are imported by the application service and adapters.

# Consequences

**Positive**:
- Single source of truth — no schema drift between transports
- Type-safe handlers with inferred input/output types
- Runtime validation in the application service (not duplicated per adapter)
- Auto-generated docs stay in sync with actual validation

**Negative**:
- Zod is a hard domain dependency (acceptable — it's the validation contract)
- Complex schemas have a learning curve
- Runtime overhead of parse/safeParse (negligible for RPC payloads)

# References

- [Zod documentation](https://zod.dev)
- [ADR-0002: Application Service Layer](./ADR-0002-application-service-layer.md) — where validation happens
