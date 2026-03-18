# MCP Implementation Guide

## Overview

RivetBench exposes endpoints as MCP tools via the FastMCP adapter. In the hexagonal architecture, MCP is a **driving adapter** — it translates MCP tool calls into application service invocations.

## Stdio Protocol Safety

**Critical rule**: When running MCP over stdio transport, `stdout` is reserved exclusively for JSON-RPC messages. All diagnostic output must go to `stderr`.

```typescript
// ❌ BREAKS MCP stdio
console.log('anything');

// ✅ SAFE
console.error('diagnostic output');
```

See [ADR-0007](./adr/ADR-0007-mcp-stdio-protocol-safety.md) for the full rationale.

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `RIVETBENCH_MCP_TRANSPORT` | `stdio` | Transport mode: `stdio` or `tcp` |
| `RIVETBENCH_MCP_PORT` | `3001` | TCP port (only when transport=tcp) |

## Architecture

In the hexagonal model, the MCP adapter:

1. Receives a tool call from FastMCP
2. Delegates to `invokeEndpoint()` (application service)
3. Formats the result as MCP tool output (`{ content: [{ type: 'text', text }] }`)
4. Returns errors as `{ isError: true, content: [...] }`

The adapter does **not** perform its own input validation — that's the application service's job.

## Adding New Endpoints

New endpoints are automatically exposed as MCP tools when registered in the `EndpointRegistry`. No MCP-specific code is needed:

```typescript
const myEndpoint = makeEndpoint({
  name: 'my-endpoint',
  summary: 'Does something useful',
  input: z.object({ query: z.string() }),
  output: z.object({ answer: z.string() }),
  handler: async ({ input }) => ({ answer: `Result for: ${input.query}` }),
});

registry.register(myEndpoint);
// Automatically available as MCP tool "my-endpoint"
```

## Tool Naming

Use lowercase names with hyphens or underscores. Dots are discouraged — some MCP clients handle them inconsistently. The `makeEndpoint()` function warns on non-conforming names.

## Testing MCP

```bash
# Start MCP server in stdio mode
npm run dev:mcp

# Test with MCP inspector or compatible client
npx @modelcontextprotocol/inspector stdio -- npx tsx src/server/mcp.ts
```

## Dynamic Tool Notifications

When endpoints are added/removed at runtime via `registry.signalToolsChanged()`, the MCP adapter sends `notifications/tools/list_changed` to all connected sessions.
