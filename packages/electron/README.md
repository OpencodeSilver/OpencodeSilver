<p align="center">
  <img src="../../assets/logo.png" width="96" height="96" alt="OpencodeSilver Desktop" style="border-radius: 20px;" />
</p>

<h1 align="center">OpencodeSilver Desktop</h1>

<p align="center">
  <strong>Native Desktop Runtime for macOS, Windows, and Linux.</strong><br />
  <em>Part of the OpencodeSilver workspace — created, programmed, and maintained by <strong>Ahmed (GEMTM)</strong>.</em>
</p>

---

## Overview

**`@opencodesilver/electron`** provides the native cross-platform desktop shell for OpencodeSilver across **macOS**, **Windows**, and **Linux**. It manages native windows, application menus, global shortcuts, deep-link handling, system tray integrations, native OS notifications, auto-updates, SSH tunnels, and packaged desktop distribution.

The web UI and OpencodeSilver server logic live in `packages/web`, while shared React components reside in `packages/ui`. The desktop shell hosts and orchestrates these packages directly within an optimized, single-process runtime.

---

## Architectural Highlights

### 1. In-Process Server Architecture
Desktop boots the OpencodeSilver web server within the same Electron main process—there is no separate sidecar subprocess. `main.mjs` imports `@opencodesilver/web/server/index.js` and invokes `startWebUiServer()`. The Electron browser window loads the UI from the local server during development, or from pre-packaged `resources/web-dist` assets in production builds.

### 2. Instant Splash and Fast Window Handoff
Electron loads `entry.mjs` instead of `main.mjs`. To prevent heavy module evaluation from delaying the first visual frame:
- `entry.mjs` creates an instant splash window via `early-startup.mjs` immediately on `app.ready`.
- Only after the splash is painted does it load `main.mjs`, which adopts the existing window via `takeEarlyWindow()`.
- Deep links and second-instance activations that arrive before `main.mjs` loads are queued and replayed once initialization completes.
- In packaged builds, the splash is served under `opencodesilver-ui://app/__splash` on the same origin as the application, eliminating white flash artifacts during navigation.

### 3. Asynchronous Shell Environment Discovery
Login-shell environment discovery starts in parallel with window creation:
- Asynchronous probe executes shell startup scripts without blocking the UI.
- Tries interactive login, then non-interactive login on failure, with a 5-second deadline.
- Output printed to `stdout` by user startup scripts is cleanly discarded to prevent environment variable corruption.

### 4. Controlled Process Shutdown
Quit, relaunch, and update cycles await `server.stop()` before exiting:
- Managed OpenCode processes, interactive terminal PTYs, and guest services are gracefully terminated.
- `server-shutdown.mjs` enforces a 35-second bounded grace window (20 seconds for terminal runtime, 15 seconds for backend cleanups).
- Detached force-kill is used strictly as a fallback if normal shutdown times out.

---

## IPC Security and Remote Policies

Renderer code interacts with the host exclusively via the secure bridge exposed in `preload.mjs`. Direct Electron imports from shared UI code are prohibited.

Native capabilities follow strict boundaries:
1. **Bridge Definition:** New renderer-facing shapes are declared in `preload.mjs`.
2. **IPC Handler:** Implementation is registered under `opencodesilver:invoke` in `main.mjs`.
3. **Privilege Gating:** Privileged capabilities (filesystem, local shell execution) are restricted from remote web contexts. Any command in `COMMANDS_SAFE_FOR_REMOTE` is strictly sanitized to strip sensitive tokens and credentials before returning (`remote-page-policy.mjs`).

---

## Development and Build Scripts

Run these commands from the repository root:

| Command | Description |
| :--- | :--- |
| `bun run electron:dev` | Start desktop app in development mode with HMR |
| `bun run electron:dev:bundled` | Run desktop app against local bundled web assets |
| `bun run electron:build` | Build and package binaries for the current OS |
| `bun run type-check:electron` | Run TypeScript type checks on desktop modules |
| `bun run lint:electron` | Run linter on Electron codebase |
| `bun run profile:startup` | Measure desktop launch performance in isolated profile |

---

## Logging and Diagnostics

- **Development:** Console logs stream directly to the active terminal.
- **Production:** Logs are recorded via `electron-log` under the platform standard log path:
  - macOS: `~/Library/Logs/OpencodeSilver/main.log`
  - Windows: `%APPDATA%\OpencodeSilver\logs\main.log`
  - Linux: `~/.config/OpencodeSilver/logs/main.log`
- Development instances use an isolated user data directory (`OpencodeSilver Dev`), preventing corruption of production settings.

---

## Author & Maintainer

- **Creator & Lead Architect:** [Ahmed (GEMTM)](https://github.com/OpencodeSilver/OpencodeSilver)
- **Repository:** [OpencodeSilver/OpencodeSilver](https://github.com/OpencodeSilver/OpencodeSilver)

---

## License

This package is open-source software licensed under the **[MIT License](../../LICENSE)**.  
Copyright (c) 2026 **Ahmed (GEMTM)**.
