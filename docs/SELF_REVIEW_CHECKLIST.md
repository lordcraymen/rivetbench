# Self-Review Checklist

Use this checklist before submitting any pull request or finalizing your work. This ensures code quality, maintainability, and adherence to project standards.

## 🏗️ SOLID Principles Review

### Single Responsibility Principle (SRP)
- [ ] Each function has **one clear responsibility**
- [ ] Each module has **one reason to change**
- [ ] No function does multiple unrelated things
- [ ] If describing a function requires "and", consider splitting it
- [ ] Functions are small (typically < 30 lines)

### Open/Closed Principle (OCP)
- [ ] New features **extend** rather than modify existing code
- [ ] Using interfaces/abstractions to allow extension
- [ ] Existing tests don't need modification for new features
- [ ] Configuration-driven behavior where appropriate

### Liskov Substitution Principle (LSP)
- [ ] Subclasses can replace parent classes without breaking functionality
- [ ] Overridden methods maintain the same contract
- [ ] No unexpected exceptions thrown by subclasses
- [ ] Invariants of parent class are preserved

### Interface Segregation Principle (ISP)
- [ ] Interfaces are **small and focused**
- [ ] No interface forces implementations of unused methods
- [ ] Clients only depend on interfaces they actually use
- [ ] Large interfaces split into cohesive smaller ones

### Dependency Inversion Principle (DIP)
- [ ] **Dependencies are injected**, not created internally
- [ ] Functions accept dependencies as parameters
- [ ] No direct calls to `loadConfig()` or `getLogger()` in business logic
- [ ] Depending on abstractions (types/interfaces), not concretions
- [ ] No hidden dependencies or global state
- [ ] Easy to mock dependencies in tests

## 🧪 Testing

### Unit Tests
- [ ] All new functions have unit tests
- [ ] Tests are **isolated** and don't depend on external state
- [ ] Tests use **dependency injection** for testability
- [ ] Edge cases are covered (empty input, null, invalid data)
- [ ] Happy path and error paths both tested
- [ ] Tests run quickly (< 100ms per test)
- [ ] `npm run test:unit` passes

### Integration Tests
- [ ] BDD scenarios added for new features
- [ ] Feature files are **readable** by non-technical stakeholders
- [ ] Scenarios test realistic user workflows
- [ ] Error scenarios included
- [ ] `npm run test:bdd` passes

### Test Quality
- [ ] Tests are **deterministic** (no random failures)
- [ ] No hardcoded ports, paths, or environment-specific values
- [ ] Tests clean up resources (servers, files, connections)
- [ ] Test names clearly describe what they test
- [ ] Assertions are specific and meaningful

## 📝 Code Quality

### TypeScript
- [ ] No `any` types (use `unknown` if type is truly unknown)
- [ ] All functions have explicit return types
- [ ] Interfaces defined for complex objects
- [ ] No unused imports or variables
- [ ] `npm run type-check` passes
- [ ] No TypeScript errors or warnings

### Error Handling
- [ ] Using **specific error types** (`ValidationError`, `EndpointNotFoundError`, etc.)
- [ ] Errors include **context** in details object
- [ ] No generic `throw new Error()` in production code
- [ ] All errors extend `RivetBenchError`
- [ ] Error messages are **user-friendly** and **actionable**

### Logging
- [ ] Using **structured logging** with context objects
- [ ] Log levels appropriate (`info` for normal, `warn` for issues, `error` for failures)
- [ ] **Never** using `console.log()` in MCP server code (only `console.error()`)
- [ ] Logger is **injected** as dependency, not globally accessed
- [ ] No sensitive information in logs (passwords, tokens, PII)

### Code Style
- [ ] Follows existing code style and conventions
- [ ] `npm run lint` passes
- [ ] No commented-out code (use git history instead)
- [ ] Meaningful variable and function names
- [ ] Comments explain **why**, not **what**
- [ ] No magic numbers (use named constants)

## 🏛️ Architecture

### Dependency Management
- [ ] Configuration loaded **once at startup**, not repeatedly
- [ ] Dependencies **explicitly passed** to functions
- [ ] No circular dependencies
- [ ] Module imports follow project structure
- [ ] No tight coupling between unrelated modules

### API Design
- [ ] Function signatures are **clear and consistent**
- [ ] Parameters have descriptive names
- [ ] Required parameters come before optional ones
- [ ] Return types are predictable and documented
- [ ] No boolean parameters (use enums or objects)

