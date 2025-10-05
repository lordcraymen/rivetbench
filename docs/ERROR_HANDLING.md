# Error Handling & Logging

RivetBench implements a comprehensive error handling and logging system that works consistently across both REST and MCP transports.

## Error Classes

All errors in RivetBench extend from `RivetBenchError`, providing consistent error handling and serialization.

### Base Error: `RivetBenchError`

```typescript
import { RivetBenchError } from './core/errors.js';

throw new RivetBenchError('Error message', 500, 'ERROR_CODE', { details });
```

**Properties:**
- `message`: Human-readable error message
- `statusCode`: HTTP status code (used in REST responses)
- `code`: Machine-readable error code
- `details`: Optional additional context

### Built-in Error Types

#### `ValidationError` (400)
Thrown when input validation fails:

```typescript
throw new ValidationError('Invalid input', {
  field: 'email',
  reason: 'Invalid format'
});
```

#### `EndpointNotFoundError` (404)
Thrown when a requested endpoint doesn't exist:

```typescript
throw new EndpointNotFoundError('myEndpoint');
```

#### `InternalServerError` (500)
Thrown for unexpected server errors:

```typescript
throw new InternalServerError('Something went wrong', { context });
```

#### `ConfigurationError` (500)
Thrown when configuration is invalid:

```typescript
throw new ConfigurationError('Missing required config', { key: 'API_KEY' });
```

## Error Responses

### REST API

All errors return a consistent JSON structure:

```json
{
  "error": {
    "name": "ValidationError",
    "code": "VALIDATION_ERROR",
    "message": "Invalid endpoint input",
    "details": {
      "endpoint": "echo",
      "issues": {...}
    }
  }
}
```

**Status codes:**
- `400` - Validation errors
- `404` - Endpoint not found
- `500` - Internal server errors

### MCP Tools

MCP tool errors return structured content with `isError: true`:

```json
{
  "content": [{
    "type": "text",
    "text": "{\"error\": {\"name\": \"ValidationError\", ...}}"
  }],
  "isError": true
}
```

## Logging

