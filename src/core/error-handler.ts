import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import type { Logger as PinoLogger } from 'pino';
import { isRivetBenchError, ValidationError, toRivetBenchError } from './errors.js';

/**
 * Create a Fastify error handler with logger dependency injection
 * Handles RivetBench errors, Zod validation errors, and unexpected errors
 * 
 * @param logger - Logger instance to use for error logging
 */
export function createErrorHandler(logger: PinoLogger) {
  return function errorHandler(
    error: FastifyError | Error,
    request: FastifyRequest,
    reply: FastifyReply
  ): void {
  // Log the error with context
  const logContext = {
    method: request.method,
    url: request.url,
    reqId: request.id,
    errorName: error.name,
    errorMessage: error.message
  };

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationError = new ValidationError('Request validation failed', {
      issues: error.issues
    });

    logger.warn(logContext, 'Validation error');

    reply.status(validationError.statusCode).send(validationError.toJSON());
    return;
  }

  // Handle known RivetBench errors
  if (isRivetBenchError(error)) {
    const level = error.statusCode >= 500 ? 'error' : 'warn';
    logger[level](logContext, error.message);

    reply.status(error.statusCode).send(error.toJSON());
    return;
  }

  // Handle Fastify errors
  if ('statusCode' in error && error.statusCode) {
    const statusCode = error.statusCode;
    const level = statusCode >= 500 ? 'error' : 'warn';
    
    logger[level]({ ...logContext, stack: error.stack }, 'Fastify error');

    reply.status(statusCode).send({
      error: {
        name: error.name,
        code: error.code || 'FASTIFY_ERROR',
        message: error.message
      }
    });
    return;
  }

  // Handle unexpected errors
  const rivetError = toRivetBenchError(error);
  logger.error({ ...logContext, stack: error.stack }, 'Unexpected error');

  reply.status(rivetError.statusCode).send(rivetError.toJSON());
  };
}

/**
 * Create a not found handler with logger dependency injection
 * 
 * @param logger - Logger instance to use for logging
 */
export function createNotFoundHandler(logger: PinoLogger) {
  return function notFoundHandler(request: FastifyRequest, reply: FastifyReply): void {
    logger.warn(
      {
        method: request.method,
        url: request.url,
        reqId: request.id
      },
      'Route not found'
    );

    reply.status(404).send({
      error: {
        name: 'NotFoundError',
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`
      }
    });
  };
}
