import React from 'react';
import {
  useAllLiveSessions,
  useAllSessionStatuses,
  useDirectorySync,
  useSessionMessageRecords,
} from '@/sync/sync-context';
import { useGlobalSessionStatusStore } from '@/sync/global-session-status';
import * as sessionActions from '@/sync/session-actions';
import type { State } from '@/sync/types';
import type { PermissionRequest } from '@/types/permission';
import {
  globalTaskManager,
  type ActivityTaskKind,
  type ActivityTaskStatus,
} from '@/lib/activity-tray/taskManager';
import {
  deriveSubagentPermissionPolicy,
  evaluatePermissionPolicy,
} from '@/lib/activity-tray/permissionEngine';
import {
  selectPermissionPolicyConfig,
  useActivityTrayStore,
} from '@/stores/useActivityTrayStore';
import {
  normalizeToolName,
  toolFileDiffs,
  toolInputPath,
} from '@/lib/opencode/tools';
import {
  findShellCompletion,
  readBackgroundShellIDFromMetadata,
  shellCompletionFailed,
} from '@/lib/opencode/background-shell';
import { useBackgroundShellsStore } from '@/sync/background-shells';

function classifyCommandKind(command: string): ActivityTaskKind {
  const lower = command.trim().toLowerCase();
  if (/\b(type-check|typecheck|tsc)\b/.test(lower)) {
    return 'typecheck';
  }
  if (/\b(prettier|eslint|oxlint|biome|format)\b/.test(lower)) {
    return 'format';
  }
  if (/\b(vite\s+build|bun\s+run\s+build|npm\s+run\s+build|pnpm\s+build|cargo\s+build)\b/.test(lower)) {
    return 'build';
  }
  return 'command';
}

function extractPermissionCommandAndTarget(
  perm: PermissionRequest,
  fallbackWorkspaceRoot: string,
): {
  kind: ActivityTaskKind;
  label: string;
  command?: string;
  targetPaths: string[];
  cwd: string;
  bypassSandbox: boolean;
} {
  const action = (perm.action || 'command').toLowerCase();
  const meta = (perm.metadata ?? {}) as Record<string, unknown>;
  const cwd =
    typeof meta.cwd === 'string' && meta.cwd.trim()
      ? meta.cwd.trim()
      : typeof meta.directory === 'string' && meta.directory.trim()
        ? meta.directory.trim()
        : fallbackWorkspaceRoot;

  const bypassSandbox = meta.bypassSandbox === true || meta.sandbox === false;

  if (action === 'shell' || action === 'bash' || action === 'shell_command') {
    const cmd =
      (typeof meta.command === 'string' && meta.command) ||
      (typeof meta.cmd === 'string' && meta.cmd) ||
      (typeof meta.script === 'string' && meta.script) ||
      (perm.resources ?? []).join(' && ') ||
      action;
    return {
      kind: classifyCommandKind(cmd),
      label: cmd,
      command: cmd,
      targetPaths: [],
      cwd,
      bypassSandbox,
    };
  }

  if (action === 'edit' || action === 'write' || action === 'patch') {
    const firstResource = (perm.resources ?? [])[0] ?? '';
    const filePath =
      (typeof meta.filePath === 'string' && meta.filePath) ||
      (typeof meta.path === 'string' && meta.path) ||
      firstResource ||
      'file';
    return {
      kind: 'edit',
      label: `${action}: ${filePath}`,
      targetPaths: filePath ? [filePath] : [],
      cwd,
      bypassSandbox,
    };
  }

  const fallbackCmd = (perm.resources ?? []).join(' ') || action;
  return {
    kind: 'command',
    label: `${action}: ${fallbackCmd}`,
    command: fallbackCmd,
    targetPaths: [],
    cwd,
    bypassSandbox,
  };
}

/**
 * Synchronizes OpenCode session tool parts, subagent sessions, and permission
 * requests into the single `globalTaskManager` source of truth.
 */
