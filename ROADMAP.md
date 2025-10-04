# RivetBench Development Roadmap

This document outlines the next steps for implementing missing features and improving the RivetBench framework.

## ✅ Completed

### Core Framework (Initial Release)
- [x] Endpoint definition system with Zod schemas
- [x] Endpoint registry (in-memory)
- [x] OpenAPI document generation
- [x] Echo endpoint implementation
- [x] Zod-to-OpenAPI schema conversion
- [x] REST server with Fastify
- [x] Swagger UI integration at `/docs`
- [x] MCP server with stdio and httpStream transports
- [x] Comprehensive unit tests (27 tests passing)

### DevOps & Quality Assurance
- [x] Pre-commit hooks with Husky and lint-staged
- [x] GitHub Actions CI/CD pipeline
- [x] Branch protection documentation
- [x] Pull request template
- [x] Contributing guidelines
- [x] CODEOWNERS file

### What was completed:
1. **Core Framework**: Full dual-exposure (REST + MCP) with automatic schema generation
2. **REST Server**: Complete with health check, RPC endpoints, validation, Swagger UI
3. **MCP Server**: Full implementation with FastMCP, supports stdio and TCP transports
4. **DevOps**: Husky + lint-staged, CI pipeline (Node 20.x and 22.x), documentation

---

## 🔴 Critical - Must Implement Next

### 1. Cucumber Step Definitions (Priority: HIGH)
**Why**: BDD tests are defined but have no step implementations

**Tasks**:
- [ ] Implement step definitions for `echo.feature`
- [ ] Implement step definitions for `health.feature`
- [ ] Configure Cucumber properly in `cucumber.js` or similar config

**Files to create**:
```typescript
// test/steps/echo.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'vitest';

// Implementation of step definitions
// - Setup test context
// - Make HTTP requests to REST server
// - Assert responses
```

```typescript
// test/steps/health.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
// Implementation for health check tests
```

**Branch**: `feature/implement-cucumber-steps`

---

## 🟡 Important - Should Implement Soon

### 2. Error Handling & Logging (Priority: MEDIUM)
**Why**: Production apps need structured error handling and logging

**Tasks**:
- [ ] Create error classes for different error types (ValidationError, NotFoundError, etc.)
- [ ] Add structured logging (consider Pino, which works well with Fastify)
- [ ] Implement error middleware/handlers
- [ ] Add request ID tracking through the pipeline

**Branch**: `feature/error-handling-logging`

---

### 3. Integration Tests (Priority: MEDIUM)
**Why**: Unit tests are good, but we need end-to-end tests

**Tasks**:
- [ ] Create integration tests that start actual servers
- [ ] Test REST endpoints with real HTTP requests
- [ ] Test MCP server with real MCP protocol
- [ ] Add to CI pipeline

**Branch**: `feature/integration-tests`

---

### 8. Input/Output Middleware (Priority: LOW-MEDIUM)
**Why**: Endpoints may need pre/post processing (auth, logging, transformation)

**Tasks**:
- [ ] Design middleware system for endpoints
- [ ] Allow middleware to intercept input/output
- [ ] Support async middleware chains
- [ ] Add examples (auth, rate limiting, caching)

**Branch**: `feature/endpoint-middleware`

---

## 🟢 Nice to Have - Future Enhancements

### 9. Performance & Production Readiness
- [ ] Add request/response compression
- [ ] Implement rate limiting
- [ ] Add metrics and monitoring (Prometheus)
- [ ] Add health check with dependency status
- [ ] Implement graceful shutdown
- [ ] Add Docker support

**Branch**: `feature/production-readiness`

---

### 10. Developer Experience
- [ ] Add CLI tool for scaffolding endpoints
- [ ] Create VSCode extension or snippets
- [ ] Add hot reload for development
- [ ] Improve error messages
- [ ] Add request/response examples in OpenAPI

**Branch**: `feature/developer-experience`

---

### 11. Advanced Features
- [ ] WebSocket support for real-time endpoints
- [ ] GraphQL endpoint generation
- [ ] Authentication/Authorization framework
- [ ] Database integration helpers
- [ ] File upload handling
- [ ] Streaming responses

**Branch**: Various feature branches

---

### 12. Documentation
- [ ] Add architecture documentation (diagrams)
- [ ] Create tutorial series
- [ ] Add API reference documentation
- [ ] Record video tutorials
- [ ] Create example applications

**Branch**: `docs/comprehensive-documentation`

---

## Implementation Strategy

### ✅ Phase 1: Core Functionality - COMPLETE
1. ✅ Implement echo endpoint
2. ✅ Implement Zod-to-OpenAPI conversion
3. ✅ Build REST server with Swagger UI
4. ✅ Implement MCP server
5. ✅ Add comprehensive unit tests (27 tests)

**Status**: Core dual-exposure framework is fully functional!

### Phase 2: Testing & Quality (Current)
1. Add Cucumber step definitions for BDD tests
2. Add integration tests for REST and MCP
3. Improve error handling and logging
4. Add request ID tracking

### Phase 3: Production Ready (Next)
1. Middleware system
2. Performance optimizations
3. Rate limiting and security
4. Monitoring and metrics

### Phase 4: Polish & Extensions (Ongoing)
1. Advanced features as needed
2. Community feedback integration
3. Performance monitoring
4. Ecosystem expansion

---

## Branch Protection Reminder

After this commit:
1. **Set up branch protection** following `.github/BRANCH_PROTECTION.md`
2. **Never commit directly to main** again
3. **Always create feature branches** for new work
4. **Open PRs** and wait for CI before merging
5. **Get code reviews** before merging

---

## Success Criteria

Each feature should have:
- ✅ Clear interface definition
- ✅ Type-safe implementation
- ✅ Unit tests (Vitest)
- ✅ BDD tests (Cucumber) where applicable
- ✅ Updated documentation
- ✅ Passing CI pipeline
- ✅ Code review approval

---

## Questions?

Refer to:
- `CONTRIBUTING.md` for development workflow
- `agent.md` for BDD/interface-first approach
- `.github/BRANCH_PROTECTION.md` for branch protection setup
- `README.md` for project overview

Happy coding! 🚀
