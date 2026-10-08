# Background Task Output — Architecture & Implementation Plan

## 1. Exploration Summary (Step A)

| Subsystem | Existing Implementation | Findings & Reuse Strategy |
|---|---|---|
| **Command Launch & Sync** | `packages/ui/src/components/chat/activity-tray/useActivityTraySync.ts` & `packages/ui/src/lib/activity-tray/taskManager.ts` | Syncs OpenCode tool calls (`bash`, `shell`, `shell_command`, `terminal`) and server-spawned tasks into `globalTaskManager`. We will reuse task IDs/metadata and bridge output streaming without touching tray/approval UI. |
| **Process / Terminal Runner** | `packages/web/server/lib/activity-tray/runtime.js` & `packages/web/server/lib/terminal/` | `bun-pty` (`^0.4.5`) and `node-pty` (`1.2.0-beta.15`) are already installed in `packages/web`. We will build a dedicated `background-task-output/runner.js` module supporting PTY mode with safe `child_process.spawn` pipe fallback, process-group isolation, and Windows `taskkill /T /F`. |
| **Output Capture & Storage** | `<appData>/activity-tray/logs/<id>.log` | Existing log capture uses unbatched `appendFile` without stream tags, byte offsets, truncation markers, or EOF exit records. We will store structured per-conversation task logs under `<appData>/tasks/<conversationId>/<taskId>.log` + `<taskId>.meta.json`. |
| **Global Store** | Zustand v5 (`useUIStore.ts`, `useActivityTrayStore.ts`) | We will add `useTaskOutputStore.ts` (Zustand + `persist`) for feature flag, settings, open task tabs, selected task ID, and UI preferences. |
| **Transport Layer** | Express 5 routes in `packages/web/server/lib/opencode/opencodesilver-routes.js` + SSE (`text/event-stream`) | We will expose REST endpoints + an offset-capable SSE endpoint (`/api/opencodesilver/task-output/tasks/:id/stream?offset=<byteOffset>&seq=<seq>`) and byte-range/tail log endpoints. |
| **Virtualization & UI Kit** | `@tanstack/react-virtual` (`3.14.13`) & `virtua` (`0.49.1`) in `packages/ui/package.json` | Reuse `@tanstack/react-virtual` for 100k+ line virtualization and write a lightweight zero-dependency ANSI SGR / `\r` / `\x1b[2K` renderer (`ansiParser.ts`). |
| **Settings Page** | `packages/ui/src/components/sections/opencodesilver/OpencodeSilverPage.tsx` | Add a single self-contained settings section `BackgroundTaskOutputSettings.tsx` rendered in `OpencodeSilverPage.tsx`. |

---

## 2. Text Architecture Diagram

```text
+---------------------------------------------------------------------------------------------------+
|                                   OPENCODESILVER SERVER (Bun / Node)                              |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  | BackgroundTaskOutputRunner (packages/web/server/lib/background-task-output/runner.js)       |  |
|  |                                                                                             |  |
|  |  1. Spawn (PTY via bun-pty/node-pty OR Pipe fallback with detached process group)           |  |
|  |  2. Capture stdout / stderr / system chunks with timestamp, stream tag, seq, byteOffset     |  |
|  |  3. Batch Write Buffer (50-80ms) -> <appData>/tasks/<convId>/<taskId>.log                   |  |
|  |     + Per-task & Total Size Cap Enforcer (Head + Truncation Marker + Tail)                  |  |
|  |     + Guaranteed Final EOF Marker on exit/kill/timeout/crash/reconcile + fsync()            |  |
|  |  4. Atomic Meta Writer (.tmp + rename) -> <appData>/tasks/<convId>/<taskId>.meta.json       |  |
|  |  5. Truthful Status Engine:                                                                 |  |
|  |     - OS exit/close listener + 2.5s Liveness Poller (PID + OS Process Start Time check)     |  |
|  |     - Idempotent finalizeTask() lock (prevents exit vs liveness vs stop races)              |  |
|  |     - Stall Detector (marks stalled=true after configurable idle threshold)                 |  |
|  +----------------------------------------------+----------------------------------------------+  |
|                                                 |                                                 |
|                                  REST + SSE (Subscribe with Offset)                               |
+-------------------------------------------------|-------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                     OPENCODESILVER CLIENT (React)                                 |
|                                                                                                   |
|  +------------------------------+      Minimal Click Hook       +------------------------------+  |
|  | AgentActivityTray.tsx        | ----------------------------> | useTaskOutputStore (Zustand) |  |
|  | WorkStatusAntigravitySections|   openTaskOutput(taskId)      | - settings (persisted)       |  |
|  +------------------------------+                               | - openTaskIds / activeTaskId |  |
|                                                                 | - tasksById / stalled map    |  |
|                                                                 +--------------+---------------+  |
|                                                                                |                  |
|                                                                                v                  |
|  +---------------------------------------------------------------------------------------------+  |
|  | BackgroundTaskOutputPanel.tsx (Bottom Dock | Inline | Full-Screen)                          |  |
|  |  - Task Switcher Tabs (with live status dot, close tab, clear final state)                  |  |
|  |  - Header: Status icon, Command, CWD, PID, Live Elapsed, Exit Code                          |  |
|  |  - Actions: Stop (graceful -> tree kill), Re-run, Copy All, Copy Selection, Download, Clear |  |
|  |  - Virtualized Log Body (@tanstack/react-virtual, ~100ms throttled buffer, role="log")      |  |
|  |  - Lightweight ANSI Renderer (16/256/Truecolor SGR, Bold, \r overwrite, \x1b[2K clear-line) |  |
|  |  - Toggles: Wrap, Timestamps, Line Numbers, Stdout/Stderr Color, Search (Ctrl+F Next/Prev)  |  |
|  |  - Optional Stdin / Ctrl+C Input Bar                                                        |  |
|  +---------------------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Data Model

### 3.1 Server & Client `BackgroundTaskRecord` (`Task`)
```ts
export type BackgroundTaskStatus = 'running' | 'done' | 'failed' | 'killed' | 'timed_out';

