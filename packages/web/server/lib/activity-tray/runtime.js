import { spawn } from 'node:child_process';
import crypto from 'node:crypto';

const PID_CHECK_INTERVAL_MS = 2500;
const KILL_GRACE_TIMEOUT_MS = 1500;
const DEFAULT_RETENTION_HOURS = 72;
const DEFAULT_MAX_LOG_SIZE_MB = 25;

export function isOsProcessAlive(pid, proc = process) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    proc.kill(pid, 0);
    return true;
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'EPERM') {
      return true;
    }
    return false;
  }
}

export function killProcessGroup(pid, force = false, proc = process, spawnFn = spawn) {
  if (!Number.isInteger(pid) || pid <= 0) return;
  if (proc.platform === 'win32') {
    try {
      const args = ['/PID', String(pid), '/T'];
      if (force) args.push('/F');
      const killer = spawnFn('taskkill', args, { stdio: 'ignore', windowsHide: true });
      killer.on?.('error', () => {});
    } catch {
      /* ignore */
    }
    try {
      proc.kill(pid, force ? 'SIGKILL' : 'SIGTERM');
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    proc.kill(-pid, force ? 'SIGKILL' : 'SIGTERM');
  } catch {
    /* ignore */
  }
  try {
    proc.kill(pid, force ? 'SIGKILL' : 'SIGTERM');
  } catch {
    /* ignore */
  }
}

export function createActivityTrayServerRuntime({
  fs,
  path,
  process: proc = process,
  opencodesilverDataDir,
}) {
  const trayRootDir = path.join(opencodesilverDataDir, 'activity-tray');
  const logsDir = path.join(trayRootDir, 'logs');
  const tasksFilePath = path.join(trayRootDir, 'tasks.json');

  const tasksById = new Map();
  const childProcessesById = new Map();
  let loaded = false;
  let writeChain = Promise.resolve();

  const ensureDirs = async () => {
    await fs.promises.mkdir(logsDir, { recursive: true });
  };

  /**
   * Atomic persistence: write to temp file in same directory, then rename.
   */
  const persistTasksSnapshot = () => {
    writeChain = writeChain
      .catch(() => {})
      .then(async () => {
        await ensureDirs();
        const tmpFile = `${tasksFilePath}.${crypto.randomUUID()}.tmp`;
        const serialized = JSON.stringify(
          {
            version: 1,
            updatedAt: Date.now(),
            tasks: Array.from(tasksById.values()),
          },
          null,
          2,
        );
        await fs.promises.writeFile(tmpFile, serialized, 'utf8');
        await fs.promises.rename(tmpFile, tasksFilePath);
      });
    return writeChain;
  };

  /**
   * Reconciles tasks marked 'running' against actual OS PIDs.
   */
  const reconcileRunningTasks = () => {
    let changed = false;
    const now = Date.now();
    for (const task of tasksById.values()) {
      if (task.status !== 'running') continue;
      if (typeof task.pid === 'number' && task.pid > 0) {
        const alive = isOsProcessAlive(task.pid, proc);
        if (!alive && !childProcessesById.has(task.id)) {
          task.status = task.exitCode === 0 ? 'done' : 'failed';
          task.endedAt = task.endedAt ?? now;
          if (task.exitCode === undefined) {
            task.exitCode = 1;
          }
          changed = true;
        }
      } else if (!childProcessesById.has(task.id)) {
        // Task has no live PID or child process handle; mark finished
        task.status = task.exitCode === 0 ? 'done' : 'failed';
        task.endedAt = task.endedAt ?? now;
        if (task.exitCode === undefined) {
          task.exitCode = 1;
        }
        changed = true;
      }
    }
    if (changed) {
      void persistTasksSnapshot();
    }
    return changed;
  };

  const loadFromDisk = async () => {
    if (loaded) return;
    loaded = true;
    try {
      await ensureDirs();
      const raw = await fs.promises.readFile(tasksFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed?.tasks) ? parsed.tasks : [];
      let skipped = false;
      for (const item of list) {
        if (item && typeof item.id === 'string') {
          const rawLabel = String(item.label || item.command || '').trim().toLowerCase();
          if (
            rawLabel === 'read' ||
            rawLabel === 'glob' ||
            rawLabel === 'grep' ||
            rawLabel === 'skill' ||
            rawLabel === 'question' ||
            (rawLabel === 'shell' && !item.command)
          ) {
            skipped = true;
            continue;
          }
          tasksById.set(item.id, item);
        }
      }
      if (skipped) {
        void persistTasksSnapshot();
      }
      reconcileRunningTasks();
    } catch {
      /* file does not exist yet or unreadable */
    }
  };

  const appendTaskLog = async (taskId, text) => {
    if (!text) return;
    try {
      await ensureDirs();
      const logFile = path.join(logsDir, `${taskId.replace(/[^a-zA-Z0-9_-]/g, '_')}.log`);
      await fs.promises.appendFile(logFile, text, 'utf8');
    } catch {
      /* ignore log write failure */
    }
  };

  const readTaskLogTail = async (taskId, tailLines = 100) => {
    try {
      const safeId = taskId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const logFile = path.join(logsDir, `${safeId}.log`);
      const content = await fs.promises.readFile(logFile, 'utf8');
      const lines = content.split(/\r?\n/);
      if (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
      }
      const limit = Math.max(1, Math.min(2000, Number(tailLines) || 100));
      return lines.slice(-limit);
    } catch {
      return [];
    }
  };

  const startCommandTask = async ({
    id,
    parentId,
    kind = 'command',
    label,
    command,
    cwd,
    conversationId = 'global',
  }) => {
    await loadFromDisk();
    const taskId = typeof id === 'string' && id.trim() ? id.trim() : `task_${crypto.randomUUID()}`;
    const safeId = taskId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const logPath = path.join(logsDir, `${safeId}.log`);
    const startedAt = Date.now();

    const task = {
      id: taskId,
      parentId: parentId || undefined,
      kind,
      label: label || command || 'Command',
      command: command || label || '',
      cwd: cwd || proc.cwd(),
      status: 'running',
      startedAt,
      logPath,
      conversationId,
    };

    if (command && typeof command === 'string' && command.trim()) {
      const shell = proc.platform === 'win32' ? 'powershell.exe' : '/bin/sh';
      const shellArgs =
        proc.platform === 'win32'
          ? ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command]
          : ['-c', command];

      const child = spawn(shell, shellArgs, {
        cwd: task.cwd,
        detached: proc.platform !== 'win32',
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      if (typeof child.pid === 'number') {
        task.pid = child.pid;
      }

      childProcessesById.set(taskId, child);

      child.stdout?.on('data', (chunk) => {
        void appendTaskLog(taskId, String(chunk));
      });
      child.stderr?.on('data', (chunk) => {
        void appendTaskLog(taskId, String(chunk));
      });

      child.on('exit', (code, signal) => {
        childProcessesById.delete(taskId);
        const existing = tasksById.get(taskId);
        if (!existing) return;
        existing.endedAt = Date.now();
        existing.exitCode = typeof code === 'number' ? code : signal ? 130 : 1;
        if (existing.status !== 'killed') {
          existing.status = code === 0 ? 'done' : 'failed';
        }
        void persistTasksSnapshot();
      });

      child.on('error', (err) => {
        void appendTaskLog(taskId, `\n[Process error]: ${err?.message || String(err)}\n`);
      });
    }

    tasksById.set(taskId, task);
    await persistTasksSnapshot();
    return task;
  };

  const upsertTask = async (payload) => {
    await loadFromDisk();
    if (!payload || typeof payload.id !== 'string' || !payload.id.trim()) {
      throw new Error('Task id is required');
    }
    const id = payload.id.trim();
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const previous = tasksById.get(id);
    const merged = {
      ...(previous ?? {}),
      ...payload,
      id,
      logPath: payload.logPath || previous?.logPath || path.join(logsDir, `${safeId}.log`),
      startedAt: payload.startedAt ?? previous?.startedAt ?? Date.now(),
      conversationId: payload.conversationId ?? previous?.conversationId ?? 'global',
    };
    tasksById.set(id, merged);
    if (typeof payload.logChunk === 'string' && payload.logChunk.length > 0) {
      await appendTaskLog(id, payload.logChunk);
    }
    await persistTasksSnapshot();
    return merged;
  };

  const killTask = async (taskId) => {
    await loadFromDisk();
    const task = tasksById.get(taskId);
    if (!task) {
      return null;
    }

    const pid = task.pid;
    const child = childProcessesById.get(taskId);

    if (pid && isOsProcessAlive(pid, proc)) {
      killProcessGroup(pid, false, proc, spawn);
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          if (isOsProcessAlive(pid, proc)) {
            killProcessGroup(pid, true, proc, spawn);
          }
          resolve();
        }, KILL_GRACE_TIMEOUT_MS);

        if (child) {
          child.once('exit', () => {
            clearTimeout(timer);
            resolve();
          });
        }
      });
    }

    childProcessesById.delete(taskId);
    task.status = 'killed';
    task.endedAt = Date.now();
    if (task.exitCode === undefined) {
      task.exitCode = 137;
    }
    await appendTaskLog(taskId, '\n[Task terminated by user]\n');
    await persistTasksSnapshot();
    return task;
  };

  const cleanupTasksAndLogs = async ({
    conversationId,
    retentionPeriodHours = DEFAULT_RETENTION_HOURS,
    maxStoredLogSizeMb = DEFAULT_MAX_LOG_SIZE_MB,
    clearAllFinished = false,
  } = {}) => {
    await loadFromDisk();
    const now = Date.now();
    const maxAgeMs = Math.max(0, Number(retentionPeriodHours) || DEFAULT_RETENTION_HOURS) * 3600 * 1000;
    let removedCount = 0;

    for (const [id, task] of tasksById.entries()) {
      const isFinished =
        task.status === 'done' ||
        task.status === 'failed' ||
        task.status === 'killed' ||
        task.status === 'denied';
      if (!isFinished) continue;
      if (conversationId && task.conversationId !== conversationId) continue;

      const endedAt = task.endedAt ?? task.startedAt ?? now;
      if (clearAllFinished || now - endedAt >= maxAgeMs) {
        tasksById.delete(id);
        removedCount += 1;
        const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
        const logFile = path.join(logsDir, `${safeId}.log`);
        await fs.promises.unlink(logFile).catch(() => {});
      }
    }

    // Enforce max total log directory size
    try {
      const entries = await fs.promises.readdir(logsDir);
      const statsList = [];
      let totalBytes = 0;
      for (const name of entries) {
        if (!name.endsWith('.log')) continue;
        const fullPath = path.join(logsDir, name);
        try {
          const stat = await fs.promises.stat(fullPath);
          totalBytes += stat.size;
          statsList.push({ fullPath, mtimeMs: stat.mtimeMs, size: stat.size });
        } catch {
          /* ignore */
        }
      }
      const maxBytes = Math.max(1, Number(maxStoredLogSizeMb) || DEFAULT_MAX_LOG_SIZE_MB) * 1024 * 1024;
      if (totalBytes > maxBytes) {
        statsList.sort((a, b) => a.mtimeMs - b.mtimeMs);
        for (const item of statsList) {
          if (totalBytes <= maxBytes) break;
          await fs.promises.unlink(item.fullPath).catch(() => {});
          totalBytes -= item.size;
        }
      }
    } catch {
      /* ignore */
    }

    if (removedCount > 0) {
      await persistTasksSnapshot();
    }
    return { removedCount };
  };

  const livenessTimer = setInterval(() => {
    if (loaded) {
      reconcileRunningTasks();
    }
  }, PID_CHECK_INTERVAL_MS);
  if (typeof livenessTimer.unref === 'function') {
    livenessTimer.unref();
  }

  return {
    loadFromDisk,
    reconcileRunningTasks,
    listTasks: async (conversationId) => {
      await loadFromDisk();
      reconcileRunningTasks();
      const all = Array.from(tasksById.values());
      if (!conversationId) return all;
      return all.filter((t) => t.conversationId === conversationId);
    },
    startCommandTask,
    upsertTask,
    killTask,
    readTaskLogTail,
    cleanupTasksAndLogs,
  };
}
