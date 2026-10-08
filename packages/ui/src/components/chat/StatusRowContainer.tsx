import React from 'react';

import { useAssistantStatus } from '@/hooks/useAssistantStatus';
import { useConfigStore } from '@/stores/useConfigStore';
import { getProviderModelDisplayName } from '@/lib/modelDisplay';
import { useSessionMessageRecords } from '@/sync/sync-context';
import { useChatSessionSelection } from './chatColumnSession';
import { estimateTokenCount } from '@/lib/tokens/contextTokenEstimator';
import { playTaskCompletionChime } from '@/lib/sound/taskChime';
import { StatusRow } from './StatusRow';
import { extractLiveTrajectory } from './AntigravityLiveTrajectoryDrawer';
import { useI18n } from '@/lib/i18n';

/**
 * Status row wrapper.
 * Uses the dedicated assistant status hook so the row keeps accurate live activity
 * labels while still limiting subscriptions to the active assistant message.
 */
export const StatusRowContainer: React.FC = React.memo(() => {
    const { t } = useI18n();
    const { activeModel, working } = useAssistantStatus();
    const currentAgentName = useConfigStore((state) => state.currentAgentName);
    const providers = useConfigStore((state) => state.providers);

    // Trigger audio chime when background working finishes
    const prevWorkingRef = React.useRef(working.isWorking);
    React.useEffect(() => {
        if (prevWorkingRef.current && !working.isWorking) {
            playTaskCompletionChime();
        }
        prevWorkingRef.current = working.isWorking;
    }, [working.isWorking]);

    const selection = useChatSessionSelection();
    const currentSessionId = selection.sessionId;
    const currentDirectory = selection.directory;
    const records = useSessionMessageRecords(currentSessionId ?? '', currentDirectory ?? undefined);

    const { estimatedTokens, trajectory } = React.useMemo(() => {
        if (!records || records.length === 0) {
            return {
                estimatedTokens: 0,
                trajectory: { steps: [], touchedFiles: [], activeSkills: [], currentAction: null, currentSummary: null },
            };
        }
        let totalChars = 0;
        for (const rawMsg of records) {
            const msg = rawMsg as any;
            if (Array.isArray(msg?.parts)) {
                for (const part of msg.parts) {
                    if (part?.type === 'text' && typeof (part as { text?: string }).text === 'string') {
                        totalChars += (part as { text?: string }).text!.length;
                    } else if (part?.type === 'reasoning' && typeof (part as { text?: string }).text === 'string') {
                        totalChars += (part as { text?: string }).text!.length;
                    }
                }
            }
        }
        const tokens = estimateTokenCount(totalChars > 0 ? 'x'.repeat(totalChars) : '');
        const traj = extractLiveTrajectory(records as any, t);
        return { estimatedTokens: tokens, trajectory: traj };
    }, [records, t]);

    const modelDisplayName = React.useMemo(() => {
        if (!activeModel) {
            return null;
        }
        const provider = providers.length > 0
            ? providers.find((candidate) => candidate.id === activeModel.providerId)
            : undefined;
        return getProviderModelDisplayName(provider, activeModel.modelId) || null;
    }, [activeModel, providers]);

    return (
        <StatusRow
            isWorking={working.isWorking}
            statusText={working.statusText}
            isGenericStatus={working.isGenericStatus}
            isWaitingForPermission={working.isWaitingForPermission}
            abortActive={working.abortActive}
            retryInfo={working.retryInfo}
            agentName={currentAgentName}
            modelName={modelDisplayName}
            providerId={activeModel?.providerId ?? null}
            estimatedTokens={estimatedTokens > 0 ? estimatedTokens : undefined}
            stepCount={trajectory.steps.length}
            activeSkillsCount={trajectory.activeSkills.length}
            currentToolAction={trajectory.currentAction}
        />
    );
});

StatusRowContainer.displayName = 'StatusRowContainer';