### Performance
- [ ] No unnecessary re-computation of values
- [ ] Config loaded once and reused
- [ ] No blocking operations in async code
- [ ] Efficient data structures chosen
- [ ] No memory leaks (servers/connections closed properly)

## 📚 Documentation

### Code Documentation
- [ ] All exported functions have **JSDoc comments**
- [ ] Complex logic has explanatory comments
- [ ] TypeScript types serve as documentation
- [ ] Examples provided for non-obvious usage
- [ ] Breaking changes documented in comments

### Project Documentation
- [ ] README updated if new features added
- [ ] Relevant guide documents updated (ERROR_HANDLING.md, MCP_GUIDE.md, etc.)
- [ ] CHANGELOG.md updated with changes
- [ ] Breaking changes highlighted
- [ ] Migration guide provided if needed

## 🔒 Security

- [ ] No hardcoded secrets or credentials
- [ ] Environment variables used for sensitive config
- [ ] Input validation on all external data
- [ ] No SQL injection, XSS, or command injection risks
- [ ] Dependencies updated to latest secure versions
- [ ] Error messages don't expose internal details

## 🚀 Production Readiness

### Configuration
- [ ] All config has sensible **defaults**
- [ ] Environment variables documented
- [ ] Config validation at startup
- [ ] No required config that's hard to provide

### Error Recovery
- [ ] Graceful handling of failures
- [ ] Appropriate HTTP status codes
- [ ] Clear error messages for users
- [ ] No silent failures

### Observability
- [ ] Sufficient logging for troubleshooting
- [ ] Request IDs for correlation
- [ ] Health check endpoints work
- [ ] Errors logged with full context

## 🔄 Before Committing

### Pre-Commit Checks
- [ ] All tests pass locally
- [ ] No linting errors
- [ ] Type checking passes
- [ ] No debug statements or console.logs left
- [ ] Formatted according to project standards

### Git
- [ ] Commit message is **descriptive**
- [ ] Commits are **logical units** (not "fix", "wip", "asdf")
- [ ] No merge commits in feature branch
- [ ] Branch is up-to-date with main/develop

## 📋 Feature-Specific Checks

### Adding New Endpoint
- [ ] Endpoint registered in registry
- [ ] Input schema defined with Zod
- [ ] Output schema defined with Zod
- [ ] Handler implements business logic
- [ ] OpenAPI docs generated automatically
- [ ] Works in both REST and MCP transports
- [ ] Error cases handled appropriately
- [ ] Tests cover success and failure scenarios

### Modifying Config
- [ ] Backward compatible (or migration path provided)
- [ ] Environment variables documented
- [ ] Type definitions updated
- [ ] Default values provided
- [ ] Config passed as dependency, not loaded repeatedly

### Changing Error Handling
- [ ] Error class extends `RivetBenchError`
- [ ] Appropriate HTTP status code
- [ ] Unique error code constant
- [ ] Details object for context
- [ ] Tests verify error response format

## ✅ Final Checklist

- [ ] **All tests pass** (`npm run test:ci`)
- [ ] **No linting errors** (`npm run lint`)
- [ ] **Type checking passes** (`npm run type-check`)
- [ ] **Documentation updated**
- [ ] **SOLID principles followed**
- [ ] **Ready for code review**

---

## Quick Self-Review Questions

1. **Can I test this easily?** If not, dependencies need to be injected.
2. **Does this function do one thing?** If not, split it.
3. **Can I add a new feature without modifying this?** If not, consider how to make it more extensible.
4. **Would this break if I swapped dependencies?** If yes, you're depending on concretions not abstractions.
5. **Is this configuration read multiple times?** If yes, pass it as a parameter instead.

## Examples of Common Issues

### ❌ Before (Problematic)
```typescript
export function createServer() {
  const config = loadConfig();  // Hidden dependency
  const logger = getLogger();   // Global state
  
  // Multiple responsibilities
  setupDatabase();
  startHealthCheck();
  registerEndpoints();
  configureAuth();
  
  return server;
}
```

### ✅ After (SOLID)
```typescript
export function createServer({
  config,
  logger,
  database,
  registry
}: ServerOptions) {  // All dependencies explicit
  // Single responsibility: compose and start server
  const server = new Server(config);
  server.setLogger(logger);
  server.setDatabase(database);
  server.setRegistry(registry);
  return server;
}
```

---

**Remember**: Code is read 10x more than it's written. Write code that's easy to understand, test, and maintain!
