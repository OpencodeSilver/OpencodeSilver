# Feature Plan — October 2026 Round

Status: **draft for maintainer approval — no code written yet.**

Scope: 10 new features + improvements to existing features across OpencodeSilver
(web / desktop / VS Code / mobile / SDK). Every item below is grounded in a
verified gap or an explicit "not yet" statement found during the inventory
(2026-10-07). Effort is relative (S ≤ 1 day, M ≈ 2–4 days, L ≥ 1 week).

---

## Part A — Existing feature inventory (summary)

Verified by code/docs inspection. Headline areas:

- **Chat**: streaming markdown, virtualized code blocks w/ copy+line counts,
  diff view toggles, message parts system, composer w/ autocompletes, quick
  prompt templates, session goals, exporter + metrics card, starred messages,
  turn latency tracker, completion chime, secret leak scanner, message search,
  read-aloud, "by the way" assist flow.
- **Workspaces**: diff walkthrough, files editor (CodeMirror, previews),
  git view (staging/commit/branches/stash/worktrees/identities), PR/MR views
  (GitHub + GitLab), plan view, inline comments, references pickers.
- **Surface chrome**: context rail workspaces, session sidebar/archive/fork,
  mini chat overlay, in-app browser, multi-run + fusion, model picker, voice
  dictation, terminal, shortcuts, themes, i18n (12 locales).
- **Web server**: OpenCode proxy, git/fs/terminal/realtime APIs, relay (E2EE
  private relay), tunnels (Cloudflare/ngrok), web push, quota/usage, walkthrough,
  session-goal/knowledge/assist, magic prompts, skills catalog, scheduled tasks,
  guests (SDK extensions), isolated spaces (gated), control service + CLI.
- **VS Code**: sidebar chat + editor-tab sessions, inline comment threads, SCM
  commit message gen, git via VS Code git, managed OpenCode 2.x process, config
  merging, settings register gate.
- **Mobile**: Capacitor iOS/Android, push (APNs+FCM sealed), iOS widgets +
  Control Center + NSE, instance management, changes workspace, server-side PTY
  terminal, QR pairing.
- **Settings**: 188 registry keys, 3 scopes, on server + VS Code host.

### Known gaps the inventory surfaced (used below)

| # | Area | Evidence |
|---|---|---|
| G1 | Desktop: no global shortcuts | `globalShortcut` absent from all `packages/electron` |
| G2 | Desktop: notifications carry no action buttons | `main.mjs` `maybeShowNativeNotification` sets title/body/sound only |
| G3 | Desktop: power lifecycle handled only for `resume` | `powerMonitor.on('resume')` only (`main.mjs:5512`) |
| G4 | Desktop: Linux updater has no differential channel | `packages/electron/README.md:195` |
| G5 | VS Code: no status bar item, notifications via webview web `Notification` | no `createStatusBarItem`; `webview/api/notifications.ts` |
| G6 | VS Code: no `keybindings` contribution; CommandPalette shortcut opens nothing | `packages/vscode/package.json` (no keybindings); `src/DOCUMENTATION.md:220` |
| G7 | VS Code: diff apply/revert has no path in chat | `DiffView` not mounted; dead `api:git/*` surface (DOCUMENTATION 235–252) |
| G8 | VS Code: terminal is a throwing stub | `webview/api/index.ts:12` |
| G9 | Mobile: no offline send queue anywhere | no queue symbol under `packages/` |
| G10 | Mobile: Android lacks deep-link intent filter; widget parity iOS-only | `AndroidManifest.xml` no VIEW scheme; widget dir is iOS-only |
| G11 | SDK: "Not here yet" list (guest file search/watch, host issue search) | `packages/sdk/DOCUMENTATION.md:133–137` |
| G12 | Extensions: registry empty, zero built-ins shipped | `packages/extensions/registry.json` = `[]` |
| G13 | Mobile: SSE-only transport on native | `packages/mobile/HANDOFF.md:146` |
| G14 | Mobile: Capacitor default splash/launcher assets | `packages/mobile/README.md:78` |
| G15 | VS Code: gated settings pages (shortcuts, tunnel, remote-instances, magic-prompts, voice, about) | `src/DOCUMENTATION.md` reachability map |
| G16 | Release tracks diverge | `changelog/` ends 2.1.1; `docs/releases/` at v2.5.0 |

