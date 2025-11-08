# Lessons Learned

This document captures architectural decisions, refactoring insights, and evolving best practices for RivetBench. **Update this at the end of each feature/refactor** to ensure guardrails stay relevant.

---

## Review Policy

**MANDATORY**: After completing a feature or refactor:
1. Document key decisions and rationale in this file
2. Review `AGENTS.MD` and update if new patterns emerge
3. Update `docs/ARCHITECTURE.md` if architectural principles change
4. Update `docs/TESTING.md` if testing patterns evolve

---

## Architecture Decisions

### 1. Dependency Injection Pattern (October 2025)

**Problem**: Multiple `loadConfig()` calls caused configuration drift, race conditions, and untestable code.

**Solution**: Load config **once** at application entry, then inject as parameter everywhere.

**Pattern**:
```typescript
// ❌ NEVER: Hidden dependencies
function createServer() {
  const config = loadConfig();  // Internal creation
}

// ✅ ALWAYS: Inject dependencies
function createServer(config: ServerConfig) {
  // Config passed as parameter
}

// At app entry point only
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();  // Load ONCE
  const server = await createServer(config);
}
```

**Rationale**:
- **Deterministic**: Config loaded once, no race conditions
- **Testable**: Easy to inject mock configs
- **Explicit**: Clear dependency contracts
- **SOLID**: Follows Dependency Inversion Principle

**Guardrail Updates**:
- Added `[SOLID-DIP-03]` to `AGENTS.MD`: Load config once at app entry
- Added DI section to `docs/ARCHITECTURE.md`

---

### 2. MCP Stdio Logging (October 2025)

**Problem**: Using `console.log()` in MCP stdio mode breaks JSON-RPC protocol.

**Solution**: All logs must go to `stderr` in MCP stdio transport.

**Pattern**:
```typescript
// ❌ NEVER in MCP stdio code
console.log('Debug info');    // Breaks protocol!
console.info('Info');          // Breaks protocol!
console.warn('Warning');       // Breaks protocol!

// ✅ ALWAYS in MCP stdio code
console.error('Debug info');   // Safe (stderr)
context.log.info('Info');      // Safe (FastMCP → stderr)
```

**Rationale**:
- MCP stdio uses stdout exclusively for JSON-RPC messages
- Any other stdout output corrupts the protocol stream
- stderr is available for all diagnostic output

**Guardrail Updates**:
- Added `[LOG-01]`, `[LOG-02]`, `[LOG-03]` to `AGENTS.MD`
- Added MCP Logging section to `docs/ARCHITECTURE.md`

---

### 3. Transport Parity (October 2025)

**Problem**: REST and MCP transports had inconsistent behavior (e.g., request ID handling).

**Solution**: Define transport parity requirements - all transports must:
1. Generate unique request IDs via `crypto.randomUUID()`
2. Validate input/output with same Zod schemas
3. Convert errors to consistent `RivetBenchError` format
4. Support request tracing through `config.requestId`

**Rationale**:
- Consistent client experience across transports
- Easier debugging with uniform request tracking
- Prevents transport-specific bugs

**Guardrail Updates**:
- Added Transport Parity section to `docs/ARCHITECTURE.md`
- Added regression test requirement for cross-transport features

---

### 4. Runtime CLI Generation (October 2025)

**Problem**: REST and MCP transports offered runtime registry-driven discovery, but the CLI required manual wiring, creating drift.

**Solution**: Build the CLI on top of the shared endpoint registry so commands are generated dynamically at startup, mirroring other transports.

**Pattern**:
```typescript
const cli = createCli({ registry, config });
await cli.run(['call', 'echo', '--input', '{"message":"hi"}']);
```

**Rationale**:
- Maintains parity across transports without build steps
- Reduces duplication by reusing validation + handlers
- Keeps developer experience consistent for new endpoints

**Guardrail Updates**:
- Added CLI coverage to README quick start instructions
- Reinforced runtime registry usage for new transports

---

## Testing Patterns

### 1. BDD Tagging Workflow (October 2025)

**Pattern**: Use `@wip` and `@implemented` tags to manage feature lifecycle.

```gherkin
@wip
Feature: New Feature
  # Development in progress

@implemented
Feature: Stable Feature
  # Ready for CI
```

**Rationale**:
- Prevents breaking CI with incomplete features
- Clear signal of feature maturity
- Easy to run WIP features in isolation

**Commands**:
- `npm run test:bdd` - Only `@implemented` (CI-safe)
- `npm run test:bdd:wip` - Only `@wip` (development)
- `npm run test:bdd:all` - Everything

