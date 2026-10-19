<p align="center">
  <img src="../../assets/logo.png" width="96" height="96" alt="@opencodesilver/ui" style="border-radius: 20px;" />
</p>

<h1 align="center">OpencodeSilver UI Design System</h1>

<p align="center">
  <strong>Shared React component library, design system, and multi-surface UI foundation.</strong><br />
  <em>Part of the OpencodeSilver workspace — created, programmed, and maintained by <strong>Ahmed (GEMTM)</strong>.</em>
</p>

---

## Overview

**`@opencodesilver/ui`** is the shared frontend foundation for OpencodeSilver. It encapsulates the core design system, user interface components, timeline renderers, diff visualizers, and state hooks utilized uniformly across all client surfaces: **Web**, **Desktop**, **VS Code Webviews**, and **Mobile**.

---

## Core Features

- **Multi-Surface Compatibility:** One codebase renders seamlessly on Desktop (Electron), Web (browser/PWA), VS Code sidebars, and Mobile (Capacitor).
- **Native RTL & LTR Support:** Comprehensive bidirectional layout engine with complete Arabic and English typography, mirrored sidebars, and alignment rules.
- **Advanced Code Editing:** High-performance CodeMirror 6 integrations with syntax highlighting for over 20 programming languages.
- **High-Fidelity Terminal:** Ghostty WebAssembly terminal emulator providing silky smooth rendering and true terminal color fidelity.
- **Diff & Walkthrough Visualizers:** Interactive structured changes walkthrough, branch comparisons, and in-place code modification widgets.
- **Adaptive Theming:** Deeply integrated Light, Dark, and High-Contrast themes synchronized across host operating systems and editors.

---

## Package Structure

```text
packages/ui/
├── src/
│   ├── components/     # Atomic and composite UI components (Chat, Diff, Settings)
│   ├── hooks/          # React hooks for sessions, theme, speech, and keybindings
│   ├── lib/            # Utilities, markdown renderers, and projection engines
│   └── styles/         # Tailwind CSS configurations and base design tokens
```

---

## Development & Scripts

```bash
# Type check TypeScript definitions
bun run --cwd packages/ui type-check

# Run UI unit and integration tests
bun run --cwd packages/ui test

# Lint UI codebase
bun run --cwd packages/ui lint
```

---

## Author & Maintainer

- **Creator & Lead Architect:** [Ahmed (GEMTM)](https://github.com/OpencodeSilver/OpencodeSilver)
- **Repository:** [OpencodeSilver/OpencodeSilver](https://github.com/OpencodeSilver/OpencodeSilver)

---

## License

This package is open-source software licensed under the **[MIT License](../../LICENSE)**.  
Copyright (c) 2026 **Ahmed (GEMTM)**.
