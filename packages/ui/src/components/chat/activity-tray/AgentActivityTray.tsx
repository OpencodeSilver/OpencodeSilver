import React from 'react';
import { Icon } from '@/components/icon/Icon';
import { cn, formatPathForDisplay } from '@/lib/utils';
import { useI18n, type I18nKey } from '@/lib/i18n';
import { useDirectoryStore } from '@/stores/useDirectoryStore';
import { useActivityTrayStore } from '@/stores/useActivityTrayStore';
import {
  globalTaskManager,
  type ActivityTask,
  type ActivityTaskStatus,
} from '@/lib/activity-tray/taskManager';
import {
  buildAlwaysAllowRuleForCommand,
  type ApprovalReason,
} from '@/lib/activity-tray/permissionEngine';
import * as sessionActions from '@/sync/session-actions';
import { useActivityTraySync } from './useActivityTraySync';

export interface AgentActivityTrayProps {
  sessionId: string | null;
  directory: string | null;
  radius?: number | string;
}

function isTerminalTaskStatus(status: ActivityTaskStatus): boolean {
  return (
    status === 'done' ||
    status === 'failed' ||
    status === 'killed' ||
    status === 'denied'
  );
}

function getReasonTranslationKey(reason?: ApprovalReason): I18nKey {
  switch (reason) {
    case 'rule_matched':
      return 'tray.reason.rule_matched';
    case 'outside_workspace':
      return 'tray.reason.outside_workspace';
    case 'outside_sandbox':
      return 'tray.reason.outside_sandbox';
    case 'nested_substitution':
      return 'tray.reason.nested_substitution';
    default:
      return 'tray.reason.default_policy';
  }
}

