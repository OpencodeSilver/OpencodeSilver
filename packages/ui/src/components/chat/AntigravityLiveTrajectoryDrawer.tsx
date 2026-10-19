import React from 'react';
import { Icon } from '@/components/icon/Icon';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useSessionMessageRecords, useSessionStatus } from '@/sync/sync-context';
import { useUIStore } from '@/stores/useUIStore';

export interface TrajectoryStepItem {
  id: string;
  toolName: string;
  toolAction: string;
  toolSummary: string;
  status: 'running' | 'completed' | 'error';
  filePath?: string;
}

export interface LiveTrajectorySummary {
  steps: TrajectoryStepItem[];
  touchedFiles: string[];
  activeSkills: string[];
  currentAction: string | null;
  currentSummary: string | null;
}

const TOOL_ACTION_VERB_MAP: Record<string, { actionKey: string; summaryKey: string; action: string; summary: string }> = {
  read: { actionKey: 'agy.tool.read.action', summaryKey: 'agy.tool.read.summary', action: 'Reading file', summary: 'File read' },
  view_file: { actionKey: 'agy.tool.view_file.action', summaryKey: 'agy.tool.view_file.summary', action: 'Viewing file', summary: 'File view' },
  edit: { actionKey: 'agy.tool.edit.action', summaryKey: 'agy.tool.edit.summary', action: 'Editing file', summary: 'File edit' },
  replace_file_content: { actionKey: 'agy.tool.replace_file_content.action', summaryKey: 'agy.tool.replace_file_content.summary', action: 'Updating code', summary: 'Code update' },
  write: { actionKey: 'agy.tool.write.action', summaryKey: 'agy.tool.write.summary', action: 'Writing file', summary: 'File write' },
  write_to_file: { actionKey: 'agy.tool.write_to_file.action', summaryKey: 'agy.tool.write_to_file.summary', action: 'Creating file', summary: 'File creation' },
  bash: { actionKey: 'agy.tool.bash.action', summaryKey: 'agy.tool.bash.summary', action: 'Running command', summary: 'Terminal execution' },
  shell: { actionKey: 'agy.tool.shell.action', summaryKey: 'agy.tool.shell.summary', action: 'Executing shell', summary: 'Shell command' },
  run_command: { actionKey: 'agy.tool.run_command.action', summaryKey: 'agy.tool.run_command.summary', action: 'Running command', summary: 'Command execution' },
  grep: { actionKey: 'agy.tool.grep.action', summaryKey: 'agy.tool.grep.summary', action: 'Searching code', summary: 'Code search' },
  glob: { actionKey: 'agy.tool.glob.action', summaryKey: 'agy.tool.glob.summary', action: 'Scanning files', summary: 'Directory scan' },
  webfetch: { actionKey: 'agy.tool.webfetch.action', summaryKey: 'agy.tool.webfetch.summary', action: 'Fetching web page', summary: 'Web fetch' },
  websearch: { actionKey: 'agy.tool.websearch.action', summaryKey: 'agy.tool.websearch.summary', action: 'Searching the web', summary: 'Web search' },
  task: { actionKey: 'agy.tool.task.action', summaryKey: 'agy.tool.task.summary', action: 'Delegating to subagent', summary: 'Subagent task' },
  skill: { actionKey: 'agy.tool.skill.action', summaryKey: 'agy.tool.skill.summary', action: 'Loading skill', summary: 'Skill activation' },
};

