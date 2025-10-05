# Architecture Guide

This document covers RivetBench's architectural patterns, principles, and implementation guidelines.

---

## Table of Contents

1. [SOLID Principles](#solid-principles)
2. [Dependency Injection Pattern](#dependency-injection-pattern)
3. [Error Handling](#error-handling)
4. [Logging](#logging)
5. [Transport Parity](#transport-parity)

---

## SOLID Principles

### Quick Reference

**S**ingle Responsibility • **O**pen/Closed • **L**iskov Substitution • **I**nterface Segregation • **D**ependency Inversion

### 1. Single Responsibility Principle (SRP)

> A module should have one, and only one, reason to change.

**✅ Good Example** (from `src/config/index.ts`):
```typescript
// Single responsibility: Load and validate config
export function loadConfig(): ServerConfig {
  return {
    rest: { host, port },
    mcp: { transport, port }
  };
}
// Does NOT: Create loggers, start servers, handle endpoints
```

**❌ Anti-Pattern**:
```typescript
// Multiple responsibilities - DON'T DO THIS
export function createLogger() {
  const config = loadConfig();        // Config loading
  const logger = pino(config);         // Logger creation
  registerGlobalLogger(logger);        // Global state
  startHealthCheck(logger);            // Health check logic
  return logger;
}
```

**Guidelines**:
- Each module does **one thing well**
- If describing a function uses "and", split it
- Functions < 30 lines typically
- One reason to modify

### 2. Open/Closed Principle (OCP)

> Open for extension, closed for modification.

**✅ Good Example** (from `src/core/errors.ts`):
```typescript
// Extend with new error type (no modification to existing code)
export class RateLimitError extends RivetBenchError {
  constructor(details?: Record<string, unknown>) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED', details);
  }
}
```

**Guidelines**:
- Use **composition** over modification
- New features should **extend**, not **change**
- Leverage interfaces for extensibility

### 3. Liskov Substitution Principle (LSP)

> Subclasses must work wherever parent works.

**✅ Good Example**:
```typescript
function logError(error: RivetBenchError) {
  logger.error(error.toJSON()); // Works for ALL error types
}

logError(new ValidationError('Invalid'));
logError(new NotFoundError('Missing'));  // Substitutable
```

### 4. Interface Segregation Principle (ISP)

> Many small interfaces > one large interface.

**✅ Good Example**:
```typescript
// Focused interfaces
interface RestServer {
  start(): Promise<void>;
}

interface McpServer {
  start(): Promise<void>;
}
```

**❌ Anti-Pattern**:
```typescript
// Forces unused methods - DON'T DO THIS
interface Server {
  startRest(): void;
  startMcp(): void;
  startGrpc(): void;  // Not all servers need this
}
```

### 5. Dependency Inversion Principle (DIP)

> Depend on abstractions; inject dependencies.

**✅ Good Example** (from `src/server/rest.ts`):
```typescript
export interface RestServerOptions {
  registry: EndpointRegistry;
  config: ServerConfig;  // Explicit dependency
}

export const createRestServer = async ({ registry, config }: RestServerOptions) => {
  const logger = createLogger(config);  // Injected config
  // ...
}
```

**❌ Anti-Pattern**:
```typescript
// Hidden dependency - DON'T DO THIS
export const createRestServer = async ({ registry }) => {
  const config = loadConfig();  // Created internally
  const logger = createLogger();
}
```

**Critical Rule**: Load config **once** at app entry, then inject everywhere.

---

## Dependency Injection Pattern

### The Problem (Before DI)

Multiple independent `loadConfig()` calls caused:
- Configuration drift in tests
- Race conditions
- Hidden dependencies
- Difficult testing

**Example of the problem**:
```typescript
// ❌ BAD: Called 4+ times during startup
export function createLogger(): PinoLogger {
  const config = loadConfig();  // Call 1
  // ...
}

export const createRestServer = async ({ registry }) => {
  const config = loadConfig();  // Call 2
  const logger = createLogger(); // Triggers call 1 again!
  // ...
  logger.info({
    host: loadConfig().rest.host,  // Call 3
    port: loadConfig().rest.port   // Call 4
  });
}
```

### The Solution (DI Pattern)

Load config **once** at application entry, then **inject** as parameter:

```typescript
// ✅ GOOD: Inject dependencies
export function createLogger(config: ServerConfig): PinoLogger {
  // Config passed as parameter
  return pino({
    level: config.logging.level,
    // ...
  });
}

export const createRestServer = async ({ registry, config }: RestServerOptions) => {
  const logger = createLogger(config);  // Injected config
  // ...
  logger.info({
    host: config.rest.host,  // Same config instance
    port: config.rest.port
  });
}

// At application entry point (src/server/rest.ts bottom)
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();  // Load ONCE
  const server = await createRestServer({ registry, config });
}
```

### Benefits

1. **Deterministic Behavior**: Config loaded once at startup
2. **Testability**: Easy to inject mock configs
3. **No Race Conditions**: Single source of truth
4. **Explicit Dependencies**: Clear function contracts

### Factory Pattern for Dependencies

When a component needs dependencies, use factory functions:

```typescript
// ✅ GOOD: Factory accepts dependencies
export function createErrorHandler(logger: PinoLogger) {
  return function errorHandler(error, request, reply) {
    logger.error({ error }, 'Request error');
    // ...
  };
}

// Usage
const logger = createLogger(config);
const errorHandler = createErrorHandler(logger);
fastify.setErrorHandler(errorHandler);
```

---

## Error Handling

### Error Class Hierarchy

All errors extend `RivetBenchError` (from `src/core/errors.ts`):

```typescript
export abstract class RivetBenchError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON() { /* ... */ }
}
```

### Built-in Error Types

| Error Class | Status Code | Use Case |
|-------------|-------------|----------|
| `ValidationError` | 400 | Input validation failures |
| `EndpointNotFoundError` | 404 | Unknown endpoint requested |
| `InternalServerError` | 500 | Unexpected server errors |
| `ConfigurationError` | 500 | Invalid configuration |

### Usage Examples

```typescript
// ✅ Validation error with context
throw new ValidationError('Invalid input', {
  field: 'email',
  reason: 'Invalid format',
  value: input.email
});

// ✅ Endpoint not found
throw new EndpointNotFoundError('myEndpoint');

// ✅ Internal error with stack trace
try {
  await dangerousOperation();
} catch (err) {
  throw new InternalServerError('Operation failed', {
    operation: 'dangerousOperation',
    originalError: err instanceof Error ? err.message : String(err)
  });
}
```

### Error Response Format

**REST API**:
```json
{
  "error": {
    "name": "ValidationError",
    "code": "VALIDATION_ERROR",
    "message": "Invalid endpoint input",
    "details": {
      "field": "email",
      "reason": "Invalid format"
    }
  }
}
```

**MCP Tools**:
```json
{
  "content": [{
    "type": "text",
    "text": "{\"error\": {\"name\": \"ValidationError\", ...}}"
  }],
  "isError": true
}
```

### Creating Custom Errors

```typescript
export class RateLimitError extends RivetBenchError {
  constructor(details?: Record<string, unknown>) {
    super(
      'Rate limit exceeded',
      429,
      'RATE_LIMIT_EXCEEDED',
      details
    );
  }
}

// Usage
throw new RateLimitError({
  limit: 100,
  window: '1m',
  reset: Date.now() + 60000
});
```

---

## Logging

### Configuration

Logger created via DI pattern:

```typescript
import { createLogger } from './core/logger.js';

const config = loadConfig();
const logger = createLogger(config);  // Inject config
```

### Structured Logging

Always use structured logging with context objects:

```typescript
// ✅ GOOD - Structured with context
logger.info({ 
  endpoint: 'echo', 
  duration: 150,
  requestId: req.id
}, 'Request completed');

// ❌ BAD - String interpolation
logger.info(`Request completed for echo in 150ms`);
```

### Log Levels

| Level | Use Case | Example |
|-------|----------|---------|
| `trace` | Detailed debugging | Function entry/exit |
| `debug` | Debugging info | Variable states |
| `info` | Normal operations | Server started |
| `warn` | Recoverable issues | Validation errors |
| `error` | Errors | Unexpected failures |
| `fatal` | Critical errors | System crash |

### Child Loggers

Create child loggers for persistent context:

```typescript
import { createChildLogger } from './core/logger.js';

const requestLogger = createChildLogger(logger, {
  requestId: req.id,
  endpoint: req.params.name
});

requestLogger.info('Processing request');  // Includes context automatically
```

### MCP-Specific Logging

**CRITICAL**: MCP stdio transport uses stdout for JSON-RPC protocol.

```typescript
// ✅ GOOD - Safe for MCP
console.error('Debug info');        // Goes to stderr
context.log.info('Debug info');     // FastMCP logger (stderr)

// ❌ BAD - BREAKS MCP stdio protocol
console.log('Debug info');    // Goes to stdout → breaks protocol
console.info('Debug info');   // Goes to stdout → breaks protocol
console.warn('Debug info');   // Goes to stdout → breaks protocol
```

### Request ID Tracking

Every request gets a unique ID (RFC 4122 UUID):

**REST**:
- Auto-generated via `crypto.randomUUID()`
- Returned in header: `X-Request-Id: 2af7e653-...`
- Passed to handlers via `config.requestId`

**MCP**:
- Generated per tool execution via `crypto.randomUUID()`
- Passed to handlers via `config.requestId`
- Used for application-level tracing

**Usage in handlers**:
```typescript
export default makeEndpoint({
  name: 'echo',
  handler: async ({ input, config }) => {
    logger.info({ requestId: config.requestId }, 'Processing');
    // ...
  }
});
```

---

## Transport Parity

All transports (REST, MCP) must maintain behavioral consistency:

### 1. Request ID Propagation

- Every transport generates unique request ID via `crypto.randomUUID()`
- Include in error logs for traceability
- Pass to handlers via `config.requestId`

### 2. Schema Validation

- All transports validate input/output using same Zod schemas
- Validation errors return consistent format

### 3. Error Handling

- All transports convert errors to `RivetBenchError` format
- Consistent client experience across transports

### 4. Observability

- All transports support request tracing, logging, debugging
- Consistent context propagation

### Testing Transport Parity

Add regression tests for cross-transport contracts:

```typescript
// Example from test/server/request-id-parity.test.ts
describe('Transport Parity', () => {
  it('should provide request ID to REST handlers', async () => {
    // Test REST transport
  });

  it('should provide request ID to MCP handlers', async () => {
    // Test MCP transport
  });
});
```

---

## Architecture Checklist

Before committing, verify:

- [ ] Config loaded once at app entry
- [ ] All dependencies injected as parameters
- [ ] No `loadConfig()` calls in business logic
- [ ] Using specific error classes from `src/core/errors.ts`
- [ ] Structured logging with context objects
- [ ] No `console.log()` in MCP code
- [ ] Request ID propagated through pipeline
- [ ] Transport parity maintained
