# Agent Workflow

This document captures the high-level steps for extending RivetBench in an interface-first, BDD-oriented manner.

1. **Clarify behavior** – Capture the desired capability in a `.feature` file under `test/features/` using Gherkin syntax.
2. **Design the interface** – Define or update TypeScript interfaces and schemas inside `src/core` or `src/endpoints` without touching the concrete implementation.
3. **Add scaffolding** – Extend registries, configuration, or server wiring to expose the new interface surface.
4. **Implement handlers** – Only after the interface is stable, fill in concrete behavior and validation logic.
5. **Document cleanup tasks** – Log any temporary scaffolding or test doubles in `cleanup.md` so they can be removed once production-ready implementations exist.
6. **Automate checks** – Add or update Vitest/Cucumber step definitions to exercise the new behavior as soon as it's implemented.
