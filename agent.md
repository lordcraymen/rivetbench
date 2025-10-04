# Agent Workflow

This document captures the high-level steps for extending RivetBench in an interface-first, BDD-oriented manner.

## 🗂️ Temporary Files Management

**All temporary files should go in `.agent/` directory** (gitignored):
- `.agent/memory/` - Context tracking, agent state, session notes
- `.agent/pr/` - PR descriptions, instructions, draft content  
- `.agent/summaries/` - Implementation summaries, cleanup logs

See `.agent/README.md` for full details.

## Core Principle

**The goal of all changes is to create a Pull Request.** Every feature, refactor, or improvement should result in a PR that can be reviewed and merged into the main branch. Work should be organized into logical, reviewable units.

## Development Steps

1. **Create a feature branch** – Always start from an up-to-date main branch. Use descriptive branch names following conventions in `CONTRIBUTING.md`.

2. **Clarify behavior** – Capture the desired capability in a `.feature` file under `test/features/` using Gherkin syntax.

3. **Design the interface** – Define or update TypeScript interfaces and schemas inside `src/core` or `src/endpoints` without touching the concrete implementation.

4. **Add scaffolding** – Extend registries, configuration, or server wiring to expose the new interface surface.

5. **Implement handlers** – Only after the interface is stable, fill in concrete behavior and validation logic.

6. **Automate checks** – Add or update Vitest/Cucumber step definitions to exercise the new behavior as soon as it's implemented.

7. **Document changes** – Update relevant documentation (README.md, docs/, etc.) to reflect new capabilities.

8. **Commit regularly** – Make atomic commits with clear, conventional commit messages. Ensure all files are committed before creating the PR.

9. **Create Pull Request** – Push your branch and create a PR with a clear description of changes, benefits, and testing performed. The PR is the deliverable.
