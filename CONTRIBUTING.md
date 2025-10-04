# Contributing to RivetBench

Thank you for your interest in contributing to RivetBench! This document provides guidelines and instructions for contributing.

## Development Workflow

### Prerequisites
- Node.js 20 or higher
- npm (comes with Node.js)
- Git

### Setup
```bash
# Clone the repository
git clone https://github.com/lordcraymen/rivetbench.git
cd rivetbench

# Install dependencies
npm install

# Run tests to ensure everything works
npm test

# Check linting
npm run lint

# Check types
npm run type-check
```

## Branch Strategy

We follow a **trunk-based development** model with protection on the `main` branch:

1. **Never commit directly to `main`** - All changes must go through Pull Requests
2. **Create feature branches** from `main`
3. **Keep branches short-lived** (ideally merged within a few days)
4. **Use descriptive branch names** following the conventions below

### Branch Naming Conventions
- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `hotfix/critical-issue` - Critical production fixes
- `docs/what-changed` - Documentation updates
- `refactor/what-refactored` - Code refactoring
- `test/what-tested` - Test additions or improvements

### Creating a New Feature

```bash
# Ensure your main branch is up to date
git checkout main
git pull origin main

# Create a new feature branch
git checkout -b feature/your-feature-name

# Make your changes...
# Pre-commit hooks will run automatically on commit

# Commit your changes (use conventional commits)
git add .
git commit -m "feat: add new endpoint for user management"

# Push your branch
git push origin feature/your-feature-name

# Create a Pull Request on GitHub
```

## Commit Message Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without changing functionality
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates, etc.
- `ci`: CI/CD configuration changes

### Examples:
```bash
feat(endpoints): add user authentication endpoint
fix(rest): handle edge case in request validation
docs(readme): update installation instructions
test(endpoints): add tests for echo endpoint
ci(github): add code coverage reporting
```

## Temporary Files Management

**AI agents and developers**: Use the `.agent/` directory for all temporary files:
- `.agent/memory/` - Agent context, state tracking, session notes
- `.agent/pr/` - PR descriptions, draft content, instructions
- `.agent/summaries/` - Implementation summaries, cleanup logs

This directory is gitignored and will never be committed. See `.agent/README.md` for details.

**Before creating a PR**:
1. Review `.agent/pr/` for draft PR descriptions
2. The `.agent/` directory will automatically be excluded from commits
3. No manual cleanup needed - just ensure no temporary MD files exist in the root

## Pre-commit Hooks

Pre-commit hooks are automatically installed via Husky. On each commit, the following checks run:

1. **Linting** - ESLint checks and auto-fixes
2. **Type checking** - TypeScript compilation check
3. **Related tests** - Tests for changed files

If any check fails, the commit will be blocked. Fix the issues and try again.

### Skipping Hooks (Not Recommended)
```bash
# Only in emergencies - CI will still catch issues
git commit --no-verify -m "emergency fix"
```

## Pull Request Process

1. **Create a PR** from your feature branch to `main`
2. **Fill out the PR template** completely
3. **Wait for CI checks** to pass:
   - Linting
   - Type checking
   - Unit tests (Vitest)
   - BDD tests (Cucumber)
   - Build verification
4. **Request review** from at least one maintainer
5. **Address feedback** if any changes are requested
6. **Merge** once approved and all checks pass

### PR Best Practices
- Keep PRs **focused and small** (easier to review)
- Write **clear descriptions** of what and why
- Reference related issues using `#issue_number`
- Add **tests** for new features or bug fixes
- Update **documentation** as needed
- Ensure **all CI checks pass**

## Testing

### Running Tests
```bash
# Run all tests in watch mode
npm test

# Run tests once (for CI)
npm run test:ci

# Run BDD tests
npm run bdd
```

### Writing Tests

#### Unit Tests (Vitest)
Place unit tests next to the code they test or in the `test/` directory.

```typescript
import { describe, it, expect } from 'vitest';
import { makeEndpoint } from '../src/core/endpoint';

describe('makeEndpoint', () => {
  it('should create an endpoint definition', () => {
    // Test implementation
  });
});
```

#### BDD Tests (Cucumber)
1. Write feature files in `test/features/`
2. Implement step definitions in `test/steps/`
3. Follow the Gherkin syntax (Given/When/Then)

## Code Style

- Follow the ESLint configuration (`.eslintrc.cjs`)
- Use TypeScript strict mode
- Prefer `const` over `let`, avoid `var`
- Use async/await over raw Promises
- Write descriptive variable and function names
- Add JSDoc comments for public APIs

### TypeScript Guidelines
- Use explicit types for function parameters and return values
- Leverage Zod for runtime validation
- Avoid `any` type - use `unknown` if necessary
- Use `interface` for object shapes, `type` for unions/intersections

## Documentation

- Update `README.md` for user-facing changes
- Update `agent.md` for workflow changes
- Add JSDoc comments for new public APIs
- Update `cleanup.md` for temporary scaffolding

## BDD and Interface-First Development

RivetBench follows an **interface-first, BDD-oriented** approach:

1. **Write a feature file** describing the desired behavior
2. **Design the interface** (types, schemas) without implementation
3. **Add scaffolding** to wire up the new interface
4. **Implement handlers** once the interface is stable
5. **Document cleanup tasks** for temporary code
6. **Automate checks** with tests

See `agent.md` for detailed workflow.

## Questions or Issues?

- Open an issue on GitHub for bugs or feature requests
- Start a discussion for questions or ideas
- Check existing issues before creating a new one

## License

By contributing to RivetBench, you agree that your contributions will be licensed under the MIT License.
