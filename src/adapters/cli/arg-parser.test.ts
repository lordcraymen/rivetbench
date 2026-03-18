import { describe, it, expect } from 'vitest';
import { parseCallArgs } from './arg-parser.js';

describe('parseCallArgs', () => {
  it('should parse JSON input with --params-json', () => {
    const result = parseCallArgs(['echo', '--params-json', '{"message":"hello"}']);

    expect(result).toEqual({
      endpointName: 'echo',
      input: { message: 'hello' },
      rawOutput: false,
    });
  });

  it('should parse named parameters with single dash', () => {
    const result = parseCallArgs(['myfunc', '-text', 'test', '-number', '42']);

    expect(result).toEqual({
      endpointName: 'myfunc',
      input: { text: 'test', number: 42 },
      rawOutput: false,
    });
  });

  it('should parse --raw flag', () => {
    const result = parseCallArgs(['echo', '-message', 'hello', '--raw']);

    expect(result).toEqual({
      endpointName: 'echo',
      input: { message: 'hello' },
      rawOutput: true,
    });
  });

  it('should parse booleans correctly', () => {
    const result = parseCallArgs(['test', '-flag', 'true']);

    expect(result.input).toEqual({ flag: true });
  });

  it('should throw for missing endpoint name', () => {
    expect(() => parseCallArgs([])).toThrow('Endpoint name is required');
  });

  it('should throw for deprecated -r flag', () => {
    expect(() => parseCallArgs(['echo', '-message', 'hi', '-r'])).toThrow(
      'Use --raw instead of -r',
    );
  });

  it('should throw for deprecated -i flag', () => {
    expect(() => parseCallArgs(['echo', '-i', '{}'])).toThrow(
      'Use --params-json instead of --input or -i',
    );
  });

  it('should throw for invalid JSON in --params-json', () => {
    expect(() => parseCallArgs(['echo', '--params-json', '{bad}'])).toThrow(
      'Invalid JSON input',
    );
  });

  it('should throw for double-dash endpoint parameters', () => {
    expect(() => parseCallArgs(['echo', '--message', 'hello'])).toThrow(
      'Unknown CLI flag',
    );
  });
});