export function useActivityTraySync(sessionId: string | null, directory: string | null): void {
  const enabled = useActivityTrayStore((state) => state.settings.enabled);
  const settings = useActivityTrayStore((state) => state.settings);

  const sessionMessages = useSessionMessageRecords(sessionId ?? '', directory ?? undefined);
  const liveSessions = useAllLiveSessions();
  const statuses = useAllSessionStatuses();
  const permissionsBySession = useDirectorySync(React.useCallback((state: State) => state.permission, []));
  const statusReady = useDirectorySync(
    React.useCallback((state: State) => state.sessionStatusReady, []),
    directory ?? undefined,
  );

  const childSessions = React.useMemo(
    () => (sessionId ? liveSessions.filter((candidate) => candidate.parentID === sessionId) : []),
    [liveSessions, sessionId],
  );

  const failedChildIds = useGlobalSessionStatusStore(
    React.useCallback(
      (state) =>
        childSessions
          .filter((child) => state.observedById.get(child.id)?.outcome === 'failed')
          .map((child) => child.id)
          .join('\n'),
      [childSessions],
    ),
  );

  const runningShellsById = useBackgroundShellsStore((state) => state.byId);
  const autoRespondedPermIdsRef = React.useRef<Set<string>>(new Set());

  // Reconcile tasks on session switch and periodically while tasks are active.
  React.useEffect(() => {
    if (!enabled) return;
    if (sessionId) {
      globalTaskManager.restoreConversationTasksLocally(sessionId);
    }
    void globalTaskManager.reconcile(sessionId ?? undefined);
    const interval = window.setInterval(() => {
      const activeCount = globalTaskManager
        .list({ conversationId: sessionId ?? undefined })
        .filter((t) => t.status === 'running' || t.status === 'queued').length;
      if (activeCount > 0) {
        void globalTaskManager.reconcile(sessionId ?? undefined);
      }
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [enabled, sessionId]);

  // 1. Sync tool call parts and OpenCode 2.x background shells from the active session transcript into TaskManager
  React.useEffect(() => {
    if (!enabled || !sessionId) return;

    const messageInfos = sessionMessages.map((m) => m.info);
    const recentMessages = sessionMessages.slice(-50);
    const seenShellIds = new Set<string>();

    for (const entry of recentMessages) {
      for (const part of entry.parts ?? []) {
        const partRecord = part as Record<string, unknown>;
        if (partRecord.type !== 'tool') continue;

        const partId = typeof partRecord.id === 'string' ? partRecord.id : '';
        if (!partId) continue;

        const rawToolName = typeof partRecord.tool === 'string' ? partRecord.tool : '';
        const normalizedTool = normalizeToolName(rawToolName);
        const stateObj = (partRecord.state ?? {}) as Record<string, unknown>;
        const rawStatus = typeof stateObj.status === 'string' ? stateObj.status : '';
        if (!rawStatus) continue;

        const inputObj = (stateObj.input ?? {}) as Record<string, unknown>;
        const metaObj = (stateObj.metadata ?? {}) as Record<string, unknown>;
        const timeObj = (stateObj.time ?? {}) as Record<string, unknown>;

        const isShell =
          normalizedTool === 'shell' ||
          normalizedTool === 'bash' ||
          normalizedTool === 'shell_command' ||
          normalizedTool.includes('terminal');
        const isEdit =
          normalizedTool === 'edit' ||
          normalizedTool === 'write' ||
          normalizedTool === 'patch' ||
          normalizedTool === 'multiedit';
        const isSubagentTool = normalizedTool === 'subagent' || normalizedTool === 'task';

        // Only track real execution/modification/subagent tasks — never ingest read/glob/grep/skill/question
        if (!isShell && !isEdit && !isSubagentTool) {
          continue;
        }

        const commandStr =
          (typeof inputObj.command === 'string' && inputObj.command.trim()) ||
          (typeof inputObj.cmd === 'string' && inputObj.cmd.trim()) ||
          (typeof metaObj.command === 'string' && metaObj.command.trim()) ||
          undefined;

        // Skip shell tool calls that don't have a command yet while pending
        if (isShell && !commandStr && (rawStatus === 'pending' || rawStatus === 'running')) {
          continue;
        }

        const filePathStr = toolInputPath(inputObj as any);
        const fileDiffs = isEdit ? toolFileDiffs(metaObj as any) : [];

        let kind: ActivityTaskKind = 'command';
        if (isShell && commandStr) {
          kind = classifyCommandKind(commandStr);
        } else if (isEdit) {
          kind = 'edit';
        } else if (isSubagentTool) {
          kind = 'subagent';
        }

        if (!settings.taskTypesToShow[kind]) {
          continue;
        }

        // Check if this is an OpenCode 2.x background shell
        const bgShellId = isShell
          ? readBackgroundShellIDFromMetadata(metaObj as any)
          : undefined;
        if (bgShellId) {
          seenShellIds.add(bgShellId);
        }

        const bgShellRunning = bgShellId ? runningShellsById.get(bgShellId) : undefined;
        const bgShellCompletion = bgShellId
          ? findShellCompletion(messageInfos, bgShellId)
          : undefined;

        let mappedStatus: ActivityTaskStatus = 'running';
        let exitCode: number | undefined =
          typeof metaObj.exit === 'number'
            ? metaObj.exit
            : typeof metaObj.exitCode === 'number'
              ? metaObj.exitCode
              : undefined;

        if (bgShellId) {
          if (bgShellCompletion) {
            const isFailed = shellCompletionFailed(bgShellCompletion);
            mappedStatus =
              bgShellCompletion.state === 'cancelled'
                ? 'killed'
                : isFailed
                  ? 'failed'
                  : 'done';
            exitCode = bgShellCompletion.exit ?? (mappedStatus === 'done' ? 0 : 1);
          } else if (bgShellRunning) {
            mappedStatus = 'running';
          } else {
            mappedStatus = 'done';
            exitCode = exitCode ?? 0;
          }
        } else if (rawStatus === 'pending') {
          mappedStatus = 'queued';
        } else if (rawStatus === 'running') {
          mappedStatus = 'running';
        } else if (rawStatus === 'completed') {
          if (typeof exitCode === 'number' && exitCode !== 0) {
            mappedStatus = 'failed';
          } else {
            mappedStatus = 'done';
            exitCode = 0;
          }
        } else if (rawStatus === 'error') {
          mappedStatus = 'failed';
          exitCode = exitCode ?? 1;
        }

        const startedAt =
          typeof timeObj.start === 'number' && Number.isFinite(timeObj.start)
            ? timeObj.start
            : entry.info.time?.created ?? Date.now();
        const endedAt =
          bgShellCompletion?.endedAt ??
          (typeof timeObj.end === 'number' && Number.isFinite(timeObj.end)
            ? timeObj.end
            : mappedStatus === 'done' || mappedStatus === 'failed' || mappedStatus === 'killed'
              ? Date.now()
              : undefined);

        let label = '';
        if (isShell) {
          label =
            commandStr ||
            (typeof inputObj.description === 'string' && inputObj.description.trim()) ||
            'Shell command';
        } else if (isEdit) {
          if (fileDiffs.length > 0) {
            const firstDiff = fileDiffs[0];
            const adds = fileDiffs.reduce((acc, d) => acc + (d.additions ?? 0), 0);
            const dels = fileDiffs.reduce((acc, d) => acc + (d.deletions ?? 0), 0);
            const more = fileDiffs.length > 1 ? ` (+${fileDiffs.length - 1} files)` : '';
            label = `${normalizedTool}: ${firstDiff.file}${more} (+${adds} -${dels})`;
          } else if (filePathStr) {
            label = `${normalizedTool}: ${filePathStr}`;
          } else {
            label = `${normalizedTool} file changes`;
          }
        } else if (isSubagentTool) {
          const desc =
            (typeof inputObj.description === 'string' && inputObj.description.trim()) ||
            (typeof inputObj.prompt === 'string' && inputObj.prompt.trim().slice(0, 80)) ||
            (typeof stateObj.title === 'string' && stateObj.title.trim()) ||
            'Subagent task';
          label = `subagent: ${desc}`;
        }

        const rawOutput =
          bgShellCompletion?.output ??
          (typeof stateObj.output === 'string' && stateObj.output.trim()
            ? stateObj.output
            : typeof metaObj.output === 'string' && metaObj.output.trim()
              ? metaObj.output
              : typeof stateObj.error === 'string' && stateObj.error.trim()
                ? stateObj.error
                : '');

        let logLines: string[] = [];
        if (rawOutput) {
          logLines = rawOutput.split(/\r?\n/).slice(-Math.max(100, settings.logTailLines));
        } else if (isEdit) {
          if (fileDiffs.length > 0) {
            for (const diff of fileDiffs) {
              logLines.push(
                `${(diff.status || 'modified').toUpperCase()}: ${diff.file} (+${diff.additions ?? 0} -${diff.deletions ?? 0})`,
              );
              if (diff.patch) {
                logLines.push(...diff.patch.split(/\r?\n/).slice(0, 80));
              }
            }
          } else if (filePathStr) {
            logLines.push(
              `${normalizedTool.toUpperCase()}: ${filePathStr} (${mappedStatus === 'done' ? 'completed successfully' : mappedStatus})`,
            );
          }
        } else if (isShell && commandStr) {
          if (mappedStatus === 'running' || mappedStatus === 'queued') {
            logLines = [`$ ${commandStr}`, 'Running...'];
          } else if (mappedStatus === 'done') {
            logLines = [`$ ${commandStr}`, 'Command completed successfully (exit code 0).'];
          }
        } else if (isSubagentTool) {
          logLines = [label, `Status: ${mappedStatus}`];
        }

        const taskId = `tool:${partId}`;
        const existing = globalTaskManager
          .list({ conversationId: sessionId })
          .find((t) => t.id === taskId);
        if (!existing) {
          void globalTaskManager.start({
            id: taskId,
            conversationId: sessionId,
            kind,
            label,
            command: commandStr || label,
            cwd: directory ?? undefined,
            status: mappedStatus,
            startedAt,
            endedAt,
            exitCode,
            initialLogs: logLines,
          });
        } else {
          globalTaskManager.updateTask(taskId, {
            label,
            command: commandStr || label,
            status: mappedStatus,
            endedAt,
            exitCode,
            appendLogs: logLines.length > 0 ? logLines : undefined,
          });
        }
      }
    }

    // Also sync any active background shells in useBackgroundShellsStore that weren't matched by a tool part
    for (const shell of runningShellsById.values()) {
      if (shell.sessionID !== sessionId || seenShellIds.has(shell.id)) continue;
      const taskId = `shell:${shell.id}`;
      const label = shell.command?.trim() || `Background shell ${shell.id.slice(0, 8)}`;
      const existing = globalTaskManager
        .list({ conversationId: sessionId })
        .find((t) => t.id === taskId);
      const logLines = [`$ ${label}`, shell.file ? `Streaming output: ${shell.file}` : 'Running in background...'];
      if (!existing) {
        void globalTaskManager.start({
          id: taskId,
          conversationId: sessionId,
          kind: classifyCommandKind(label),
          label,
          command: label,
          cwd: shell.directory || directory || undefined,
          status: 'running',
          startedAt: shell.startedAt || Date.now(),
          initialLogs: logLines,
        });
      } else {
        globalTaskManager.updateTask(taskId, {
          label,
          command: label,
          status: 'running',
        });
      }
    }
  }, [
    directory,
    enabled,
    runningShellsById,
    sessionId,
    sessionMessages,
    settings.logTailLines,
    settings.taskTypesToShow,
  ]);

  // 2. Sync child subagent sessions into TaskManager
  React.useEffect(() => {
    if (!enabled || !sessionId || !settings.taskTypesToShow.subagent) return;
    const failedSet = new Set(failedChildIds.split('\n').filter(Boolean));

    for (const child of childSessions) {
      const blocked = (permissionsBySession[child.id]?.length ?? 0) > 0;
      const statusType = statuses[child.id]?.type;
      const busy = statusType === 'busy' || statusType === 'retry';
      const failed = !busy && failedSet.has(child.id);
      const done =
        !failed &&
        (statusType === 'idle' || (!statusType && statusReady && child.directory === directory));

      let taskStatus: ActivityTaskStatus = 'running';
      if (blocked) taskStatus = 'awaiting_approval';
      else if (failed) taskStatus = 'failed';
      else if (done && !busy) taskStatus = 'done';

      const exitCode = taskStatus === 'done' ? 0 : taskStatus === 'failed' ? 1 : undefined;
      const startedAt = child.time?.created ?? Date.now();
      const endedAt =
        taskStatus === 'done' || taskStatus === 'failed'
          ? child.time?.updated ?? Date.now()
          : undefined;

      const taskId = `subagent:${child.id}`;
      const existing = globalTaskManager.list({ conversationId: sessionId }).find((t) => t.id === taskId);
      const label = child.title?.trim() || `Subagent ${child.id.slice(0, 8)}`;
      const logLines = [
        `Subagent Session: ${label} (${child.id})`,
        `Directory: ${child.directory ?? directory ?? ''}`,
        `Status: ${taskStatus}`,
      ];
      if (!existing) {
        void globalTaskManager.start({
          id: taskId,
          parentId: sessionId,
          conversationId: sessionId,
          kind: 'subagent',
          label,
          command: label,
          cwd: child.directory ?? directory ?? undefined,
          status: taskStatus,
          startedAt,
          endedAt,
          exitCode,
          initialLogs: logLines,
        });
      } else {
        globalTaskManager.updateTask(taskId, {
          label,
          command: label,
          status: taskStatus,
          endedAt,
          exitCode,
        });
      }
    }
  }, [
    childSessions,
    directory,
    enabled,
    failedChildIds,
    permissionsBySession,
    sessionId,
    settings.taskTypesToShow.subagent,
    statusReady,
    statuses,
  ]);

  // 3. Sync pending permission requests (main session + child subagent sessions)
  React.useEffect(() => {
    if (!enabled || !sessionId) return;

    const relevantSessionIds = [sessionId, ...childSessions.map((c) => c.id)];
    const activePermTaskIds = new Set<string>();
    const parentPolicy = selectPermissionPolicyConfig(settings, directory);
    const subagentPolicy = deriveSubagentPermissionPolicy(parentPolicy);

    for (const targetSessionId of relevantSessionIds) {
      const isSubagent = targetSessionId !== sessionId;
      const list = permissionsBySession[targetSessionId] ?? [];
      for (const perm of list) {
        const taskId = `perm:${perm.id}`;
        activePermTaskIds.add(taskId);

        const extracted = extractPermissionCommandAndTarget(perm, directory ?? '');
        const evalResult = evaluatePermissionPolicy(
          {
            command: extracted.command,
            targetPaths: extracted.targetPaths,
            cwd: extracted.cwd,
            bypassSandbox: extracted.bypassSandbox,
          },
          isSubagent ? subagentPolicy : parentPolicy,
        );

        if (
          (evalResult.outcome === 'allow' || evalResult.outcome === 'deny') &&
          !autoRespondedPermIdsRef.current.has(perm.id)
        ) {
          autoRespondedPermIdsRef.current.add(perm.id);
          const reply = evalResult.outcome === 'allow' ? 'once' : 'reject';
          void sessionActions.respondToPermission(perm.sessionID, perm.id, reply);
          if (evalResult.outcome === 'deny') {
            void globalTaskManager.start({
              id: taskId,
              parentId: isSubagent ? targetSessionId : undefined,
              conversationId: sessionId,
              kind: extracted.kind,
              label: extracted.label,
              command: extracted.command,
              cwd: extracted.cwd,
              status: 'denied',
              startedAt: Date.now(),
              endedAt: Date.now(),
              permissionId: `${perm.sessionID}:${perm.id}`,
              bypassSandbox: extracted.bypassSandbox,
            });
            globalTaskManager.updateTask(taskId, {
              approvalReason: evalResult.reason,
              matchedRule: evalResult.matchedRule,
            });
          }
          continue;
        }

        void globalTaskManager.start({
          id: taskId,
          parentId: isSubagent ? targetSessionId : undefined,
          conversationId: sessionId,
          kind: extracted.kind,
          label: extracted.label,
          command: extracted.command,
          cwd: extracted.cwd,
          status: 'awaiting_approval',
          startedAt: Date.now(),
          permissionId: `${perm.sessionID}:${perm.id}`,
          bypassSandbox: extracted.bypassSandbox,
        });
        globalTaskManager.updateTask(taskId, {
          approvalReason: evalResult.reason,
          matchedRule: evalResult.matchedRule,
        });
      }
    }

    const existingPermTasks = globalTaskManager
      .list({ conversationId: sessionId })
      .filter((t) => t.id.startsWith('perm:') && t.status === 'awaiting_approval');
    for (const staleTask of existingPermTasks) {
      if (!activePermTaskIds.has(staleTask.id)) {
        globalTaskManager.updateTask(staleTask.id, {
          status: 'done',
          endedAt: Date.now(),
        });
      }
    }
  }, [childSessions, directory, enabled, permissionsBySession, sessionId, settings]);
}
