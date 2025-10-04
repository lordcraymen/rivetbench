# Pull Request: Implement Cucumber BDD Step Definitions

## 🎯 Overview

This PR implements **Cucumber BDD testing** for RivetBench while maintaining **Vitest as the only testing framework**. No additional test frameworks (Chai, Jest, etc.) were added.

## 🚀 What's New

### Test Infrastructure
- ✅ Complete Cucumber step definitions for BDD testing
- ✅ Custom assertion helpers compatible with Vitest API
- ✅ TypeScript + ESM support for Cucumber
- ✅ CI-safe workflow with `@wip` and `@implemented` tags

### Files Added

**Step Definitions** (`test/steps/`)
- `world.ts` - Shared test context (World class)
- `hooks.ts` - Before/After hooks for cleanup
- `assertions.ts` - Vitest-style assertion helpers
- `endpoint-steps.ts` - Generic endpoint testing steps
- `rest-steps.ts` - REST API testing steps

**Documentation**
- `docs/BDD_TESTING.md` - Complete BDD workflow guide
- `CUCUMBER_IMPLEMENTATION.md` - Technical implementation summary

**Configuration Updates**
- `cucumber.config.js` - ESM-compatible configuration
- `package.json` - New test scripts and dependencies

**Feature Files Updated**
- `test/features/echo.feature` - Added `@implemented` tag, updated syntax
- `test/features/health.feature` - Added `@implemented` tag, updated syntax

## 📊 Test Results

```
✓ 27 unit tests (Vitest)
✓ 3 BDD scenarios (Cucumber)
✓ 10 BDD steps
✓ 100% pass rate
✓ All linting checks pass
```

## 🎓 New Test Commands

```bash
# Unit Tests (Vitest)
npm test              # Watch mode
npm run test:unit     # Run once

# BDD Tests (Cucumber)
npm run test:bdd      # Implemented features only (for CI)
npm run test:bdd:all  # All features including WIP
npm run test:bdd:wip  # Work-in-progress only

# CI Pipeline
npm run test:ci       # Unit + BDD (excludes @wip)
```

## 🏷️ Feature Tag System

### `@implemented`
- Production-ready features
- Included in CI pipeline
- Must have passing tests

### `@wip` (Work In Progress)
- Features under development
- **Excluded from CI** (won't break pipeline)
- Developers can work on them safely

## 🔧 Technical Implementation

### The Challenge
Vitest cannot be imported in CommonJS context, but Cucumber was loading modules in CJS mode.

### The Solution
```bash
NODE_OPTIONS='--import tsx/esm' cucumber-js test/features --import 'test/steps/*.ts'
```

**Key Points:**
1. Use Node.js v22's native `--import` flag (not deprecated `--loader`)
2. Load TypeScript with `tsx/esm` for full ESM support
3. Custom assertions that mirror Vitest API (no additional frameworks)

### Custom Assertions
```typescript
// test/steps/assertions.ts
export function expect(actual: unknown) {
  return {
    toBe(expected) { /* ... */ },
    toBeDefined() { /* ... */ },
    toHaveProperty(key, value) { /* ... */ },
    toEqual(expected) { /* ... */ }
  };
}
```

## 🎯 BDD Workflow

1. **Write Feature** - Create `.feature` file with `@wip` tag
2. **Review** - Stakeholder approval of Gherkin
3. **Implement Steps** - Tests fail (Red phase)
4. **Implement Code** - Tests pass (Green phase)
5. **Mark Ready** - Change to `@implemented`
6. **CI Validates** - Automatic testing

## 📝 Example Usage

```gherkin
@wip
Feature: New Calculator
  Scenario: Add numbers
    Given I have a calculator
    When I add 2 and 3
    Then the result should be 5
```

**During Development**: `npm run test:bdd:wip` (safe to fail)  
**After Implementation**: Change to `@implemented`, runs in CI

## ✅ Benefits

1. **Single Test Framework** - Only Vitest, no duplication
2. **BDD Workflow** - Gherkin-first development
3. **CI-Safe** - WIP features don't break pipeline
4. **Type-Safe** - Full TypeScript support
5. **Well Documented** - Complete guides included

## 🔍 Checklist

- [x] All tests pass (unit + BDD)
- [x] Linting passes
- [x] Type checking passes
- [x] Documentation complete
- [x] CI pipeline works with `@wip` exclusion
- [x] No breaking changes
- [x] Follows conventional commits

## 📖 Documentation

- **BDD Guide**: `docs/BDD_TESTING.md`
- **Implementation Details**: `CUCUMBER_IMPLEMENTATION.md`
- **Examples**: `test/features/*.feature`
- **Step Definitions**: `test/steps/*.ts`

## 🎉 Closes

Closes #1 - Implement Cucumber step definitions (from ROADMAP.md)

## 🚦 Ready to Merge

This PR:
- ✅ Implements priority HIGH item from roadmap
- ✅ Maintains backward compatibility
- ✅ Adds no breaking changes
- ✅ Includes comprehensive documentation
- ✅ All tests passing

---

**Reviewers**: Please review the BDD workflow in `docs/BDD_TESTING.md` and test the new commands locally!
