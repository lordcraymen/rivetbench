import { After, Before, Status } from '@cucumber/cucumber';
import { RivetBenchWorld } from './world.js';

/**
 * Before hook - runs before each scenario
 */
Before(async function (this: RivetBenchWorld) {
  // Nothing to setup yet, but useful for future initialization
});

/**
 * After hook - runs after each scenario
 * Cleans up resources like servers
 */
After(async function (this: RivetBenchWorld, { result }) {
  // Clean up resources
  await this.reset();

  // Log if scenario failed
  if (result?.status === Status.FAILED) {
    console.error(`Scenario failed: ${result.message}`);
  }
});
