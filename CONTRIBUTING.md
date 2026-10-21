# Contributing to OpencodeSilver

Thank you for your interest in contributing to **OpencodeSilver**! We welcome bug reports, improvements, documentation updates, and feature suggestions.

---

## Code of Conduct

Please maintain a respectful, constructive, and inclusive tone across issues, pull requests, and discussions.

---

## Development Setup

1. **Fork and clone** the repository:
   ```bash
   git clone https://github.com/OpencodeSilver/OpencodeSilver.git
   cd OpencodeSilver
   ```

2. **Install prerequisites:**
   - [Bun](https://bun.sh) (v1.4.0+)
   - [Node.js](https://nodejs.org) (v22.0.0+)

3. **Install dependencies:**
   ```bash
   bun install
   ```

4. **Start local development:**
   ```bash
   bun run dev
   ```

---

## Git Workflow & Branching

- Create a feature or fix branch from `main`:
  ```bash
  git checkout -b feat/your-feature-name
  # or
  git checkout -b fix/your-bug-fix
  ```
- Keep changes atomic and well-scoped.

---

## Verification Before Submitting

Always run the quality and test suites before submitting your Pull Request:

```bash
# Type checking across all workspaces
bun run type-check

# Run unit tests
bun run test

# Code linting
bun run lint
```

If your changes affect the Electron desktop shell:
```bash
bun run electron:build
```

---

## Submitting a Pull Request

1. Push your branch to your fork.
2. Open a Pull Request against `main`.
3. Provide a clear description of the problem solved, changes made, and test coverage added.
4. Ensure all CI checks pass.