export function extractLiveTrajectory(
  records: Array<any>,
  t?: (key: any, params?: Record<string, any>) => string
): LiveTrajectorySummary {
  const steps: TrajectoryStepItem[] = [];
  const touchedFilesSet = new Set<string>();
  const activeSkillsSet = new Set<string>();

  if (!Array.isArray(records) || records.length === 0) {
    return {
      steps,
      touchedFiles: [],
      activeSkills: [],
      currentAction: null,
      currentSummary: null,
    };
  }

  const getRole = (rec: any): string | undefined => rec?.info?.role ?? rec?.role;
  const getId = (rec: any, fallbackIdx: number): string =>
    String(rec?.info?.id ?? rec?.id ?? `msg-${fallbackIdx}`);

  // Find the latest user message index so we scope trajectory to the current turn (or latest assistant turn)
  let startIndex = 0;
  for (let i = records.length - 1; i >= 0; i--) {
    if (getRole(records[i]) === 'user') {
      startIndex = i + 1;
      break;
    }
  }

  for (let i = startIndex; i < records.length; i++) {
    const rec = records[i];
    if (!rec || getRole(rec) !== 'assistant') continue;

    const partsList = Array.isArray(rec.parts) ? rec.parts : [];
    for (let pIdx = 0; pIdx < partsList.length; pIdx++) {
      const part = partsList[pIdx];
      if (!part || (part.type !== 'tool' && part.type !== 'tool-invocation')) continue;

      const rawTool = String(part.tool || part.toolName || 'tool').toLowerCase();
      const stateObj = part.state || {};
      const rawStatus = String(stateObj.status || part.status || 'completed').toLowerCase();
      const status: 'running' | 'completed' | 'error' =
        rawStatus === 'running' || rawStatus === 'pending' || rawStatus === 'in_progress'
          ? 'running'
          : rawStatus === 'error' || rawStatus === 'failed'
            ? 'error'
            : 'completed';

      const input = stateObj.input || part.args || {};
      const fileCandidate =
        input.filePath || input.TargetFile || input.AbsolutePath || input.path || input.file || undefined;
      const commandCandidate = input.command || input.CommandLine || input.cmd || undefined;
      const skillCandidate = input.skill || input.name || undefined;

      if (typeof fileCandidate === 'string' && fileCandidate.trim()) {
        const cleanFile = fileCandidate.split(/[\\/]/).pop() || fileCandidate;
        if (
          rawTool.includes('edit') ||
          rawTool.includes('write') ||
          rawTool.includes('replace') ||
          rawTool.includes('patch')
        ) {
          touchedFilesSet.add(cleanFile);
        }
        if (fileCandidate.includes('SKILL.md')) {
          const parts = fileCandidate.replace(/\\/g, '/').split('/');
          const skillIdx = parts.indexOf('skills');
          if (skillIdx >= 0 && parts[skillIdx + 1]) {
            activeSkillsSet.add(parts[skillIdx + 1]);
          }
        }
      }

      if (rawTool.includes('skill') && typeof skillCandidate === 'string') {
        activeSkillsSet.add(skillCandidate);
      }

      const mappedEntry = TOOL_ACTION_VERB_MAP[rawTool];
      const mapped = mappedEntry
        ? {
            action: t ? t(mappedEntry.actionKey) : mappedEntry.action,
            summary: t ? t(mappedEntry.summaryKey) : mappedEntry.summary,
          }
        : {
            action: t ? t('agy.tool.generic.action', { tool: rawTool }) : `Running ${rawTool}`,
            summary: t ? t('agy.tool.generic.summary', { tool: rawTool }) : `${rawTool} execution`,
          };

      const shortTarget =
        typeof fileCandidate === 'string'
          ? fileCandidate.split(/[\\/]/).pop()
          : typeof commandCandidate === 'string'
            ? commandCandidate.slice(0, 36)
            : '';

      const explicitAction = input.toolAction || stateObj.title;
      const explicitSummary = input.toolSummary;

      const toolAction = explicitAction
        ? String(explicitAction)
        : shortTarget
          ? `${mapped.action}: ${shortTarget}`
          : mapped.action;

      const toolSummary = explicitSummary
        ? String(explicitSummary)
        : shortTarget
          ? `${mapped.summary} (${shortTarget})`
          : mapped.summary;

      steps.push({
        id: `${getId(rec, i)}-${pIdx}`,
        toolName: rawTool,
        toolAction,
        toolSummary,
        status,
        filePath: typeof fileCandidate === 'string' ? fileCandidate : undefined,
      });
    }
  }

  const runningStep = [...steps].reverse().find((s) => s.status === 'running');
  const lastStep = steps[steps.length - 1];
  const focusStep = runningStep || lastStep;

  return {
    steps,
    touchedFiles: Array.from(touchedFilesSet),
    activeSkills: Array.from(activeSkillsSet),
    currentAction: focusStep ? focusStep.toolAction : null,
    currentSummary: focusStep ? focusStep.toolSummary : null,
  };
}

