# RivetBench Documentation

This directory contains detailed documentation for developers and contributors.

---

## 📚 Active Documentation

### Core References (Read in Order)

1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Architecture patterns and SOLID principles
   - SOLID principles with examples
   - Dependency injection pattern
   - Error handling system
   - Logging guidelines
   - Transport parity requirements

2. **[TESTING.md](./TESTING.md)** - Testing practices and workflows
   - Unit tests (Vitest)
   - BDD tests (Cucumber)
   - Test structure and patterns
   - Best practices

3. **[LESSONS_LEARNED.md](./LESSONS_LEARNED.md)** - Architectural decisions and evolving patterns
   - Past decisions and rationale
   - Common pitfalls to avoid
   - Evolution of guardrails
   - **MANDATORY**: Update after each feature/refactor

4. **[MCP_GUIDE.md](./MCP_GUIDE.md)** - MCP implementation details
   - Quick start
   - Configuration
   - Architecture overview
   - Adding endpoints
   - Testing MCP features
   - Integration guide

---

## 🚀 Planning Documents

- **[ROADMAP.md](./ROADMAP.md)** - Feature roadmap and development priorities

---

## Quick Links to Root Docs

- **[../README.md](../README.md)** - Project overview and user guide
- **[../AGENTS.MD](../AGENTS.MD)** - Agent policy and quick reference
- **[../CONTRIBUTING.md](../CONTRIBUTING.md)** - Contribution guidelines

---

## Documentation Hierarchy

```
Level 1 (Always Read First):
  └─ AGENTS.MD           # Quick policy, priorities, DoD, SOLID subset

Level 2 (On Demand):
  ├─ docs/ARCHITECTURE.md   # Deep dive: SOLID, DI, errors, logging
  ├─ docs/TESTING.md        # Deep dive: Unit tests, BDD, patterns
  └─ CONTRIBUTING.md        # Workflow: branches, commits, PRs

Level 3 (Specialized):
  └─ docs/MCP_GUIDE.md      # MCP-specific implementation

Reference:
  └─ README.md              # User-facing project overview
```

---

## When to Read What

### Starting a New Feature
1. Read `AGENTS.MD` - Understand policy and priorities
2. Read `CONTRIBUTING.md` - Understand workflow
3. Skim `docs/ARCHITECTURE.md` - Review SOLID principles
4. Skim `docs/TESTING.md` - Review testing requirements

### Working on MCP Features
1. Read `AGENTS.MD` - Note MCP-specific logging rules
2. Read `docs/MCP_GUIDE.md` - Comprehensive MCP guide
3. Reference `docs/ARCHITECTURE.md` → Transport Parity section

### Debugging/Refactoring
1. Read `docs/ARCHITECTURE.md` - Dependency injection patterns
2. Read `docs/TESTING.md` - Testing patterns for refactored code
3. Reference `AGENTS.MD` - Self-check against policy

### Before Creating PR
1. Review `AGENTS.MD` - Self-check against DoD and policy
2. Review `CONTRIBUTING.md` → Pull Request Process
3. Run pre-commit checklist from `AGENTS.MD`

---

## Maintenance Notes

**Kept Minimal**: This structure is designed to minimize context stuffing while maintaining precise guardrails. Each document has a specific purpose and consumption order.

**Agent-Friendly**: Documents follow a drill-down pattern - agents start with high-level policy (AGENTS.MD) and only dive deeper when needed for specific work.
