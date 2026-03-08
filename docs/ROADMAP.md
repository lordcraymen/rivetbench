# RivetBench Development Roadmap

This document outlines the development history and next steps for the RivetBench framework.

## Current Status

**Version**: 0.2.0  
**Date**: March 2026

### What's Working

✅ **Core Framework**: Write-once endpoints with Zod schemas  
✅ **REST Server**: Full REST API with Swagger UI at `/docs`  
✅ **MCP Server**: Dual transport (stdio + HTTP Stream) MCP implementation  
✅ **Schema Generation**: Automatic OpenAPI + MCP JSON Schema  
✅ **CLI Tool**: Full CLI with named parameters, JSON input, and raw output  
✅ **BDD Testing**: Cucumber step definitions and integration tests  
✅ **Error Handling**: Custom error classes and structured logging  
✅ **Request ID Parity**: UUID-based request tracing across all transports  
✅ **Dynamic Tool Notifications**: Runtime tool-list changes with MCP push + REST ETag  
✅ **Tool Enrichers**: Per-request tool list filtering/annotation  
✅ **CI/CD**: GitHub Actions with Node 20.x and 22.x  
✅ **Quality**: Pre-commit hooks, linting, type checking

---

## Next: Version 0.3.0 — Embedding & AI Agent Experience

> **Theme**: Make rivetbench a first-class *library dependency* for AI agents and human developers building on top of it.  
> **Origin**: Real-world integration feedback from an agent embedding rivetbench as a downstream dependency.

### 1. Programmatic Config Overrides (Priority: P0)
**Status**: 🔴 Not Started  
**Effort**: Small

`loadConfig()` currently only reads env vars. Library consumers need programmatic overrides:
```ts
// Current — forces mutation or env-var hacks
const config = loadConfig();
config.application.name = 'my-app'; // 🤮

// Target — clean DeepPartial merge
const config = loadConfig({
  application: { name: 'my-app' },
  mcp: { transport: 'stdio' },
});
```

Tasks:
- [ ] Add `DeepPartial<ServerConfig>` override parameter to `loadConfig()`
- [ ] Deep-merge overrides with env-var defaults (overrides win)
- [ ] Unit tests for merge behavior and edge cases
- [ ] Update JSDoc and README

### 2. Custom Handler Context / Dependency Injection (Priority: P0)
**Status**: 🔴 Not Started  
**Effort**: Medium

`EndpointContext` currently provides only `{ input, config }`. Consumers who need to inject custom dependencies (DB connections, WebSocket relays, auth state) are forced into module-level singletons:
```ts
// Current workaround — module-level state
let dispatch: DispatchFn | null = null;
export function setDispatch(fn: DispatchFn) { dispatch = fn; }

// Target — typed context injection
makeEndpoint({
  name: 'graph.getState',
  input: z.object({}),
  output: GraphSchema,
  handler: async ({ input, ctx }) => ctx.relay.dispatch('getGraph'),
  //                       ^^^ typed, injected at server/registry level
});
```

Tasks:
- [ ] Add generic context type parameter to `makeEndpoint` / `EndpointDefinition`
- [ ] Extend `EndpointContext` to include an optional user-provided `ctx`
- [ ] Allow context factory injection at registry or server creation level
- [ ] Maintain backward compatibility (no `ctx` required by default)
- [ ] Unit tests and migration guide
- [ ] Update endpoint and registry JSDoc

### 3. API Reference in README (Priority: P1)
**Status**: 🔴 Not Started  
**Effort**: Small

The npm README is the **only** thing an AI agent sees on first contact. Currently missing API signatures — agents must `cat` 4+ `.d.ts` files to understand the types. This costs ~5k tokens of exploration per first-time integration.

Tasks:
- [ ] Add `## API Reference` section to README
- [ ] Document key signatures: `makeEndpoint`, `EndpointDefinition`, `EndpointContext`, `InMemoryEndpointRegistry`, `createRestServer`, `startMcpServer`, `loadConfig`
- [ ] Include one complete programmatic embedding example (not just CLI/dev-mode)
- [ ] Clarify REST server return type (`{ fastify, start() }`) and lifecycle

### 4. Sub-Export `./core` for Tree-Shaking (Priority: P1)
**Status**: 🔴 Not Started  
**Effort**: Small

Importing `@lordcraymen/rivetbench` pulls in Fastify, fastmcp, Pino, etc. Consumers who only need `makeEndpoint` + `InMemoryEndpointRegistry` (endpoint definition files) get all transport dependencies transitively.

Tasks:
- [ ] Add `@lordcraymen/rivetbench/core` export map entry in package.json
- [ ] Core sub-export includes: `makeEndpoint`, `EndpointDefinition`, `EndpointContext`, `InMemoryEndpointRegistry`, `EndpointRegistry`, error classes
- [ ] Core sub-export does NOT import Fastify, fastmcp, or Pino
- [ ] Verify tree-shaking works with bundlers
- [ ] Document in README

### 5. MCP Server Lifecycle Handle (Priority: P2)
**Status**: 🔴 Not Started  
**Effort**: Medium

`startMcpServer` is fire-and-forget — no way to stop/restart. Blocks proper testing and graceful shutdown:
```ts
// Current
await startMcpServer({ registry, config }); // no handle returned

// Target
const mcp = createMcpServer({ registry, config });
await mcp.start();
// later...
await mcp.stop();
```

