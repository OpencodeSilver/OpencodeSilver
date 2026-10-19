import React from 'react';
import { useGlobalSessionStatusStore } from '@/sync/global-session-status';
import { Icon } from '@/components/icon/Icon';
import { SessionActivityDuration } from '@/components/session/SessionActivityDuration';
import { useHasSessionActivityDuration } from '@/sync/session-activity-timing';
import { useI18n } from '@/lib/i18n';
import { useAllLiveSessions, useAllSessionStatuses, useDirectorySync } from '@/sync/sync-context';
import { useUIStore } from '@/stores/useUIStore';
import { useConfigStore } from '@/stores/useConfigStore';
import { getProviderModelDisplayName } from '@/lib/modelDisplay';
import { useSessionUIStore } from '@/sync/session-ui-store';
import { isVSCodeRuntime } from '@/lib/desktop';
import { useReportWorkStatusPresence } from './presenceContext';
import { formatCost } from './subagentCost';
import { computeRollup } from './useSubagentCostRollup';
import type { State } from '@/sync/types';

type Props = {
  sessionId: string | null;
  directory: string | null;
};

const SECTION_ID = 'subagents';

const SubagentDuration: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const hasDuration = useHasSessionActivityDuration(sessionId, true);
  return hasDuration ? <SessionActivityDuration sessionId={sessionId} running /> : null;
};

/**
 * Running subagents and, more importantly, their blockers: a permission request
 * raised by a child session has no representation in the transcript, so this
 * panel is the only place it becomes visible.
 */
