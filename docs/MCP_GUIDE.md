# MCP Implementation Guide

**RivetBench MCP (Model Context Protocol) Server**

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Adding Endpoints](#adding-endpoints)
- [Testing](#testing)
- [Integration](#integration)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)

---

## Overview

RivetBench exposes all registered endpoints as MCP tools, enabling AI models to interact with your endpoints using the standardized Model Context Protocol. The same endpoint definitions work seamlessly for both REST and MCP.

### Key Features

- ✅ **Automatic tool registration**: All endpoints become MCP tools automatically
- ✅ **Schema validation**: Zod schemas are used for input/output validation
- ✅ **Multiple transports**: Supports both stdio and HTTP Stream (TCP)
- ✅ **Error handling**: Proper error messages returned to MCP clients
- ✅ **Type safety**: Full TypeScript support with inferred types
- ✅ **Production ready**: Comprehensive error handling and logging

### What is MCP?

The Model Context Protocol (MCP) is a standardized protocol that allows AI models (like Claude) to interact with external tools and services. RivetBench implements MCP, making your endpoints accessible to AI models through a standardized interface.

---

## Quick Start

### Start MCP Server (stdio)

The stdio transport uses standard input/output for communication. This is ideal for Claude Desktop integration, MCP Inspector testing, and process-based MCP clients.

```bash
npm run dev:mcp
```

Or explicitly:
```bash
RIVETBENCH_MCP_TRANSPORT=stdio npm run dev:mcp
```

### Start MCP Server (TCP)

The HTTP Stream transport uses HTTP for communication. This is ideal for web-based MCP clients, network-based integrations, and load-balanced deployments.

```bash
RIVETBENCH_MCP_TRANSPORT=tcp RIVETBENCH_MCP_PORT=3001 npm run dev:mcp
```

### Test with MCP Inspector

```bash
npx @modelcontextprotocol/inspector npx tsx src/server/mcp.ts
```

---

## Configuration

Configure the MCP server via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `RIVETBENCH_MCP_TRANSPORT` | `stdio` | Transport type: `stdio` or `tcp` |
| `RIVETBENCH_MCP_PORT` | `3001` | Port for TCP transport (only used when transport=tcp) |

### Example Configurations

**Development (stdio)**:
```bash
# .env
RIVETBENCH_MCP_TRANSPORT=stdio
```

**Production (TCP)**:
```bash
# .env
RIVETBENCH_MCP_TRANSPORT=tcp
RIVETBENCH_MCP_PORT=3001
```

---

## Architecture

### System Overview

```
┌─────────────────────────────────────┐
│     Your Endpoint Definition        │
│  (Write once with Zod schemas)      │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       │                │
   ┌───▼────┐      ┌───▼────┐
   │  REST  │      │  MCP   │
   │ Server │      │ Server │
   └───┬────┘      └───┬────┘
       │                │
       │                │
   HTTP/JSON      stdio/TCP
       │                │
  ┌────▼────┐    ┌─────▼─────┐
  │ Clients │    │ AI Models │
  │ Swagger │    │  Claude   │
  │  Apps   │    │  Others   │
  └─────────┘    └───────────┘
```

**Key Insight**: Same endpoint → Two protocols → Maximum reach

### Component Architecture

```
┌─────────────────────┐
│   MCP Client        │
│  (Claude, etc.)     │
└──────────┬──────────┘
           │
           │ stdio or HTTP Stream
           │
┌──────────▼──────────┐
│   FastMCP Server    │
│  - Tool registry    │
│  - Schema validation│
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Endpoint Registry  │
│  - Echo endpoint    │
│  - Custom endpoints │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Endpoint Handlers  │
│  - Business logic   │
│  - Zod validation   │
└─────────────────────┘
```

### Request Flow

```
Endpoint Registry
    ↓
MCP Server (FastMCP)
    ↓
Tools (1 per endpoint)
    ↓
Zod Schema Validation
    ↓
Handler Execution
    ↓
Response Formatting
```

---

## Adding Endpoints

### Step 1: Define Your Endpoint

Each endpoint registered in the registry is automatically exposed as an MCP tool:

```typescript
// src/endpoints/myendpoint.ts
import { z } from 'zod';
import { makeEndpoint } from '../core/endpoint.js';

export const myEndpoint = makeEndpoint({
  name: 'my-tool',
  summary: 'Does something useful',
  description: 'Detailed description for AI models',
  input: z.object({
    param1: z.string(),
    param2: z.number().optional()
  }),
  output: z.object({
    result: z.string()
  }),
  handler: async ({ input }) => {
    return { result: `Processed: ${input.param1}` };
  }
});
```

### Step 2: Register the Endpoint

```typescript
// src/endpoints/index.ts
import { myEndpoint } from './myendpoint.js';

export const createDefaultRegistry = () => {
  const registry = new InMemoryEndpointRegistry();
  registry.register(myEndpoint);
  return registry;
};
```

This endpoint becomes an MCP tool named `my-tool` with:
- **Name**: `my-tool`
- **Description**: "Detailed description for AI models"
- **Parameters**: JSON Schema derived from Zod schema
- **Response**: JSON object validated against output schema

### Example: Calculator Endpoint

```typescript
// src/endpoints/calculate.ts
import { z } from 'zod';
import { makeEndpoint } from '../core/endpoint.js';

export const calculateEndpoint = makeEndpoint({
  name: 'calculate',
  summary: 'Perform basic math operations',
  description: 'Add, subtract, multiply, or divide two numbers',
  input: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number()
  }),
  output: z.object({
    result: z.number()
  }),
  handler: async ({ input }) => {
    const { operation, a, b } = input;
    let result: number;
    
    switch (operation) {
      case 'add': result = a + b; break;
      case 'subtract': result = a - b; break;
      case 'multiply': result = a * b; break;
      case 'divide': 
        if (b === 0) throw new Error('Division by zero');
        result = a / b;
        break;
    }
    
    return { result };
  }
});
```

That's it! Your endpoint is now available:
- As REST: `POST /rpc/calculate`
- As MCP: `calculate` tool
- With Swagger docs at `/docs`
- With full validation on both protocols

---

## Testing

### Unit Tests

The MCP server has comprehensive unit tests in `test/server/mcp.test.ts`:

```bash
npm test
```

**Test Coverage**:
- Server initialization
- Endpoint registration
- Schema validation
- Handler execution
- Input/output validation
- Error handling

### Manual Testing with MCP Inspector

You can test your MCP server using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Test your server
npx @modelcontextprotocol/inspector npx tsx src/server/mcp.ts
```

The inspector provides a web UI where you can:
- View all registered tools
- Test tool invocation
- Inspect request/response payloads
- Debug schema validation

### Testing Transports

**stdio Transport**:
```bash
npm run dev:mcp
# Server will wait for input on stdin
```

**TCP Transport**:
```bash
RIVETBENCH_MCP_TRANSPORT=tcp RIVETBENCH_MCP_PORT=3001 npm run dev:mcp
# Server will listen on port 3001
```

---

## Integration

### Claude Desktop

Add to your Claude Desktop config:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Production** (compiled):
```json
{
  "mcpServers": {
    "rivetbench": {
      "command": "node",
      "args": [
        "/path/to/rivetbench/dist/server/mcp.js"
      ]
    }
  }
}
```

**Development** (TypeScript):
```json
{
  "mcpServers": {
    "rivetbench": {
      "command": "npx",
      "args": [
        "tsx",
        "/path/to/rivetbench/src/server/mcp.ts"
      ]
    }
  }
}
```

After updating the config:
1. Quit Claude Desktop completely
2. Restart Claude Desktop
3. Your tools will appear in Claude's tool list

### Custom MCP Clients

For custom MCP client integration:

**stdio Transport**:
```typescript
import { spawn } from 'child_process';

const server = spawn('npx', ['tsx', 'src/server/mcp.ts'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Communicate via server.stdin and server.stdout
```

**TCP Transport**:
```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamTransport } from '@modelcontextprotocol/sdk/client/stream.js';

const transport = new StreamTransport({
  url: 'http://localhost:3001'
});

const client = new Client({
  name: 'my-client',
  version: '1.0.0'
}, {
  capabilities: {}
});

await client.connect(transport);
```

---

## Troubleshooting

### "Could not infer client capabilities" Warning

**Issue**: This warning appears when running the MCP server without a connected client.

**Solution**: This is expected during development and can be ignored. The server is working correctly. The warning only appears when testing the server standalone.

### Connection Issues with stdio

**Issue**: Client can't connect via stdio transport.

**Solutions**:
- Ensure no other process is writing to stdout/stderr
- Verify the MCP client is configured correctly
- Check that the server process has proper permissions
- Try explicitly setting `RIVETBENCH_MCP_TRANSPORT=stdio`

### TCP Connection Issues

**Issue**: Client can't connect to TCP transport.

**Solutions**:
- Ensure the port is not in use: `lsof -i :3001`
- Check firewall allows connections on the configured port
- Verify the client is connecting to the correct host and port
- Try a different port: `RIVETBENCH_MCP_PORT=3002`

### Validation Errors

**Issue**: Tool invocation returns validation errors.

**Solutions**:
- Check the input matches the Zod schema exactly
- Review the error message for specific validation failures
- Test the endpoint via REST first to isolate MCP-specific issues
- Use MCP Inspector to see the full schema

### Server Crashes

**Issue**: MCP server crashes or exits unexpectedly.

**Solutions**:
- Check server logs for error messages
- Ensure all dependencies are installed: `npm install`
- Verify Node.js version is 20 or higher
- Try running with more verbose logging
- Check that endpoint handlers don't have unhandled promise rejections

---

## Best Practices

### 1. Descriptive Names

Use clear, hyphenated tool names that describe the action:

✅ **Good**: `calculate-tax`, `send-email`, `fetch-weather`  
❌ **Bad**: `calc`, `email`, `weather`

### 2. Comprehensive Descriptions

Write descriptions that help AI models understand when to use the tool:

✅ **Good**:
```typescript
{
  name: 'calculate-tax',
  summary: 'Calculate sales tax for a purchase',
  description: 'Calculates the sales tax amount and total price for a purchase based on the item price and tax rate. Returns both the tax amount and final total.'
}
```

❌ **Bad**:
```typescript
{
  name: 'calculate-tax',
  summary: 'Tax calculator',
  description: 'Calculates tax'
}
```

### 3. Rich Schema Validation

Use Zod's full validation features:

```typescript
input: z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(120),
  username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/),
  website: z.string().url().optional()
})
```

### 4. Clear Error Messages

Provide context in error messages:

```typescript
handler: async ({ input }) => {
  if (input.amount < 0) {
    throw new Error('Amount must be non-negative');
  }
  if (input.currency !== 'USD') {
    throw new Error(`Unsupported currency: ${input.currency}`);
  }
  // ... rest of handler
}
```

### 5. Idempotency

Make tools idempotent when possible:

```typescript
// ✅ Idempotent - same input always returns same output
handler: async ({ input }) => {
  return { result: input.a + input.b };
}

// ❌ Not idempotent - depends on external state
handler: async ({ input }) => {
  return { result: Math.random() };
}
```

### 6. Documentation

Document complex schemas and business logic:

```typescript
/**
 * Calculates compound interest
 * Formula: A = P(1 + r/n)^(nt)
 * where:
 *   A = final amount
 *   P = principal (initial investment)
 *   r = annual interest rate (decimal)
 *   n = number of times interest is compounded per year
 *   t = number of years
 */
export const compoundInterestEndpoint = makeEndpoint({
  // ...
});
```

---

## API Reference

### Response Format

#### Success Response

Tools return responses in MCP's content format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"result\": \"Processed: hello\"}"
    }
  ]
}
```

#### Error Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"error\": \"Validation failed: ...\"}"
    }
  ],
  "isError": true
}
```

### Error Handling

The MCP server handles errors gracefully:

1. **Validation Errors**: Zod validation errors are caught and returned with details
2. **Handler Errors**: Runtime errors in handlers are caught and logged
3. **Schema Errors**: Output validation failures are reported

All errors are returned in MCP's content format with `isError: true`.

### Schema Conversion

Zod schemas are passed directly to FastMCP as StandardSchema (v1) compatible schemas. FastMCP handles the conversion to MCP's JSON Schema format internally.

### Context Object

Each tool execution receives a context object with:

- `context.log`: Structured logging (debug, info, warn, error)
- `context.session`: Authentication session (if configured)
- `context.reportProgress`: Progress reporting for long operations
- `context.streamContent`: Content streaming support

Example usage:

```typescript
handler: async ({ input, context }) => {
  context.log.info('Processing request', { input });
  
  // Long operation
  for (let i = 0; i < 10; i++) {
    await context.reportProgress(i / 10, 'Processing...');
    // do work
  }
  
  return { result: 'done' };
}
```

### Logging

The MCP server logs:
- Server startup and configuration
- Tool registration
- Tool execution errors
- Client connection status

---

## Implementation Details

### Technology Stack

- **fastmcp** (v3.19.0): High-level MCP server framework
- **zod**: Schema validation (shared with REST)
- **@modelcontextprotocol/sdk**: MCP protocol implementation (transitive)

### File Structure

```
src/
├── server/
│   └── mcp.ts          # MCP server implementation
├── config/
│   └── index.ts        # Configuration (includes MCP env vars)
├── core/
│   ├── endpoint.ts     # Endpoint factory
│   └── registry.ts     # Endpoint registry
└── endpoints/
    ├── index.ts        # Registry initialization
    └── echo.ts         # Example endpoint

test/
└── server/
    └── mcp.test.ts     # MCP server tests
```

---

## Success Metrics

✅ **Functional**: Both REST and MCP servers work  
✅ **Tested**: 27 unit tests passing  
✅ **Documented**: Complete guides and examples  
✅ **Type Safe**: Full TypeScript coverage  
✅ **Configurable**: Environment variables supported  
✅ **Validated**: Zod schemas on both protocols  
✅ **Error Handling**: Graceful failures  
✅ **Production Ready**: Can deploy today  

---

## References

- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
- [FastMCP Documentation](https://github.com/wong2/fastmcp)
- [Zod Documentation](https://zod.dev/)
- [Claude Desktop MCP Configuration](https://docs.anthropic.com/claude/docs/model-context-protocol)

---

## Next Steps

Recommended improvements for the MCP implementation:

1. **Authentication**: Add session-based authentication for sensitive tools
2. **Rate Limiting**: Implement rate limiting for production deployments
3. **Monitoring**: Add metrics and monitoring for tool usage
4. **Caching**: Cache expensive operations with appropriate TTLs
5. **Streaming**: Implement streaming responses for long-running operations

---

**Happy coding! 🚀**

*The MCP implementation is complete and production-ready. Write once, expose everywhere!*
