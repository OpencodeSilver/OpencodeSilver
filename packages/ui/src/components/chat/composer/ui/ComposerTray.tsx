/**
 * The strip under the composer (desktop): the host the chat runs on
 * ("Local ▾", opens the host switcher) and the agent picker ("Build ▾").
 */

import React from 'react';

import { DesktopHostSwitcherDialog } from '@/components/desktop/DesktopHostSwitcher';
import { Icon } from '@/components/icon/Icon';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollableOverlay } from '@/components/ui/ScrollableOverlay';
import { agentLabel } from '@/lib/agentLabel';
import { isDesktopLocalOriginActive, isDesktopShell } from '@/lib/desktop';
import { desktopHostsGet, redactSensitiveUrl } from '@/lib/desktopHosts';
import {
    LOCAL_HOST_ID,
    buildLocalDesktopHost,
    getLocalDesktopOrigin,
    resolveCurrentDesktopHost,
} from '@/lib/desktopCurrentHost';
import { useI18n } from '@/lib/i18n';
import { subscribeRuntimeEndpointChanged } from '@/lib/runtime-switch';
import { cn } from '@/lib/utils';
import { useContextStore } from '@/stores/contextStore';
import { useConfigStore } from '@/stores/useConfigStore';
import type { BtwSelection } from '@/stores/useBtwStore';

const TRAY_BUTTON_CLASS = 'inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus:outline-none';

const FALLBACK_AGENTS = [
    { name: 'build', displayName: '', description: '' },
    { name: 'plan', displayName: '', description: '' },
];

type ComposerTrayProps = {
    sessionId: string | null;
    pinnedSelection?: BtwSelection | null;
};

function useCurrentHostLabel(): string {
    const [label, setLabel] = React.useState('Local');
    const [isDesktopApp] = React.useState(() => isDesktopShell());

    const updateLabel = React.useCallback(async () => {
        if (!isDesktopApp) {
            setLabel('Local');
            return;
        }
        try {
            if (isDesktopLocalOriginActive()) {
                setLabel('Local');
                return;
            }
            const config = await desktopHostsGet();
            const resolved = resolveCurrentDesktopHost([buildLocalDesktopHost(getLocalDesktopOrigin()), ...config.hosts]);
            setLabel(resolved.id === LOCAL_HOST_ID ? 'Local' : redactSensitiveUrl(resolved.label.trim() || 'Instance'));
        } catch {
            setLabel('Local');
        }
    }, [isDesktopApp]);

    React.useEffect(() => {
        void updateLabel();
        if (!isDesktopApp) return;
        return subscribeRuntimeEndpointChanged(() => {
            void updateLabel();
        });
    }, [isDesktopApp, updateLabel]);

    return label;
}

export const ComposerTray = React.memo(function ComposerTray({ sessionId, pinnedSelection = null }: ComposerTrayProps) {
    const { t } = useI18n();
    const hostLabel = useCurrentHostLabel();
    const [hostSwitcherOpen, setHostSwitcherOpen] = React.useState(false);
    const [agentMenuOpen, setAgentMenuOpen] = React.useState(false);
    const [agentQuery, setAgentQuery] = React.useState('');

    const currentAgentName = useConfigStore((state) => state.currentAgentName);
    const setAgent = useConfigStore((state) => state.setAgent);
    const getVisibleAgents = useConfigStore((state) => state.getVisibleAgents);
    const visibleAgents = getVisibleAgents();
    const agents = visibleAgents.length > 0 ? visibleAgents : FALLBACK_AGENTS;
    const sessionAgent = useContextStore(React.useCallback(
        (state) => (sessionId ? state.getSessionAgentSelection(sessionId) : null),
        [sessionId],
    ));
    const selectedAgentName = pinnedSelection?.agent ?? sessionAgent ?? currentAgentName;
    const selectedAgent = agents.find((agent) => agent.name === selectedAgentName);
    const selectedAgentLabel = selectedAgent
        ? agentLabel(selectedAgent)
        : selectedAgentName
            ? agentLabel({ name: selectedAgentName, displayName: '' })
            : t('chat.modelControls.selectAgent');

    const filteredAgents = React.useMemo(() => {
        const query = agentQuery.trim().toLowerCase();
        if (!query) return agents;
        return agents.filter((agent) =>
            (agent.displayName || agent.name).toLowerCase().includes(query)
            || (agent.description || '').toLowerCase().includes(query));
    }, [agents, agentQuery]);

    const selectAgent = (name: string) => {
        setAgent(name);
        if (sessionId) {
            useContextStore.getState().saveSessionAgentSelection(sessionId, name);
        }
        setAgentMenuOpen(false);
        setAgentQuery('');
    };

    return (
        <div className="flex h-10 w-full select-none items-center justify-between rounded-b-[17px] border-t border-[var(--border-soft)]/50 bg-[var(--surface-tray)] px-3.5 text-[13px] text-[var(--text-muted)]">
            <div className="flex items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => setHostSwitcherOpen(true)}
                    className={TRAY_BUTTON_CLASS}
                    title={t('chat.composerStrip.hostSwitcherTitle')}
                >
                    <Icon name="macbook" className="h-4 w-4 shrink-0" />
                    <span className="max-w-[140px] truncate font-normal">{hostLabel}</span>
                    <Icon name="arrow-down-s" className="h-3.5 w-3.5 shrink-0" />
                </button>
                <DesktopHostSwitcherDialog
                    open={hostSwitcherOpen}
                    onOpenChange={setHostSwitcherOpen}
                    onHostSwitched={() => setHostSwitcherOpen(false)}
                />
            </div>
            <div className="flex items-center gap-1.5">
                <DropdownMenu open={agentMenuOpen} onOpenChange={setAgentMenuOpen}>
                    <DropdownMenuTrigger asChild>
                        <button type="button" className={cn(TRAY_BUTTON_CLASS, 'gap-1')}>
                            <span className="max-w-[140px] truncate font-normal">{selectedAgentLabel}</span>
                            <Icon name="arrow-down-s" className="h-3.5 w-3.5 shrink-0" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side="top"
                        align="end"
                        className="w-56 rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-raised)] p-1 shadow-lg"
                    >
                        <div className="mb-1 border-b border-[var(--border-soft)] p-1">
                            <Input
                                type="text"
                                placeholder={t('chat.modelControls.searchAgents')}
                                value={agentQuery}
                                onChange={(event) => setAgentQuery(event.target.value)}
                                className="h-7 border-[var(--border-soft)] bg-[var(--surface-field)] text-xs"
                                onKeyDown={(event) => event.stopPropagation()}
                            />
                        </div>
                        <ScrollableOverlay outerClassName="max-h-48 overflow-y-auto">
                            {filteredAgents.length === 0 ? (
                                <div className="p-2 text-center text-xs text-muted-foreground">
                                    {t('chat.modelControls.noAgentsFound')}
                                </div>
                            ) : filteredAgents.map((agent) => (
                                <DropdownMenuItem
                                    key={agent.name}
                                    onSelect={() => selectAgent(agent.name)}
                                    className={cn(
                                        'flex cursor-pointer items-center justify-between rounded-[8px] px-2 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--surface-raised-hover)]',
                                        agent.name === selectedAgentName && 'bg-[var(--surface-raised-hover)]',
                                    )}
                                >
                                    <span className="font-medium">{agentLabel(agent)}</span>
                                    {agent.name === selectedAgentName ? <Icon name="check" className="h-3.5 w-3.5 text-primary" /> : null}
                                </DropdownMenuItem>
                            ))}
                        </ScrollableOverlay>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
});