---

## Part B — Improvements to existing features

Each is a targeted enhancement, behavior-preserving unless stated.

### I1. VS Code settings-surface parity (G15)
Enable the gated settings pages that can behave correctly inside VS Code
(`shortcuts`, `magic-prompts`, `voice`, `about`, `tunnel`, `remote-instances`),
verify each against the VS Code bridge, keep truly non-functional ones hidden.
- Files: `packages/ui/src/components/sections/*` metadata, `packages/vscode`
  bridge runtimes as needed.
- Skills: `settings-ui-patterns`, `opencodesilver-change-discipline`.
- Validation: type-check + VS Code dev run per page.

### I2. VS Code real terminal instead of stub (G8)
Replace the throwing `createStubTerminalAPI` with a working terminal. Options to
decide: (a) VS Code `window.createTerminal` bridging to the session PTY, or
(b) read-only server-side PTY view. Recommendation: (a) — real interaction,
reuses existing PTY server.
- Files: `packages/vscode/src`, `webview/api/index.ts`.
- Skills: `desktop-shell` (child-process/PTY intersect), `opencodesilver-change-discipline`.
- Validation: VS Code dev run, terminal smoke test.

### I3. Mobile: WebSocket transport option (G13)
Add a runtime toggle `messageStreamTransport: ws` for native apps instead of the
hard SSE lock; keep SSE as fallback.
- Files: `packages/mobile` transport wiring, shared `packages/ui` transport.
- Skills: `relay-transport`, `sync-state-invariants`.
- Validation: mobile simulator run, reconnect test.

### I4. Mobile branding assets (G14)
Replace Capacitor-generated splash/launcher with branded assets; make
`ic_launcher_monochrome` survive regeneration (add to a keep-list/script).
- Files: `packages/mobile/resources/`, build script.
- Skills: `opencodesilver-change-discipline`.
- Validation: `mobile:build:android:debug` + simulator launch.

### I5. Electron app-menu parity with tray (G2 side)
App menu already exists (`main.mjs:4755/4857`); tray has inline permission
approval + session quick actions. Add the same quick actions to the app menu.
- Files: `packages/electron/main.mjs`.
- Skills: `desktop-shell`.
- Validation: electron dev run, menu smoke test.

### I6. Secret scanner + command safety hardening
Extend `lib/safety/secretScanner.ts` patterns (more providers/key formats,
jwt), add rule unit tests, and widen command-safety coverage (dry-run parity
already shipped in 2.4.0 — add missing dangerous patterns).
- Files: `packages/ui/src/lib/safety/*`, `lib/safety/DOCUMENTATION.md`, tests.
- Skills: `opencodesilver-change-discipline`.
- Validation: `bun run --cwd packages/ui test`, lint.

### I7. Housekeeping — reconcile release tracks (G16, flag only)
`changelog/` is read-only until the maintainer asks; this item is a flag:
2.2.0 → 2.5.0 notes live in `docs/releases/` only. Decide whether to backfill
into `changelog/` (will then be done as release work, not now).

### Roadmap note (not in this round unless requested)
**Isolated spaces** remains the largest in-flight feature (server+UI built,
release-gated by `ISOLATED_SPACES_RELEASED = false`); STAGES 6–10 pending.
Continuing it is a separate workstream.

---

## Part C — 10 new features

### Phase 1 — quick wins (S, low risk)