export interface BackgroundTaskRecord {
  id: string;
  conversationId: string;
  command: string;
  cwd: string;
  status: BackgroundTaskStatus;
  pid: number | null;
  processStartTime?: string | null; // OS process creation token to detect PID reuse
  startedAt: number;
  endedAt?: number;
  exitCode?: number | null;
  signal?: string | null;
  logPath: string;
  bytesWritten: number;
  truncated: boolean;
  ptyMode?: boolean;
  stalled?: boolean;
  lastOutputAt?: number;
  failureReason?: string;
}
```

### 3.2 On-Disk Log Format (`<appData>/tasks/<conversationId>/<taskId>.log`)
- Each chunk line is stored in a structured, stream-tagged framing format so byte-range/offset reads and raw downloads remain human-readable while preserving stream tags (`stdout` | `stderr` | `system`) and timestamps:
  `[ISO_TIMESTAMP][stdout|stderr|system] <raw line content>\n`
- **Guaranteed Final EOF Marker**:
  Written by `finalizeTask()` on every terminal transition (`done`, `failed`, `killed`, `timed_out`, external kill, or startup reconciliation):
  `<<<OPENCODESILVER_EOF {"status":"done","exitCode":0,"signal":null,"endedAt":1791450000000,"bytesWritten":1024}>>>\n`

### 3.3 Settings Model (`BackgroundTaskOutputSettings`)
- `enabled: boolean` (default: `true` — single feature flag)
- `ptyMode: boolean` (default: `true`)
- `defaultPlacement: 'bottom' | 'inline' | 'fullscreen'` (default: `'bottom'`)
- `autoFollowDefault: boolean` (default: `true`)
- `wrapDefault: boolean` (default: `false`)
- `timestampsDefault: boolean` (default: `false`)
- `lineNumbersDefault: boolean` (default: `true`)
- `distinguishStderrDefault: boolean` (default: `true`)
- `fontSize: number` (default: `12`, range `10`–`18`)
- `scrollbackLines: number` (default: `10000`, range `500`–`200000`)
- `maxLogSizePerTaskMb: number` (default: `10`, range `1`–`100`)
- `maxTotalLogSizeMb: number` (default: `100`, range `10`–`1000`)
- `retentionDays: number` (default: `7`, range `1`–`90`)
- `timeoutSeconds: number` (default: `0` = no timeout, range `0`–`86400`)
- `stallThresholdSeconds: number` (default: `30`, range `5`–`600`)
- `confirmBeforeStop: boolean` (default: `false`)
- `onExitBehavior: 'keep_running' | 'stop_all' | 'ask'` (default: `'keep_running'`)

---

## 4. New vs. Modified Files

### New Files
1. `docs/background-task-output-plan.md` — This architectural plan.
2. `packages/web/server/lib/background-task-output/runner.js` — Background process runner, PTY/pipe spawner, Windows `taskkill /T /F` & POSIX process-group killer, batched log writer with `fsync`, head+tail truncation, guaranteed EOF marker, atomic `.meta.json` persistence, PID + start-time reconciliation, idempotent finalizer, and SSE offset broadcaster.
3. `packages/ui/src/lib/task-output/ansiParser.ts` — Lightweight ANSI SGR parser (16-color, 256-color, RGB truecolor, bold, dim, underline) + carriage return (`\r`) and clear-line (`\x1b[2K`, `\x1b[K`) line state machine.
4. `packages/ui/src/stores/useTaskOutputStore.ts` — Zustand persisted store for `"Background Task Output"` settings, open task tabs, offset-based SSE subscription client, ~100ms throttled render buffer, and server API actions.
5. `packages/ui/src/components/chat/task-output/BackgroundTaskOutputPanel.tsx` — Live terminal output panel supporting `bottom dock`, `inline`, and `full-screen` placements, virtualized log rows (`@tanstack/react-virtual`), search (`Ctrl+F`), ANSI rendering, stdin/Ctrl+C bar, task tabs, and full a11y (`role="log"` + polite live region).
6. `packages/ui/src/components/sections/opencodesilver/BackgroundTaskOutputSettings.tsx` — Settings section for `"Background Task Output"`.
7. `packages/ui/src/lib/i18n/messages/task-output.i18n.ts` — Complete English (`en`) and Arabic (`ar`) i18n keys (plus fallback coverage for all 14 locales).
8. `packages/ui/src/lib/task-output/__tests__/ansiParser.test.ts` — Unit tests for ANSI colors, bold, `\r` carriage return, and `\x1b[2K` clear-line.
9. `packages/web/server/lib/background-task-output/__tests__/runner.test.js` — Comprehensive integration & lifecycle tests (success, nonzero exit, Windows process-tree kill with child verification, timeout, spawn failure, 0-byte "No output" with EOF marker, killed task EOF marker, head+tail truncation marker, offset resume without gaps/duplicates, PID reuse & dead PID reconciliation, idempotent finalization under race).

### Modified Files (Minimal Additive Hooks Only)
1. `packages/web/server/lib/opencode/opencodesilver-routes.js` — Mount `/api/opencodesilver/task-output/*` routes and mirror `/api/opencodesilver/activity-tray/tasks/start` into the runner so tasks started anywhere stream live.
2. `packages/ui/src/lib/i18n/messages/chat-tools.i18n.ts` — Spread `taskOutputI18n` into the locale dictionaries.
3. `packages/ui/src/components/chat/activity-tray/AgentActivityTray.tsx` — Minimal click hook on the existing "Open logs" button / task row to open `BackgroundTaskOutputPanel` when `useTaskOutputStore.getState().settings.enabled` is true (leaving existing behavior untouched when disabled).
4. `packages/ui/src/components/chat/work-status/WorkStatusAntigravitySections.tsx` — Minimal click hook on background task rows in the right-hand panel to open `BackgroundTaskOutputPanel` when enabled.
5. `packages/ui/src/components/chat/ChatContainer.tsx` — Render `<BackgroundTaskOutputPanel />` when open and enabled.
6. `packages/ui/src/components/sections/opencodesilver/OpencodeSilverPage.tsx` — Render `<BackgroundTaskOutputSettings />` under Chat/General settings.

---

## 5. Event Flow: "Command Launched" → "Line Visible in UI"

1. **Launch**: Client or agent calls `POST /api/opencodesilver/task-output/tasks/start` (or synced from OpenCode tool execution via `useTaskOutputStore.syncToolTask`).
2. **Spawn & Meta**: `runner.js` creates `<appData>/tasks/<conversationId>/<taskId>.log` (0 bytes initially), queries the OS process creation timestamp (`Get-CimInstance`/`wmic` on Windows, `ps -o lstart=` on POSIX), writes `<taskId>.meta.json` atomically via `.tmp` + `rename`, and returns `{ task }` immediately.
3. **Capture & Batch**: Child stdout/stderr emit chunks. Each chunk is tagged with `{ seq, stream, timestamp, text }` and queued in a 60ms batch buffer.
4. **Disk Flush & Broadcast**: Every 60ms (or immediately on exit), the batch is appended to `<taskId>.log`, `bytesWritten` is updated with start/end byte offsets, and connected SSE clients on `/api/opencodesilver/task-output/tasks/:id/stream?offset=...` receive `event: chunk` with `{ seq, startOffset, endOffset, entries }`.
5. **Client Throttled Render**: `useTaskOutputStore` buffers incoming SSE chunks and flushes to state at most once every `100ms`, capping in-memory lines to `scrollbackLines`.
6. **Virtualized Paint**: `BackgroundTaskOutputPanel` processes `\r` and `\x1b[2K` per line, parses ANSI SGR spans via `ansiParser.ts`, and renders only the visible viewport rows via `@tanstack/react-virtual`.

---

## 6. Failure Modes & Handling

| Failure Mode | Mitigation in This Implementation |
|---|---|
| **"Stuck RUNNING" after process dies** | `runner.js` combines `exit`/`close` listeners with a 2.5s OS liveness check (`process.kill(pid, 0)` + OS start-time check). Dead processes transition immediately via idempotent `finalizeTask()`. |
| **Orphan child processes on Windows/POSIX** | Windows uses `taskkill /PID <pid> /T` (graceful) followed by `taskkill /PID <pid> /T /F` after grace timeout. POSIX spawns with `detached: true` and signals `-pid` (`SIGTERM` -> `SIGKILL`). |
| **Bare 0-byte log on kill or silent command** | `finalizeTask()` ALWAYS appends `<<<OPENCODESILVER_EOF ...>>>` and calls `fsyncSync` before closing the file descriptor. Silent commands (`sleep 1`) have 0 content lines + valid EOF marker, and UI explicitly renders `"No output"` + exit badge. |
| **PID reuse after app restart** | Startup reconciliation compares persisted `processStartTime` against current OS process creation time for `task.pid`. If mismatched, the PID was reused by another process and the task is finalized as `failed` (`"process lost"`). |
| **100k+ line log floods UI** | Server enforces per-task byte cap (keeping head + visible `--- [TRUNCATED] ---` marker + tail); client throttles state updates to 100ms, caps scrollback buffer, and virtualizes DOM rows. |
| **SSE disconnect / reconnect** | Client tracks `nextByteOffset`. On reconnect, `/stream?offset=<nextByteOffset>` streams the exact byte range from disk before switching to live tailing—zero gaps or duplicates. |

---

## 7. Test Matrix

1. **Lifecycle**: exit 0 (`done`), nonzero exit (`failed`), graceful/forced stop (`killed`), timeout (`timed_out`), invalid spawn binary/cwd (`failed` with system error log + EOF marker).
2. **Windows Tree Kill**: parent spawns a long-running child process (`node -e "setInterval(()=>{},1000)"`), parent is stopped via `stopTask()`, verify both parent PID and child PID are dead.
3. **Empty Output & Killed EOF Marker**: `node -e ""` produces 0 output lines + EOF marker (`status: done`, `exitCode: 0`); killed `sleep` task has EOF marker (`status: killed`).
4. **Truncation**: task writing > cap triggers head+tail truncation with `<<<OPENCODESILVER_TRUNCATED ...>>>` marker and sets `task.truncated = true`.
5. **Offset Resume**: read first N bytes, reconnect stream at `offset=N`, verify exact byte continuity without duplicate or missing lines.
6. **Startup Reconciliation**: simulate crashed server with `.meta.json` still `status: "running"` for (a) dead PID, (b) alive PID, (c) reused PID with mismatched `processStartTime`.
7. **Idempotent Finalize**: invoke `finalizeTask()` concurrently from `exit`, `stopTask()`, and `reconcile()` — verify EOF marker is written once and status transitions once.
8. **ANSI Parser**: SGR foreground/background colors, bold, reset, `\r` progress bar overwrite, `\x1b[2K` line clear.

---

## 8. Rollback Steps

1. **Instant Runtime Disable**: Toggle **"Enable Background Task Output"** off in **Settings → Chat → Background Task Output** (or set `enabled: false` in `useTaskOutputStore`). All task clicks immediately revert to their previous inline tray behavior.
2. **Code Rollback**: Revert the 6 modified files (`opencodesilver-routes.js`, `chat-tools.i18n.ts`, `AgentActivityTray.tsx`, `WorkStatusAntigravitySections.tsx`, `ChatContainer.tsx`, `OpencodeSilverPage.tsx`) and remove `packages/web/server/lib/background-task-output/`, `packages/ui/src/lib/task-output/`, `packages/ui/src/stores/useTaskOutputStore.ts`, `packages/ui/src/components/chat/task-output/`, and `packages/ui/src/components/sections/opencodesilver/BackgroundTaskOutputSettings.tsx`.
