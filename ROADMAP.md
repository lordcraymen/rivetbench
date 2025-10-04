# RivetBench Development Roadmap

This document outlines the next steps for implementing features and improvements to the RivetBench framework.

## Current Status

**Version**: 0.1.0 - MCP Implementation Complete  
**Date**: October 2025

### What's Working

✅ **Core Framework**: Write-once endpoints with Zod schemas  
✅ **REST Server**: Full REST API with Swagger UI at `/docs`  
✅ **MCP Server**: Dual transport (stdio + TCP) MCP implementation  
✅ **Schema Generation**: Automatic OpenAPI + MCP JSON Schema  
✅ **Testing**: 27 unit tests passing  
✅ **CI/CD**: GitHub Actions with Node 20.x and 22.x  
✅ **Quality**: Pre-commit hooks, linting, type checking  

---

## Next: Version 0.2.0 - Testing & Quality

### 1. Cucumber Step Definitions (Priority: HIGH)
**Status**: 🔴 Not Started  
**Branch**: `feature/implement-cucumber-steps`

BDD tests are defined but need step implementations:
- [ ] Implement step definitions for `echo.feature`
- [ ] Implement step definitions for `health.feature`
- [ ] Configure Cucumber execution in test suite
- [ ] Document BDD testing approach

### 2. Integration Tests (Priority: HIGH)
**Status**: 🔴 Not Started  
**Branch**: `feature/integration-tests`

End-to-end testing with real servers:
- [ ] REST server integration tests with real HTTP requests
- [ ] MCP server integration tests with real protocol
- [ ] Cross-protocol consistency tests
- [ ] Add integration tests to CI pipeline

### 3. Error Handling & Logging (Priority: MEDIUM)
**Status**: 🔴 Not Started  
**Branch**: `feature/error-handling-logging`

Production-grade error handling:
- [ ] Custom error classes (ValidationError, NotFoundError, etc.)
- [ ] Structured logging with Pino
- [ ] Error middleware for consistent responses
- [ ] Request ID tracking through pipeline

---

## Future: Version 0.3.0 - Production Ready

### Middleware System
**Status**: 🔴 Not Started  
**Branch**: `feature/endpoint-middleware`

Pre/post processing for endpoints:
- [ ] Design middleware architecture
- [ ] Async middleware chain support
- [ ] Built-in middleware (auth, logging, rate limiting)
- [ ] Documentation and examples

### Performance & Monitoring
**Status**: 🔴 Not Started  
**Branch**: `feature/production-readiness`

Production-ready features:
- [ ] Request/response compression
- [ ] Rate limiting
- [ ] Metrics and monitoring (Prometheus)
- [ ] Enhanced health checks
- [ ] Graceful shutdown
- [ ] Docker support

---

## Future: Version 0.4.0+ - Extensions

### Developer Experience
**Status**: 💭 Planned

- [ ] CLI tool for scaffolding endpoints
- [ ] Hot reload for development
- [ ] VSCode snippets/extension
- [ ] Better error messages
- [ ] OpenAPI example generation

### Advanced Features
**Status**: 💭 Planned

- [ ] WebSocket support
- [ ] GraphQL endpoint generation
- [ ] Authentication/Authorization framework
- [ ] Database integration helpers
- [ ] File upload handling
- [ ] Streaming responses

### Documentation & Community
**Status**: 💭 Planned

- [ ] Architecture documentation with diagrams
- [ ] Tutorial series
- [ ] Example applications
- [ ] Video tutorials
- [ ] Community templates

---

## Implementation Principles

When implementing features, follow this process:

1. **Interface First**: Define the interface and types before implementation
2. **BDD Approach**: Write feature files to describe behavior
3. **Type Safety**: Ensure full TypeScript coverage
4. **Test Coverage**: Unit + integration tests for all features
5. **Documentation**: Update docs before merging
6. **CI Verification**: All checks must pass before merge

See `agent.md` for detailed workflow guidance.

---

## Version History

### Version 0.1.0 (October 2025) - MCP Implementation
**Highlights**: Complete dual-exposure framework (REST + MCP)

**Added**:
- Core endpoint system with Zod schemas
- REST server with Fastify and Swagger UI
- MCP server with dual transport (stdio + TCP)
- OpenAPI 3 generation
- Comprehensive test suite (27 tests)
- CI/CD pipeline with GitHub Actions
- Pre-commit hooks and quality checks

**Documentation**:
- Complete MCP implementation guide
- Contributing guidelines
- Branch protection setup
- Development workflow

---

## Contributing

See `CONTRIBUTING.md` for:
- Development setup
- Branch naming conventions
- Commit message format
- Pull request process
- Code review guidelines

---

## Questions?

- **Getting Started**: See `README.md`
- **Development Workflow**: See `CONTRIBUTING.md`
- **BDD Approach**: See `agent.md`
- **MCP Details**: See `docs/MCP_GUIDE.md`

Happy coding! 🚀
