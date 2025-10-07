---
title: "ADR-0003: Dependency Injection Pattern"
date: "2025-10-07"
status: accepted
tags:
  - architecture
  - dependency-injection
  - configuration
  - solid-principles
modules:
  - src/config/
  - src/server/
  - src/core/
summary: >-
  Load configuration once at application entry point and inject as parameter to all components, eliminating hidden dependencies and enabling deterministic testing.
---

# Context

Initial implementation suffered from configuration management problems:

1. **Multiple Config Loading**: `loadConfig()` called multiple times during startup (4+ calls)
2. **Configuration Drift**: Different parts of app potentially loaded different config states
3. **Hidden Dependencies**: Functions internally called `loadConfig()` without declaring the dependency
4. **Race Conditions**: Config loading could happen at different times with different results
5. **Testing Difficulties**: Hard to inject mock configurations for testing
6. **SOLID Violations**: Violated Dependency Inversion Principle with hidden dependencies

Example of the problem:
```typescript
// ❌ BAD: Hidden dependencies, multiple config loads
export function createLogger(): PinoLogger {
  const config = loadConfig();  // Call 1
  // ...
}

export const createRestServer = async ({ registry }) => {
  const config = loadConfig();  // Call 2
  const logger = createLogger(); // Triggers call 1 again!
  // ...
}
```

# Decision

Implement dependency injection pattern:

1. **Single Config Load**: Load configuration once at application entry point only
2. **Explicit Dependencies**: All functions accept configuration as parameter
3. **Constructor Injection**: Pass dependencies through function parameters and constructors
4. **No Hidden Dependencies**: Never call `loadConfig()` inside library functions
5. **Consistent Configuration**: Same config instance used throughout entire application lifecycle

Pattern:
```typescript
// ✅ GOOD: Explicit dependency injection
export function createLogger(config: ServerConfig): PinoLogger {
  // Config passed as parameter
}

export const createRestServer = async ({ registry, config }: RestServerOptions) => {
  const logger = createLogger(config);  // Injected config
  // ...
}

// At application entry point only
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();  // Load ONCE
  const server = await createServer(config);
}
```

# Consequences

## Positive

- **Deterministic**: Configuration loaded once, no race conditions or drift
- **Testable**: Easy to inject mock configurations for testing
- **Explicit Dependencies**: Clear contracts showing what each component needs
- **SOLID Compliance**: Follows Dependency Inversion Principle properly
- **Performance**: Avoid repeated config loading and parsing
- **Debugging**: Easier to trace configuration values and changes

## Negative

- **Boilerplate**: More verbose function signatures with explicit parameters
- **Initial Setup**: Requires more careful coordination at application startup
- **Learning Curve**: Developers must understand DI pattern rather than just calling `loadConfig()`

## Implementation Guidelines

- Load config **once** at application entry (`if (import.meta.url === ...)` pattern)
- All functions accept config/logger/dependencies as parameters
- Use TypeScript interfaces to define dependency contracts
- Never call `loadConfig()` inside library functions

# References

- SOLID Principles documentation in `docs/ARCHITECTURE.md`
- `src/config/index.ts` - Configuration loading
- `src/server/rest.ts` and `src/server/mcp.ts` - Entry points with single config load
- Agent policy `[SOLID-DIP-03]` in `AGENTS.MD`