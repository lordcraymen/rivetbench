import { describe, it, expect } from 'vitest';
import {
  RivetBenchError,
  ValidationError,
  EndpointNotFoundError,
  InternalServerError,
  ConfigurationError,
  isRivetBenchError,
  toRivetBenchError
} from '../../src/core/errors.js';

describe('Error Classes', () => {
  describe('RivetBenchError', () => {
    it('should create a basic error', () => {
      const error = new RivetBenchError('Test error', 500, 'TEST_ERROR');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('RivetBenchError');
    });

    it('should use constructor name as default code', () => {
      const error = new RivetBenchError('Test error', 500);
      
      expect(error.code).toBe('RivetBenchError');
    });

    it('should include details in JSON output', () => {
      const details = { field: 'value', nested: { key: 'data' } };
      const error = new RivetBenchError('Test error', 500, 'TEST_ERROR', details);
      
      const json = error.toJSON();
      
      expect(json).toEqual({
        error: {
          name: 'RivetBenchError',
          code: 'TEST_ERROR',
          message: 'Test error',
          details
        }
      });
    });

    it('should not include details in JSON when not provided', () => {
      const error = new RivetBenchError('Test error', 500, 'TEST_ERROR');
      
      const json = error.toJSON();
      
      expect(json).toEqual({
        error: {
          name: 'RivetBenchError',
          code: 'TEST_ERROR',
          message: 'Test error'
        }
      });
    });
  });

  describe('ValidationError', () => {
    it('should create a 400 error', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
    });

    it('should include validation details', () => {
      const details = { field: 'email', reason: 'Invalid format' };
      const error = new ValidationError('Validation failed', details);
      
      const json = error.toJSON();
      
      expect(json.error.details).toEqual(details);
    });
  });

  describe('EndpointNotFoundError', () => {
    it('should create a 404 error with endpoint name', () => {
      const error = new EndpointNotFoundError('testEndpoint');
      
      expect(error.message).toBe("Endpoint 'testEndpoint' not found");
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('ENDPOINT_NOT_FOUND');
      expect(error.name).toBe('EndpointNotFoundError');
    });

    it('should include endpoint name in details', () => {
      const error = new EndpointNotFoundError('testEndpoint');
      const json = error.toJSON();
      
      expect(json.error.details).toEqual({ endpointName: 'testEndpoint' });
    });
  });

  describe('InternalServerError', () => {
    it('should create a 500 error with default message', () => {
      const error = new InternalServerError();
      
      expect(error.message).toBe('An internal server error occurred');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.name).toBe('InternalServerError');
    });

    it('should accept custom message', () => {
      const error = new InternalServerError('Custom error message');
      
      expect(error.message).toBe('Custom error message');
    });
  });

  describe('ConfigurationError', () => {
    it('should create a 500 configuration error', () => {
      const error = new ConfigurationError('Invalid config');
      
      expect(error.message).toBe('Invalid config');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('CONFIGURATION_ERROR');
      expect(error.name).toBe('ConfigurationError');
    });
  });

  describe('isRivetBenchError', () => {
    it('should return true for RivetBench errors', () => {
      expect(isRivetBenchError(new ValidationError('test'))).toBe(true);
      expect(isRivetBenchError(new EndpointNotFoundError('test'))).toBe(true);
      expect(isRivetBenchError(new InternalServerError())).toBe(true);
    });

    it('should return false for non-RivetBench errors', () => {
      expect(isRivetBenchError(new Error('test'))).toBe(false);
      expect(isRivetBenchError('string')).toBe(false);
      expect(isRivetBenchError(null)).toBe(false);
      expect(isRivetBenchError(undefined)).toBe(false);
    });
  });

  describe('toRivetBenchError', () => {
    it('should return RivetBench errors unchanged', () => {
      const error = new ValidationError('test');
      const result = toRivetBenchError(error);
      
      expect(result).toBe(error);
    });

    it('should convert Error to InternalServerError', () => {
      const originalError = new Error('Original error');
      const result = toRivetBenchError(originalError);
      
      expect(result).toBeInstanceOf(InternalServerError);
      expect(result.message).toBe('Original error');
      expect(result.details).toHaveProperty('originalError', 'Error');
    });

    it('should convert unknown errors to InternalServerError', () => {
      const result = toRivetBenchError('string error');
      
      expect(result).toBeInstanceOf(InternalServerError);
      expect(result.message).toBe('An unknown error occurred');
      expect(result.details).toHaveProperty('error', 'string error');
    });
  });
});
