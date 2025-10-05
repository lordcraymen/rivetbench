# SOLID Principles in RivetBench

This document outlines how SOLID principles are applied in RivetBench and provides guidance for maintaining these standards in future development.

## Overview

SOLID is an acronym for five design principles that make software designs more understandable, flexible, and maintainable:

- **S**ingle Responsibility Principle
- **O**pen/Closed Principle
- **L**iskov Substitution Principle
- **I**nterface Segregation Principle
- **D**ependency Inversion Principle

## 1. Single Responsibility Principle (SRP)

> A class/module should have one, and only one, reason to change.

### Implementation in RivetBench

#### ✅ Good Examples

**Config Loading** (`src/config/index.ts`)
- **Single Responsibility**: Load and validate configuration from environment variables
- **Does NOT**: Create loggers, start servers, or handle endpoints
- Each function has one clear purpose

**Logger** (`src/core/logger.ts`)
- **Single Responsibility**: Create and configure logging infrastructure
- **Does NOT**: Load config, handle errors, or manage server lifecycle
- Pure function that transforms config into a logger instance

**Error Handling** (`src/core/error-handler.ts`)
- **Single Responsibility**: Transform errors into consistent HTTP responses
- **Does NOT**: Make business logic decisions or call endpoints
- Focused solely on error-to-response mapping

**Server Creation** (`src/server/rest.ts`, `src/server/mcp.ts`)
- **Single Responsibility**: Compose components into a running server
- **Does NOT**: Implement endpoint logic or create configurations
- Orchestrates dependencies without business logic

#### ❌ Anti-Pattern to Avoid

```typescript
// BAD: Multiple responsibilities
export function createLogger() {
  const config = loadConfig();        // Config loading
  const logger = pino(config.logging); // Logger creation
  registerGlobalLogger(logger);        // Global state management
  startHealthCheck(logger);            // Health check logic
  return logger;
}
```

### Guidelines

- Each module should do **one thing well**
- If you're using "and" to describe what a function does, it probably does too much
- Functions should be small and focused (typically < 30 lines)
- A module should have one clear reason to be modified

## 2. Open/Closed Principle (OCP)

> Software entities should be open for extension but closed for modification.

### Implementation in RivetBench

#### ✅ Good Examples

**Endpoint Registry** (`src/core/registry.ts`)
```typescript
// Closed for modification: Core registry logic is stable
// Open for extension: New endpoints can be added without changing registry code
registry.register(myNewEndpoint);
```

**Error Types** (`src/core/errors.ts`)
```typescript
// Extending with new error type (no modification to existing code)
export class RateLimitError extends RivetBenchError {
  constructor(details?: Record<string, unknown>) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED', details);
  }
}
```

**Transport Layer**
- REST and MCP are different transports for the same endpoints
- Adding a new transport (e.g., gRPC) wouldn't require modifying endpoint logic

### Guidelines

- Use **composition** over modification
- Leverage **interfaces and abstract types** for extensibility
- New features should be added by **extending** existing code, not **changing** it
- Use **dependency injection** to allow different implementations

## 3. Liskov Substitution Principle (LSP)

> Objects of a superclass should be replaceable with objects of its subclasses without breaking the application.

### Implementation in RivetBench

#### ✅ Good Examples

**Error Hierarchy**
```typescript
// All RivetBenchError subclasses can be used interchangeably
function handleError(error: RivetBenchError) {
  return error.toJSON(); // Works for all error types
}

// Can substitute with any subclass
handleError(new ValidationError('Invalid'));
handleError(new EndpointNotFoundError('test'));
handleError(new InternalServerError('Oops'));
```

**Endpoint Registry Interface**
```typescript
interface EndpointRegistry {
  register(endpoint: Endpoint): void;
  get(name: string): Endpoint | undefined;
  list(): Endpoint[];
}

// InMemoryEndpointRegistry can be substituted without breaking code
// Future: DatabaseEndpointRegistry, RedisEndpointRegistry, etc.
```

### Guidelines

- Subclasses should **strengthen, not weaken**, preconditions
- Subclasses should **weaken, not strengthen**, postconditions
- Invariants of the superclass must be preserved
- Don't throw **unexpected exceptions** in subclasses
- Maintain the same **interface contract**

## 4. Interface Segregation Principle (ISP)

> Many client-specific interfaces are better than one general-purpose interface.

### Implementation in RivetBench

#### ✅ Good Examples

**Endpoint Interface** (`src/core/endpoint.ts`)
```typescript
// Focused interface with only what endpoints need
export interface Endpoint<TInput = unknown, TOutput = unknown> {
  name: string;
  summary: string;
  description?: string;
  input: z.ZodSchema<TInput>;
  output: z.ZodSchema<TOutput>;
  handler: EndpointHandler<TInput, TOutput>;
}
```

**Server Config Sections**
```typescript
// Segregated by concern
interface ServerConfig {
  rest: RestConfig;      // Only REST-specific settings
  mcp: McpConfig;        // Only MCP-specific settings
  logging: LogConfig;    // Only logging-specific settings
  application: AppConfig; // Only app-specific settings
}
```

#### ❌ Anti-Pattern to Avoid

