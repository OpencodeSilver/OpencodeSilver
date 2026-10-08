import { runtimeFetch } from '@/lib/runtime-fetch';
import {
  buildAlwaysAllowRuleForCommand,
  evaluatePermissionPolicy,
  type ApprovalReason,
  type PermissionPolicyConfig,
} from './permissionEngine';

export type ActivityTaskKind =
  | 'command'
  | 'edit'
  | 'format'
  | 'build'
  | 'typecheck'
  | 'subagent';

export type ActivityTaskStatus =
  | 'queued'
  | 'awaiting_approval'
  | 'running'
  | 'done'
  | 'failed'
  | 'killed'
  | 'denied';

export interface ActivityTask {
  id: string;
  parentId?: string;
  kind: ActivityTaskKind;
  label: string;
  status: ActivityTaskStatus;
  startedAt: number;
  endedAt?: number;
  exitCode?: number | null;
  pid?: number;
  logPath: string;
  conversationId: string;
  command?: string;
  cwd?: string;
  approvalReason?: ApprovalReason;
  matchedRule?: string;
  permissionId?: string;
  bypassSandbox?: boolean;
}

export interface ActivityTaskFilter {
  conversationId?: string;
  statuses?: ActivityTaskStatus[];
  kinds?: ActivityTaskKind[];
  parentId?: string;
}

export interface StartTaskInput {
  id?: string;
  parentId?: string;
  kind: ActivityTaskKind;
  label: string;
  command?: string;
  cwd?: string;
  conversationId: string;
  pid?: number;
  status?: ActivityTaskStatus;
  startedAt?: number;
  endedAt?: number;
  exitCode?: number | null;
  logPath?: string;
  initialLogs?: string[];
  bypassSandbox?: boolean;
  permissionId?: string;
  policy?: PermissionPolicyConfig;
  spawnOnServer?: boolean;
}

export type TaskManagerListener = (tasks: readonly ActivityTask[]) => void;

export interface TaskManagerOptions {
  throttleMs?: number;
  checkProcessAlive?: (pid: number) => boolean | Promise<boolean>;
  onRuleAdded?: (rule: string) => void;
  onPermissionReply?: (
    task: ActivityTask,
    reply: 'once' | 'always' | 'reject',
  ) => void | Promise<void>;
  enableServerSync?: boolean;
}

const STORAGE_KEY_PREFIX = 'opencodesilver.activityTray.tasks.v1:';

export class TaskManager {
  private tasks = new Map<string, ActivityTask>();
  private logs = new Map<string, string[]>();
  private listeners = new Set<TaskManagerListener>();
  private throttleMs: number;
  private notifyTimer: ReturnType<typeof setTimeout> | null = null;
  private checkProcessAliveFn?: (pid: number) => boolean | Promise<boolean>;
  private onRuleAdded?: (rule: string) => void;
  private onPermissionReply?: (
    task: ActivityTask,
    reply: 'once' | 'always' | 'reject',
  ) => void | Promise<void>;
  private enableServerSync: boolean;

  constructor(options: TaskManagerOptions = {}) {
    this.throttleMs = options.throttleMs ?? 100;
    this.checkProcessAliveFn = options.checkProcessAlive;
    this.onRuleAdded = options.onRuleAdded;
    this.onPermissionReply = options.onPermissionReply;
    this.enableServerSync = options.enableServerSync ?? true;
  }

  public configure(options: Partial<TaskManagerOptions>): void {
    if (options.throttleMs !== undefined) this.throttleMs = options.throttleMs;
    if (options.checkProcessAlive !== undefined) this.checkProcessAliveFn = options.checkProcessAlive;
    if (options.onRuleAdded !== undefined) this.onRuleAdded = options.onRuleAdded;
    if (options.onPermissionReply !== undefined) this.onPermissionReply = options.onPermissionReply;
    if (options.enableServerSync !== undefined) this.enableServerSync = options.enableServerSync;
  }

