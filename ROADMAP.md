# RivetBench Development Roadmap

This document outlines the next steps for implementing missing features and improving the RivetBench framework.

## ✅ Completed (This Commit)

### DevOps & Quality Assurance
- [x] Pre-commit hooks with Husky and lint-staged
- [x] GitHub Actions CI/CD pipeline
- [x] Branch protection documentation
- [x] Pull request template
- [x] Contributing guidelines
- [x] CODEOWNERS file

### What was added:
1. **Husky + lint-staged**: Automatic linting, type-checking, and related tests on commit
2. **CI Pipeline**: Runs on all PRs and pushes to main, tests against Node 20.x and 22.x
3. **Documentation**: Complete guides for contributing and branch protection setup

---

## 🔴 Critical - Must Implement Next

### 1. Example Endpoint Implementation (Priority: HIGH)
**Why**: Tests reference an echo endpoint that doesn't exist yet

**Tasks**:
- [ ] Create `src/endpoints/echo.ts` implementing the echo endpoint
- [ ] Register the endpoint in `src/endpoints/index.ts`
- [ ] Wire it up in the server initialization

**Files to create/modify**:
```typescript
// src/endpoints/echo.ts
import { z } from 'zod';
import { makeEndpoint } from '../core/endpoint.js';

const EchoInput = z.object({
  message: z.string().min(1, 'Message cannot be empty')
});

const EchoOutput = z.object({
  echoed: z.string()
});

export const echoEndpoint = makeEndpoint({
  name: 'echo',
  summary: 'Echo a message back to the caller',
  description: 'Takes a message string and returns it in the echoed field',
  input: EchoInput,
  output: EchoOutput,
  handler: async ({ input }) => {
    return { echoed: input.message };
  }
});
```

```typescript
// src/endpoints/index.ts
import { InMemoryEndpointRegistry } from '../core/registry.js';
import { echoEndpoint } from './echo.js';

export const createDefaultRegistry = () => {
  const registry = new InMemoryEndpointRegistry();
  registry.register(echoEndpoint);
  return registry;
};
```

**Branch**: `feature/implement-echo-endpoint`

---

### 2. Cucumber Step Definitions (Priority: HIGH)
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

### 3. Zod-to-OpenAPI Schema Conversion (Priority: HIGH)
**Why**: OpenAPI docs currently show placeholder schemas instead of actual Zod schemas

**Tasks**:
- [ ] Install `zod-to-json-schema` or similar library
- [ ] Update `src/core/openapi.ts` to convert Zod schemas to JSON Schema
- [ ] Ensure proper OpenAPI 3.0.3 compliance

**Implementation**:
```typescript
// src/core/openapi.ts
import { zodToJsonSchema } from 'zod-to-json-schema';

const buildRequestBodySchema = (endpoint: AnyEndpointDefinition): OpenAPIV3.SchemaObject => {
  return zodToJsonSchema(endpoint.input, { target: 'openApi3' }) as OpenAPIV3.SchemaObject;
};

const buildResponseSchema = (endpoint: AnyEndpointDefinition): OpenAPIV3.SchemaObject => {
  return zodToJsonSchema(endpoint.output, { target: 'openApi3' }) as OpenAPIV3.SchemaObject;
};
```

**Branch**: `feature/zod-to-openapi-conversion`

---

### 4. MCP Server Implementation (Priority: MEDIUM)
**Why**: MCP server is currently a stub that throws an error

**Tasks**:
- [ ] Implement actual MCP server using `fastmcp` library
- [ ] Register endpoints as MCP tools
- [ ] Support both stdio and TCP transport modes
- [ ] Test with MCP clients

**Implementation outline**:
```typescript
// src/server/mcp.ts
import { FastMCP } from 'fastmcp';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const startMcpServer = async ({ registry }: McpServerOptions) => {
  const mcp = new FastMCP('RivetBench');
  
  // Register each endpoint as an MCP tool
  for (const endpoint of registry.list()) {
    mcp.addTool({
      name: endpoint.name,
      description: endpoint.summary,
      parameters: zodToJsonSchema(endpoint.input),
      handler: async (params) => {
        const parsed = endpoint.input.parse(params);
        return await endpoint.handler({ input: parsed, config: {} });
      }
    });
  }
  
  await mcp.start();
};
```

**Branch**: `feature/implement-mcp-server`

---

## 🟡 Important - Should Implement Soon

### 5. Swagger UI Integration (Priority: MEDIUM)
**Why**: README mentions built-in Swagger UI, but it's not implemented

**Tasks**:
- [ ] Install `@fastify/swagger` and `@fastify/swagger-ui`
- [ ] Integrate Swagger UI at `/docs` endpoint
- [ ] Configure with the generated OpenAPI document

**Branch**: `feature/add-swagger-ui`

---

### 6. Error Handling & Logging (Priority: MEDIUM)
**Why**: Production apps need structured error handling and logging

**Tasks**:
- [ ] Create error classes for different error types (ValidationError, NotFoundError, etc.)
- [ ] Add structured logging (consider Pino, which works well with Fastify)
- [ ] Implement error middleware/handlers
- [ ] Add request ID tracking through the pipeline

**Branch**: `feature/error-handling-logging`

---

### 7. Integration Tests (Priority: MEDIUM)
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

### Phase 1: Core Functionality (Weeks 1-2)
1. Implement echo endpoint
2. Add Cucumber step definitions
3. Implement Zod-to-OpenAPI conversion
4. Get BDD tests passing

### Phase 2: MCP & REST Parity (Weeks 3-4)
1. Implement MCP server
2. Add Swagger UI
3. Add integration tests
4. Ensure both REST and MCP work identically

### Phase 3: Production Ready (Weeks 5-6)
1. Error handling and logging
2. Middleware system
3. Performance optimizations
4. Documentation improvements

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
