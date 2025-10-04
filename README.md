# RivetBench

**RivetBench** is a lightweight TypeScript framework for building **dual‑exposed endpoints** that work over both **REST** and **MCP (Model Context Protocol)**, with **OpenAPI 3** documentation generated automatically.

Write an endpoint once — expose it everywhere.

---

## Features

* Unified endpoint definitions with **Zod** schemas for validation and typing
* **RPC over REST**: POST-only routes that dispatch by endpoint name (no resource modeling)
* Automatic generation of **REST routes**, **MCP tools**, and **OpenAPI 3** specs
* Built‑in **Swagger UI** for exploration and testing
* Type‑safe handlers shared between REST and MCP

---

## Tech Stack

* **Node.js 20+** / **TypeScript**
* **Fastify** for REST APIs
* **fastmcp** for MCP
* **Zod** + **zod‑to‑openapi** for schema generation
* **Vitest** for testing

---

## Project Layout

```
rivetbench/
├─ src/
│  ├─ core/                # framework core (endpoint factory, openapi, registry)
│  ├─ server/              # rest + mcp servers
│  ├─ endpoints/           # your endpoints live here
│  └─ config/              # environment and startup settings
├─ test/
│  └─ sample.test.ts
├─ package.json
└─ README.md
```

---

## Example Endpoint (RPC style)

```ts
import { z } from "zod";
import { makeEndpoint } from "../core/endpoint";

const EchoInput = z.object({ message: z.string() });
const EchoOutput = z.object({ echoed: z.string() });

export default makeEndpoint({
  name: "echo",
  summary: "Echo a message",
  input: EchoInput,
  output: EchoOutput,
  // handler is opaque; only input/output are exposed in MCP & OpenAPI
  handler: async ({ input }) => ({ echoed: input.message })
});
```

---

## Quick Start

```bash
npm install
npm run dev:rest     # Start REST + Swagger on :3000
npm run dev:mcp      # Start MCP server (stdio transport)
```

### REST Server
Swagger UI → [http://localhost:3000/docs](http://localhost:3000/docs)

### MCP Server

**stdio transport (default)**:
```bash
npm run dev:mcp
```

**HTTP Stream transport (TCP)**:
```bash
RIVETBENCH_MCP_TRANSPORT=tcp RIVETBENCH_MCP_PORT=3001 npm run dev:mcp
```

The MCP server exposes all registered endpoints as MCP tools with automatic schema validation.

---

## RPC‑over‑REST semantics

* **POST‑only**: Each call is `POST /rpc/:name` (default) or `POST /tools/:name`.
* **Stateless**: All data comes from the request body; no server session required.
* **Opaque handler**: Only the Zod input/output are published (MCP & OpenAPI). The implementation never leaks.
* **OpenAPI**: Paths are generated for each endpoint as `POST /rpc/{name}` with `requestBody` = input schema and response = output schema.
* **MCP parity**: The same definition becomes an MCP tool with matching input/output JSON Schema.

### Optional conventions

* **Idempotency**: Support `Idempotency-Key` header for safe retries of POST.
* **Long‑running jobs**: If needed, return an `operationId` in the output; a separate `status` endpoint/tool can be defined like any other RPC (kept optional).

---

## Documentation

- **[Development Workflow](WORKFLOW.md)** - Daily workflow, branch management, and best practices
- **[MCP Implementation Guide](docs/MCP_GUIDE.md)** - Complete guide to MCP server usage, configuration, and integration
- **[BDD Testing Guide](docs/BDD_TESTING.md)** - Cucumber/BDD testing documentation and examples
- **[Contributing](CONTRIBUTING.md)** - Development workflow, branch strategy, and contribution guidelines
- **[Roadmap](ROADMAP.md)** - Feature plans and development priorities

---

## License

MIT

---

**RivetBench** — forge and test your API connections.