Tasks:
- [ ] Refactor `startMcpServer` → `createMcpServer` returning lifecycle handle
- [ ] Expose `start()` / `stop()` methods
- [ ] Keep `startMcpServer` as convenience wrapper (non-breaking)
- [ ] Unit tests for start/stop lifecycle
- [ ] Update README and MCP guide

### 6. MCP Tool Naming Guidance (Priority: P2)
**Status**: 🔴 Not Started  
**Effort**: Tiny

Dots in MCP tool names (`graph.getState`) are handled inconsistently by some MCP clients. Since rivetbench controls tool registration, a naming recommendation prevents interop issues.

Tasks:
- [ ] Document recommended naming convention (underscores preferred, dots discouraged)
- [ ] Consider optional name validation/warning in `makeEndpoint`
- [ ] Add guidance to README and MCP guide

### 7. Request ID Parity — BDD Test Completion (Priority: P2)
**Status**: 🟡 Partially Complete  
**Carry-over from v0.2.0**

Implementation is complete (all 3 transports generate + pass UUIDs), but BDD scenarios in `request-id-parity.feature` are still tagged `@wip`.

Tasks:
- [ ] Implement BDD step definitions for request ID scenarios
- [ ] Move feature tags from `@wip` to `@implemented`

---

## Version 0.4.0 — Middleware & Production Readiness

### 1. Middleware System (Priority: MEDIUM)
**Status**: 🔴 Not Started

Pre/post processing for endpoints:
- [ ] Design middleware architecture
- [ ] Async middleware chain support
- [ ] Built-in middleware (auth, logging, rate limiting)
- [ ] Documentation and examples

### 2. Performance & Monitoring (Priority: MEDIUM)
**Status**: 🔴 Not Started

Production-ready features:
- [ ] Request/response compression
- [ ] Rate limiting
- [ ] Metrics and monitoring (Prometheus)
- [ ] Enhanced health checks
- [ ] Graceful shutdown
- [ ] Docker support

---

## Future: Version 0.5.0+ — Extensions

### Developer Experience
**Status**: 💭 Planned

- [ ] CLI tool for scaffolding endpoints
- [ ] Hot reload for development
- [ ] VSCode snippets/extension
- [ ] Better error messages
- [ ] OpenAPI example generation

### Advanced Features
**Status**: 💭 Planned

- [ ] WebSocket support
- [ ] GraphQL endpoint generation
- [ ] Authentication/Authorization framework
- [ ] Database integration helpers
- [ ] File upload handling
- [ ] Streaming responses

### Documentation & Community
**Status**: 💭 Planned

- [ ] Architecture documentation with diagrams
- [ ] Tutorial series
- [ ] Example applications
- [ ] Video tutorials
- [ ] Community templates

---

## Implementation Principles

When implementing features, follow this process:

1. **Interface First**: Define the interface and types before implementation
2. **BDD Approach**: Write feature files to describe behavior
3. **Type Safety**: Ensure full TypeScript coverage
4. **Test Coverage**: Unit + integration tests for all features
5. **Documentation**: Update docs before merging
6. **CI Verification**: All checks must pass before merge

See `AGENTS.MD` for detailed workflow guidance.

---

## Version History

### Version 0.2.0 (March 2026) — Triple Transport & Dynamic Tools
**Highlights**: Request ID parity, tool enrichers, dynamic notifications, ETag caching

**Added**:
- Request ID parity: `crypto.randomUUID()` tracing across REST, MCP, and CLI
- Tool enrichers: per-request tool list filtering/annotation via `setToolEnricher()`
- Dynamic tool notifications: `signalToolsChanged()` with MCP push + REST ETag
- REST `GET /tools` with `ETag` / `If-None-Match` caching
- CLI flag/parameter separation (double-dash for CLI flags, single-dash for endpoint params)
- Collision detection for endpoint naming
- Unit tests for request ID parity across transports

**Remaining**:
- BDD scenarios for request ID parity still `@wip` (carried to v0.3.0)

### Version 0.1.0 (February 2026) — Initial Release
**Highlights**: Complete dual-exposure framework (REST + MCP) with CLI and BDD testing

**Added**:
- Core endpoint system with Zod schemas
- REST server with Fastify and Swagger UI
- MCP server with dual transport (stdio + TCP)
- OpenAPI 3 generation
- Custom error classes and structured logging
- Request ID tracking through pipeline
- CLI tool with named parameters, JSON input, and raw output mode
- Complete Cucumber/BDD step definitions for all transports
- Integration tests with real server instances
- Comprehensive unit + integration test suite
- CI/CD pipeline with GitHub Actions (Node 20.x + 22.x)
- Pre-commit hooks and quality checks

**Documentation**:
- Complete MCP implementation guide
- Contributing guidelines
- Architecture decision records (ADRs)
- Testing guide and BDD workflow

---

## Contributing

See `CONTRIBUTING.md` for:
- Development setup
- Branch naming conventions
- Commit message format
- Pull request process
- Code review guidelines

---

## Questions?

- **Getting Started**: See `README.md`
- **Development Workflow**: See `CONTRIBUTING.md`
- **Agent Guidelines**: See `AGENTS.MD`
- **MCP Details**: See `docs/MCP_GUIDE.md`

Happy coding! 🚀
