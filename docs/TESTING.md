# RivetBench Testing Strategy

## Test Pyramid

```
        ╱ BDD ╲            Cucumber feature files — transport parity
       ╱───────╲
      ╱ Integration ╲      Adapter tests — Fastify, MCP, CLI against real infra
     ╱─────────────────╲
    ╱    Unit Tests       ╲  Domain + Application layer — pure functions, no I/O
   ╱───────────────────────╲
```

## Unit Tests (Vitest)

**Scope**: Domain and Application layers. No I/O, no real servers.

```bash
npm run test:unit          # Single run
npm run test               # Watch mode
```

### Structure

```
test/
├── domain/
│   ├── endpoint.test.ts       # makeEndpoint, naming validation
│   ├── registry.test.ts       # InMemoryEndpointRegistry
│   └── errors.test.ts         # Error classes, serialization
├── application/
│   ├── invoke-endpoint.test.ts  # The core pipeline
│   └── list-endpoints.test.ts   # Listing + enrichment
├── adapters/
│   ├── fastify/
│   │   └── rest.test.ts       # Fastify route registration
│   ├── fastmcp/
│   │   └── mcp.test.ts        # MCP tool registration
│   └── cli/
│       ├── index.test.ts      # CLI dispatch
│       └── format-output.test.ts
└── config/
    └── index.test.ts          # loadConfig
```

### Conventions

- **Arrange-Act-Assert**: One assertion per test case
- **No network calls**: Mock external dependencies via DI
- **Test file location**: Mirror `src/` structure under `test/`
- **Naming**: `*.test.ts` suffix

### Application Service Tests

The application service layer is the highest-value test target. Since all transports delegate to it, testing `invokeEndpoint()` once covers the core pipeline:

```typescript
describe('invokeEndpoint', () => {
  it('should validate input and return validated output', async () => {
    // Arrange
    const registry = new InMemoryEndpointRegistry();
    registry.register(echoEndpoint);
    const logger = createTestLogger();

    // Act
    const result = await invokeEndpoint(registry, 'echo', { message: 'hi' }, logger);

    // Assert
    expect(result.output).toEqual({ echoed: 'hi' });
    expect(result.requestId).toBeDefined();
  });

  it('should throw ValidationError for invalid input', async () => {
    const registry = new InMemoryEndpointRegistry();
    registry.register(echoEndpoint);
    const logger = createTestLogger();

    await expect(
      invokeEndpoint(registry, 'echo', { message: 123 }, logger)
    ).rejects.toThrow(ValidationError);
  });
});
```

## BDD Tests (Cucumber)

**Scope**: Cross-transport parity. Verifies identical behaviour across REST, MCP, and CLI.

```bash
npm run test:bdd           # All implemented scenarios
npm run test:bdd:wip       # Work-in-progress only
npm run test:bdd:all       # Everything including @wip
```

### Feature Files

```
test/features/
├── echo.feature                  # Echo endpoint across transports
├── health.feature                # Health check endpoint
├── request-id-parity.feature     # Request ID generation parity
├── cli-named-parameters.feature  # CLI parameter parsing
└── cli-raw-output.feature        # CLI output formatting
```

### Step Definitions

```
test/steps/
├── world.ts              # Shared test world (registry, config, servers)
├── hooks.ts              # Before/After lifecycle
├── endpoint-steps.ts     # Given/When/Then for endpoint invocation
├── rest-steps.ts         # REST-specific steps
├── cli-steps.ts          # CLI-specific steps
├── request-id-steps.ts   # Request ID verification
└── assertions.ts         # Shared assertion helpers
```

### Tags

| Tag | Meaning |
|-----|---------|
| `@wip` | Work in progress — excluded from default run |
| `@implemented` | Fully implemented and verified |

## Test Utilities

### Test Logger

For unit tests, use a no-op logger that implements `LoggerPort`:

```typescript
export function createTestLogger(): LoggerPort {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
    child: () => createTestLogger(),
  };
}
```

### Test Registry

Build a registry with specific endpoints for focused testing:

```typescript
function createTestRegistry(...endpoints: AnyEndpointDefinition[]): EndpointRegistry {
  const registry = new InMemoryEndpointRegistry();
  for (const ep of endpoints) registry.register(ep);
  return registry;
}
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run test` | Vitest in watch mode |
| `npm run test:unit` | Vitest single run |
| `npm run test:bdd` | Cucumber (implemented only) |
| `npm run test:bdd:wip` | Cucumber (@wip tag) |
| `npm run test:bdd:all` | Cucumber (all tags) |
| `npm run test:ci` | Unit + BDD (CI pipeline) |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript strict check |