interface AntigravityLiveTrajectoryDrawerProps {
  sessionId: string | null;
  directory?: string | null;
  open: boolean;
  onClose: () => void;
}

export const AntigravityLiveTrajectoryDrawer: React.FC<AntigravityLiveTrajectoryDrawerProps> = React.memo(
  ({ sessionId, directory, open, onClose }) => {
    const { t } = useI18n();
    const records = useSessionMessageRecords(sessionId ?? '', directory ?? undefined);
    const status = useSessionStatus(sessionId ?? '', directory ?? undefined);
    const trajectory = React.useMemo(() => extractLiveTrajectory(records as any, t), [records, t]);

    if (!open || trajectory.steps.length === 0) return null;

    const isWorking = status?.type === 'busy';

    const handleOpenDiffPanel = () => {
      const uiState = useUIStore.getState() as any;
      if (typeof uiState.openContextPanelMode === 'function') {
        uiState.openContextPanelMode('diff');
      } else if (typeof uiState.setContextPanelMode === 'function') {
        uiState.setContextPanelMode('diff');
      }
    };

    return (
      <div className="mb-2 w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--interactive-border)] oc-glass-popover shadow-[0_8px_28px_-6px_rgb(0_0_0_/_0.28)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-3.5 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon
              name={isWorking ? 'loader-4' : 'sparkling'}
              className={cn('size-3.5 shrink-0 text-foreground', isWorking && 'animate-spin')}
            />
            <span className="typography-ui-label font-medium text-foreground truncate">
              {t('agy.trajectory.title')}
            </span>
            <span className="rounded-full bg-foreground/10 px-2 py-0.5 typography-micro tabular-nums text-muted-foreground">
              {trajectory.steps.length} {t('agy.trajectory.steps')}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {trajectory.activeSkills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-foreground/5 px-1.5 py-0.5 typography-micro text-foreground"
              >
                <Icon name="sparkling" className="size-2.5" />
                {skill}
              </span>
            ))}
            <button
              type="button"
              onClick={onClose}
              aria-label={t('agy.trajectory.close')}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
            >
              <Icon name="close" className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Steps List */}
        <div className="max-h-48 overflow-y-auto divide-y divide-border/30 px-3 py-1.5">
          {trajectory.steps.slice(-12).map((step, index) => (
            <div key={step.id} className="flex items-center justify-between gap-2 py-1.5 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                {step.status === 'running' ? (
                  <Icon name="loader-4" className="size-3.5 shrink-0 animate-spin text-foreground" />
                ) : step.status === 'error' ? (
                  <Icon name="error-warning" className="size-3.5 shrink-0 text-[var(--status-error)]" />
                ) : (
                  <Icon name="check" className="size-3.5 shrink-0 text-[var(--status-success)]" />
                )}
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                  #{index + 1}
                </span>
                <span className="font-medium text-foreground truncate">{step.toolAction}</span>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground truncate max-w-[180px]">
                {step.toolSummary}
              </span>
            </div>
          ))}
        </div>

        {/* Touched Files Footer */}
        {trajectory.touchedFiles.length > 0 ? (
          <div className="flex items-center justify-between gap-2 border-t border-border/50 bg-foreground/[0.03] px-3.5 py-1.5">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none min-w-0">
              <span className="shrink-0 typography-micro text-muted-foreground">
                {t('agy.trajectory.touchedFiles')}:
              </span>
              {trajectory.touchedFiles.map((file) => (
                <button
                  key={file}
                  type="button"
                  onClick={handleOpenDiffPanel}
                  className="inline-flex shrink-0 items-center gap-1 rounded border border-border/60 bg-background/70 px-1.5 py-0.5 font-mono text-[11px] text-foreground hover:border-foreground/40"
                >
                  <Icon name="file-code" className="size-3 text-muted-foreground" />
                  {file}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }
);

AntigravityLiveTrajectoryDrawer.displayName = 'AntigravityLiveTrajectoryDrawer';
