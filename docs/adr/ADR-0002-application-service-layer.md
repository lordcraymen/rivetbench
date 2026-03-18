---
title: "ADR-0002: Application Service Layer"
date: "2026-03-18"
status: accepted
tags:
  - architecture
  - hexagonal
  - application-service
  - use-case
modules:
  - src/application/
summary: >-
  Introduce an application service layer with a single invokeEndpoint() function that all transports delegate to, eliminating the duplicated validate-invoke-validate pipeline.
---

# Context

In the pre-hexagonal codebase, the endpoint invocation pipeline was duplicated across three transports:

| Step | REST (`rest.ts`) | MCP (`mcp.ts`) | CLI (`cli/index.ts`) |
|------|-------------------|----------------|----------------------|
| Resolve endpoint | `registry.get(name)` | — (from loop) | `registry.get(name)` |
| Validate input | `endpoint.input.safeParse()` | `endpoint.input.safeParse()` | `endpoint.input.safeParse()` |
| Generate request ID | `request.id` (Fastify) | `crypto.randomUUID()` | `randomUUID()` |
| Call handler | `endpoint.handler({...})` | `endpoint.handler({...})` | `endpoint.handler({...})` |
| Validate output | `endpoint.output.parse()` | `endpoint.output.parse()` | `endpoint.output.parse()` |
| Create context | `registry.createContext()` | `registry.createContext()` | `registry.createContext()` |

This duplication caused:
- Subtle behavioural divergence across transports (e.g. different request ID sources)
- Each transport reimplementing error handling for the same failure modes
- Any pipeline change requiring coordinated edits to three files
- Triple the test surface for the same logic

# Decision

Introduce `src/application/invoke-endpoint.ts` as the **single** entry point for endpoint invocation:

```typescript
export interface InvocationResult {
  requestId: string;
  output: unknown;
}

export async function invokeEndpoint(
  registry: EndpointRegistry,
  name: string,
  rawInput: unknown,
  logger: LoggerPort,
): Promise<InvocationResult> {
  const endpoint = registry.get(name);
  if (!endpoint) throw new EndpointNotFoundError(name);

  const requestId = crypto.randomUUID();
  const parsed = endpoint.input.safeParse(rawInput);
  if (!parsed.success) {
    throw new ValidationError('Invalid endpoint input', {
      endpoint: name,
      issues: parsed.error.format(),
    });
  }

  logger.info('Invoking endpoint', { endpoint: name, requestId });

  const result = await endpoint.handler({
    input: parsed.data,
    config: { requestId },
    ctx: registry.createContext(),
  });

  return { requestId, output: endpoint.output.parse(result) };
}
```

Similarly, `src/application/list-endpoints.ts` handles listing and enrichment.

All transport adapters become thin wrappers: parse transport-specific input format → call `invokeEndpoint()` → format transport-specific output.

# Consequences

**Positive**:
- Pipeline logic exists in exactly one place
- Transport parity is structural, not just a testing requirement
- New transports need only ~20 lines of adapter code
- Application service is trivially unit-testable with no infrastructure

**Negative**:
- Adapters lose the ability to customise the invocation pipeline per-transport (this is intentional — deviations are bugs, not features)
- Slightly deeper call stack

# References

- [ADR-0001: Hexagonal Architecture](./ADR-0001-hexagonal-architecture.md)
- [ARCHITECTURE.md § Application Layer](../ARCHITECTURE.md)
