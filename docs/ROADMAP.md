# RivetBench Development Roadmap

This document outlines the next steps for implementing features and improvements to the RivetBench framework.

## Current Status

**Version**: 0.2.0 - Testing & CLI Complete  
**Date**: November 2025

### What's Working

✅ **Core Framework**: Write-once endpoints with Zod schemas  
✅ **REST Server**: Full REST API with Swagger UI at `/docs`  
✅ **MCP Server**: Dual transport (stdio + TCP) MCP implementation  
✅ **Schema Generation**: Automatic OpenAPI + MCP JSON Schema  
✅ **CLI Tool**: Full CLI with named parameters and JSON input  
✅ **BDD Testing**: Complete Cucumber step definitions and integration tests  
✅ **Error Handling**: Custom error classes and structured logging  
✅ **Testing**: Unit + integration tests passing  
✅ **CI/CD**: GitHub Actions with Node 20.x and 22.x  
✅ **Quality**: Pre-commit hooks, linting, type checking

## Completed Features (Version 0.2.0)

### ✅ **CLI Tool Implementation**
**Status**: ✅ **COMPLETE**  
**Features**:
- [x] Named parameter support (`rivetbench call echo -message "hello"`)
- [x] JSON input mode (`rivetbench call echo --input '{"message":"hello"}'`)
- [x] Raw output mode (`rivetbench call echo -message "hello" --raw`)
- [x] Endpoint listing (`rivetbench list`)
- [x] Help system (`rivetbench --help`)
- [x] Full test coverage with memory streams

### ✅ **BDD Testing Framework**
**Status**: ✅ **COMPLETE**  
**Features**:
- [x] Complete step definitions for all transports (REST, CLI)
- [x] Integration tests with real server instances
- [x] Feature tagging workflow (`@implemented`, `@wip`)
- [x] Cucumber configuration and execution scripts
- [x] Cross-transport consistency testing
- [x] Test isolation with dependency injection

### ✅ **Error Handling & Logging**
**Status**: ✅ **COMPLETE**  
**Features**:
- [x] Custom error classes (ValidationError, EndpointNotFoundError, InternalServerError, ConfigurationError)
- [x] Structured logging with Pino (stderr-compatible for MCP)
- [x] Error middleware for consistent REST responses
- [x] Request ID tracking through pipeline
- [x] MCP error handling with FastMCP logger
- [x] Comprehensive test coverage

---## Next: Version 0.3.0 - Production Ready

### 1. Request ID Parity (Priority: HIGH)
**Status**: � In Progress  
**Branch**: `feature/request-id-parity`

Complete request ID consistency across transports:
- [x] Request ID generation via `crypto.randomUUID()`
- [ ] Complete request ID context passing in MCP transport
- [ ] Finalize request tracing through all endpoint handlers
- [ ] Complete BDD test coverage for request ID parity

### 2. Middleware System (Priority: MEDIUM)
**Status**: 🔴 Not Started  
**Branch**: `feature/endpoint-middleware`

Pre/post processing for endpoints:
- [ ] Design middleware architecture
- [ ] Async middleware chain support
- [ ] Built-in middleware (auth, logging, rate limiting)
- [ ] Documentation and examples

### 3. Performance & Monitoring (Priority: MEDIUM)
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

### Version 0.2.0 (November 2025) - Testing & CLI Complete
**Highlights**: Complete BDD testing framework and CLI tool

**Added**:
- Complete Cucumber step definitions for all feature files
- CLI tool with named parameters and JSON input support
- Integration tests with real server instances
- Raw output mode for CLI (`--raw`)
- Cross-transport consistency testing
- BDD tagging workflow (`@implemented`, `@wip`)

**Enhanced**:
- Test coverage expanded significantly
- Documentation for testing approach
- CI pipeline includes BDD tests

### Version 0.1.0 (October 2025) - MCP Implementation
**Highlights**: Complete dual-exposure framework (REST + MCP)

**Added**:
- Core endpoint system with Zod schemas
- REST server with Fastify and Swagger UI
- MCP server with dual transport (stdio + TCP)
- OpenAPI 3 generation
- Custom error classes and structured logging
- Request ID tracking through pipeline
- Comprehensive test suite
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
