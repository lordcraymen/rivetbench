# BDD Testing with Cucumber

## Overview

RivetBench uses **Cucumber** for BDD (Behavior-Driven Development) testing alongside **Vitest** for unit tests. This hybrid approach provides:

- **Vitest**: Fast unit tests for isolated component testing
- **Cucumber**: Gherkin-based integration tests for user-facing behavior

## Test Structure

```
test/
├─ features/          # Gherkin feature files (.feature)
│  ├─ echo.feature
│  └─ health.feature
├─ steps/             # Step definitions (TypeScript)
│  ├─ world.ts        # Shared test context
│  ├─ hooks.ts        # Before/After hooks
│  ├─ assertions.ts   # Custom assertion helpers
│  ├─ endpoint-steps.ts
│  └─ rest-steps.ts
└─ core/, server/     # Vitest unit tests
```

## Running Tests

```bash
# Unit tests (Vitest)
npm test              # Watch mode
npm run test:unit     # Run once

# BDD tests (Cucumber)
npm run test:bdd      # Run implemented features only
npm run test:bdd:all  # Run all features (including @wip)
npm run test:bdd:wip  # Run work-in-progress features only

# CI pipeline (both)
npm run test:ci       # Runs unit + BDD tests
```

## BDD Workflow

### 1. Define Feature (Gherkin)

Create a `.feature` file in `test/features/`:

```gherkin
@wip
Feature: Calculator
  As a user
  I want to perform calculations
  So that I can solve math problems

  Scenario: Add two numbers
    Given I have a calculator
    When I add 2 and 3
    Then the result should be 5
```

**Tag with `@wip`** for work-in-progress features that aren't ready for CI.

### 2. Review Feature

Review the Gherkin specification with stakeholders before implementing.

### 3. Implement Step Definitions

Create step definitions in `test/steps/`:

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { RivetBenchWorld } from './world.js';

When('I add {int} and {int}', function (this: RivetBenchWorld, a: number, b: number) {
  this.result = a + b;
});

Then('the result should be {int}', function (this: RivetBenchWorld, expected: number) {
  this.expect(this.result).toBe(expected);
});
```

### 4. Run Tests (Should Fail)

```bash
npm run test:bdd:wip  # Run only @wip features
```

Tests should fail initially (Red phase of TDD).

### 5. Implement Functionality

Add the actual implementation to make tests pass.

### 6. Tests Pass (Green Phase)

Once tests pass, remove the `@wip` tag:

```gherkin
@implemented
Feature: Calculator
  # ... rest of feature
```

### 7. Run Full Test Suite

```bash
npm run test:ci  # Ensure all tests pass
```

## Feature Tags

### `@implemented`
- **Purpose**: Mark features ready for CI
- **CI Behavior**: Included in `test:bdd` and `test:ci`
- **Usage**: Production-ready features

### `@wip` (Work In Progress)
- **Purpose**: Features under development
- **CI Behavior**: Excluded from `test:bdd` and `test:ci`
- **Usage**: New features not yet implemented
- **Run with**: `npm run test:bdd:wip`

## Assertions

We use custom assertion helpers (compatible with Vitest syntax) in `test/steps/assertions.ts`:

```typescript
this.expect(actual).toBe(expected);
this.expect(value).toBeDefined();
this.expect(obj).toHaveProperty('key', 'value');
this.expect(obj).toEqual(expected);
```

## Shared State (World)

The `RivetBenchWorld` class in `test/steps/world.ts` provides shared state across steps:

```typescript
export class RivetBenchWorld extends World {
  public restServer?: FastifyInstance;
  public response?: { statusCode: number; body: unknown };
  public expect = expect;  // Assertion helper
}
```

## Hooks

`test/steps/hooks.ts` provides setup/teardown:

```typescript
Before(async function (this: RivetBenchWorld) {
  // Setup before each scenario
});

After(async function (this: RivetBenchWorld) {
  await this.reset();  // Cleanup after each scenario
});
```

## Configuration

### `cucumber.config.js`

```javascript
export default {
  default: {
    import: ['test/steps/*.ts'],
    format: ['progress'],
    formatOptions: { snippetInterface: 'async-await' },
    publishQuiet: true
  }
};
```

### TypeScript + ESM Support

Cucumber runs with Node's `--import tsx/esm` flag to support TypeScript and ESM modules.

## CI Integration

The `test:ci` script runs both test suites:

```json
{
  "test:ci": "npm run test:unit && npm run test:bdd"
}
```

Only `@implemented` features run in CI. `@wip` features are excluded to prevent breaking the pipeline.

## Best Practices

### ✅ DO
- Tag new features with `@wip` until fully implemented
- Write Gherkin BEFORE implementation (BDD)
- Use descriptive scenario names
- Keep steps reusable across features
- Clean up resources in `After` hooks

### ❌ DON'T
- Commit `@wip` features without tests passing
- Mix business logic into step definitions
- Create overly complex scenarios
- Skip the review phase
- Leave servers running after tests

## Example: Adding a New Feature

1. **Create feature file** (`test/features/calculator.feature`):
```gherkin
@wip
Feature: Calculator
  Scenario: Add two numbers
    Given I have a calculator
    When I add 2 and 3
    Then the result should be 5
```

2. **Run to see undefined steps**:
```bash
npm run test:bdd:wip
```

3. **Implement step definitions** (`test/steps/calculator-steps.ts`)

4. **Implement functionality** in `src/`

5. **Verify tests pass**:
```bash
npm run test:bdd:wip
```

6. **Mark as implemented**:
```gherkin
@implemented
Feature: Calculator
```

7. **Run full CI**:
```bash
npm run test:ci
```

## Troubleshooting

### "Undefined step" errors
- Ensure step definitions are in `test/steps/*.ts`
- Check that Gherkin text matches step definition regex exactly
- Verify JSON strings are quoted: `'{ "key": "value" }'`

### ESM/TypeScript errors
- Ensure `"type": "module"` in `package.json`
- Use `NODE_OPTIONS='--import tsx/esm'` for Cucumber commands
- Import files with `.js` extension (TypeScript ESM convention)

### Tests pass locally but fail in CI
- Ensure no `@wip` tags on committed features
- Check that `test:ci` script is used in CI
- Verify all dependencies are in `package.json`

---

For more examples, see existing feature files in `test/features/`.
