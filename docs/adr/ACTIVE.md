# Active Architecture Decisions

Generated at 2026-03-18T06:38:58.737Z

| ID | Title | Status | Summary |
| --- | --- | --- | --- |
| ADR-0001 | ADR-0001: Hexagonal Architecture (Ports & Adapters) | accepted | Adopt hexagonal architecture to decouple domain logic from infrastructure, enabling transport adapters to be swapped or composed without touching business logic. |
| ADR-0002 | ADR-0002: Application Service Layer | accepted | Introduce an application service layer with a single invokeEndpoint() function that all transports delegate to, eliminating the duplicated validate-invoke-validate pipeline. |
| ADR-0003 | ADR-0003: Zod Schema as Domain Contract | accepted | Use Zod schemas as the single source of truth for input/output validation, TypeScript types, OpenAPI generation, and MCP tool definitions across all transports. |
| ADR-0004 | ADR-0004: Port Interfaces for Infrastructure Abstraction | accepted | Define port interfaces (LoggerPort, ContextFactory) so the application layer depends on abstractions, not concrete infrastructure like Pino or FastMCP. |
| ADR-0005 | ADR-0005: Framework-Agnostic Transport Adapters | accepted | Transport adapters produce mountable handlers rather than owning server lifecycle, enabling RivetBench to be embedded in existing Express, Hono, or Fastify applications. |
| ADR-0006 | ADR-0006: Structured Error Handling | accepted | Domain defines a RivetBenchError hierarchy for business errors. Adapters map these to transport-specific responses. No transport types in the domain. |
| ADR-0007 | ADR-0007: MCP Stdio Protocol Safety | accepted | Restrict all diagnostic output to stderr when running MCP in stdio mode. No console.log() in MCP adapter code. Use LoggerPort for safe, transport-aware logging. |
| ADR-0008 | ADR-0008: RPC-over-REST Design Pattern | accepted | Use RPC-over-REST with POST-only endpoints dispatched by name (POST /rpc/:name) rather than traditional RESTful resource modelling, optimising for transport parity with MCP tools. |
| ADR-0009 | ADR-0009: CLI Flag and Parameter Separation | accepted | Use double dashes (--) for CLI flags and single dash (-) for endpoint parameters to avoid naming collisions between framework flags and user-defined endpoint input. |
