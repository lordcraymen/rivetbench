import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import type { LoggerPort } from '../../ports/logger.js';
import { isRivetBenchError, ValidationError, toRivetBenchError } from '../../domain/errors.js';

/**
 * Create a Fastify error handler with logger dependency injection.
 *
 * Maps domain errors ({@link RivetBenchError}), Zod validation errors,
 * and Fastify framework errors into structured JSON responses (ADR-0006).
 *
 * @param logger - LoggerPort instance for structured error logging.
 *
 * @example
 * ```typescript
 * fastify.setErrorHandler(createErrorHandler(loggerPort));
 * ```
 */
export function createErrorHandler(logger: LoggerPort) {
  return function errorHandler(
    error: FastifyError | Error,
    request: FastifyRequest,
    reply: FastifyReply,
  ): void {
    const logContext = {
      method: request.method,
      url: request.url,
      reqId: request.id,
      errorName: error.name,
      errorMessage: error.message,
    };

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const validationError = new ValidationError('Request validation failed', {
        issues: error.issues,
      });

      logger.warn('Validation error', logContext);
      reply.status(validationError.statusCode).send(validationError.toJSON());
      return;
    }

    // Handle known RivetBench errors
    if (isRivetBenchError(error)) {
      const level = error.statusCode >= 500 ? 'error' : 'warn';
      logger[level](error.message, logContext);
      reply.status(error.statusCode).send(error.toJSON());
      return;
    }

    // Handle Fastify errors
    if ('statusCode' in error && error.statusCode) {
      const statusCode = error.statusCode;
      const level = statusCode >= 500 ? 'error' : 'warn';
      logger[level]('Fastify error', { ...logContext, stack: error.stack });

      reply.status(statusCode).send({
        error: {
          name: error.name,
          code: error.code || 'FASTIFY_ERROR',
          message: error.message,
        },
      });
      return;
    }

    // Handle unexpected errors
    const rivetError = toRivetBenchError(error);
    logger.error('Unexpected error', { ...logContext, stack: error.stack });
    reply.status(rivetError.statusCode).send(rivetError.toJSON());
  };
}

/**
 * Create a Fastify not-found handler with logger dependency injection.
 *
 * @param logger - LoggerPort instance for structured logging.
 *
 * @example
 * ```typescript
 * fastify.setNotFoundHandler(createNotFoundHandler(loggerPort));
 * ```
 */
export function createNotFoundHandler(logger: LoggerPort) {
  return function notFoundHandler(request: FastifyRequest, reply: FastifyReply): void {
    logger.warn('Route not found', {
      method: request.method,
      url: request.url,
      reqId: request.id,
    });

    reply.status(404).send({
      error: {
        name: 'NotFoundError',
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
      },
    });
  };
}
