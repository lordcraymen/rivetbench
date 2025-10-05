# SOLID Principles - Quick Reference Card

> Keep this handy when writing code for RivetBench

## The 5 Principles

### 🎯 Single Responsibility (SRP)
**Each module should do ONE thing**

```typescript
// ❌ BAD - Multiple responsibilities
function createAndStartServer() {
  const config = loadConfig();
  const logger = createLogger();
  const db = connectDatabase();
  return startServer(config, logger, db);
}

// ✅ GOOD - Single responsibility
function createServer(config, logger, db) {
  return new Server(config, logger, db);
}
```

**Ask**: "Does this have more than one reason to change?"

---

### 🔓 Open/Closed (OCP)
**Open for extension, closed for modification**

```typescript
// ❌ BAD - Must modify to add features
function handleError(error) {
  if (error.type === 'validation') { /* ... */ }
  if (error.type === 'notfound') { /* ... */ }
}

// ✅ GOOD - Extend via inheritance
class ValidationError extends RivetBenchError { /* ... */ }
class NotFoundError extends RivetBenchError { /* ... */ }
```

**Ask**: "Can I add features without changing this?"

---

### 🔄 Liskov Substitution (LSP)
**Subclasses must work wherever parent works**

```typescript
// ✅ GOOD - All errors work the same way
function logError(error: RivetBenchError) {
  logger.error(error.toJSON()); // Works for ALL error types
}

logError(new ValidationError('Invalid'));
logError(new NotFoundError('Missing'));
```

**Ask**: "Can I swap this with a subclass without breaking things?"

---

### 🧩 Interface Segregation (ISP)
**Many small interfaces > one large interface**

```typescript
// ❌ BAD - Forces unused methods
interface Server {
  startRest(): void;
  startMcp(): void;
  startGrpc(): void;  // Not all servers need this
}

// ✅ GOOD - Focused interfaces
interface RestServer {
  start(): void;
}

interface McpServer {
  start(): void;
}
```

**Ask**: "Do implementers need all these methods?"

---

### 💉 Dependency Inversion (DIP)
**Inject dependencies, don't create them**

```typescript
// ❌ BAD - Hidden dependency
function createServer() {
  const config = loadConfig();  // Created internally
  // ...
}

// ✅ GOOD - Injected dependency
function createServer(config: ServerConfig) {
  // Config passed as parameter
  // ...
}

// At entry point
const config = loadConfig();
const server = createServer(config);
```

**Ask**: "Are all dependencies in the function signature?"

---

## Common Anti-Patterns to Avoid

### ❌ God Objects
```typescript
// Does everything - AVOID!
class AppManager {
  loadConfig() { }
  createLogger() { }
  connectDb() { }
  startServer() { }
  handleRequests() { }
}
```

### ❌ Hidden Dependencies
```typescript
// Hidden process.env read - AVOID!
function doSomething() {
  const value = process.env.MY_VAR;
}
```

### ❌ Global State
```typescript
// Global singleton - AVOID!
let globalLogger = null;
export function getLogger() {
  return globalLogger ??= createLogger();
}
```

### ❌ Tight Coupling
```typescript
// Hardcoded dependency - AVOID!
class Service {
  private db = new PostgresDb();
}
```

---

## RivetBench Patterns ✅

### Configuration Management
```typescript
// Load ONCE at startup
const config = loadConfig();

// Pass to all components
const logger = createLogger(config);
const server = createRestServer({ registry, config });
```

### Logger Creation
```typescript
// Inject config
export function createLogger(config: ServerConfig): PinoLogger {
  return pino({ level: config.logging.level });
}
```

### Error Handlers
```typescript
// Factory function with dependency
export function createErrorHandler(logger: PinoLogger) {
  return function errorHandler(error, request, reply) {
    logger.error(/* ... */);
  };
}
```

### Server Creation
```typescript
// All dependencies explicit
export interface RestServerOptions {
  registry: EndpointRegistry;
  config: ServerConfig;
}

export const createRestServer = async ({ 
  registry, 
  config 
}: RestServerOptions) => {
  const logger = createLogger(config);
  // ...
};
```

---

## Quick Checklist ✓

Before committing, verify:

- [ ] No `loadConfig()` calls in business logic
- [ ] No `getLogger()` or global getters
- [ ] All dependencies in function signatures
- [ ] Functions have one clear purpose
- [ ] Config loaded once at entry point
- [ ] Dependencies are injected
- [ ] Easy to mock for testing

---

## When to Use What

| Situation | Pattern | Example |
|-----------|---------|---------|
| **Need config** | Inject as parameter | `createServer(config)` |
| **Need logger** | Inject as parameter | `createErrorHandler(logger)` |
| **Need multiple deps** | Use options object | `createServer({ config, logger })` |
| **Creating instances** | Use factory function | `createLogger(config)` |
| **Application entry** | Load once, pass down | `const config = loadConfig()` |

---

## Resources

- **Full Guide**: `docs/SOLID_PRINCIPLES.md`
- **Checklist**: `docs/SELF_REVIEW_CHECKLIST.md`
- **Refactoring Example**: `docs/REFACTORING_DEPENDENCY_INJECTION.md`

---

## Remember

> "Dependencies should be **explicit** and **injected**, not **hidden** and **created**"

> "Load config **once** at startup, then **pass it through**"

> "Each function should do **one thing** and do it **well**"

---

**Print this and keep it near your workspace!** 📌
