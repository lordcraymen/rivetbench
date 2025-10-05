# Agent Policy (v1.0)

## Priorities
P0 Correctness > P1 Security > P2 Maintainability > P3 Performance > P4 Speed.

## Definition of Done
- [DOD-01] All new/changed code has unit tests (min 80% coverage in changed files).
- [DOD-02] Formatter + linter pass: `npm run lint` and `npm run type-check` with no errors.
- [DOD-03] No new runtime warnings in `npm test`.
- [DOD-04] Public APIs documented with JSDoc and 1 usage example.
- [DOD-05] No secrets/keys; config via env vars only (see `src/config/index.ts`).

## SOLID & Clean Code (enforced subset)
- [SOLID-SRP-01] Max 1 responsibility per module; split if >250 LOC or >2 concerns.
- [SOLID-DIP-02] Depend on interfaces/abstractions; **inject dependencies as parameters**.
- [SOLID-DIP-03] Load config **once** at app entry; pass `config` to all components.
- [CLEAN-NAM-01] Names are descriptive; abbreviations only: cfg, ctx, idx, tmp, req, res.
- [CLEAN-FUNC-02] Functions ≤ 30 LOC; >2 branches → extract.
- [CLEAN-ERR-03] No bare `catch`; use specific error classes from `src/core/errors.ts`.
- [CLEAN-IMM-04] Prefer pure functions; avoid global state.

## Style & Tooling
- [STYLE-01] TypeScript strict mode; no `any` without comment `// justification: REASON`.
- [STYLE-02] Use ESLint rules in `.eslintrc.js`; no suppressions without inline comment.
- [STYLE-03] Run `npm run lint` and `npm run type-check` before committing.

## Tests
- [TEST-01] Unit tests: Arrange-Act-Assert; one assertion per test case.
- [TEST-02] BDD: Tag with `@wip` until implemented; `@implemented` when ready.
- [TEST-03] Mock external dependencies via DI; no network calls in unit tests.

## Security
- [SEC-01] Validate all external inputs using Zod schemas.
- [SEC-02] Secrets from env vars only; never hardcode (see [DOD-05]).
- [SEC-03] Log errors without exposing sensitive data (passwords, tokens).

## Logging (MCP-specific)
- [LOG-01] **CRITICAL**: In MCP stdio mode, use `console.error()` or `context.log.*` only.
- [LOG-02] **NEVER** use `console.log()` in MCP code; it breaks JSON-RPC protocol.
- [LOG-03] Use structured logging: `logger.info({ key: value }, 'message')`.

## Output Contract
Return:
1. **PLAN**: Brief summary of changes (2-4 lines).
2. **CHANGES**: List files modified with 1-line description each.
3. **SELF-CHECK**: List DOD/SOLID/STYLE/SEC/LOG IDs with pass/fail + brief evidence.

## Post-Feature Review (Mandatory)
After completing a feature or refactor:
1. **Document lessons** in `docs/LESSONS_LEARNED.md`
2. **Review guardrails**: Does `AGENTS.MD` need updates?
3. **Update patterns**: Do `docs/ARCHITECTURE.md` or `docs/TESTING.md` need updates?
4. **Keep focused**: Remove outdated content from LESSONS_LEARNED.md

---

## Drill-Down References

**When you need more detail**, consult these docs in order:

### Architecture & Patterns
- **SOLID Principles**: See `docs/ARCHITECTURE.md` → SOLID section
- **Dependency Injection**: See `docs/ARCHITECTURE.md` → DI Pattern section
- **Error Handling**: See `docs/ARCHITECTURE.md` → Error Handling section
- **Lessons Learned**: See `docs/LESSONS_LEARNED.md` → Past decisions & rationale

### Testing
- **Unit Tests**: See `docs/TESTING.md` → Unit Tests section
- **BDD/Cucumber**: See `docs/TESTING.md` → BDD section
- **Test Structure**: See `docs/TESTING.md` → Structure section

### Development Workflow
- **Branching**: See `docs/CONTRIBUTING.md` → Branch Strategy section
- **Commits**: See `docs/CONTRIBUTING.md` → Commit Guidelines section
- **PRs**: See `docs/CONTRIBUTING.md` → Pull Request section

### Technical Guides
- **MCP Implementation**: See `docs/MCP_GUIDE.md` (for MCP-specific work)
- **REST API**: See `README.md` → Quick Start section

---

## Quick Reference

### Common Patterns

**Dependency Injection**:
```typescript
// ❌ BAD - Hidden dependency
function createServer() {
  const config = loadConfig();  // Created internally
}

// ✅ GOOD - Injected dependency
function createServer(config: ServerConfig) {
  // Config passed as parameter
}
```

**Error Handling**:
```typescript
// ❌ BAD - Generic error
throw new Error('Something failed');

// ✅ GOOD - Specific error with context
throw new ValidationError('Invalid input', { field: 'email' });
```

**MCP Logging**:
```typescript
// ❌ BAD - Breaks MCP stdio
console.log('Debug info');

// ✅ GOOD - Safe for MCP
console.error('Debug info');
context.log.info('Debug info');
```

### Pre-Commit Checklist (30 seconds)
1. [ ] Run `npm run lint` → passes
2. [ ] Run `npm run type-check` → passes
3. [ ] Run `npm test` → passes
4. [ ] Review changed files for SOLID violations
5. [ ] Verify no `console.log()` in MCP code

---

## Context Hierarchy

**Level 1 (Always)**: This file (AGENTS.MD)
**Level 2 (On demand)**: `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/CONTRIBUTING.md`
**Level 3 (Specialized)**: `docs/MCP_GUIDE.md` (MCP work only)

Read `README.md` for project overview and user-facing documentation.