const InlineApprovalCard: React.FC<{
  task: ActivityTask;
  onApprove: (task: ActivityTask, scope: 'once' | 'always') => void;
  onDeny: (task: ActivityTask) => void;
}> = ({ task, onApprove, onDeny }) => {
  const { t } = useI18n();
  const homeDirectory = useDirectoryStore((state) => state.homeDirectory);
  const reasonKey = getReasonTranslationKey(task.approvalReason);
  const reasonText = t(reasonKey, { rule: task.matchedRule ?? '*' });
  const alwaysRulePreview = React.useMemo(
    () => (task.command ? buildAlwaysAllowRuleForCommand(task.command) : null),
    [task.command],
  );

  return (
    <div
      role="group"
      aria-label={t('tray.approval.title')}
      className="mx-2 my-1.5 rounded-lg border border-[rgb(var(--status-warning)/0.45)] bg-[rgb(var(--status-warning)/0.07)] p-2.5 text-xs"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 text-[rgb(var(--status-warning))] font-medium">
          <Icon name="shield" className="h-3.5 w-3.5 shrink-0" />
          <span>{t('tray.approval.title')}</span>
        </div>
        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-background/70 text-muted-foreground border border-border/50">
          {!task.bypassSandbox ? t('tray.approval.sandboxOn') : t('tray.approval.sandboxOff')}
        </span>
      </div>

      <div
        dir="ltr"
        className="mb-1.5 rounded border border-border/60 bg-background/85 px-2 py-1.5 font-mono text-[11px] text-foreground break-all"
      >
        {task.command || task.label}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground mb-2">
        <span>{reasonText}</span>
        {task.cwd && (
          <span className="font-mono text-[10px] truncate max-w-[260px]" dir="ltr" title={task.cwd}>
            {t('tray.approval.cwd')}: {formatPathForDisplay(task.cwd, homeDirectory)}
          </span>
        )}
      </div>

      {alwaysRulePreview && (
        <div className="mb-2 text-[10px] text-muted-foreground font-mono" dir="ltr">
          {t('tray.approval.rulePreview', { rule: alwaysRulePreview })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => onDeny(task)}
          title={t('tray.approval.shortcutDeny')}
          className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-[rgb(var(--status-error)/0.14)] hover:text-[rgb(var(--status-error))] hover:border-[rgb(var(--status-error)/0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        >
          <span>{t('tray.approval.deny')}</span>
          <kbd className="text-[9px] opacity-65 font-mono">Alt+D</kbd>
        </button>
        <button
          type="button"
          onClick={() => onApprove(task, 'always')}
          title={t('tray.approval.shortcutAlwaysAllow')}
          className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        >
          <span>{t('tray.approval.alwaysAllow')}</span>
          <kbd className="text-[9px] opacity-65 font-mono">Alt+A</kbd>
        </button>
        <button
          type="button"
          onClick={() => onApprove(task, 'once')}
          title={t('tray.approval.shortcutAllowOnce')}
          className="inline-flex items-center gap-1 rounded-md bg-[rgb(var(--primary))] px-2.5 py-1 text-[11px] font-medium text-[rgb(var(--primary-foreground))] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-opacity"
        >
          <span>{t('tray.approval.allowOnce')}</span>
          <kbd className="text-[9px] opacity-80 font-mono">Alt+Y</kbd>
        </button>
      </div>
    </div>
  );
};

export const AgentActivityTray: React.FC<AgentActivityTrayProps> = ({
  sessionId,
  directory,
  radius = 12,
}) => {
  const { t } = useI18n();

  // Sync live OpenCode events into globalTaskManager
  useActivityTraySync(sessionId, directory);

  const settings = useActivityTrayStore((state) => state.settings);
  const allTasks = useActivityTrayStore((state) => state.tasks);
  const setExpanded = useActivityTrayStore((state) => state.setExpanded);

  const [now, setNow] = React.useState(() => Date.now());
  const [focusedApprovalIndex, setFocusedApprovalIndex] = React.useState(0);

  const lingerMs =
    settings.autoHideFinishedAfterSeconds < 0
      ? Number.POSITIVE_INFINITY
      : settings.autoHideFinishedAfterSeconds * 1000;

  // Filter tasks belonging to the current conversation
  const sessionTasks = React.useMemo(() => {
    return allTasks.filter((task) => {
      if (sessionId && task.conversationId && task.conversationId !== sessionId) {
        return false;
      }
      if (!settings.taskTypesToShow[task.kind]) {
        return false;
      }
      if (isTerminalTaskStatus(task.status)) {
        const finishedAt = task.endedAt ?? task.startedAt;
        if (now - finishedAt > lingerMs) {
          return false;
        }
      }
      return true;
    });
  }, [allTasks, lingerMs, now, sessionId, settings.taskTypesToShow]);

  const approvalTasks = React.useMemo(
    () => sessionTasks.filter((task) => task.status === 'awaiting_approval'),
    [sessionTasks],
  );

  React.useEffect(() => {
    if (sessionTasks.length === 0 && allTasks.length === 0) return;
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [allTasks.length, sessionTasks.length]);

  const prevApprovalCountRef = React.useRef(approvalTasks.length);
  React.useEffect(() => {
    if (approvalTasks.length > prevApprovalCountRef.current) {
      setExpanded(true);
    }
    prevApprovalCountRef.current = approvalTasks.length;
  }, [approvalTasks.length, setExpanded]);

  const handleApproveTask = React.useCallback(
    async (task: ActivityTask, scope: 'once' | 'always') => {
      if (task.permissionId) {
        const [permSessionId, permId] = task.permissionId.split(':');
        if (permSessionId && permId) {
          try {
            await sessionActions.respondToPermission(
              permSessionId,
              permId,
              scope === 'always' ? 'always' : 'once',
            );
          } catch {
            // Fall through to TaskManager update
          }
        }
      }
      await globalTaskManager.approve(task.id, scope);
    },
    [],
  );

  const handleDenyTask = React.useCallback(async (task: ActivityTask) => {
    if (task.permissionId) {
      const [permSessionId, permId] = task.permissionId.split(':');
      if (permSessionId && permId) {
        try {
          await sessionActions.respondToPermission(permSessionId, permId, 'reject');
        } catch {
          // Fall through to TaskManager update
        }
      }
    }
    await globalTaskManager.deny(task.id);
  }, []);

  // Keyboard shortcuts for inline approvals (Alt+Y allow once, Alt+A always allow, Alt+D deny, Alt+J/Alt+N next approval)
  React.useEffect(() => {
    if (!settings.enabled || approvalTasks.length === 0) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      const key = event.key.toLowerCase();
      const targetTask =
        approvalTasks[focusedApprovalIndex % approvalTasks.length] ?? approvalTasks[0];
      if (!targetTask) return;

      if (key === 'y' || (event.key === 'Enter' && !event.shiftKey)) {
        event.preventDefault();
        void handleApproveTask(targetTask, 'once');
      } else if (key === 'a' || (event.key === 'Enter' && event.shiftKey)) {
        event.preventDefault();
        void handleApproveTask(targetTask, 'always');
      } else if (key === 'd' || event.key === 'Backspace') {
        event.preventDefault();
        void handleDenyTask(targetTask);
      } else if (key === 'j' || key === 'n') {
        event.preventDefault();
        setExpanded(true);
        setFocusedApprovalIndex((prev) => (prev + 1) % approvalTasks.length);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    approvalTasks,
    focusedApprovalIndex,
    handleApproveTask,
    handleDenyTask,
    setExpanded,
    settings.enabled,
  ]);

  // Background tasks are now displayed in the right-hand ContextPanel (Files & Diffs -> Background Tasks).
  // Above the chat input, only render inline approval cards when a command awaits user permission.
  if (!settings.enabled || approvalTasks.length === 0) {
    return null;
  }

  return (
    <section
      role="region"
      aria-label={t('tray.regionLabel')}
      style={{
        borderTopLeftRadius: radius,
        borderTopRightRadius: radius,
      }}
      className={cn(
        'w-full border border-b-0 border-border/80 bg-muted/35 backdrop-blur-md text-foreground',
        'transition-all duration-200 ease-out motion-reduce:transition-none overflow-hidden',
      )}
    >
      <div className="divide-y divide-border/30">
        {approvalTasks.map((task) => (
          <InlineApprovalCard
            key={task.id}
            task={task}
            onApprove={(target, scope) => void handleApproveTask(target, scope)}
            onDeny={(target) => void handleDenyTask(target)}
          />
        ))}
      </div>
    </section>
  );
};
