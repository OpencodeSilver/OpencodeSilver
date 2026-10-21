# React Compiler Configuration & Parity Guide

This document describes the design, trade-offs, and verification workflows for the React 19 Compiler (`babel-plugin-react-compiler`) in OpencodeSilver.

---

## 1. Architectural Overview

OpencodeSilver uses React 19 with the experimental React Compiler Babel plugin (`babel-plugin-react-compiler`).
The compiler analyzes JavaScript/TypeScript ASTs at compile time and injects automatic memoization caches for component rendering and hook dependencies, obsoleting manual `useMemo` and `useCallback` annotations in idiomatic code.

---

## 2. Dev vs. Production Behavior & Rationale

In `packages/web/vite.config.ts`, compiler execution is controlled by build target and environment:

```typescript
const devReactCompiler =
  process.env.OPENCODESILVER_DEV_REACT_COMPILER === '1' ||
  process.env.OPENCODESILVER_DEV_REACT_COMPILER === 'true';

export default defineConfig(({ command }) => ({
  plugins: [
    react(
      command === 'build' || devReactCompiler
        ? { babel: { plugins: ['babel-plugin-react-compiler'] } }
        : {},
    ),
  ],
}));
```

### The Engineering Trade-off:
1. **Production Builds (`bun run build`):**
   - **Always Enabled:** The React Compiler runs over every module during bundling.
   - **Benefit:** Minimized re-render cycles, automatic fine-grained reactive updates, and zero manual memoization overhead in production runtime.

2. **Development Runtimes (`bun run dev` / `dev:web:hmr`):**
   - **Default: Opt-in (`OPENCODESILVER_DEV_REACT_COMPILER=1`):** Running a full Babel AST transformation across ~2,500 monorepo components during Vite HMR adds multi-second latency to file saves. Bypassing Babel in dev preserves near-instantaneous HMR cycles via esbuild.
   - **Parity Testing:** When debugging compiler-specific runtime anomalies or verifying memoization behavior, developers can start the dev server with the compiler enabled:
     ```bash
     OPENCODESILVER_DEV_REACT_COMPILER=1 bun run dev
     ```

---

## 3. Profiling & Performance Measurement

To measure runtime performance and ensure changes in hot paths do not introduce regressions:

| Command | Target | Purpose |
| :--- | :--- | :--- |
| `bun run profile:startup` | Early startup latency | Measures time to first paint and IPC readiness |
| `bun run profile:session` | Chat session render time | Profiles message list scrolling and streaming updates |
| `bun run profile:browser` | Web browser bundle analysis | Analyzes chunk sizes and dynamic imports |
| `bun run doctor` | React Component Doctor | Scans components for hooks anti-patterns |