  private scheduleNotify(immediate = false): void {
    if (immediate || this.throttleMs <= 0) {
      if (this.notifyTimer !== null) {
        clearTimeout(this.notifyTimer);
        this.notifyTimer = null;
      }
      this.flushNotify();
      return;
    }

    if (this.notifyTimer !== null) return;
    this.notifyTimer = setTimeout(() => {
      this.notifyTimer = null;
      this.flushNotify();
    }, this.throttleMs);
  }

  public flushNotify(): void {
    const snapshot = this.list();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch {
        /* ignore listener errors */
      }
    }
  }

  private persistConversationTasksLocally(conversationId: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const list = this.list({ conversationId });
      const key = `${STORAGE_KEY_PREFIX}${encodeURIComponent(conversationId)}`;
      const tmpKey = `${key}.tmp`;
      const payload = JSON.stringify({
        version: 1,
        updatedAt: Date.now(),
        tasks: list,
      });
      window.localStorage.setItem(tmpKey, payload);
      window.localStorage.setItem(key, payload);
      window.localStorage.removeItem(tmpKey);
    } catch {
      /* ignore quota errors */
    }
  }

  public restoreConversationTasksLocally(conversationId: string): ActivityTask[] {
    if (typeof window === 'undefined' || !window.localStorage || !conversationId) return [];
    try {
      const key = `${STORAGE_KEY_PREFIX}${encodeURIComponent(conversationId)}`;
      const raw = window.localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as { tasks?: ActivityTask[] };
      const restored = Array.isArray(parsed?.tasks) ? parsed.tasks : [];
      let skipped = false;
      for (const task of restored) {
        if (task && typeof task.id === 'string' && !this.tasks.has(task.id)) {
          const rawLabel = String(task.label || task.command || '').trim().toLowerCase();
          if (
            rawLabel === 'read' ||
            rawLabel === 'glob' ||
            rawLabel === 'grep' ||
            rawLabel === 'skill' ||
            rawLabel === 'question' ||
            (rawLabel === 'shell' && !task.command)
          ) {
            skipped = true;
            continue;
          }
          this.tasks.set(task.id, task);
        }
      }
      if (skipped) {
        this.persistConversationTasksLocally(conversationId);
      }
      this.scheduleNotify(true);
      return this.list({ conversationId });
    } catch {
      return [];
    }
  }

  /**
   * Starts or registers a task. If a PermissionPolicyConfig is supplied,
   * evaluates the command/operation first and sets status to 'awaiting_approval',
   * 'denied', or 'running'.
   */
  public async start(input: StartTaskInput): Promise<ActivityTask> {
    const id =
      input.id && input.id.trim()
        ? input.id.trim()
        : `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const startedAt = input.startedAt ?? Date.now();
    const logPath = input.logPath ?? `~/.config/opencodesilver/activity-tray/logs/${safeId}.log`;

    let status: ActivityTaskStatus = input.status ?? 'running';
    let approvalReason: ApprovalReason | undefined;
    let matchedRule: string | undefined;
    let endedAt = input.endedAt;
    let exitCode = input.exitCode;

    if (input.policy && !input.status) {
      const evalResult = evaluatePermissionPolicy(
        {
          command: input.command ?? (input.kind === 'command' ? input.label : undefined),
          cwd: input.cwd,
          bypassSandbox: input.bypassSandbox,
        },
        input.policy,
      );
      if (evalResult.outcome === 'deny') {
        status = 'denied';
        approvalReason = evalResult.reason;
        matchedRule = evalResult.matchedRule;
        endedAt = startedAt;
        exitCode = 126;
      } else if (evalResult.outcome === 'ask') {
        status = 'awaiting_approval';
        approvalReason = evalResult.reason;
        matchedRule = evalResult.matchedRule;
      } else {
        status = 'running';
        approvalReason = evalResult.reason;
        matchedRule = evalResult.matchedRule;
      }
    }

    const existing = this.tasks.get(id);
    const task: ActivityTask = {
      ...(existing ?? {}),
      id,
      parentId: input.parentId ?? existing?.parentId,
      kind: input.kind,
      label: input.label,
      command: input.command ?? existing?.command,
      cwd: input.cwd ?? existing?.cwd,
      status,
      startedAt: existing?.startedAt ?? startedAt,
      endedAt,
      exitCode,
      pid: input.pid ?? existing?.pid,
      logPath,
      conversationId: input.conversationId,
      approvalReason: approvalReason ?? existing?.approvalReason,
      matchedRule: matchedRule ?? existing?.matchedRule,
      permissionId: input.permissionId ?? existing?.permissionId,
      bypassSandbox: input.bypassSandbox ?? existing?.bypassSandbox,
    };

    this.tasks.set(id, task);

    if (input.initialLogs && input.initialLogs.length > 0) {
      const existingLogs = this.logs.get(id) ?? [];
      this.logs.set(id, [...existingLogs, ...input.initialLogs]);
    }

    this.persistConversationTasksLocally(task.conversationId);
    this.scheduleNotify();

    if (this.enableServerSync && typeof window !== 'undefined') {
      if (input.spawnOnServer && status === 'running' && task.command) {
        try {
          const response = await runtimeFetch('/api/opencodesilver/activity-tray/tasks/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: task.id,
              parentId: task.parentId,
              kind: task.kind,
              label: task.label,
              command: task.command,
              cwd: task.cwd,
              conversationId: task.conversationId,
            }),
          });
          if (response.ok) {
            const data = (await response.json()) as { task?: Partial<ActivityTask> };
            if (data?.task) {
              const updated: ActivityTask = {
                ...task,
                ...data.task,
                id: task.id,
              };
              this.tasks.set(task.id, updated);
              this.persistConversationTasksLocally(task.conversationId);
              this.scheduleNotify();
              return updated;
            }
          }
        } catch {
          /* server offline or in test environment */
        }
      } else {
        void runtimeFetch('/api/opencodesilver/activity-tray/tasks/upsert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task),
        }).catch(() => {});
      }
    }

    return task;
  }

  /**
   * Updates an existing task's status, exitCode, or logs.
   */
  public updateTask(
    id: string,
    patch: Partial<Omit<ActivityTask, 'id'>> & { appendLogs?: string[] },
  ): ActivityTask | null {
    const existing = this.tasks.get(id);
    if (!existing) return null;

    const { appendLogs, ...rest } = patch;
    const next: ActivityTask = {
      ...existing,
      ...rest,
      id,
    };

    if (
      (next.status === 'done' ||
        next.status === 'failed' ||
        next.status === 'killed' ||
        next.status === 'denied') &&
      !next.endedAt
    ) {
      next.endedAt = Date.now();
    }

    this.tasks.set(id, next);

    if (appendLogs && appendLogs.length > 0) {
      const currentLogs = this.logs.get(id) ?? [];
      const combined = [...currentLogs, ...appendLogs];
      this.logs.set(id, combined.slice(-1000));
    }

    this.persistConversationTasksLocally(next.conversationId);
    this.scheduleNotify();

    if (this.enableServerSync && typeof window !== 'undefined') {
      void runtimeFetch('/api/opencodesilver/activity-tray/tasks/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...next,
          logChunk: appendLogs && appendLogs.length > 0 ? `${appendLogs.join('\n')}\n` : undefined,
        }),
      }).catch(() => {});
    }

    return next;
  }

  /**
   * Approves a task awaiting approval ('once' or 'always').
   * When scope === 'always', generates a command(prefix) rule and invokes onRuleAdded.
   */
  public async approve(id: string, scope: 'once' | 'always'): Promise<ActivityTask | null> {
    const task = this.tasks.get(id);
    if (!task) return null;

    if (scope === 'always') {
      const rule = buildAlwaysAllowRuleForCommand(task.command || task.label);
      this.onRuleAdded?.(rule);
    }

    if (this.onPermissionReply) {
      await this.onPermissionReply(task, scope);
    }

    const updated = this.updateTask(id, {
      status: 'running',
      startedAt: Date.now(),
    });
    this.scheduleNotify(true);
    return updated;
  }

  /**
   * Denies a task awaiting approval.
   */
  public async deny(id: string): Promise<ActivityTask | null> {
    const task = this.tasks.get(id);
    if (!task) return null;

    if (this.onPermissionReply) {
      await this.onPermissionReply(task, 'reject');
    }

    const updated = this.updateTask(id, {
      status: 'denied',
      endedAt: Date.now(),
      exitCode: 126,
      appendLogs: ['[Action denied by user]'],
    });
    this.scheduleNotify(true);
    return updated;
  }

  /**
   * Terminates a running task (and any child sub-tasks in its process group).
   */
  public async kill(id: string): Promise<ActivityTask | null> {
    const task = this.tasks.get(id);
    if (!task) return null;

    if (this.enableServerSync && typeof window !== 'undefined') {
      try {
        await runtimeFetch(`/api/opencodesilver/activity-tray/tasks/${encodeURIComponent(id)}/kill`, {
          method: 'POST',
        });
      } catch {
        /* ignore network error */
      }
    }

    // Also terminate any child tasks sharing parentId === id
    for (const candidate of this.tasks.values()) {
      if (candidate.parentId === id && candidate.status === 'running') {
        this.updateTask(candidate.id, {
          status: 'killed',
          endedAt: Date.now(),
          exitCode: 137,
          appendLogs: ['[Parent task terminated]'],
        });
      }
    }

    const updated = this.updateTask(id, {
      status: 'killed',
      endedAt: Date.now(),
      exitCode: 137,
      appendLogs: ['[Task stopped by user]'],
    });
    this.scheduleNotify(true);
    return updated;
  }

  /**
   * Returns the last `tailLines` of logs for a task.
   */
  public async getLogs(id: string, tailLines = 100): Promise<string[]> {
    const limit = Math.max(1, tailLines);
    const local = this.logs.get(id) ?? [];

    if (this.enableServerSync && typeof window !== 'undefined') {
      try {
        const res = await runtimeFetch(
          `/api/opencodesilver/activity-tray/tasks/${encodeURIComponent(id)}/logs?tailLines=${limit}`,
        );
        if (res.ok) {
          const data = (await res.json()) as { lines?: string[] };
          if (Array.isArray(data?.lines) && data.lines.length > 0) {
            this.logs.set(id, data.lines);
            return data.lines.slice(-limit);
          }
        }
      } catch {
        /* fallback to local logs */
      }
    }

    return local.slice(-limit);
  }

  public appendLogs(id: string, lines: string[]): void {
    if (!lines.length) return;
    const current = this.logs.get(id) ?? [];
    this.logs.set(id, [...current, ...lines].slice(-1000));
    this.scheduleNotify();
  }

  public getLogsSync(id: string, tailLines = 100): string[] {
    const local = this.logs.get(id) ?? [];
    return local.slice(-Math.max(1, tailLines));
  }

  /**
   * Lists tasks matching the optional filter, sorted newest first with
   * awaiting_approval and running tasks prioritized at the top.
   */
  public list(filter?: ActivityTaskFilter): ActivityTask[] {
    const results: ActivityTask[] = [];
    for (const task of this.tasks.values()) {
      if (filter?.conversationId && task.conversationId !== filter.conversationId) {
        continue;
      }
      if (filter?.parentId && task.parentId !== filter.parentId) {
        continue;
      }
      if (filter?.statuses && !filter.statuses.includes(task.status)) {
        continue;
      }
      if (filter?.kinds && !filter.kinds.includes(task.kind)) {
        continue;
      }
      results.push(task);
    }

    const statusPriority = (status: ActivityTaskStatus): number => {
      switch (status) {
        case 'awaiting_approval':
          return 0;
        case 'running':
        case 'queued':
          return 1;
        default:
          return 2;
      }
    };

    results.sort((a, b) => {
      const pa = statusPriority(a.status);
      const pb = statusPriority(b.status);
      if (pa !== pb) return pa - pb;
      return b.startedAt - a.startedAt;
    });

    return results;
  }

  /**
   * Subscribes to task list changes.
   */
  public subscribe(listener: TaskManagerListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Startup and periodic reconciliation:
   * Verifies every task marked 'running' against OS PID liveness or server state.
   * Prevents the stuck "N tasks running" bug when a process has already exited.
   */
  public async reconcile(conversationId?: string): Promise<boolean> {
    let changed = false;
    const now = Date.now();

    if (this.checkProcessAliveFn) {
      for (const task of this.tasks.values()) {
        if (conversationId && task.conversationId !== conversationId) continue;
        if (task.status !== 'running') continue;
        if (typeof task.pid === 'number' && task.pid > 0) {
          const alive = await this.checkProcessAliveFn(task.pid);
          if (!alive) {
            task.status = task.exitCode === 0 ? 'done' : 'failed';
            task.endedAt = task.endedAt ?? now;
            if (task.exitCode === undefined) task.exitCode = 1;
            changed = true;
            this.persistConversationTasksLocally(task.conversationId);
          }
        }
      }
    }

    if (this.enableServerSync && typeof window !== 'undefined') {
      try {
        const query = conversationId
          ? `?conversationId=${encodeURIComponent(conversationId)}`
          : '';
        const res = await runtimeFetch(`/api/opencodesilver/activity-tray/tasks${query}`);
        if (res.ok) {
          const data = (await res.json()) as { tasks?: ActivityTask[] };
          if (Array.isArray(data?.tasks)) {
            for (const serverTask of data.tasks) {
              if (!serverTask || typeof serverTask.id !== 'string') continue;
              const local = this.tasks.get(serverTask.id);
              if (
                !local ||
                local.status !== serverTask.status ||
                local.exitCode !== serverTask.exitCode ||
                local.pid !== serverTask.pid
              ) {
                this.tasks.set(serverTask.id, { ...(local ?? {}), ...serverTask });
                changed = true;
              }
            }
          }
        }
      } catch {
        /* ignore offline */
      }
    }

    if (changed) {
      this.scheduleNotify(true);
    }
    return changed;
  }

  /**
   * Clears finished tasks (done, failed, killed, denied) optionally older than maxAgeMs.
   */
  public clearFinishedTasks(options?: {
    conversationId?: string;
    olderThanMs?: number;
  }): number {
    const now = Date.now();
    const olderThanMs = options?.olderThanMs ?? 0;
    let removed = 0;
    const affectedConversations = new Set<string>();

    for (const [id, task] of this.tasks.entries()) {
      if (options?.conversationId && task.conversationId !== options.conversationId) {
        continue;
      }
      const isFinished =
        task.status === 'done' ||
        task.status === 'failed' ||
        task.status === 'killed' ||
        task.status === 'denied';
      if (!isFinished) continue;

      const endedAt = task.endedAt ?? task.startedAt;
      if (olderThanMs <= 0 || now - endedAt >= olderThanMs) {
        this.tasks.delete(id);
        this.logs.delete(id);
        affectedConversations.add(task.conversationId);
        removed += 1;
      }
    }

    for (const convId of affectedConversations) {
      this.persistConversationTasksLocally(convId);
    }

    if (removed > 0) {
      this.scheduleNotify(true);
      if (this.enableServerSync && typeof window !== 'undefined') {
        void runtimeFetch('/api/opencodesilver/activity-tray/tasks/clear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: options?.conversationId,
            clearAllFinished: olderThanMs <= 0,
          }),
        }).catch(() => {});
      }
    }

    return removed;
  }

  public resetAll(): void {
    this.tasks.clear();
    this.logs.clear();
    this.scheduleNotify(true);
  }
}

export const globalTaskManager = new TaskManager();