---

### 2. Test Isolation via Dependency Injection (October 2025)

**Problem**: Tests with shared state affect each other.

**Solution**: Inject fresh dependencies in `beforeEach`, clean up in `afterEach`.

```typescript
// ✅ GOOD: Isolated tests
let server: FastifyInstance;

beforeEach(async () => {
  const config: ServerConfig = { /* test config */ };
  server = await createRestServer({ registry, config });
});

afterEach(async () => {
  await server.close();
});
```

**Rationale**:
- Each test starts with clean state
- No cross-test contamination
- Deterministic test results

---

## Common Pitfalls

### ❌ Configuration Anti-Patterns

**Don't**:
```typescript
// Multiple config loads
function myFunction() {
  const config = loadConfig();  // ❌
  // ...
}

// Global config access
export const config = loadConfig();  // ❌
export function myFunction() {
  // Uses global config
}
```

**Do**:
```typescript
// Single load at entry
const config = loadConfig();
await startServer(config);

// Inject everywhere
function myFunction(config: ServerConfig) {
  // Uses injected config
}
```

---

### ❌ Error Handling Anti-Patterns

**Don't**:
```typescript
throw new Error('Something failed');  // ❌ Generic
catch (err) { /* ignore */ }          // ❌ Bare catch
```

**Do**:
```typescript
throw new ValidationError('Invalid input', { field: 'email' });  // ✅ Specific
catch (err) {
  if (err instanceof ValidationError) {
    // Handle specifically
  }
  throw new InternalServerError('Failed', { originalError: err });
}
```

---

### ❌ Testing Anti-Patterns

**Don't**:
```typescript
// Test implementation details
it('should call internal method', () => {
  expect(obj._internalMethod).toHaveBeenCalled();  // ❌
});

// Shared state
const server = await createServer();  // ❌ Outside test
it('test 1', () => { /* mutates server */ });
it('test 2', () => { /* affected by test 1 */ });
```

**Do**:
```typescript
// Test behavior
it('should return valid output', () => {
  expect(result).toMatchObject({ expected });  // ✅
});

// Isolated
beforeEach(() => { server = await createServer(); });
afterEach(() => { await server.close(); });
```

---

## Evolution of Guardrails

### October 2025: Initial Policy Consolidation

**Changes Made**:
- Consolidated 10 docs → 4 active docs + AGENTS.MD
- Established 3-level consumption order (Policy → Details → Specialized)
- Reduced documentation volume by 45%

**Key Decisions**:
- Keep policy minimal (<100 lines in AGENTS.MD)
- Use rule IDs for trackability ([DOD-01], [SOLID-DIP-02], etc.)
- Drill-down references instead of upfront detail dump

**Rationale**:
- Agents need clear starting point without overwhelming context
- Detailed docs only loaded when specific work requires them
- Guardrails must be precise but consumable

**Review**: After 3-4 features, assess if policy needs refinement.

---

## Future Considerations

### Questions to Revisit

1. **Middleware System** (v0.3.0):
   - How to inject dependencies into middleware?
   - Should middleware be composable functions or classes?
   - How to test middleware in isolation?

2. **Performance Monitoring**:
   - Where to inject metrics collection?
   - How to maintain DI pattern with monitoring?
   - Should monitoring be a cross-cutting concern?

3. **Multi-Transport Features**:
   - How to ensure new transports follow parity requirements?
   - Should we create an abstract Transport interface?
   - How to test transport parity automatically?

---

## Template for New Lessons

Use this template when adding new lessons:

```markdown
### N. Lesson Title (Month Year)

**Problem**: Describe the issue encountered

**Solution**: Describe the pattern/decision adopted

**Pattern**:
```typescript
// Code example
```

**Rationale**:
- Why this approach was chosen
- Benefits achieved
- Trade-offs considered

**Guardrail Updates**:
- What was added/changed in AGENTS.MD
- What was added/changed in ARCHITECTURE.md or TESTING.md

**Review**: When to revisit this decision
```

---

## Maintenance Checklist

After each feature/refactor:

- [ ] Document key architectural decisions in this file
- [ ] Review `AGENTS.MD` - do any rules need updating?
- [ ] Review `docs/ARCHITECTURE.md` - do patterns need updating?
- [ ] Review `docs/TESTING.md` - do test patterns need updating?
- [ ] Remove outdated content from this file (keep it focused)
- [ ] Update rule IDs if new guardrails added
- [ ] Verify all examples still compile/run

**Target**: Keep this file under 500 lines. Archive old lessons if they become irrelevant.
