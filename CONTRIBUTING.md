# Contributing to RivetBench

Thank you for your interest in contributing to RivetBench! This document provides guidelines and instructions for contributing.

---

## Prerequisites

- **Node.js 20+** and npm
- **Git**
- **Read**: `AGENTS.MD` for coding standards
- **Read**: `docs/ARCHITECTURE.md` for SOLID principles

---

## Quick Start

```bash
# Clone and setup
git clone https://github.com/lordcraymen/rivetbench.git
cd rivetbench
npm install

# Verify setup
npm run lint          # Linter passes
npm run type-check    # Types pass
npm test              # All tests pass
```

---

## Branch Strategy

**Trunk-based development** with protected `main` branch:

1. **Never commit directly to `main`** - All changes via Pull Requests
2. **Create feature branches** from up-to-date `main`
3. **Keep branches short-lived** (merge within days)
4. **Use descriptive branch names**

### Branch Naming

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New features | `feature/add-auth` |
| `fix/` | Bug fixes | `fix/validation-error` |
| `hotfix/` | Critical production fixes | `hotfix/security-patch` |
| `docs/` | Documentation | `docs/update-api-guide` |
| `refactor/` | Code refactoring | `refactor/improve-error-handling` |
| `test/` | Test additions | `test/add-integration-tests` |

### Feature Branch Workflow

```bash
# Start fresh from main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes, commit regularly
git add .
git commit -m "feat: add your feature"

# Push and create PR
git push origin feature/your-feature-name
```

---

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>
```

**Types**:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting (no code change)
- `refactor` - Code refactor (no behavior change)
- `test` - Add/update tests
- `chore` - Maintenance, deps
- `ci` - CI/CD changes

**Examples**:
```bash
feat(endpoints): add user authentication endpoint
fix(rest): handle validation edge case
docs(readme): update installation instructions
test(endpoints): add integration tests for echo
refactor(logger): convert to dependency injection pattern
```

---

## Pull Request Process

### Before Creating PR

1. **Complete self-review** using checklist in `AGENTS.MD`
2. **Run quality checks**:
   ```bash
   npm run lint          # Must pass
   npm run type-check    # Must pass
   npm test              # All tests pass
   npm run test:bdd      # BDD tests pass
   ```
3. **Review changes**: Ensure no debug code, console.log(), or secrets
4. **Update docs**: README.md, JSDoc comments, etc.
5. **Document lessons** (mandatory): Update `docs/LESSONS_LEARNED.md` with:
   - Key architectural decisions made
   - Patterns adopted or avoided
   - Guardrail updates needed

### Creating the PR

1. **Push your branch**: `git push origin feature/your-feature`
2. **Create PR** on GitHub from your branch to `main`
3. **Fill out template** completely:
   - What changed and why
   - Testing performed
   - Related issues (#issue_number)
4. **Wait for CI checks**:
   - Linting
   - Type checking
   - Unit tests (Vitest)
   - BDD tests (Cucumber @implemented)
   - Build verification
5. **Request review** from maintainer
6. **Address feedback** if changes requested
7. **Merge** once approved

### PR Best Practices

- ✅ Keep PRs **small and focused** (easier to review)
- ✅ Write **clear descriptions** (what, why, how)
- ✅ Reference issues: `Closes #123` or `Relates to #456`
- ✅ Add **tests** for new features/fixes
- ✅ Update **documentation**
- ✅ Ensure **all CI checks pass**
- ❌ Don't mix unrelated changes
- ❌ Don't commit commented-out code
- ❌ Don't skip self-review checklist

---

## Pre-commit Hooks

Hooks run automatically via Husky on each commit:

1. **Linting** - ESLint auto-fixes
2. **Type checking** - TypeScript compilation
3. **Related tests** - Tests for changed files

If checks fail, commit is blocked. Fix issues and retry.

**Emergency skip** (CI will still catch issues):
```bash
git commit --no-verify -m "emergency: critical fix"
```

---

## Code Standards

### TypeScript

- Use **strict mode** (no `any` without justification comment)
- Explicit **return types** for functions
- **Interfaces** for object shapes, **types** for unions
- Leverage **Zod** for runtime validation
- No unused imports/variables

### Code Style

- Follow **ESLint** config (`.eslintrc.cjs`)
- Use `const` > `let`, never `var`
- Use **async/await** over raw Promises
- **Descriptive names** (no abbreviations except: cfg, ctx, idx, tmp, req, res)
- **JSDoc** for public APIs with usage example
- Comments explain **why**, not **what**

### SOLID Principles (Critical)

See `docs/ARCHITECTURE.md` for details:

1. **Single Responsibility**: One purpose per module
2. **Open/Closed**: Extend, don't modify
3. **Liskov Substitution**: Subclasses work like parents
4. **Interface Segregation**: Small, focused interfaces
5. **Dependency Inversion**: **Inject dependencies**

**Key Rule**: Load config **once** at app entry, then **inject** everywhere.

```typescript
// ❌ BAD - Hidden dependency
function createServer() {
  const config = loadConfig();  // Internal creation
}

// ✅ GOOD - Injected dependency
function createServer(config: ServerConfig) {
  // Config passed as parameter
}
```

---

## Testing

See `docs/TESTING.md` for comprehensive guide.

### Quick Reference

**Run tests**:
```bash
npm test              # Watch mode (development)
npm run test:unit     # Unit tests once
npm run test:bdd      # BDD tests (@implemented only)
npm run test:bdd:wip  # Work-in-progress features
npm run test:ci       # CI mode (unit + BDD)
```

**Write tests**:
- Use **Arrange-Act-Assert** pattern
- **Inject dependencies** (config, logger)
- Test **happy path + errors**
- Keep tests **isolated** (no shared state)
- **80%+ coverage** for changed files

**BDD workflow**:
1. Write `.feature` file (Gherkin)
2. Tag with `@wip`
3. Implement step definitions
4. Code the feature
5. Tests pass → change to `@implemented`

---

## Development Workflow

### Interface-First, BDD-Oriented

1. **Write feature file** - Describe desired behavior
2. **Design interface** - Types, schemas (no implementation)
3. **Add scaffolding** - Wire up new interface
4. **Implement handlers** - Fill in behavior
5. **Add tests** - Unit + BDD
6. **Document** - Update README, JSDoc
7. **Create PR** - Push and request review

### Goal: Create a Pull Request

Every feature, fix, or improvement should result in a **reviewable PR** that can be merged into `main`.

---

## Documentation

**Update when relevant**:
- `README.md` - User-facing changes
- `AGENTS.MD` - Agent policy/workflow changes
- `docs/ARCHITECTURE.md` - Architectural decisions
- `docs/TESTING.md` - Testing patterns
- `docs/LESSONS_LEARNED.md` - **MANDATORY** after each feature/refactor
- `docs/MCP_GUIDE.md` - MCP-specific features
- JSDoc comments - Public APIs

---

## Questions or Issues?

- **Bugs/Features**: Open issue on GitHub
- **Questions**: Start a discussion
- **Before opening**: Check existing issues

---

## License

By contributing to RivetBench, you agree that your contributions will be licensed under the **MIT License**.
