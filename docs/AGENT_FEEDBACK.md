# Real-World Agent Integration Feedback

> **Context**: This is unedited feedback from an AI agent that integrated rivetbench as a downstream dependency in a real project. It served as the primary input for the **v0.3.0 Embedding & AI Agent Experience** milestone in [ROADMAP.md](ROADMAP.md). The roadmap defines the actual feature scope and priorities — this document preserves the original observations for background.

---

Honest feedback from having just integrated it as a downstream dependency:

### What's great

- **`makeEndpoint` is the right abstraction.** Zod in, Zod out, handler. Three lines of ceremony per tool. This is exactly the unit of composition AI agents and humans both want.
- **Triple transport for free is the killer feature.** I defined 12 endpoints and got MCP + REST/Swagger + CLI without thinking about it. That's real leverage.
- **Zod schemas ARE the AI-readable docs.** The agent sees the input/output schema and just knows what to send. This is better than any description string.

### Friction I actually hit during this integration

**1. No programmatic config override.** I had to do this:
```ts
const config = loadConfig();
config.application.name = 'webmcp-bridge';  // mutating the return value 🤮
config.rest.port = restPort;
```
`loadConfig()` only reads env vars. For library consumers embedding rivetbench, I want:
```ts
const config = loadConfig({
  application: { name: 'webmcp-bridge' },
  mcp: { transport: 'stdio' },
});
```
A `DeepPartial<ServerConfig>` override parameter with defaults would fix this.

**2. REST server API surprised me.** I wrote `restServer.listen(...)` because that's what Fastify does. The actual API is `.start()`. I only discovered this from the type error. The README doesn't show programmatic REST startup — only `npm run dev:rest`.

**3. No custom handler context / DI.** `EndpointContext` gives me `{ input, config }`. But I needed to inject a WebSocket relay connection. I had to fall back to module-level state:
```ts
let bridgeDispatch: BridgeDispatchFn | null = null;
export function setBridgeDispatch(fn) { bridgeDispatch = fn; }
```
If `makeEndpoint` accepted a generic context type that gets injected at registry or server level, this would be much cleaner:
```ts
makeEndpoint({
  name: 'graph.getState',
  input: z.object({}),
  output: GraphSchema,
  handler: async ({ input, ctx }) => ctx.relay.dispatch('getGraph'),
  //                       ^^^ typed, injected at server creation
});
```

**4. Single export entry point.** Importing `@lordcraymen/rivetbench` pulls in Fastify, fastmcp, Pino, etc. For consumers who only need `makeEndpoint` + `InMemoryEndpointRegistry` (my case — transport setup is in a separate file), a `@lordcraymen/rivetbench/core` sub-export that's tree-shakeable would help. Right now my bridge package transitively depends on all of Fastify even though the endpoints file doesn't need it.

**5. `startMcpServer` is fire-and-forget.** There's no `createMcpServer` that returns a handle I can stop/restart. For testing and graceful shutdown, a factory + explicit lifecycle would be more composable:
```ts
const mcp = createMcpServer({ registry, config });
await mcp.start();
// later...
await mcp.stop();
```

### AIX-specific (AI agent experience)

**6. The npm README is the only thing an AI agent sees, and it's missing API signatures.** I had to `cat` four separate `.d.ts` files to understand the types. An `## API Reference` section in the README with the key type signatures (`makeEndpoint`, `EndpointDefinition`, `EndpointContext`, `InMemoryEndpointRegistry.register`) would let an AI agent start coding immediately without filesystem exploration.

**7. Consider naming guidance for MCP tool names.** I used dots (`graph.getState`) which some MCP clients handle inconsistently. The docs could recommend a naming convention (dots vs underscores vs hyphens) since rivetbench controls the MCP tool registration.

### Priority ranking for DX/AIX impact

| Priority | Issue | Effort |
|----------|-------|--------|
| **P0** | Programmatic config overrides (#1) | Small — `DeepPartial` merge in `loadConfig` |
| **P0** | Custom handler context/DI (#3) | Medium — generic on `makeEndpoint` + registry injection |
| **P1** | API reference in README (#6) | Small — copy from `.d.ts` |
| **P1** | Sub-export `./core` (#4) | Small — add export map entry |
| **P2** | Server lifecycle handle (#5) | Medium |
| **P2** | REST startup docs (#2) | Tiny |

The core `makeEndpoint` abstraction is solid. The gaps are all in the embedding/composition layer — which is exactly where AI agents operate (they're building *on top of* rivetbench, not using the CLI). Fixing #1 and #3 would make rivetbench significantly better as a framework dependency vs. a standalone scaffold.