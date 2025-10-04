/**
 * Custom error classes for RivetBench
 * These errors provide consistent error handling across REST and MCP transports
 */

/**
 * Base error class for all RivetBench errors
 */
export class RivetBenchError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number = 500, code?: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code || this.constructor.name;
    this.details = details;

    // Maintains proper stack trace for where error was thrown (only in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON(): { error: { name: string; code: string; message: string; details?: unknown } } {
    const result: { error: { name: string; code: string; message: string; details?: unknown } } = {
      error: {
        name: this.name,
        code: this.code,
        message: this.message
      }
    };
    
    if (this.details !== undefined) {
      result.error.details = this.details;
    }
    
    return result;
  }
}

/**
 * Validation error - thrown when input fails schema validation
 * HTTP Status: 400 Bad Request
 */
export class ValidationError extends RivetBenchError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Endpoint not found error - thrown when requested endpoint doesn't exist
 * HTTP Status: 404 Not Found
 */
export class EndpointNotFoundError extends RivetBenchError {
  constructor(endpointName: string) {
    super(`Endpoint '${endpointName}' not found`, 404, 'ENDPOINT_NOT_FOUND', { endpointName });
  }
}

/**
 * Internal server error - thrown for unexpected errors
 * HTTP Status: 500 Internal Server Error
 */
export class InternalServerError extends RivetBenchError {
  constructor(message: string = 'An internal server error occurred', details?: unknown) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', details);
  }
}

/**
 * Configuration error - thrown when configuration is invalid
 * HTTP Status: 500 Internal Server Error
 */
export class ConfigurationError extends RivetBenchError {
  constructor(message: string, details?: unknown) {
    super(message, 500, 'CONFIGURATION_ERROR', details);
  }
}

/**
 * Helper function to determine if an error is a known RivetBench error
 */
export function isRivetBenchError(error: unknown): error is RivetBenchError {
  return error instanceof RivetBenchError;
}

/**
 * Helper function to convert any error to a RivetBenchError
 */
export function toRivetBenchError(error: unknown): RivetBenchError {
  if (isRivetBenchError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalServerError(error.message, {
      originalError: error.name,
      stack: error.stack
    });
  }

  return new InternalServerError('An unknown error occurred', { error });
}