```typescript
// BAD: Bloated interface forcing unnecessary implementations
interface ServerComponent {
  startRest(): void;
  startMcp(): void;
  startGrpc(): void;
  initDatabase(): void;
  setupAuth(): void;
  // 20 more methods...
}
```

### Guidelines

- Keep interfaces **small and focused**
- Clients shouldn't depend on interfaces they don't use
- **Split large interfaces** into smaller, cohesive ones
- Prefer **many specific interfaces** over one generic interface

## 5. Dependency Inversion Principle (DIP)

> Depend upon abstractions, not concretions.

### Implementation in RivetBench

#### ✅ Good Examples

**Logger Dependency Injection**
```typescript
// HIGH-LEVEL: Server depends on abstraction (PinoLogger interface)
export function createRestServer({ registry, config }: RestServerOptions) {
  const logger = createLogger(config); // Injected dependency
  // ...
}

// LOW-LEVEL: Logger implementation can change without affecting server
export function createLogger(config: ServerConfig): PinoLogger {
  return pino({ level: config.logging.level });
}
```

**Config Dependency Injection**
```typescript
// Server doesn't call loadConfig() internally
// Config is injected from outside, making it testable
export const createRestServer = async ({ registry, config }: RestServerOptions) => {
  // Uses injected config, doesn't create it
  const logger = createLogger(config);
}

// In tests, we can inject a test config
const testConfig = { /* ... */ };
const server = await createRestServer({ registry, config: testConfig });
```

**Error Handler Factory**
```typescript
// Error handler depends on logger abstraction, not concrete implementation
export function createErrorHandler(logger: PinoLogger) {
  return function errorHandler(error, request, reply) {
    logger.error({ /* ... */ }, 'Error occurred');
    // ...
  };
}
```

#### ❌ Anti-Pattern to Avoid

```typescript
// BAD: Direct dependency on concrete implementation
export function createRestServer({ registry }: RestServerOptions) {
  const config = loadConfig();  // Hardcoded dependency
  const logger = getLogger();   // Hidden global dependency
  // Hard to test, tightly coupled to environment
}
```

### Recent Refactoring Example

**Before** (❌ Violated DIP):
```typescript
export function createLogger(): PinoLogger {
  const config = loadConfig();  // Hidden dependency on environment
  // ...
}

export const createRestServer = async ({ registry }: RestServerOptions) => {
  const logger = createLogger();  // No control over config
}
```

**After** (✅ Follows DIP):
```typescript
export function createLogger(config: ServerConfig): PinoLogger {
  // Depends on abstraction (config interface), not implementation
  // ...
}

export const createRestServer = async ({ registry, config }: RestServerOptions) => {
  const logger = createLogger(config);  // Explicit dependency
}

// At the application entry point
const config = loadConfig();  // Load once at startup
const server = await createRestServer({ registry, config });
```

### Guidelines

- **Inject dependencies** rather than creating them internally
- Depend on **interfaces/types**, not concrete classes
- **Invert control**: Let callers provide dependencies
- High-level modules should not depend on low-level modules
- Use **factory functions** or **constructors** with parameters
- Avoid **hidden dependencies** (global state, singletons)

## Benefits of Following SOLID

1. **Testability**: Easy to mock dependencies and test in isolation
2. **Maintainability**: Changes are localized and predictable
3. **Flexibility**: Easy to add new features without modifying existing code
4. **Readability**: Clear responsibilities and dependencies
5. **Reliability**: Less coupling means fewer unexpected side effects

## Common Violations to Watch For

### 1. God Objects
```typescript
// BAD: Does everything
class ServerManager {
  loadConfig() { /* ... */ }
  createLogger() { /* ... */ }
  startRestServer() { /* ... */ }
  startMcpServer() { /* ... */ }
  registerEndpoints() { /* ... */ }
  handleErrors() { /* ... */ }
}
```

### 2. Hidden Dependencies
```typescript
// BAD: Hidden dependency on environment
function processRequest() {
  const config = loadConfig();  // Reads from process.env
  // ...
}
```

### 3. Tight Coupling
```typescript
// BAD: Tightly coupled to concrete implementation
class UserService {
  private db = new PostgresDatabase();  // Hard dependency
}

// GOOD: Loose coupling via injection
class UserService {
  constructor(private db: Database) {}  // Depends on interface
}
```

### 4. Feature Envy
```typescript
// BAD: Class accessing another class's data extensively
class ReportGenerator {
  generate(user: User) {
    console.log(user.name);
    console.log(user.email);
    console.log(user.address.street);
    console.log(user.address.city);
    // This logic probably belongs in User class
  }
}
```

## Applying SOLID in Code Reviews

When reviewing code, ask:

1. **SRP**: Does this function/class have multiple reasons to change?
2. **OCP**: Will adding new features require modifying existing code?
3. **LSP**: Can I substitute this with a different implementation without breaking things?
4. **ISP**: Does this interface force implementers to include unused methods?
5. **DIP**: Is this depending on a concrete implementation or an abstraction?

## Resources

- [SOLID Principles Explained](https://www.freecodecamp.org/news/solid-principles-explained-in-plain-english/)
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Dependency Injection Principles, Practices, and Patterns](https://www.manning.com/books/dependency-injection-principles-practices-patterns)