export const WorkStatusSubagentsSection: React.FC<Props> = ({ sessionId, directory }) => {
  const { t } = useI18n();
  const isMobile = useUIStore((state) => state.isMobile);
  const providers = useConfigStore((state) => state.providers);

  const liveSessions = useAllLiveSessions();
  const statuses = useAllSessionStatuses();
  const children = React.useMemo(
    () => (sessionId ? liveSessions.filter((candidate) => candidate.parentID === sessionId) : []),
    [liveSessions, sessionId],
  );

  // Each child's own subtree total (its cost plus every descendant of its
  // own), so nested subagent-of-subagent cost rolls up under the immediate
  // child row shown here rather than disappearing. Computed from the list
  // already held: the hook would open a second live-session subscription.
  const { perChildCost } = React.useMemo(() => computeRollup(liveSessions, sessionId), [liveSessions, sessionId]);

  // One subscription covers every child: per-session hooks would multiply
  // store subscriptions by the number of subagents.
  const permissions = useDirectorySync(React.useCallback((state: State) => state.permission, []));
  const forms = useDirectorySync(React.useCallback((state: State) => state.form, []));
  const statusReady = useDirectorySync(
    React.useCallback((state: State) => state.sessionStatusReady, []),
    directory ?? undefined,
  );
  // The last turn's outcome outlives the live status: a child that went idle
  // after an error reads as failed, not done. Joined to a string so the
  // selector stays stable while nothing about these children changes.
  const failedChildIds = useGlobalSessionStatusStore(React.useCallback((state) => children
    .filter((child) => state.observedById.get(child.id)?.outcome === 'failed')
    .map((child) => child.id)
    .join('\n'), [children]));

  const openContextPanelTab = useUIStore((state) => state.openContextPanelTab);
  const setCurrentSession = useSessionUIStore((state) => state.setCurrentSession);
  const setSectionExpanded = useUIStore((state) => state.setWorkStatusSectionExpanded);

  // Subagents appearing where there were none is the one moment this section
  // has something urgent to say, so it opens itself. Only on the empty→present
  // edge: re-expanding on every count change would fight a user who just
  // collapsed it.
  const hadChildren = React.useRef(children.length > 0);
  React.useEffect(() => {
    const present = children.length > 0;
    if (present && !hadChildren.current) setSectionExpanded(SECTION_ID, true);
    hadChildren.current = present;
  }, [children.length, setSectionExpanded]);

  // Same branch the transcript's Task tool takes: surfaces that cannot host an
  // side panel navigate to the child session instead of opening a tab.
  const openChildSession = React.useCallback((childId: string, label: string) => {
    if (!directory) return;
    if (isMobile || isVSCodeRuntime()) {
      setCurrentSession(childId, directory);
      return;
    }
    openContextPanelTab(directory, {
      mode: 'chat',
      dedupeKey: `session:${childId}`,
      label,
      readOnly: true,
    });
  }, [directory, isMobile, openContextPanelTab, setCurrentSession]);

  useReportWorkStatusPresence('subagents', children.length > 0);

  if (children.length === 0) return null;

  const failedIds = new Set(failedChildIds.split('\n'));
  const rows = children.map((child) => {
    const blocked = (permissions[child.id]?.length ?? 0) > 0;
    const asked = (forms[child.id]?.length ?? 0) > 0;
    const status = statuses[child.id]?.type;
    const busy = status === 'busy' || status === 'retry';
    const failed = !busy && failedIds.has(child.id);
    const done = !failed && (status === 'idle' || (!status && statusReady && child.directory === directory));
    return { child, blocked, asked, busy, failed, done, finished: !blocked && !asked && (done || failed) };
  });
  // Newest first by creation, never by last activity: an activity order
  // reshuffled the rows on every step, moving them under the pointer. Finished
  // rows sink below the unfinished ones but keep the same order among
  // themselves, so a fully finished list reads exactly as it did at launch.
  rows.sort((left, right) => (Number(left.finished) - Number(right.finished))
    || ((right.child.time?.created ?? 0) - (left.child.time?.created ?? 0)));

  return (
    <section data-work-status-section={SECTION_ID} className="mb-3 flex flex-col gap-1 border-b border-[var(--interactive-border)] pb-3">
      <div className="max-h-64 overflow-y-auto">
        {rows.map(({ child, blocked, asked, busy, failed, done }) => {
          const label = child.title?.trim() || t('chat.workStatus.subagent.untitled');
          let statusLabel = t('ag.inspector.subagent.completed');
          if (blocked) {
            statusLabel = t('chat.workStatus.subagent.needsPermission');
          } else if (asked) {
            statusLabel = t('chat.workStatus.subagent.askedQuestion');
          } else if (busy) {
            statusLabel = t('ag.inspector.subagent.running');
          } else if (failed) {
            statusLabel = t('chat.workStatus.subagent.failed');
          } else if (done) {
            statusLabel = t('ag.inspector.subagent.completed');
          }
          const childCost = perChildCost.get(child.id) ?? 0;
          const modelName = getProviderModelDisplayName(
            providers.find((provider) => provider.id === child.model?.providerID),
            child.model?.id,
          );
          return (
            <button
              key={child.id}
              type="button"
              onClick={directory ? () => openChildSession(child.id, label) : undefined}
              title={modelName || label}
              aria-label={[t('chat.workStatus.action.openSubagent', { name: label }), statusLabel].filter(Boolean).join('. ')}
              className="group flex w-full items-center justify-between gap-3 rounded-md px-1.5 py-2 text-left transition-colors hover:bg-interactive-hover/60"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[13.5px] font-medium leading-snug text-foreground">
                  {label}
                </span>
                <div className="flex items-center gap-2 text-[12px] leading-tight text-muted-foreground">
                  <span className={blocked || asked ? 'text-[var(--status-warning)]' : failed ? 'text-[var(--status-error)]' : undefined}>
                    {statusLabel}
                  </span>
                  {busy ? <SubagentDuration sessionId={child.id} /> : null}
                  {childCost > 0 ? <span className="tabular-nums opacity-75">{formatCost(childCost)}</span> : null}
                </div>
              </div>
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/80 transition-colors group-hover:text-foreground">
                <Icon name="close-circle" className="size-4" />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