**N1. VS Code status bar activity (G5)**
`createStatusBarItem` showing session state: busy spinner while an agent runs,
model badge, quota/error warnings. Click → `focusChat`.
- Files: `packages/vscode/src/statusBar.ts`, `extension.ts` wiring, webview
  state feed. Skills: `opencodesilver-change-discipline`.
- Validation: VS Code dev run; item appears/updates on session events.

**N2. VS Code keyboards shortcuts contribution (G6)**
Add `contributes.keybindings`: focus chat, new session, add line comment,
submit/remove comment; wire sensible defaults (e.g. `Alt+C`-family) with `when`
clauses.
- Files: `packages/vscode/package.json` only (plus command ids already exist).
- Skills: `opencodesilver-change-discipline`.
- Validation: `vscode:type-check`, install VSIX in dev host, press each key.

**N3. Fix VS Code Command Palette shortcut (G6)**
`CommandPalette` only renders inside `MainLayout`, so the toggle opens nothing.
Render it in `VSCodeLayout` (or gate the command per runtime).
- Files: `packages/ui/src/components/layout/VSCodeLayout.tsx`,
  `packages/ui/src/components/command-palette/*`.
- Skills: `settings-ui-patterns`, `locale-ui-patterns` (labels).
- Validation: `type-check:ui`, VS Code dev run, toggle opens palette.

**N4. Desktop power/lock lifecycle (G3)**
Handle `suspend` / `shutdown` / `lock-screen`: on suspend/lock pause completion
timers and flush server state; on resume re-verify streams and restart stale
realtime connections; respect keep-awake flag on lock.
- Files: `packages/electron/main.mjs` + `power-lifecycle.mjs` + tests.
- Skills: `desktop-shell`, `sync-state-invariants` (reconnect behavior).
- Validation: electron dev run; simulated power events (macOS `pmset`/win test
  harness), unit tests for timer handling.

### Phase 2 — moderate (M)

**N5. Desktop global shortcuts (G1)**
Configurable global shortcuts: show/hide main window, new session, open Mini
Chat, focus prompt input. Settings UI (device scope keys) + defaults
(`Ctrl+Alt+Space`-family, documented, no conflicts with editor keys).
- Files: `packages/electron/shortcuts.mjs` (register/unregister on settings
  change), `main.mjs` wiring, `preload.mjs` bridge, settings registry keys +
  new "Shortcuts (Desktop)" settings section.
- Skills: `desktop-shell`, `settings-ui-patterns`, `theme-system` (section UI).
- Validation: electron dev run on Win/mac (both registration paths), unit tests
  for mapping, settings round-trip.

**N6. Interactive notification actions (G2)**
Notification action buttons: Jump to session; Approve/Deny pending permission
(reuse tray inline-approval logic); Done/Stop for background agents. Needs
claim → action payload wiring through `main.mjs` notification path and IPC.
- Files: `packages/electron/main.mjs` (notification object + action handling),
  `notification-actions.mjs`, `preload.mjs`; shared permission payloads from
  `packages/ui`.
- Skills: `desktop-shell`, `enterprise-boundary` (approval = trust decision).
- Validation: electron dev run, both mac (actions) and Win (fallback to click),
  permission approve/deny e2e in dev.

**N7. VS Code inline diff apply/revert from chat (G7)**
Activate the dead `api:git/diff|file-diff|apply` handlers: in a chat tool diff,
offer Apply / Revert hunk writing through the localfs proxy into the workspace.
- Files: `packages/vscode` bridge-git runtime exposure, webview ui path
  (`ToolPart`/`DiffViewToggle`), shared `packages/ui` diff apply flow.
- Skills: `opencodesilver-change-discipline`, `ui-api-decoupling`.
- Validation: VS Code dev run — apply a CHAT tool diff, verify file on disk +
  git status; revert path; undo safe.

**N8. Offline send queue (G9)**
Persisted outbound queue for prompts when transport is down: keeps drafts,
stores the send intent, retries on reconnect with dedupe, pending badge in the
composer/status row, delivery confirmations on resume. Covers web + desktop +
mobile (mobile is the primary beneficiary).
- Files: `packages/ui/src/sync/` queue extension + new `offline-queue` module,
  persistence layer, composer indicator, `sync-state-invariants` rules.
