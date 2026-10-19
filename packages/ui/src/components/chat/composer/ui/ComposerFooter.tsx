/**
 * The composer's footer row.
 *
 * Desktop lays it out as attachments and toggles on the left, model controls
 * and send on the right. Mobile keeps everything on one line and swaps the
 * model controls for the compact buttons above the text, because the footer
 * has to stay reachable with one thumb.
 *
 * The dictation component is rendered here on desktop only: on mobile it lives
 * at the composer wrapper level so a recording started from the collapsed pill
 * survives the expand.
 */

import type { SourceControlProvider } from '@/lib/api/types';
import React from 'react';

import { SessionGoalButton, SessionGoalObjectiveCounter } from '@/components/chat/SessionGoalButton';
import { ComposerDictation } from '@/components/dictation/ComposerDictation';
import { Icon } from '@/components/icon/Icon';
import type { GuestAttachItem } from '@/hooks/useGuestSurfaces';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useConfigStore } from '@/stores/useConfigStore';
import { isVSCodeRuntime } from '@/lib/desktop';
import { isDictationCaptureSupported } from '@/lib/dictation/use-dictation-audio-source';
import { ModelControls } from '../../ModelControls';
import { ComposerActionButtons } from './ComposerActionButtons';
import { ComposerAttachmentControls } from './ComposerAttachmentControls';
import { ComposerToolsControls } from './ComposerToolsControls';
import { FocusModeButton } from './FocusModeButton';
import { PermissionAutoAcceptButton } from './PermissionAutoAcceptButton';
import { PermissionModeChip } from './PermissionModeChip';
import { ComposerTray } from './ComposerTray';
import type { PermissionMode } from '@/stores/utils/permissionAutoAccept';
import type { BtwSelection } from '@/stores/useBtwStore';

const MemoModelControls = React.memo(ModelControls);

const TRAY_ICON_BUTTON_CLASS = 'flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--interactive-hover)] hover:text-[var(--text-primary)]';
const MemoComposerDictation = React.memo(ComposerDictation);

export interface ComposerFooterProps {
    isMobile: boolean;
    isVSCode: boolean;
    sessionId: string | null;
    directory?: string;
    newSessionDraftOpen: boolean;
    messageLength: number;

    radius: string;
    footerPaddingClass: string;
    footerGapClass: string;
    footerIconButtonClass: string;
    iconSizeClass: string;
    sendIconSizeClass: string;
    stopIconSizeClass: string;

    canSend: boolean;
    canAbort: boolean;
    hasContent: boolean;
    isExpandedInput: boolean;
    permissionMode: PermissionMode;
    isPermissionAutoAcceptInteractive: boolean;
    dictationActive: boolean;

    onOpenSettings?: () => void;
    onPickLocalFiles: () => void;
    onOpenGitHubPicker: () => void;
    /** The host the project's issues and change requests come from. */
    repositoryProvider?: SourceControlProvider;
    showLinearPicker?: boolean;
    onOpenLinearPicker?: () => void;
    attachGuests?: readonly GuestAttachItem[];
    onOpenGuestAttach?: (guestId: string) => void;
    onOpenAttachSheet: () => void;
    onToggleExpandedInput: () => void;
    onCyclePermissionMode: () => void;
    /** Applies one permission mode picked from the composer's permission chip. */
    onSelectPermissionMode?: (mode: PermissionMode) => void;
    onPrimaryAction: () => void;
    onQueueMessage: () => void;
    onAbort: () => void;
    onStartDictation: () => void;
    onDictationInsert: (text: string) => void;
    onDictationInsertAndSend: (text: string) => void;
    onDictationSendStart: () => void;
    onDictationStart: () => void;
    onDictationContentHeightChange: (height: number | null) => void;
    onInsertPrompt?: (promptText: string) => void;
    onReplacePrompt?: (promptText: string) => void;
    currentPromptText?: string;
    isBtw?: boolean;
    modelSessionId?: string | null;
    btwSelection: BtwSelection;
    /** A pinned column's own model, agent and effort (see pinnedComposerSelection.ts). */
    pinnedSelection?: BtwSelection | null;
    /** Offers "Run on several models" in the model picker (desktop). */
    onRunInParallel?: () => void;
    /** Set while the composer is in "Run in parallel" mode: the primary action launches the run. */
    parallelRun?: { runCount: number; launching: boolean; onLaunch: () => void } | null;
}

