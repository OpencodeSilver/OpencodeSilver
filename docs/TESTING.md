# Monorepo Testing Strategy & Runner Architecture

This document defines the test runner topology, process isolation guarantees, and execution boundaries across OpencodeSilver.

---

## 1. Test Runner Matrix

The monorepo deliberately divides test execution according to package dependencies and runtime environment:

| Package | Test Framework | Execution Method | Rationale |
| :--- | :--- | :--- | :--- |
| `packages/core` | `bun:test` | `bun test` | Pure TypeScript logic, zero DOM/browser dependencies, sub-second execution. |
| `packages/ui` | `bun:test` | `scripts/run-isolated-tests.mjs` | Component and store units. Isolated processes prevent state leaks across stores. Uses Happy-DOM when DOM globals are needed. |
| `packages/sdk` | `bun:test` | `scripts/run-isolated-tests.mjs` | Manifest parser and host bridge contract tests. |
| `packages/vscode` | `bun:test` | `scripts/run-isolated-tests.mjs` | Extension unit tests, webview message bridge, secret scanner tests. |
| `packages/electron` | `node:test` | `scripts/run-isolated-tests.mjs` | IPC security, webPreferences, updater feeds, and native platform integration. |
| `packages/web` | `vitest` | `vitest run` | Express/Node HTTP servers, supertest loopback endpoints, real git subprocesses, and Vite asset-dependent fixtures (`*.vitest.tsx`). |
| `packages/mobile` | `bun:test` | `bun test` | Mobile config, asset synchronization, and environment scripts. |

---

## 2. Preventing Double-Counting

To prevent integration tests from being counted or executed twice:

1. **Vite Component Fixtures (`*.vitest.tsx`):**
   - Files ending in `.vitest.tsx` (e.g. `packages/ui/src/components/views/MultiFileDiffEntry.vitest.tsx`) require Vite's asset loader (SVG imports, CSS modules).
   - The UI runner regex (`\.(test|spec)\.(js|cjs|mjs|jsx|ts|tsx)$`) skips `.vitest.tsx` files.
   - Vitest in `packages/web` explicitly includes `../ui/src/**/*.vitest.tsx` through `packages/web/vitest.config.ts`.
   - Result: Each test runs exactly once under its intended engine.

2. **The `bun-test-shim.ts` Bridge:**
   - For UI integration tests executed under Vitest that import `bun:test`, `packages/web/test/bun-test-shim.ts` provides a seamless alias mapping `bun:test` symbols to Vitest (`vi.fn()`, `describe`, `it`, `expect`).

---

## 3. Process Isolation (`run-isolated-tests.mjs`)

Singletons (stores, registries, tunnel clients, event emitters) can leak state across test files if run in a shared Node or Bun VM.
`scripts/run-isolated-tests.mjs` spawns an isolated process for every matching test file with a concurrency ceiling (`MAX_PARALLEL = 4`) and a per-file timeout.
