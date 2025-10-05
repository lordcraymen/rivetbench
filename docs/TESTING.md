# Testing Guide

This document covers testing practices, patterns, and workflows for RivetBench.

---

## Table of Contents

1. [Test Structure](#test-structure)
2. [Unit Tests (Vitest)](#unit-tests-vitest)
3. [BDD Tests (Cucumber)](#bdd-tests-cucumber)
4. [Test Commands](#test-commands)
5. [Best Practices](#best-practices)

---

## Test Structure

```
test/
├─ core/                  # Unit tests for core modules
│  ├─ endpoint.test.ts
│  ├─ errors.test.ts
│  ├─ openapi.test.ts
│  └─ registry.test.ts
├─ server/                # Unit tests for servers
│  ├─ mcp.test.ts
│  ├─ rest.test.ts
│  └─ request-id-parity.test.ts
├─ features/              # Gherkin feature files (.feature)
│  ├─ echo.feature
│  ├─ health.feature
│  └─ request-id-parity.feature
└─ steps/                 # Cucumber step definitions
   ├─ world.ts            # Shared test context
   ├─ hooks.ts            # Before/After hooks
   ├─ assertions.ts       # Custom assertions
   ├─ endpoint-steps.ts   # Generic endpoint steps
   └─ rest-steps.ts       # REST-specific steps
```

---

## Unit Tests (Vitest)

### Basic Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('MyModule', () => {
  let config: ServerConfig;

  beforeEach(() => {
    // Arrange: Setup test fixtures
    config = {
      rest: { host: '127.0.0.1', port: 3000 },
      mcp: { transport: 'stdio' as const },
      logging: { level: 'silent' }
    };
  });

  it('should do something specific', () => {
    // Arrange: Already done in beforeEach

    // Act: Execute the code under test
    const result = myFunction(config);

    // Assert: Verify the outcome
    expect(result).toBeDefined();
    expect(result.value).toBe('expected');
  });
});
```

### Arrange-Act-Assert Pattern

**Arrange**: Set up test data and dependencies
**Act**: Execute the code under test
**Assert**: Verify the outcome

```typescript
it('should validate input and return output', async () => {
  // Arrange
  const endpoint = makeEndpoint({
    name: 'test',
    input: z.object({ value: z.string() }),
    output: z.object({ result: z.string() }),
    handler: async ({ input }) => ({ result: input.value.toUpperCase() })
  });
  const input = { value: 'hello' };

  // Act
  const output = await endpoint.handler({ input, config });

  // Assert
  expect(output).toEqual({ result: 'HELLO' });
});
```

### Dependency Injection in Tests

Always inject dependencies for testability:

```typescript
// ✅ GOOD - Easy to test with mock config
it('should use injected config', () => {
  const mockConfig: ServerConfig = {
    rest: { host: 'test-host', port: 9999 },
    mcp: { transport: 'stdio' as const },
    logging: { level: 'silent' }
  };

  const logger = createLogger(mockConfig);
  expect(logger).toBeDefined();
});

// ❌ BAD - Hard to test (loads from env)
it('should use global config', () => {
  const logger = createLogger();  // Calls loadConfig() internally
  expect(logger).toBeDefined();
});
```

### Mocking External Dependencies

```typescript
import { vi } from 'vitest';

it('should handle external service errors', async () => {
  // Mock external service
  const mockService = {
    fetch: vi.fn().mockRejectedValue(new Error('Network error'))
  };

  // Inject mock
  const handler = createHandler(mockService);

  // Verify error handling
  await expect(handler()).rejects.toThrow(InternalServerError);
});
```

### Coverage Requirements

- **Minimum**: 80% line coverage in changed files
- **Target**: 90%+ for critical paths
- **Check coverage**: `npm run test:coverage`

```bash
npm run test:coverage

# View detailed HTML report
open coverage/index.html
```

---

## BDD Tests (Cucumber)

### BDD Workflow

1. **Define** → Write `.feature` file in Gherkin
2. **Review** → Validate with stakeholders
3. **Tag** → Mark with `@wip` (work-in-progress)
4. **Implement** → Write step definitions
5. **Code** → Implement actual functionality
6. **Pass** → Tests pass (green phase)
7. **Retag** → Change to `@implemented`
8. **CI** → Runs automatically in pipeline

### Feature Files (Gherkin)

```gherkin
@implemented
Feature: Echo Endpoint
  As a user
  I want to echo messages
  So that I can test the endpoint

  Scenario: Echo a simple message
    Given I have an echo endpoint
    When I send a POST request to "/rpc/echo" with body:
      """json
      { "message": "Hello, World!" }
      """
    Then the response status should be 200
    And the response should contain:
      """json
      { "echoed": "Hello, World!" }
      """
```

### Feature Tags

| Tag | Purpose | CI Behavior | Usage |
|-----|---------|-------------|-------|
| `@implemented` | Production-ready | Included | Stable features |
| `@wip` | Work-in-progress | Excluded | New features under development |

**Tag usage**:
```gherkin
@wip
Feature: New Feature
  # This won't run in CI until tag changed to @implemented
```

### Step Definitions

Create reusable steps in `test/steps/`:

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { RivetBenchWorld } from './world.js';

When(
  'I send a POST request to {string} with body:',
  async function (this: RivetBenchWorld, path: string, bodyJson: string) {
    const body = JSON.parse(bodyJson);
    const response = await this.restServer!.inject({
      method: 'POST',
      url: path,
      payload: body
    });
    this.response = {
      statusCode: response.statusCode,
      body: JSON.parse(response.body)
    };
  }
);

Then(
  'the response status should be {int}',
  function (this: RivetBenchWorld, expectedStatus: number) {
    this.expect(this.response?.statusCode).toBe(expectedStatus);
  }
);
```

### World (Shared Context)

The `RivetBenchWorld` class provides shared state:

```typescript
export class RivetBenchWorld extends World {
  public restServer?: FastifyInstance;
  public response?: { statusCode: number; body: unknown };
  public expect = expect;  // Vitest assertions

  async reset(): Promise<void> {
    if (this.restServer) {
      await this.restServer.close();
      this.restServer = undefined;
    }
    this.response = undefined;
  }
}
```

### Hooks (Setup/Teardown)

```typescript
import { Before, After } from '@cucumber/cucumber';

Before(async function (this: RivetBenchWorld) {
  // Setup before each scenario
  console.error('[Cucumber] Starting scenario');
});

After(async function (this: RivetBenchWorld) {
  // Cleanup after each scenario
  await this.reset();
  console.error('[Cucumber] Scenario complete');
});
```

### Custom Assertions

```typescript
// In test/steps/assertions.ts
export function assertJsonEqual(
  actual: unknown,
  expected: unknown,
  message?: string
): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

// Usage in steps
Then('the response should match', function (this: RivetBenchWorld, expectedJson: string) {
  assertJsonEqual(this.response?.body, JSON.parse(expectedJson));
});
```

---

## Test Commands

### Unit Tests
```bash
npm test                 # Watch mode (development)
npm run test:unit        # Run once
npm run test:coverage    # With coverage report
```

### BDD Tests
```bash
npm run test:bdd         # Run @implemented features only (CI)
npm run test:bdd:all     # Run all features (including @wip)
npm run test:bdd:wip     # Run @wip features only
```

### CI Pipeline
```bash
npm run test:ci          # Runs unit + BDD (@implemented only)
```

### Quality Checks
```bash
npm run lint             # ESLint
npm run type-check       # TypeScript compiler
```

---

## Best Practices

### ✅ DO

**Unit Tests**:
- Use Arrange-Act-Assert pattern
- One assertion per test (or closely related assertions)
- Inject dependencies (config, logger, etc.)
- Mock external services
- Test both happy path and error cases
- Keep tests fast (< 100ms per test)

**BDD Tests**:
- Write Gherkin BEFORE implementation
- Tag with `@wip` until ready
- Use descriptive scenario names
- Keep steps reusable across features
- Clean up resources in `After` hooks

**General**:
- Make tests deterministic (no random values)
- Avoid hardcoded ports/paths
- Test edge cases (null, empty, invalid)
- Use meaningful test names
- Keep tests isolated (no shared state)

### ❌ DON'T

- Don't use `any` types in tests
- Don't test implementation details (test behavior)
- Don't use `console.log()` (use `console.error()` for debugging)
- Don't skip cleanup (always close servers, files, etc.)
- Don't rely on test execution order
- Don't commit tests with `@wip` unless intentional
- Don't use hardcoded secrets/keys in tests

### Test Isolation

**Bad** (shared state):
```typescript
// ❌ BAD - Tests affect each other
let server: FastifyInstance;

beforeAll(async () => {
  server = await createRestServer({ registry, config });
});

it('test 1', () => { /* modifies server */ });
it('test 2', () => { /* affected by test 1 */ });
```

**Good** (isolated):
```typescript
// ✅ GOOD - Each test is isolated
let server: FastifyInstance;

beforeEach(async () => {
  server = await createRestServer({ registry, config });
});

afterEach(async () => {
  await server.close();
});

it('test 1', () => { /* isolated */ });
it('test 2', () => { /* isolated */ });
```

### Error Testing

```typescript
// ✅ GOOD - Test specific error type and message
it('should throw ValidationError for invalid input', async () => {
  await expect(
    handler({ input: { invalid: 'data' }, config })
  ).rejects.toThrow(ValidationError);
});

// ✅ BETTER - Also check error details
it('should throw ValidationError with field details', async () => {
  try {
    await handler({ input: { invalid: 'data' }, config });
    expect.fail('Should have thrown');
  } catch (err) {
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.details).toHaveProperty('field', 'message');
  }
});
```

### Async Testing

```typescript
// ✅ GOOD - Use async/await
it('should handle async operations', async () => {
  const result = await asyncOperation();
  expect(result).toBe('success');
});

// ❌ BAD - Missing await
it('should handle async operations', () => {
  const result = asyncOperation();  // Returns Promise!
  expect(result).toBe('success');   // WRONG - compares Promise
});
```

---

## Debugging Tests

### Debug Single Test

```bash
# Run specific test file
npm test -- endpoint.test.ts

# Run specific test by name pattern
npm test -- -t "should validate input"
```

### Debug Cucumber Scenario

```bash
# Run specific feature file
npm run test:bdd -- test/features/echo.feature

# Run specific scenario by line number
npm run test:bdd -- test/features/echo.feature:10
```

### Enable Debug Logging

```typescript
// In test file
const config: ServerConfig = {
  logging: { level: 'debug' }  // Change from 'silent'
};
```

### VS Code Debugger

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test", "--", "--no-coverage"],
  "console": "integratedTerminal",
  "skipFiles": ["<node_internals>/**"]
}
```

---

## Test Checklist

Before committing:

- [ ] All new code has unit tests
- [ ] Tests follow Arrange-Act-Assert pattern
- [ ] Dependencies are injected (not created)
- [ ] Tests are isolated (no shared state)
- [ ] Edge cases covered (null, empty, invalid)
- [ ] Error cases tested
- [ ] `npm test` passes
- [ ] `npm run test:bdd` passes
- [ ] Coverage ≥ 80% for changed files
- [ ] No `console.log()` in test code
- [ ] BDD features tagged correctly (`@implemented` or `@wip`)
