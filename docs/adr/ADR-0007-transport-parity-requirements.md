---
title: "ADR-0007: Transport Parity Requirements"
date: "2025-10-07"
status: accepted
tags:
  - architecture
  - transport-parity
  - consistency
  - testing
modules:
  - src/server/rest.ts
  - src/server/mcp.ts
  - test/features/
summary: >-
  Enforce identical behavior across REST and MCP transports including request ID generation, validation, error handling, and request tracing for consistent client experience.
---

# Context

With dual transport architecture, clients using REST vs MCP should have identical experiences. Without explicit parity requirements, transports can diverge:

1. **Inconsistent Request IDs**: Different ID generation strategies between transports
2. **Validation Differences**: Same endpoint behaving differently on REST vs MCP
3. **Error Format Drift**: Different error responses despite shared error classes
4. **Debugging Complexity**: Different tracing and logging between transports
5. **Feature Gaps**: New features implemented in one transport but not the other

This leads to transport-specific bugs and inconsistent client experiences.

# Decision

Establish transport parity requirements that all transports must implement:

## Core Parity Requirements

1. **Request ID Generation**: All transports generate unique request IDs via `crypto.randomUUID()`
2. **Schema Validation**: Identical input/output validation using the same Zod schemas
3. **Error Handling**: Same error types and JSON serialization format
4. **Request Tracing**: Support request tracking through `config.requestId` parameter
5. **Response Format**: Consistent success and error response structures
6. **Handler Execution**: Same endpoint handlers called with same context interface

## Implementation Pattern

Each transport must:
```typescript
// 1. Generate request ID
const requestId = crypto.randomUUID();

// 2. Validate input using endpoint schema
const input = endpoint.input.parse(rawInput);

// 3. Call handler with consistent context
const result = await endpoint.handler({ 
  input, 
  config: { requestId } 
});

// 4. Validate output
const output = endpoint.output.parse(result);

// 5. Return consistent response format
```

## Testing Requirements

- BDD scenarios must test both transports for identical behavior
- Request ID parity explicitly tested with matching scenarios
- Error handling verified across transports

# Consequences

## Positive

- **Consistent Client Experience**: Same behavior regardless of transport choice
- **Simplified Debugging**: Request IDs work consistently for tracing
- **Reduced Transport Bugs**: Explicit requirements prevent divergence
- **Testing Confidence**: BDD scenarios ensure parity is maintained
- **Feature Consistency**: New features automatically work across transports

## Negative

- **Implementation Overhead**: Must implement same features in multiple transports
- **Testing Complexity**: Every endpoint change requires testing both transports
- **Constraint Burden**: Transport-specific optimizations may be limited by parity requirements
- **Development Time**: More careful coordination required between transport implementations

## Monitoring and Enforcement

- **BDD Tests**: Feature tests validate parity automatically
- **Code Reviews**: Check that changes apply to both transports
- **Request ID Verification**: Specific tests for request ID generation and tracking
- **Documentation**: Clear parity requirements in development guidelines

# References

- `test/features/request-id-parity.feature` - BDD tests for request ID parity
- `src/server/rest.ts` and `src/server/mcp.ts` - Transport implementations
- ADR-0001 - Dual Transport Architecture (provides foundational context)
- ADR-0006 - Structured Error Handling (supports consistent error responses)
- `docs/LESSONS_LEARNED.md` - Transport Parity section