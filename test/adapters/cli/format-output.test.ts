import { describe, it, expect } from 'vitest';
import { formatOutput } from '../../../src/adapters/cli/arg-parser.js';

describe('CLI formatOutput', () => {
  describe('JSON output mode (rawOutput: false)', () => {
    it('formats objects as pretty JSON', () => {
      const output = { message: 'hello' };
      const result = formatOutput(output, false);
      
      expect(result).toBe('{\n  "message": "hello"\n}');
    });

    it('formats primitives as JSON', () => {
      expect(formatOutput('hello', false)).toBe('"hello"');
      expect(formatOutput(42, false)).toBe('42');
      expect(formatOutput(true, false)).toBe('true');
    });

    it('formats null and undefined as JSON', () => {
      expect(formatOutput(null, false)).toBe('null');
      expect(formatOutput(undefined, false)).toBe(undefined); // JSON.stringify behavior
    });
  });

  describe('Raw output mode (rawOutput: true)', () => {
    it('extracts value from single-property objects with string values', () => {
      const output = { echoed: 'hello world' };
      const result = formatOutput(output, true);
      
      expect(result).toBe('hello world');
    });

    it('extracts value from single-property objects with number values', () => {
      const output = { count: 42 };
      const result = formatOutput(output, true);
      
      expect(result).toBe('42');
    });

    it('extracts value from single-property objects with boolean values', () => {
      const output = { success: true };
      const result = formatOutput(output, true);
      
      expect(result).toBe('true');
    });

    it('returns empty string for null and undefined', () => {
      expect(formatOutput(null, true)).toBe('');
      expect(formatOutput(undefined, true)).toBe('');
    });

    it('returns string representation of primitives', () => {
      expect(formatOutput('hello', true)).toBe('hello');
      expect(formatOutput(42, true)).toBe('42');
      expect(formatOutput(true, true)).toBe('true');
    });

    it('falls back to JSON for multi-property objects', () => {
      const output = { result: 'processed', count: 42, length: 9 };
      const result = formatOutput(output, true);
      
      expect(result).toBe('{\n  "result": "processed",\n  "count": 42,\n  "length": 9\n}');
    });

    it('falls back to JSON for single-property objects with complex values', () => {
      const output = { data: { nested: 'object' } };
      const result = formatOutput(output, true);
      
      expect(result).toBe('{\n  "data": {\n    "nested": "object"\n  }\n}');
    });

    it('falls back to JSON for arrays even in single property', () => {
      const output = { items: ['a', 'b', 'c'] };
      const result = formatOutput(output, true);
      
      expect(result).toBe('{\n  "items": [\n    "a",\n    "b",\n    "c"\n  ]\n}');
    });

    it('handles empty objects', () => {
      const output = {};
      const result = formatOutput(output, true);
      
      expect(result).toBe('{}');
    });
  });
});