- Skills: `sync-state-invariants`, `performance-engineering` (queue hot path),
  `opencodesilver-change-discipline`.
- Validation: unit tests (enqueue/retry/dedupe on fake transport), `type-check`,
  manual disconnect/reconnect in web dev run.

### Phase 3 — larger (L)

**N9. Android deep links + home-screen widget (G10)**
(a) `AndroidManifest.xml` VIEW intent-filter for `opencodesilver://`, routed
through the existing `deepLinks.ts` vocabulary (`session/<id>`, `new`,
`changes`, …). (b) Android App Widget + (optional) Quick Settings tile with
session status, mirroring the iOS widget scope.
- Files: `packages/mobile/android/app/src/main/AndroidManifest.xml`,
  `MainActivity.java`, new Kotlin widget + service, shared realtime state feed,
  `packages/ui/src/apps/deepLink` routing for Android entry.
- Skills: `opencodesilver-change-discipline`, `sync-state-invariants` (widget
  live status), `ui-api-decoupling` (shared fetch/auth in native surface).
- Validation: `mobile:build:android:debug`, emulator install, tap deep link,
  add widget, verify live status update.

**N10. Guest SDK: file search/watch + first built-in extension (G11+G12)**
(a) SDK contract additions: `searchFiles` + `watch` host methods (guest-side
types, schemas, host server implementation in `web/server/lib/guests/`,
frame-policy CSP update); (b) ship the first app-owned built-in extension in
`packages/extensions` (e.g. a "Code Search & Locate" panel using searchFiles +
existing file APIs), which populates `registry.json` for the first time.
Optional add-on (pending feasibility): `issues.search/get` host methods.
- Files: `packages/sdk/src/{host.ts,schemas.ts,workspace*.ts}`,
  `packages/web/server/lib/guests/` search handlers, `packages/extensions/*`
  first package + registry entry, UI attach/hosts surfaces if needed.
- Skills: `opencodesilver-change-discipline`, `writing-for-agents` (sdk/docs),
  `ui-api-decoupling`, `enterprise-boundary` (guest capability grant review).
- Validation: SDK unit tests, guest bundle build, web dev run — install, attach,
  search + watch live update; registry build test.

### Feasibility-gated (starts with investigation, may be shelved)

**N11 (pending). Linux differential auto-updates (G4)**
Verify electron-updater blockmap support for Linux/AppImage (upstream
capability, end-to-end manual boundary per README). If supported: wire
`updater-channel.mjs`/`updater-feed.mjs` to emit blockmaps on Linux and enable
differential download. If upstream doesn't support it: document and shelve.
- Files: `packages/electron/updater-*.mjs`, release scripts.
- Skills: `desktop-shell`.
- Validation: staged AppImage update round-trip (manual review boundary), unit
  tests for channel selection.

---

## Execution order & gates

1. Maintainer approves scope (which of N1–N11, which I1–I7).
2. Phase 1 (N1–N4) + quick improvements (I2, I5, I6) — PR-sized batches.
3. Phase 2 (N5–N8) + I1, I3.
4. Phase 3 (N9, N10) + I4; N11 feasibility check in parallel.
5. Each batch: load the listed skills, follow module ownership, run
   type-check/lint/tests for touched packages, `bun run dead-code` after any
   source add/remove. Changelog stays read-only (I7 flag only).

## Decisions needed from the maintainer

- Pick exactly 10 from N1–N11 (N11 is the shelve-candidate) — or authorize the
  recommended set (N1–N10, N11 as feasibility).
- Which of I1–I7 to include.
- I2 terminal approach: (a) VS Code native terminal vs (b) read-only PTY.
- N8 offline queue: include desktop/web too, or scope to mobile first?