/**
 * Simplified assertion utilities for Cucumber tests
 * These mirror Vitest's expect API but work in any context
 */

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

export function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected) {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    
    toBeDefined() {
      if (actual === undefined || actual === null) {
        throw new AssertionError(`Expected value to be defined, but got ${actual}`);
      }
    },
    
    toHaveProperty(key: string, value?: unknown) {
      if (typeof actual !== 'object' || actual === null) {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} to be an object`);
      }
      
      if (!(key in actual)) {
        throw new AssertionError(`Expected object to have property "${key}"`);
      }
      
      if (value !== undefined) {
        const actualValue = (actual as Record<string, unknown>)[key];
        if (actualValue !== value) {
          throw new AssertionError(
            `Expected property "${key}" to be ${JSON.stringify(value)}, but got ${JSON.stringify(actualValue)}`
          );
        }
      }
    },
    
    toEqual(expected: unknown) {
      const actualStr = JSON.stringify(actual);
      const expectedStr = JSON.stringify(expected);
      if (actualStr !== expectedStr) {
        throw new AssertionError(`Expected ${actualStr} to equal ${expectedStr}`);
      }
    }
  };
}
