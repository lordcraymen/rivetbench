import Fastify from 'fastify';
import { buildOpenApiDocument } from '../core/openapi.js';
import { EndpointRegistry } from '../core/registry.js';
import { loadConfig } from '../config/index.js';

export interface RestServerOptions {
  registry: EndpointRegistry;
}

export const createRestServer = ({ registry }: RestServerOptions) => {
  const config = loadConfig();
  const fastify = Fastify({
    logger: true
  });

  const document = buildOpenApiDocument(registry.list(), {
    title: config.application.name,
    version: config.application.version,
    description: config.application.description
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

  fastify.get('/docs/openapi.json', async () => document);

  return {
    fastify,
    start: async () => {
      await fastify.listen({ host: config.rest.host, port: config.rest.port });
      return fastify;
    }
  };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  // eslint-disable-next-line no-console
  createRestServer({ registry: { list: () => [], get: () => undefined, register: () => {} } }).start().catch((error) => {
    console.error('Failed to start REST server', error);
    process.exit(1);
  });
}
