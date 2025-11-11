import { describe, it, expect } from 'vitest';
import { myFuncEndpoint } from '../../src/endpoints/myfunc.js';
import { uppercaseEndpoint } from '../../src/endpoints/uppercase.js';

describe('MyFunc Endpoint', () => {
  it('processes text and number inputs correctly', async () => {
    const input = { text: 'hello', number: 5 };
    const config = { requestId: 'test-123' };
    
    const result = await myFuncEndpoint.handler({ input, config });
    
    expect(result).toEqual({
      result: 'Processed: hello',
      doubled: 10,
      inputLength: 5
    });
  });

  it('handles decimal numbers correctly', async () => {
    const input = { text: 'test', number: 3.14 };
    const config = { requestId: 'test-123' };
    
    const result = await myFuncEndpoint.handler({ input, config });
    
    expect(result).toEqual({
      result: 'Processed: test',
      doubled: 6.28,
      inputLength: 4
    });
  });

  it('validates input schema correctly', () => {
    const validInput = { text: 'hello', number: 5 };
    const invalidInput1 = { text: '', number: 5 }; // empty text
    const invalidInput2 = { text: 'hello', number: -1 }; // negative number
    const invalidInput3 = { text: 'hello' }; // missing number
    
    expect(myFuncEndpoint.input.safeParse(validInput).success).toBe(true);
    expect(myFuncEndpoint.input.safeParse(invalidInput1).success).toBe(false);
    expect(myFuncEndpoint.input.safeParse(invalidInput2).success).toBe(false);
    expect(myFuncEndpoint.input.safeParse(invalidInput3).success).toBe(false);
  });

  it('has correct endpoint metadata', () => {
    expect(myFuncEndpoint.name).toBe('myfunc');
    expect(myFuncEndpoint.summary).toBe('Demo function that takes text and number parameters');
    expect(myFuncEndpoint.description).toContain('named parameter CLI usage');
  });
});

describe('Uppercase Endpoint', () => {
  it('converts text to uppercase correctly', async () => {
    const input = { text: 'hello world' };
    const config = { requestId: 'test-123' };
    
    const result = await uppercaseEndpoint.handler({ input, config });
    
    expect(result).toEqual({
      result: 'HELLO WORLD'
    });
  });

  it('handles empty string input', async () => {
    const input = { text: '' };
    const config = { requestId: 'test-123' };
    
    const result = await uppercaseEndpoint.handler({ input, config });
    
    expect(result).toEqual({
      result: ''
    });
  });

  it('handles special characters and numbers', async () => {
    const input = { text: 'hello123!@#' };
    const config = { requestId: 'test-123' };
    
    const result = await uppercaseEndpoint.handler({ input, config });
    
    expect(result).toEqual({
      result: 'HELLO123!@#'
    });
  });

  it('validates input schema correctly', () => {
    const validInput = { text: 'hello' };
    const invalidInput = { text: 123 }; // not a string
    const missingInput = {}; // missing text
    
    expect(uppercaseEndpoint.input.safeParse(validInput).success).toBe(true);
    expect(uppercaseEndpoint.input.safeParse(invalidInput).success).toBe(false);
    expect(uppercaseEndpoint.input.safeParse(missingInput).success).toBe(false);
  });

  it('has correct endpoint metadata', () => {
    expect(uppercaseEndpoint.name).toBe('uppercase');
    expect(uppercaseEndpoint.summary).toBe('Convert text to uppercase');
    expect(uppercaseEndpoint.description).toContain('raw output mode');
  });
});