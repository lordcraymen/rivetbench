import Fastify from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { buildOpenApiDocument } from '../core/openapi.js';
import { EndpointRegistry } from '../core/registry.js';
import { loadConfig } from '../config/index.js';

export interface RestServerOptions {
  registry: EndpointRegistry;
}

export const createRestServer = async ({ registry }: RestServerOptions) => {
  const config = loadConfig();
  const fastify = Fastify({
    logger: true
  });

  const document = buildOpenApiDocument(registry.list(), {
    title: config.application.name,
    version: config.application.version,
    description: config.application.description
  });

  // Register Swagger plugin with the generated OpenAPI document
  await fastify.register(fastifySwagger, {
    mode: 'static',
    specification: {
      document
    }
  });

  // Register Swagger UI
  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true
    },
    staticCSP: true,
    transformStaticCSP: (header) => header
  });

  fastify.get('/health', async () => ({ status: 'ok' }));

  fastify.post('/rpc/:name', async (request, reply) => {
    const endpoint = registry.get((request.params as { name: string }).name);
    if (!endpoint) {
      reply.code(404);
      return { error: 'Endpoint not found' };
    }

    const parsedInput = endpoint.input.safeParse(request.body);
    if (!parsedInput.success) {
      reply.code(400);
      return { error: 'Invalid input', details: parsedInput.error.format() };
    }

    const result = await endpoint.handler({
      input: parsedInput.data,
      config: { requestId: request.id }
    });

    return endpoint.output.parse(result);
  });

  return {
    fastify,
    start: async () => {
      await fastify.listen({ host: config.rest.host, port: config.rest.port });
      return fastify;
    }
  };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  import('../endpoints/index.js').then(async ({ createDefaultRegistry }) => {
    const registry = createDefaultRegistry();
    // eslint-disable-next-line no-console
    const server = await createRestServer({ registry });
    await server.start().catch((error) => {
      console.error('Failed to start REST server', error);
      process.exit(1);
    });
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to load endpoints', error);
    process.exit(1);
  });
}
