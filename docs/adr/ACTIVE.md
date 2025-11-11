# Active Architecture Decisions

Generated at 2025-11-11T12:00:00.000Z

| ID | Title | Status | Summary |
| --- | --- | --- | --- |
| ADR-0001 | ADR-0001: Dual Transport Architecture (REST + MCP) | accepted | Implement unified endpoints that can be exposed over both REST HTTP and MCP (Model Context Protocol) transports, enabling AI agents and traditional HTTP clients to use the same business logic. |
| ADR-0002 | ADR-0002: RPC-over-REST Design Pattern | accepted | Use RPC-over-REST pattern with POST-only endpoints dispatched by name rather than traditional RESTful resource modeling, optimizing for AI agent interaction and unified transport behavior. |
| ADR-0003 | ADR-0003: Dependency Injection Pattern | accepted | Load configuration once at application entry point and inject as parameter to all components, eliminating hidden dependencies and enabling deterministic testing. |
| ADR-0004 | ADR-0004: Zod Schema-Driven Architecture | accepted | Use Zod schemas as the single source of truth for input/output validation, TypeScript types, OpenAPI documentation, and MCP tool definitions across all transports. |
| ADR-0005 | ADR-0005: MCP Stdio Logging Constraints | accepted | Restrict all diagnostic output to stderr when running MCP in stdio mode to prevent corruption of JSON-RPC protocol stream on stdout. |
| ADR-0006 | ADR-0006: Structured Error Handling | accepted | Define custom error classes extending RivetBenchError base class with structured JSON serialization for consistent error responses across REST and MCP transports. |
| ADR-0007 | ADR-0007: Transport Parity Requirements | accepted | Enforce identical behavior across REST and MCP transports including request ID generation, validation, error handling, and request tracing for consistent client experience. |
| ADR-0008 | ADR-0008: CLI Flag and Parameter Separation | active | Use double dashes (--) for CLI flags and single dash (-) for endpoint parameters to avoid naming collisions. Rename --input to --params-json for clarity. |