RivetBench uses [Pino](https://getpino.io/) for structured logging with special considerations for MCP compatibility.

### Configuration

Configure logging via environment variables:

```bash
# Log level (trace, debug, info, warn, error, fatal)
LOG_LEVEL=info

# Environment (affects log formatting)
NODE_ENV=production
```

### REST Server Logging

The REST server logs all requests, responses, and errors:

```typescript
import { getLogger, createChildLogger } from './core/logger.js';

const logger = getLogger();

// Log with context
logger.info({ endpoint: 'echo', duration: 150 }, 'Request completed');

// Create child logger with persistent context
const childLogger = createChildLogger({ service: 'auth' });
childLogger.warn('Authentication failed');
```

**Logged events:**
- Incoming requests (method, URL, reqId)
- Request completion (statusCode, responseTime)
- Validation errors (field, reason)
- Endpoint not found (endpointName)
- Unexpected errors (stack trace)

### MCP Server Logging

**CRITICAL:** For MCP stdio transport, all logs MUST go to `stderr` (not stdout):

- ✅ Pino is configured to write to `stderr` by default
- ✅ FastMCP's `context.log` writes to `stderr`
- ❌ Never use `console.log()` in MCP server code
- ✅ Use `console.error()` for debugging

**Why?** The MCP stdio transport uses stdout exclusively for JSON-RPC protocol messages. Writing anything else to stdout will break the protocol.

```typescript
// ✅ Good - uses FastMCP logger (writes to stderr)
context.log.error('Tool execution failed', { tool: 'echo' });

// ✅ Good - for debugging
console.error('Debug info');

// ❌ BAD - breaks MCP stdio protocol!
console.log('This will break MCP!');
console.info('This will also break MCP!');
console.warn('This will also break MCP!');
```

### Log Levels

- `trace`: Detailed debugging information
- `debug`: Debugging information
- `info`: General informational messages (default)
- `warn`: Warning messages (e.g., validation errors)
- `error`: Error messages (e.g., unexpected failures)
- `fatal`: Critical errors requiring immediate attention

### Pretty Printing

In development (`NODE_ENV=development`), logs are pretty-printed:

```
[16:40:24 UTC] INFO: Server listening at http://127.0.0.1:3000
    endpoints: ["echo"]
[16:40:25 UTC] WARN: Validation error
    method: "POST"
    url: "/rpc/echo"
    reqId: "abc-123"
```

In production, logs are JSON for parsing:

```json
{"level":30,"time":1759596074699,"msg":"Server listening","host":"0.0.0.0","port":3000}
```

## Request ID Tracking

Every request gets a unique ID for correlation:

**REST:**
```bash
# Generated automatically
X-Request-Id: 2af7e653-8e51-41aa-b674-55a810506544
```

All logs for that request include `reqId: "2af7e653-8e51-41aa-b674-55a810506544"`

**MCP:**
Request IDs are passed to endpoint handlers via `config.requestId`

## Error Handler Middleware

The REST server uses custom error handlers:

```typescript
import { errorHandler, notFoundHandler } from './core/error-handler.js';

fastify.setErrorHandler(errorHandler);
fastify.setNotFoundHandler(notFoundHandler);
```

**Features:**
- Automatic Zod validation error handling
- Consistent error response format
- Request ID inclusion in error logs
- Stack trace logging for 500 errors
- Proper HTTP status codes

## Helper Functions

### `isRivetBenchError(error)`

Check if an error is a known RivetBench error:

```typescript
import { isRivetBenchError } from './core/errors.js';

if (isRivetBenchError(error)) {
  console.error('Known error:', error.code);
}
```

### `toRivetBenchError(error)`

Convert any error to a RivetBenchError:

```typescript
import { toRivetBenchError } from './core/errors.js';

try {
  // some code
} catch (error) {
  const rivetError = toRivetBenchError(error);
  logger.error(rivetError.toJSON());
}
```

## Best Practices

### 1. Use Specific Error Types

```typescript
// ✅ Good
throw new ValidationError('Email required', { field: 'email' });

// ❌ Bad
throw new Error('Email required');
```

### 2. Include Context in Details

```typescript
throw new InternalServerError('Database connection failed', {
  host: 'localhost',
  port: 5432,
  database: 'myapp'
});
```

### 3. Log with Structured Data

```typescript
// ✅ Good
logger.error({ userId, action: 'login', error: err.message }, 'Login failed');

// ❌ Bad
logger.error(`Login failed for user ${userId}: ${err.message}`);
```

### 4. Never Log to stdout in MCP

```typescript
// ✅ Good
console.error('Debug:', data);

// ❌ BAD - breaks MCP!
console.log('Debug:', data);
```

### 5. Use Child Loggers for Context

```typescript
const endpointLogger = createChildLogger({ endpoint: 'echo' });

endpointLogger.info('Processing request');
endpointLogger.warn('Invalid input');
// All logs automatically include endpoint: 'echo'
```

## Testing

Error handling is fully tested:

```bash
npm run test:unit  # Includes error class tests
npm run test:bdd   # Integration tests with error scenarios
```

See `test/core/errors.test.ts` for examples.

## Migration Guide

If you're upgrading from a previous version:

1. **Update error throws:**
   ```typescript
   // Old
   throw new Error('Endpoint not found');
   
   // New
   throw new EndpointNotFoundError(endpointName);
   ```

2. **Update error assertions:**
   ```typescript
   // Old
   expect(response.body).toEqual({ error: 'Endpoint not found' });
   
   // New
   expect(response.body.error).toHaveProperty('name', 'EndpointNotFoundError');
   expect(response.body.error).toHaveProperty('code', 'ENDPOINT_NOT_FOUND');
   ```

3. **Update logging:**
   ```typescript
   // Old
   console.log('Server started');
   
   // New
   logger.info({ port: 3000 }, 'Server started');
   ```
