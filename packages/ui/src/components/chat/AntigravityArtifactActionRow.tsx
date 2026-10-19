import React from 'react';
import { Icon } from '@/components/icon/Icon';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { useSessionUIStore } from '@/sync/session-ui-store';
import { useSessionMessageRecords, useSessionStatus } from '@/sync/sync-context';
import { useUIStore } from '@/stores/useUIStore';
import { useInputStore } from '@/sync/input-store';

interface AntigravityArtifactActionRowProps {
  sessionId: string | null;
  directory?: string | null;
}

interface DetectedArtifact {
  messageId: string;
  title: string;
  filePath?: string;
  summary: string;
  kind: 'plan' | 'blueprint' | 'artifact';
}

function detectExecutableArtifact(
  records: Array<any>,
  defaultTitle: string,
  defaultSummary: string
): DetectedArtifact | null {
  if (!Array.isArray(records) || records.length === 0) return null;

  const getRole = (rec: any): string | undefined => rec?.info?.role ?? rec?.role;
  const getId = (rec: any, fallbackIdx: number): string =>
    String(rec?.info?.id ?? rec?.id ?? `msg-${fallbackIdx}`);

  // Inspect the latest assistant turn
  for (let i = records.length - 1; i >= 0; i--) {
    const rec = records[i];
    if (!rec) continue;
    const role = getRole(rec);
    if (role === 'user') {
      // If the latest message is from the user, no unacknowledged assistant artifact is waiting
      return null;
    }
    if (role !== 'assistant') continue;

    let combinedText = '';
    let detectedPath: string | undefined;

    for (const part of Array.isArray(rec.parts) ? rec.parts : []) {
      if (!part) continue;
      if (part.type === 'text' && typeof part.text === 'string') {
        combinedText += '\n' + part.text;
      } else if (part.type === 'tool' || part.type === 'tool-invocation') {
        const toolName = String(part.tool || part.toolName || '').toLowerCase();
        const input = part.state?.input || part.args || {};
        const fileCandidate = input.filePath || input.TargetFile || input.path || '';
        if (
          typeof fileCandidate === 'string' &&
          (fileCandidate.endsWith('_plan.md') ||
            fileCandidate.endsWith('PLAN.md') ||
            fileCandidate.includes('blueprint') ||
            toolName.includes('plan'))
        ) {
          detectedPath = fileCandidate;
        }
      }
    }

    const trimmed = combinedText.trim();
    if (!trimmed && !detectedPath) return null;

    // Detect if the assistant created an implementation plan, architectural blueprint, or executable artifact
    const isPlanText =
      trimmed.includes('The plan at ') ||
      trimmed.includes('implementation_plan') ||
      trimmed.includes('## المرحلة') ||
      trimmed.includes('### Phase 1') ||
      trimmed.includes('## القسم الثالث') ||
      trimmed.includes('Proceed') ||
      trimmed.includes('ابدأ التنفيذ');

    if (!isPlanText && !detectedPath) return null;

    // Extract a clean title from the markdown heading or file path
    const headingMatch = trimmed.match(/^#{1,3}\s+([^\n]+)/m);
    const planPathMatch = trimmed.match(/The plan at ([^\s\n]+)/);
    const filePath = detectedPath || planPathMatch?.[1];
    const baseName = filePath ? filePath.split(/[\\/]/).pop() : undefined;

    const title = headingMatch
      ? headingMatch[1].replace(/[*`]/g, '').trim().slice(0, 80)
      : baseName || defaultTitle;

    const firstParagraph = trimmed
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 20 && !line.startsWith('#') && !line.startsWith('```') && !line.startsWith('|'));

    return {
      messageId: getId(rec, i),
      title,
      filePath,
      summary: firstParagraph ? firstParagraph.slice(0, 140) : defaultSummary,
      kind: filePath?.includes('plan') ? 'plan' : 'blueprint',
    };
  }

  return null;
}

/**
 * Google Antigravity 2 style Executable Artifact & Plan Dock Row.
 * Appears directly above the chat input when the agent presents an actionable
 * plan, blueprint, or artifact, offering one-click "Proceed" execution and
 * quick context panel review.
 */
export const AntigravityArtifactActionRow: React.FC<AntigravityArtifactActionRowProps> = React.memo(
  ({ sessionId, directory }) => {
    const { t } = useI18n();
    const status = useSessionStatus(sessionId ?? '', directory ?? undefined);
    const records = useSessionMessageRecords(sessionId ?? '', directory ?? undefined);
    const [dismissedIds, setDismissedIds] = React.useState<Record<string, boolean>>({});
    const [expanded, setExpanded] = React.useState(false);

    const isIdle = !status || status.type === 'idle';
    const artifact = React.useMemo(() => {
      if (!sessionId || !isIdle) return null;
      return detectExecutableArtifact(
        records as any,
        t('agy.artifactDock.defaultTitle'),
        t('agy.artifactDock.defaultSummary')
      );
    }, [sessionId, isIdle, records, t]);

    // Keep background detection active: automatically mark the session plan as available
    // when an executable plan or architectural blueprint is detected in the conversation.
    React.useEffect(() => {
      if (sessionId && artifact) {
        useSessionUIStore.getState().markSessionPlanAvailable(sessionId);
      }
    }, [sessionId, artifact]);

    if (!artifact || dismissedIds[artifact.messageId]) {
      return null;
    }

    const handleProceed = () => {
      setDismissedIds((prev) => ({ ...prev, [artifact.messageId]: true }));
      useInputStore.getState().requestPresetSubmit(
        t('agy.artifactDock.proceedPrompt'),
        'command'
      );
    };

    const handleReviewInPanel = () => {
      if (sessionId) {
        useSessionUIStore.getState().markSessionPlanAvailable(sessionId);
      }
      const uiState = useUIStore.getState() as any;
      if (typeof uiState.openContextPanelMode === 'function') {
        uiState.openContextPanelMode('plan');
      } else if (typeof uiState.setContextPanelMode === 'function') {
        uiState.setContextPanelMode('plan');
      }
      setExpanded((prev) => !prev);
    };

    const handleDismiss = () => {
      setDismissedIds((prev) => ({ ...prev, [artifact.messageId]: true }));
    };

    return (
      <div className="hidden" aria-hidden="true" data-agy-artifact-engine="active">
        <div className="flex min-h-10 items-center gap-2 pl-3 pr-2 py-1">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-foreground/10 text-foreground">
            <Icon name="sparkling" className="size-3.5" />
          </span>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left hover:opacity-90"
          >
            <span className="shrink-0 rounded bg-foreground/10 px-1.5 py-0.5 typography-micro font-semibold uppercase tracking-wider text-foreground">
              {t('agy.artifactDock.badge')}
            </span>
            <span className="min-w-0 flex-1 truncate typography-ui-label font-medium text-foreground">
              {artifact.title}
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={handleReviewInPanel}
              title={t('agy.artifactDock.review')}
            >
              {t('agy.artifactDock.review')}
            </Button>
            <Button
              type="button"
              size="xs"
              onClick={handleProceed}
            >
              {t('agy.artifactDock.proceed')}
            </Button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label={t('agy.artifactDock.dismiss')}
            >
              <Icon name="close" className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }
);

AntigravityArtifactActionRow.displayName = 'AntigravityArtifactActionRow';

