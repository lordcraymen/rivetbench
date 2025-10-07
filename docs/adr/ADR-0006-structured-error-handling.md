---
title: "ADR-0006: Structured Error Handling"
date: "2025-10-07"
status: accepted
tags:
  - architecture
  - error-handling
  - transport-parity
  - json
modules:
  - src/core/errors.ts
  - src/core/error-handler.ts
summary: >-
  Define custom error classes extending RivetBenchError base class with structured JSON serialization for consistent error responses across REST and MCP transports.
---

# Context

A dual transport system needs consistent error handling across REST HTTP responses and MCP tool calls. Common problems with error handling:

1. **Inconsistent Errors**: Different error formats between transports
2. **Information Loss**: Stack traces and context lost in transport
3. **Generic Errors**: Using built-in Error class loses semantic meaning
4. **Debugging Difficulty**: Hard to trace errors across transport boundaries
5. **Client Experience**: Poor error messages for API consumers

The system needs structured errors that work identically across transports while preserving debugging information.

# Decision

Implement structured error handling with custom error hierarchy:

1. **Base Error Class**: `RivetBenchError` as abstract base with common structure
2. **Semantic Subclasses**: Specific error types (`ValidationError`, `NotFoundError`, etc.)
3. **Structured JSON**: All errors serialize to consistent JSON format
4. **HTTP Status Mapping**: Errors include appropriate HTTP status codes
5. **Context Preservation**: Support for additional context data and request IDs
6. **Transport Agnostic**: Same error handling logic works for REST and MCP

Error structure:
```typescript
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid input provided",
  "status": 400,
  "details": { "field": "email", "reason": "invalid format" },
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Custom error classes:
```typescript
export class ValidationError extends RivetBenchError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}
```

# Consequences

## Positive

- **Consistent Errors**: Same error format across REST and MCP transports
- **Rich Context**: Errors include status codes, error types, and additional details
- **Type Safety**: TypeScript can check error types and handling
- **Debugging Support**: Request IDs and context preserved across transport boundaries
- **Client Experience**: Structured errors are easier for clients to handle programmatically
- **Extensibility**: Easy to add new error types with specific semantics

## Negative

- **Boilerplate**: Must create specific error classes instead of using generic Error
- **Learning Curve**: Developers must learn custom error hierarchy
- **Serialization Overhead**: JSON serialization adds slight performance cost
- **Transport Coupling**: Error format must work across different transport protocols

## Implementation Guidelines

- **Specific Errors**: Use semantic error classes, never generic `Error`
- **Context Data**: Include relevant details in error construction
- **Request Tracing**: Always include request ID when available
- **Status Codes**: Map error types to appropriate HTTP status codes
- **Error Boundaries**: Handle and convert errors at transport boundaries

# References

- `src/core/errors.ts` - Custom error class definitions
- `src/core/error-handler.ts` - Error handling and serialization logic
- Agent policy `[CLEAN-ERR-03]` in `AGENTS.MD`
- `docs/ARCHITECTURE.md` - Error Handling section