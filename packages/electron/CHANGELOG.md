# Changelog

All notable changes to OpencodeSilver Desktop will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-10-18

### Added
- **Native Cross-Platform Runtime:** Native desktop shell for macOS, Windows, and Linux.
- **In-Process Server Orchestration:** Web server boots directly inside the Electron main process for zero-subprocess overhead.
- **Fast Startup & Splash Handoff:** Instant splash screen on `app.ready` with smooth window adoption and buffered launch events.
- **Asynchronous Environment Discovery:** Non-blocking login-shell environment probing with stdout isolation.
- **Secure IPC & Remote Page Policy:** Preload-isolated IPC bridge with strict privilege gating for remote hosts.
- **Graceful Lifecycle Shutdown:** 35-second bounded grace window ensuring terminal PTYs and OpenCode backend tasks cleanly persist state.
- **Native OS Menus & Shortcuts:** Multilingual application menus supporting 14 languages with full keyboard accelerator bindings.
