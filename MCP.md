# MCP Server Implementation

This document describes RivetBench's MCP (Model Context Protocol) server implementation.

## Overview

RivetBench exposes all registered endpoints as MCP tools, enabling AI models to interact with your endpoints using the standardized Model Context Protocol. The same endpoint definitions work seamlessly for both REST and MCP.

## Features

- ✅ **Automatic tool registration**: All endpoints become MCP tools automatically
- ✅ **Schema validation**: Zod schemas are used for input/output validation
- ✅ **Multiple transports**: Supports both stdio and HTTP Stream (TCP)
- ✅ **Error handling**: Proper error messages returned to MCP clients
- ✅ **Type safety**: Full TypeScript support with inferred types

## Transports

### stdio Transport (Default)

The stdio transport uses standard input/output for communication. This is ideal for:
- Claude Desktop integration
- MCP Inspector testing
- Process-based MCP clients

```bash
npm run dev:mcp
```

Or explicitly:
```bash
RIVETBENCH_MCP_TRANSPORT=stdio npm run dev:mcp
```

### HTTP Stream Transport (TCP)

The HTTP Stream transport uses HTTP for communication. This is ideal for:
- Web-based MCP clients
- Network-based integrations
- Load-balanced deployments

```bash
RIVETBENCH_MCP_TRANSPORT=tcp RIVETBENCH_MCP_PORT=3001 npm run dev:mcp
```

## Configuration

Configure the MCP server via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `RIVETBENCH_MCP_TRANSPORT` | `stdio` | Transport type: `stdio` or `tcp` |
| `RIVETBENCH_MCP_PORT` | `3001` | Port for TCP transport (only used when transport=tcp) |

## Tool Registration

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

## Response Format

Tools return responses in MCP's content format:

### Success Response
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

### Error Response
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

## Testing with MCP Inspector

You can test your MCP server using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Test your server
mcp-inspector npx tsx src/server/mcp.ts
```

## Integration with Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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

Or for development:

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

## Architecture

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

## Error Handling

The MCP server handles errors gracefully:

1. **Validation Errors**: Zod validation errors are caught and returned with details
2. **Handler Errors**: Runtime errors in handlers are caught and logged
3. **Schema Errors**: Output validation failures are reported

All errors are returned in MCP's content format with `isError: true`.

## Implementation Details

### Schema Conversion

Zod schemas are passed directly to FastMCP as StandardSchema (v1) compatible schemas. FastMCP handles the conversion to MCP's JSON Schema format internally.

### Context

Each tool execution receives a context object with:
- `context.log`: Structured logging (debug, info, warn, error)
- `context.session`: Authentication session (if configured)
- `context.reportProgress`: Progress reporting for long operations
- `context.streamContent`: Content streaming support

### Logging

The MCP server logs:
- Server startup and configuration
- Tool registration
- Tool execution errors
- Client connection status

## Best Practices

1. **Descriptive Names**: Use clear, hyphenated tool names (e.g., `calculate-tax`, `send-email`)
2. **Good Descriptions**: Write descriptions that help AI models understand when to use the tool
3. **Schema Validation**: Use Zod's rich validation features (min, max, email, regex, etc.)
4. **Error Messages**: Provide clear error messages in handler exceptions
5. **Idempotency**: Make tools idempotent when possible
6. **Documentation**: Document complex input/output structures

## Troubleshooting

### "Could not infer client capabilities" Warning

This warning appears when running the MCP server without a connected client. It's expected during development and can be ignored. The server is working correctly.

### Connection Issues with stdio

Ensure:
- No other process is writing to stdout/stderr
- The MCP client is configured correctly
- The server process has proper permissions

### TCP Connection Issues

Ensure:
- The port is not in use by another process
- Firewall allows connections on the configured port
- The client is connecting to the correct host and port

## References

- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
- [FastMCP Documentation](https://github.com/wong2/fastmcp)
- [Zod Documentation](https://zod.dev/)