export function ComposerFooter(props: ComposerFooterProps) {
    const { t } = useI18n();
    const {
        isMobile,
        isVSCode,
        sessionId: currentSessionId,
        directory,
        newSessionDraftOpen,
        messageLength,
        radius: chatInputRadius,
        footerPaddingClass,
        footerGapClass,
        footerIconButtonClass,
        iconSizeClass,
        sendIconSizeClass,
        stopIconSizeClass,
        canSend,
        canAbort,
        hasContent,
        isExpandedInput,
        permissionMode,
        isPermissionAutoAcceptInteractive,
        dictationActive,
        onOpenSettings,
        onPickLocalFiles,
        onOpenGitHubPicker,
        repositoryProvider,
        showLinearPicker,
        onOpenLinearPicker,
        attachGuests,
        onOpenGuestAttach,
        onOpenAttachSheet,
        onToggleExpandedInput,
        onCyclePermissionMode,
        onSelectPermissionMode,
        onPrimaryAction,
        onQueueMessage,
        onAbort,
        onStartDictation,
        onDictationInsert,
        onDictationInsertAndSend,
        onDictationSendStart,
        onDictationStart,
        onDictationContentHeightChange,
        onInsertPrompt,
        onReplacePrompt,
        currentPromptText,
        isBtw = false,
        modelSessionId,
        btwSelection,
        pinnedSelection = null,
        onRunInParallel,
        parallelRun = null,
    } = props;

    const dictationEnabled = useConfigStore((state) => state.dictationEnabled);
    const [dictationSupported] = React.useState(() => !isVSCodeRuntime() && isDictationCaptureSupported());
    const showDictation = dictationEnabled && dictationSupported;
    // `/plan …` drafts run the planning agent; the permission chip has nothing to say there.
    const isPlanCommand = Boolean(currentPromptText?.startsWith('/plan '));

    return (
        <div
            className={cn(
                'bg-transparent flex-shrink-0',
                footerPaddingClass,
                isMobile ? 'flex items-center gap-x-1.5' : 'flex w-full select-none flex-col !p-0'
            )}
            style={{
                borderBottomLeftRadius: chatInputRadius,
                borderBottomRightRadius: chatInputRadius,
            }}
            data-chat-input-footer="true"
        >
            {isMobile ? (
                <>
                    <div className="flex w-full items-center justify-between gap-x-1.5">
                        <div className="composer-mobile-actions flex items-center gap-x-2 pl-1">
                            <ComposerAttachmentControls
                                isVSCode={isVSCode}
                                footerIconButtonClass={footerIconButtonClass}
                                iconSizeClass={iconSizeClass}
                                handlePickLocalFiles={onPickLocalFiles}
                                openGitHubPicker={onOpenGitHubPicker}
                                repositoryProvider={repositoryProvider}
                                showLinearPicker={showLinearPicker}
                                openLinearPicker={onOpenLinearPicker}
                                onOpenSettings={isBtw ? undefined : onOpenSettings}
                                onOpenMobileSheet={onOpenAttachSheet}
                                attachGuests={attachGuests}
                                onOpenGuestAttach={onOpenGuestAttach}
                                filesOnly={isBtw}
                            />
                            {!isBtw ? (
                                <ComposerToolsControls
                                    sessionId={currentSessionId}
                                    footerIconButtonClass={footerIconButtonClass}
                                    iconSizeClass={iconSizeClass}
                                    onInsertPrompt={onInsertPrompt}
                                    onReplacePrompt={onReplacePrompt}
                                    currentPromptText={currentPromptText}
                                />
                            ) : null}
                            <PermissionAutoAcceptButton
                                footerIconButtonClass={footerIconButtonClass}
                                iconSizeClass={iconSizeClass}
                                isInteractive={isPermissionAutoAcceptInteractive}
                                permissionMode={permissionMode}
                                handlePermissionModeCycle={onCyclePermissionMode}
                            />
                            {!isBtw ? <SessionGoalButton
                                sessionId={currentSessionId}
                                directory={directory}
                                draftOpen={newSessionDraftOpen}
                                footerIconButtonClass={footerIconButtonClass}
                                iconSizeClass={iconSizeClass}
                            /> : null}
                            {!isBtw ? <SessionGoalObjectiveCounter length={messageLength} /> : null}
                        </div>
                        <div className="flex items-center min-w-0 gap-x-1 justify-end">
                            <div className="flex items-center gap-x-1 flex-shrink-0">
                                {!isBtw && showDictation ? <button
                                    type="button"
                                    className={footerIconButtonClass}
                                    // Keep the soft keyboard open (same guard as
                                    // PermissionAutoAcceptButton); the recording
                                    // engine lives in the wrapper-level
                                    // ComposerDictation instance.
                                    onMouseDown={(event) => event.preventDefault()}
                                    onPointerDownCapture={(event) => {
                                        if (event.pointerType === 'touch') {
                                            event.preventDefault();
                                        }
                                    }}
                                    onClick={onStartDictation}
                                    disabled={dictationActive}
                                    title={t('chat.dictation.start')}
                                    aria-label={t('chat.dictation.start')}
                                >
                                    <Icon name="mic" className={cn(iconSizeClass, 'text-current')} />
                                </button> : null}
                                <ComposerActionButtons
                                    isMobile={isMobile}
                                    footerIconButtonClass={footerIconButtonClass}
                                    sendIconSizeClass={sendIconSizeClass}
                                    stopIconSizeClass={stopIconSizeClass}
                                    canSend={canSend}
                                    canAbort={canAbort}
                                    hasContent={hasContent}
                                    currentSessionId={currentSessionId}
                                    newSessionDraftOpen={newSessionDraftOpen}
                                    onPrimaryAction={onPrimaryAction}
                                    onQueueMessage={onQueueMessage}
                                    onAbort={onAbort}
                                />
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className={cn('flex w-full flex-shrink-0 items-center justify-between gap-2 rounded-b-[4px] bg-[var(--surface-composer)] px-3 pb-2 pt-1', footerGapClass)}>
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                            <ComposerAttachmentControls
                                isVSCode={isVSCode}
                                footerIconButtonClass={TRAY_ICON_BUTTON_CLASS}
                                iconSizeClass="h-4 w-4"
                                handlePickLocalFiles={onPickLocalFiles}
                                openGitHubPicker={onOpenGitHubPicker}
                                repositoryProvider={repositoryProvider}
                                showLinearPicker={showLinearPicker}
                                openLinearPicker={onOpenLinearPicker}
                                onOpenSettings={isBtw ? undefined : onOpenSettings}
                                attachGuests={attachGuests}
                                onOpenGuestAttach={onOpenGuestAttach}
                                filesOnly={isBtw}
                                isExpandedInput={isExpandedInput}
                                onToggleExpandedInput={!isBtw ? onToggleExpandedInput : undefined}
                                onCyclePermissionMode={onCyclePermissionMode}
                            />
                            {!isBtw && isExpandedInput ? <FocusModeButton
                                footerIconButtonClass={TRAY_ICON_BUTTON_CLASS}
                                iconSizeClass="h-4 w-4"
                                isExpandedInput={isExpandedInput}
                                onToggle={onToggleExpandedInput}
                            /> : null}
                            {parallelRun ? (
                                <div className="text-xs text-muted-foreground">{t('chat.parallel.defaultTitle')}</div>
                            ) : isBtw ? (
                                <ModelControls className="min-w-0" sessionId={modelSessionId ?? null} selection={btwSelection} hideAgentSelector />
                            ) : pinnedSelection ? (
                                <ModelControls className="min-w-0" sessionId={currentSessionId} selection={pinnedSelection} agentSelectable hideAgentSelector />
                            ) : (
                                <MemoModelControls className="min-w-0" onRunInParallel={onRunInParallel} hideAgentSelector />
                            )}
                            {!isBtw ? <SessionGoalButton
                                sessionId={currentSessionId}
                                directory={directory}
                                draftOpen={newSessionDraftOpen}
                                footerIconButtonClass={TRAY_ICON_BUTTON_CLASS}
                                iconSizeClass="h-4 w-4"
                                withTooltip
                                onlyWhenActive
                            /> : null}
                            {!isBtw ? <SessionGoalObjectiveCounter length={messageLength} /> : null}
                            {!isBtw ? (
                                // Kept mounted (hidden) so the "+" menu's optimize, metrics,
                                // export and purge actions still reach their dialogs.
                                <div className="hidden" aria-hidden="true">
                                    <ComposerToolsControls
                                        sessionId={currentSessionId}
                                        footerIconButtonClass={footerIconButtonClass}
                                        iconSizeClass={iconSizeClass}
                                        onInsertPrompt={onInsertPrompt}
                                        onReplacePrompt={onReplacePrompt}
                                        currentPromptText={currentPromptText}
                                    />
                                </div>
                            ) : null}
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                            {!isBtw && !isPlanCommand ? (
                                <PermissionModeChip
                                    asChip
                                    isInteractive={isPermissionAutoAcceptInteractive}
                                    permissionMode={permissionMode}
                                    handlePermissionModeCycle={onCyclePermissionMode}
                                    onSelectMode={onSelectPermissionMode}
                                />
                            ) : null}
                            {!isBtw ? <MemoComposerDictation
                                radius={chatInputRadius ?? '15px'}
                                isMobile={false}
                                footerIconButtonClass={`${TRAY_ICON_BUTTON_CLASS} focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`}
                                footerPaddingClass="px-1"
                                iconSizeClass="h-4 w-4"
                                sendIconSizeClass={sendIconSizeClass}
                                onInsert={onDictationInsert}
                                onInsertAndSend={onDictationInsertAndSend}
                                onSendStart={onDictationSendStart}
                                onStart={onDictationStart}
                                onContentHeightChange={onDictationContentHeightChange}
                            /> : null}
                            {parallelRun ? (
                                <ComposerActionButtons
                                    isMobile={isMobile}
                                    footerIconButtonClass={footerIconButtonClass}
                                    sendIconSizeClass={sendIconSizeClass}
                                    stopIconSizeClass={stopIconSizeClass}
                                    canSend={canSend && parallelRun.runCount >= 2 && !parallelRun.launching}
                                    canAbort={false}
                                    hasContent={hasContent}
                                    currentSessionId={currentSessionId}
                                    newSessionDraftOpen={newSessionDraftOpen}
                                    onPrimaryAction={parallelRun.onLaunch}
                                    onQueueMessage={onQueueMessage}
                                    onAbort={onAbort}
                                    sendLabel={t('chat.parallel.runAria', { count: parallelRun.runCount })}
                                />
                            ) : (
                                <ComposerActionButtons
                                    isMobile={isMobile}
                                    footerIconButtonClass={footerIconButtonClass}
                                    sendIconSizeClass={sendIconSizeClass}
                                    stopIconSizeClass={stopIconSizeClass}
                                    canSend={canSend}
                                    canAbort={canAbort}
                                    hasContent={hasContent}
                                    currentSessionId={currentSessionId}
                                    newSessionDraftOpen={newSessionDraftOpen}
                                    onPrimaryAction={onPrimaryAction}
                                    onQueueMessage={onQueueMessage}
                                    onAbort={onAbort}
                                />
                            )}
                        </div>
                    </div>
                    {!isBtw ? <ComposerTray sessionId={currentSessionId} pinnedSelection={pinnedSelection} /> : null}
                </>
            )}
        </div>
    );
}
