import React from "react";
import { useChatSessionSelection } from './chatColumnSession';
import { WorkingPlaceholder } from "./message/parts/WorkingPlaceholder";
import { ContextUsageIndicator } from "./ContextUsageIndicator";
import { useI18n } from "@/lib/i18n";
import { AntigravityLiveTrajectoryDrawer } from "./AntigravityLiveTrajectoryDrawer";

// The floating assistant-status chip that hovers above the composer while the
// agent works ("Claude is working…"). Also hosts the Antigravity 2 expandable
// Live Trajectory Drawer showing dual-label toolAction / toolSummary steps,
// active skills, and touched files.

const STATUS_ROW_CONTAINER_STYLE = { containerType: "inline-size" as const, containerName: "status-row" };

interface StatusRowProps {
  isWorking?: boolean;
  statusText?: string | null;
  isGenericStatus?: boolean;
  isWaitingForPermission?: boolean;
  abortActive?: boolean;
  retryInfo?: { attempt?: number; next?: number } | null;
  agentName?: string;
  modelName?: string | null;
  providerId?: string | null;
  estimatedTokens?: number;
  stepCount?: number;
  activeSkillsCount?: number;
  currentToolAction?: string | null;
  /** `conversation` renders a clean pill in the timeline; `inline` inside composer; `floating` classic. */
  variant?: 'floating' | 'inline' | 'conversation';
}

export const StatusRow: React.FC<StatusRowProps> = ({
  isWorking = false,
  statusText = null,
  isGenericStatus,
  isWaitingForPermission,
  abortActive,
  retryInfo,
  agentName,
  modelName,
  providerId,
  estimatedTokens,
  stepCount = 0,
  activeSkillsCount = 0,
  currentToolAction = null,
  variant = 'floating',
}) => {
  const { t } = useI18n();
  const selection = useChatSessionSelection();
  const currentSessionId = selection.sessionId;
  const currentDirectory = selection.directory;
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const shouldRenderPlaceholder = !abortActive;
  const hasBackgroundData =
    stepCount > 0 ||
    activeSkillsCount > 0 ||
    (typeof estimatedTokens === 'number' && estimatedTokens > 0);

  if (!isWorking && !hasBackgroundData) {
    return null;
  }

  const effectiveStatusText = isWorking && currentToolAction ? currentToolAction : statusText;

  return (
    <div style={isWorking ? STATUS_ROW_CONTAINER_STYLE : undefined} className={isWorking ? undefined : "hidden"}>
      {/* Background engine for Antigravity 2 trajectory & context tracking (active, visually hidden) */}
      <div className="hidden" aria-hidden="true" data-agy-trajectory-engine="active">
        {drawerOpen && currentSessionId ? (
          <AntigravityLiveTrajectoryDrawer
            sessionId={currentSessionId}
            directory={currentDirectory}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
          />
        ) : null}
        {activeSkillsCount > 0 ? (
          <span title={t('agy.trajectory.activeSkills')}>
            {activeSkillsCount}
          </span>
        ) : null}
        {stepCount > 0 ? (
          <button
            type="button"
            onClick={() => setDrawerOpen((prev) => !prev)}
            title={t('agy.trajectory.toggleDrawer')}
          >
            {stepCount} {t('agy.trajectory.steps')}
          </button>
        ) : null}
        {typeof estimatedTokens === 'number' && estimatedTokens > 0 ? (
          <ContextUsageIndicator totalTokens={estimatedTokens} />
        ) : null}
      </div>

      {isWorking ? (
        <div
          className={
            variant === 'conversation'
              ? "flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-card/85 border border-border/60 text-foreground w-fit max-w-full shadow-sm backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-1 duration-200"
              : variant === 'inline'
                ? "flex w-full min-w-0 items-center gap-2 h-8 whitespace-nowrap px-3 border-b border-[var(--border-soft,var(--border))]"
                : "oc-glass-popover inline-flex w-max max-w-full items-center gap-2 h-8 whitespace-nowrap rounded-full [corner-shape:round] px-3"
          }
          data-status-row-variant={variant}
          dir="auto"
        >
          <div className="flex items-center min-w-0 gap-2 overflow-x-hidden">
            {shouldRenderPlaceholder ? (
              <WorkingPlaceholder
                key={currentSessionId ?? "no-session"}
                isWorking={isWorking}
                statusText={effectiveStatusText}
                isGenericStatus={isGenericStatus && !currentToolAction}
                isWaitingForPermission={isWaitingForPermission}
                retryInfo={retryInfo}
                agentName={agentName}
                modelName={modelName}
                providerId={providerId}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};


