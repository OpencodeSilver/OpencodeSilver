import React, { useEffect } from 'react';
import { useGuestsStore } from '@/lib/guests/store';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useUIStore, type ContextPanelMode } from '@/stores/useUIStore';
import { useEffectiveDirectory } from '@/hooks/useEffectiveDirectory';
import { useContextWindowLimits } from '@/hooks/useContextWindowLimits';
import { useSessionUIStore } from '@/sync/session-ui-store';
import { useSessionWorktreeStore } from '@/sync/session-worktree-store';
import { formatSessionWorktreeBadge } from '@/sync/session-worktree-contract';
import { useGlobalSessionStatus, useSessionMessagesResolved } from '@/sync/sync-context';
import { useDirectoryStore as useAppDirectoryStore } from '@/stores/useDirectoryStore';
import { isChatDirectoryForHome } from '@/lib/chatDirectories';
import { useSessionMessageRecordsForExport } from '@/sync/use-sync';
import { useProjectsStore } from '@/stores/useProjectsStore';
import { useQuotaAutoRefresh, useQuotaStore } from '@/stores/useQuotaStore';
import { useGitBranchLabel } from '@/stores/useGitStore';
import { useGlobalSessionsStore } from '@/stores/useGlobalSessionsStore';
import { archiveUndoToastOptions, collectSessionSubtreeIds } from '@/components/session/sidebar/sessions/sessionSubtreeActions';
import { streamPerfCount } from '@/stores/utils/streamDebug';
import { useFeatureFlagsStore } from '@/stores/useFeatureFlagsStore';

import { useDesktopWindowControlsLayout } from '@/hooks/useDesktopWindowControlsLayout';
import { ContextUsageDisplay } from '@/components/ui/ContextUsageDisplay';
import { toContextUsageReading } from '@/components/ui/contextUsageReading';
import { WindowsWindowControls } from '@/components/desktop/WindowsWindowControls';
import { UpdateDialog } from '@/components/ui/UpdateDialog';
import { useDeviceInfo, useTabletStandalonePwaRuntime } from '@/lib/device';
import { cn } from '@/lib/utils';
import { formatShortcutForDisplay, getEffectiveShortcutCombo, type ShortcutActionId } from '@/lib/shortcuts';
import { useKeybinds } from '@/hooks/useKeybind';
import {
} from '@/lib/quota/model-families';

import {
} from '@/components/ui/collapsible';
import type { SessionContextUsage } from '@/stores/types/sessionTypes';
import { isSameContextUsage } from '@/stores/utils/tokenUtils';
import { DesktopHostSwitcherDialog } from '@/components/desktop/DesktopHostSwitcher';
import { OpenInAppButton } from '@/components/desktop/OpenInAppButton';
import { ProjectActionsButton } from '@/components/layout/ProjectActionsButton';
import { SpaceAccessButton } from '@/components/session/spaces/SpaceAccessButton';
import { SpaceApplyButton } from '@/components/session/spaces/SpaceApplyButton';
import { useProjectActionsContext } from '@/hooks/useProjectActionsContext';
import { SessionSwitcherDropdown } from '@/components/session/SessionSwitcherDropdown';
import { SessionTabsStrip, type SessionTabMenuArgs } from './SessionTabsStrip';
import { SessionMenuItemHint } from '@/components/session/SessionMenuItemHint';
import { HeaderSessionArchiveMenuItem } from './HeaderSessionArchiveMenuItem';
import { canUseElectronDesktopIPC, invokeDesktop, isDesktopLocalOriginActive, isDesktopShell, isVSCodeRuntime, startDesktopWindowDrag, type UpdateInfo } from '@/lib/desktop';
import { desktopHostsGet, redactSensitiveUrl } from '@/lib/desktopHosts';
import {
  LOCAL_HOST_ID,
  buildLocalDesktopHost,
  getLocalDesktopOrigin,
  resolveCurrentDesktopHost,
} from '@/lib/desktopCurrentHost';
import { Icon } from "@/components/icon/Icon";
import { useI18n } from '@/lib/i18n';
import { runtimeFetch } from '@/lib/runtime-fetch';
import { getRuntimeBearerTokenSync } from '@/lib/runtime-auth';
import { getRuntimeApiBaseUrl, subscribeRuntimeEndpointChanged } from '@/lib/runtime-switch';
import { useShallow } from 'zustand/react/shallow';
import type { IconName } from "@/components/icon/icons";
import { toast } from '@/components/ui';
import { copyTextToClipboard } from '@/lib/clipboard';
import { buildExportFilename, downloadAsMarkdown, formatSessionAsMarkdown, saveAsMarkdownDesktop } from '@/lib/exportSession';
import { GuestIcon } from '@/components/layout/GuestRailIcon';
import { useGuestActions } from '@/hooks/useGuestSurfaces';
import { guestSessionActions, type GuestActionEntry } from '@/lib/guests/actions';
import { runGuestSessionAction } from '@/lib/guests/session-action';
import { SessionAiRenameMenuItem } from '@/components/session/SessionAiRenameMenuItem';
import { handleSessionRenameKeyDown } from '@/components/session/sessionRenameKeyboard';
import { useIsSessionAiRenamePending } from '@/sync/use-session-ai-rename';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMultiRunTitle } from '@/lib/multirun/useMultiRuns';
import { buildSessionTreeMoveMessages, requestSessionTreeMove, useIsSessionWorktreeMovePending } from '@/lib/worktrees/sessionWorktreeMove';

const DESKTOP_HEADER_ICON_BUTTON_CLASS = 'app-region-no-drag inline-flex h-8 w-8 items-center justify-center gap-2 rounded-md typography-ui-label font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-interactive-hover transition-colors';

type HeaderIconActionButtonProps = {
  visible?: boolean;
  title: string;
  ariaLabel: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
  Icon: IconName;
  iconClassName?: string;
  pressed?: boolean;
};

const HeaderIconActionButton = React.memo(function HeaderIconActionButton({
  visible = true,
  title,
  ariaLabel,
  onClick,
  className,
  Icon: iconName,
  iconClassName,
  pressed = false,
}: HeaderIconActionButtonProps) {
  if (!visible) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={ariaLabel}
          aria-pressed={pressed}
          className={cn(
            className ?? DESKTOP_HEADER_ICON_BUTTON_CLASS,
            pressed && 'bg-interactive-selection text-interactive-selection-foreground'
          )}
        >
          <Icon name={iconName} className={iconClassName ?? 'h-[18px] w-[18px]'} />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{title}</p>
      </TooltipContent>
    </Tooltip>
  );
});

type DesktopServicesMenuProps = {
  isDesktopApp: boolean;
  currentInstanceLabel: string;
  currentInstanceIsLocal: boolean;
  isDesktopServicesOpen: boolean;
  setIsDesktopServicesOpen: React.Dispatch<React.SetStateAction<boolean>>;
  refreshCurrentInstanceLabel: () => Promise<void>;
  shortcutLabel: (actionId: ShortcutActionId) => string;
  remoteUpdateInfo: UpdateInfo | null;
  remoteUpdateChecking: boolean;
  remoteUpdateError: string | null;
  onOpenRemoteUpdate: () => void;
};

const DesktopServicesMenu = React.memo(function DesktopServicesMenu({
  isDesktopApp,
  currentInstanceLabel,
  currentInstanceIsLocal,
  isDesktopServicesOpen,
  setIsDesktopServicesOpen,
  refreshCurrentInstanceLabel,
  shortcutLabel,
  remoteUpdateInfo,
  remoteUpdateChecking,
  remoteUpdateError,
  onOpenRemoteUpdate,
}: DesktopServicesMenuProps) {
  const { t } = useI18n();
  return (
    <DropdownMenu
      open={isDesktopServicesOpen}
      onOpenChange={(open) => {
        setIsDesktopServicesOpen(open);
        if (open) {
          void refreshCurrentInstanceLabel();
        }
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={isDesktopApp
                ? t('header.services.openWithCurrent', { current: currentInstanceLabel })
                : t('header.services.open')}
              className={cn(
                DESKTOP_HEADER_ICON_BUTTON_CLASS,
                isDesktopApp ? 'w-auto max-w-[20rem] justify-start gap-1.5 px-2.5' : 'h-8 w-8'
              )}
            >
              <Icon name="server" className="h-[18px] w-[18px]" />
              {isDesktopApp ? (
                <span className="truncate typography-ui-label font-medium text-foreground">{currentInstanceLabel}</span>
              ) : null}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {t('header.services.tooltip.currentInstance', {
              current: currentInstanceLabel,
              toggle: shortcutLabel('toggle_services_menu'),
            })}
          </p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="end"
        className="w-[min(27rem,calc(100vw-2rem))] max-h-[75vh] overflow-y-auto p-0"
      >
        {isDesktopApp ? (
          <div>
            {!currentInstanceIsLocal ? (
              <div className="border-b border-[var(--interactive-border)] px-4 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="typography-ui-label font-medium text-foreground">{t('header.services.remoteUpdate.title')}</div>
                    <div className="typography-micro text-muted-foreground">
                      {remoteUpdateInfo?.available
                        ? t('header.services.remoteUpdate.available', { version: remoteUpdateInfo.version || '' })
                        : remoteUpdateChecking
                          ? t('header.services.remoteUpdate.checking')
                          : remoteUpdateError || t('header.services.remoteUpdate.upToDate')}
                    </div>
                  </div>
                  {remoteUpdateInfo?.available ? (
                    <button
                      type="button"
                      className="shrink-0 rounded-md bg-[var(--primary-base)] px-3 py-1.5 typography-ui-label font-medium text-[var(--primary-foreground)] hover:opacity-90"
                      onClick={onOpenRemoteUpdate}
                    >
                      {t('header.services.remoteUpdate.actions.open')}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
            <DesktopHostSwitcherDialog
              embedded
              open={isDesktopServicesOpen}
              onOpenChange={() => {}}
              onHostSwitched={() => setIsDesktopServicesOpen(false)}
            />
          </div>
        ) : null}

      </DropdownMenuContent>
    </DropdownMenu>
  );
});

const normalize = (value: string): string => {
  if (!value) return '';
  const replaced = value.replace(/\\/g, '/');
  return replaced === '/' ? '/' : replaced.replace(/\/+$/, '');
};

const getActiveContextMode = (panelState: {
  isOpen: boolean;
  activeTabId: string | null;
  tabs: Array<{ id: string; mode: ContextPanelMode }>;
} | undefined): ContextPanelMode | null => {
  if (!panelState?.isOpen || !Array.isArray(panelState.tabs) || panelState.tabs.length === 0) {
    return null;
  }

  const activeTab = panelState.tabs.find((tab) => tab.id === panelState.activeTabId) ?? panelState.tabs[panelState.tabs.length - 1];
  return activeTab?.mode ?? null;
};


type HeaderSessionSnapshot = {
  title: string | null;
  directory: string | null;
  created: number | null;
  slug: string | null;
  parentId: string | null;
};

export const Header: React.FC = () => {
  streamPerfCount('ui.header.render');
  const { t } = useI18n();
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const openContextOverview = useUIStore((state) => state.openContextOverview);
  const closeContextPanel = useUIStore((state) => state.closeContextPanel);
  const shortcutOverrides = useUIStore((state) => state.shortcutOverrides);
  const sessionTabsEnabled = useUIStore((state) => state.sessionTabsEnabled);

  const getContextUsage = useSessionUIStore((state) => state.getContextUsage);
  const isNewSessionDraftOpen = useSessionUIStore((state) => Boolean(state.newSessionDraft?.open));
  const currentSessionId = useSessionUIStore((state) => state.currentSessionId);
  const currentSessionMessagesResolved = useSessionMessagesResolved(currentSessionId ?? '');
  const currentSessionStatus = useGlobalSessionStatus(currentSessionId ?? '');
  const isCurrentSessionMovingToWorktree = useIsSessionWorktreeMovePending(currentSessionId ?? '');
  const currentGlobalSession = useGlobalSessionsStore(useShallow(React.useCallback(
    (state): HeaderSessionSnapshot | null => {
      if (!currentSessionId) return null;
       const session = [...state.activeSessions, ...state.archivedSessions]
         .find((candidate) => candidate.id === currentSessionId);
      if (!session) return null;
      const record = session as typeof session & { directory?: string | null; slug?: string | null };
      return {
        title: session.title ?? null,
        directory: record.directory ?? null,
        created: session.time?.created ?? null,
        slug: record.slug ?? null,
        parentId: session.parentID ?? null,
      };
    },
    [currentSessionId],
  )));
  const activeProject = useProjectsStore(useShallow((state) => {
    if (!state.activeProjectId) {
      return null;
    }
    const project = state.projects.find((candidate) => candidate.id === state.activeProjectId);
    return project ? { id: project.id, path: project.path, label: project.label } : null;
  }));
  const activeProjectLabel = React.useMemo(() => {
    if (!activeProject) {
      return null;
    }

    const trimmedLabel = activeProject.label?.trim();
    if (trimmedLabel) {
      return trimmedLabel;
    }

    const pathSegments = activeProject.path.split(/[\\/]/).filter(Boolean);
    return pathSegments[pathSegments.length - 1] ?? null;
  }, [activeProject]);
  const loadQuotaSettings = useQuotaStore((state) => state.loadSettings);

  const { isMobile } = useDeviceInfo();
  const headerRef = React.useRef<HTMLElement | null>(null);

  const [isDesktopApp, setIsDesktopApp] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return isDesktopShell();
  });
  const hasElectronDesktopIPC = React.useMemo(() => canUseElectronDesktopIPC(), []);
  const isTabletStandalonePwa = useTabletStandalonePwaRuntime();
  const [isDesktopWindowFullscreen, setIsDesktopWindowFullscreen] = React.useState(false);

  const isMacPlatform = React.useMemo(() => {
    if (typeof navigator === 'undefined') {
      return false;
    }
    return /Macintosh|Mac OS X/.test(navigator.userAgent || '');
  }, []);

  const { usesFramelessChrome, side: windowControlsSide } = useDesktopWindowControlsLayout();

  const macosMajorVersion = React.useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const injected = (window as unknown as { __OPENCODESILVER_MACOS_MAJOR__?: unknown }).__OPENCODESILVER_MACOS_MAJOR__;
    if (typeof injected === 'number' && Number.isFinite(injected) && injected > 0) {
      return injected;
    }

    // Fallback: WebKit reports "Mac OS X 10_15_7" format where 10 is legacy prefix
    if (typeof navigator === 'undefined') {
      return null;
    }
    const match = (navigator.userAgent || '').match(/Mac OS X (\d+)[._](\d+)/);
    if (!match) {
      return null;
    }
    const first = Number.parseInt(match[1], 10);
    const second = Number.parseInt(match[2], 10);
    if (Number.isNaN(first)) {
      return null;
    }
    return first === 10 ? second : first;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    setIsDesktopApp(isDesktopShell());
  }, []);

  const { context: contextLimit, output: outputLimit } = useContextWindowLimits(currentSessionId);
  const contextUsage = getContextUsage(contextLimit, outputLimit);
  const [stableDesktopContextUsage, setStableDesktopContextUsage] = React.useState<SessionContextUsage | null>(null);
  const isContextUsageResolvedForSession = !currentSessionId || currentSessionMessagesResolved;

  useEffect(() => {
    if (!currentSessionId) {
      setStableDesktopContextUsage((prev) => (prev === null ? prev : null));
      return;
    }

    if (contextUsage) {
      setStableDesktopContextUsage((prev) => (isSameContextUsage(prev, contextUsage) ? prev : contextUsage));
      return;
    }

    if (isContextUsageResolvedForSession) {
      setStableDesktopContextUsage((prev) => (prev === null ? prev : null));
    }
  }, [contextUsage, currentSessionId, isContextUsageResolvedForSession]);

  const [isDesktopServicesOpen, setIsDesktopServicesOpen] = React.useState(false);
  const [currentInstanceLabel, setCurrentInstanceLabel] = React.useState('Local');
  const [currentInstanceIsLocal, setCurrentInstanceIsLocal] = React.useState(true);
  const [remoteUpdateDialogOpen, setRemoteUpdateDialogOpen] = React.useState(false);
  const [remoteUpdateInfo, setRemoteUpdateInfo] = React.useState<UpdateInfo | null>(null);
  const [remoteUpdateChecking, setRemoteUpdateChecking] = React.useState(false);
  const [remoteUpdateError, setRemoteUpdateError] = React.useState<string | null>(null);
  const isVSCode = React.useMemo(() => isVSCodeRuntime(), []);
  // While the work-status panel is on screen it already reports the project,
  // the branch and the context fill — three paces away in the same window.
  // These yield to it rather than saying the same thing twice, and return the
  // moment the panel is switched off or squeezed out by a narrow chat.
  const workStatusPanelVisible = useUIStore((state) => state.workStatusPanelVisible);
  const workStatusPanelEnabled = useUIStore((state) => state.workStatusPanelEnabled);
  const setWorkStatusPanelEnabled = useUIStore((state) => state.setWorkStatusPanelEnabled);
  const workStatusPanelFits = useUIStore((state) => state.workStatusPanelFits);
  const workStatusOverlayOpen = useUIStore((state) => state.workStatusOverlayOpen);
  const setWorkStatusOverlayOpen = useUIStore((state) => state.setWorkStatusOverlayOpen);

  // Two meanings for one button. With room beside the chat it switches the
  // panel on and off. Without room it cannot be shown inline at all, so it
  // reads as off and opens the panel over the chat instead — the stored
  // preference is left alone, so the panel comes back on its own once the
  // window is wide enough again.
  const workStatusPanelShownInline = workStatusPanelEnabled && workStatusPanelFits;
  const workStatusToggleActive = workStatusPanelShownInline || workStatusOverlayOpen;
  const handleWorkStatusToggle = React.useCallback(() => {
    if (workStatusPanelEnabled && !workStatusPanelFits) {
      setWorkStatusOverlayOpen(!workStatusOverlayOpen);
      return;
    }
    setWorkStatusPanelEnabled(!workStatusPanelEnabled);
  }, [setWorkStatusOverlayOpen, setWorkStatusPanelEnabled, workStatusOverlayOpen, workStatusPanelEnabled, workStatusPanelFits]);
  const showDesktopHeaderContextUsage = !isVSCode
    && !workStatusPanelVisible
    && !!stableDesktopContextUsage;

  const refreshCurrentInstanceLabel = React.useCallback(async () => {
    if (typeof window === 'undefined' || !isDesktopApp) {
      return;
    }

    try {
      if (isDesktopLocalOriginActive()) {
        setCurrentInstanceLabel('Local');
        setCurrentInstanceIsLocal(true);
        return;
      }
      setCurrentInstanceIsLocal(false);

      // Same resolution the host switcher's own header uses, so the button and
      // the panel it opens can never disagree about which instance this is.
      const cfg = await desktopHostsGet();
      const localOrigin = getLocalDesktopOrigin();
      const resolved = resolveCurrentDesktopHost([buildLocalDesktopHost(localOrigin), ...cfg.hosts]);

      if (resolved.id === LOCAL_HOST_ID) {
        setCurrentInstanceLabel('Local');
        setCurrentInstanceIsLocal(true);
        return;
      }

      setCurrentInstanceLabel(redactSensitiveUrl(resolved.label.trim() || 'Instance'));
    } catch {
      setCurrentInstanceLabel('Local');
      setCurrentInstanceIsLocal(true);
    }
  }, [isDesktopApp]);

  useEffect(() => {
    void refreshCurrentInstanceLabel();
    // Switching instances does not remount the header, so without this the
    // button would keep naming the instance the window left behind.
    return subscribeRuntimeEndpointChanged(() => {
      void refreshCurrentInstanceLabel();
    });
  }, [refreshCurrentInstanceLabel]);

  const checkRemoteInstanceUpdate = React.useCallback(async () => {
    if (currentInstanceIsLocal) {
      setRemoteUpdateInfo(null);
      setRemoteUpdateError(null);
      return;
    }

    setRemoteUpdateChecking(true);
    setRemoteUpdateError(null);
    try {
      // Status-only poll: must not count as usage on the remote server's install id.
      const params = new URLSearchParams({ appType: 'web', instanceMode: 'remote', reportUsage: 'false' });
      const response = await runtimeFetch(`/api/opencodesilver/update-check?${params.toString()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      const data = await response.json();
      setRemoteUpdateInfo({
        available: data.available ?? false,
        version: data.version,
        currentVersion: data.currentVersion ?? 'unknown',
        body: data.body,
        nextSuggestedCheckInSec: typeof data.nextSuggestedCheckInSec === 'number' ? data.nextSuggestedCheckInSec : undefined,
        packageManager: data.packageManager,
        updateCommand: data.updateCommand,
      });
    } catch (error) {
      setRemoteUpdateInfo(null);
      setRemoteUpdateError(error instanceof Error ? error.message : t('header.services.remoteUpdate.error'));
    } finally {
      setRemoteUpdateChecking(false);
    }
  }, [currentInstanceIsLocal, t]);

  React.useEffect(() => {
    setRemoteUpdateInfo(null);
    setRemoteUpdateError(null);
    setRemoteUpdateDialogOpen(false);
  }, [currentInstanceIsLocal, currentInstanceLabel]);

  React.useEffect(() => {
    if (!isDesktopApp || currentInstanceIsLocal) {
      return;
    }

    const initialDelayMs = 3000;
    const intervalMs = 60 * 60 * 1000;
    let disposed = false;
    let timer: number | null = null;

    const schedule = (delayMs: number) => {
      timer = window.setTimeout(() => {
        if (disposed || (typeof document !== 'undefined' && document.visibilityState !== 'visible')) {
          schedule(intervalMs);
          return;
        }
        void checkRemoteInstanceUpdate().finally(() => {
          if (!disposed) {
            schedule(intervalMs);
          }
        });
      }, delayMs);
    };

    schedule(initialDelayMs);

    return () => {
      disposed = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [checkRemoteInstanceUpdate, currentInstanceIsLocal, currentInstanceLabel, isDesktopApp]);

  const openRemoteInstanceUpdate = React.useCallback(() => {
    if (remoteUpdateInfo?.available) {
      setRemoteUpdateDialogOpen(true);
      return;
    }
    void checkRemoteInstanceUpdate();
  }, [checkRemoteInstanceUpdate, remoteUpdateInfo?.available]);

  useQuotaAutoRefresh();

  React.useEffect(() => {
    void loadQuotaSettings();
  }, [loadQuotaSettings]);


  const currentSessionSnapshot = currentSessionId
    ? currentGlobalSession ?? null
    : null;

  const lastResolvedSessionRef = React.useRef<{
    sessionId: string;
    session: HeaderSessionSnapshot;
    expiresAt: number;
  } | null>(null);
  const [sessionFallbackVersion, setSessionFallbackVersion] = React.useState(0);

  React.useEffect(() => {
    if (!currentSessionId) {
      if (lastResolvedSessionRef.current) {
        lastResolvedSessionRef.current = null;
        setSessionFallbackVersion((value) => value + 1);
      }
      return;
    }

    if (currentSessionSnapshot) {
      lastResolvedSessionRef.current = {
        sessionId: currentSessionId,
        session: currentSessionSnapshot,
        expiresAt: Date.now() + 2000,
      };
      return;
    }

    const cached = lastResolvedSessionRef.current;
    if (!cached || cached.sessionId !== currentSessionId) {
      return;
    }

    const remainingMs = cached.expiresAt - Date.now();
    if (remainingMs <= 0) {
      lastResolvedSessionRef.current = null;
      setSessionFallbackVersion((value) => value + 1);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (lastResolvedSessionRef.current?.sessionId === currentSessionId) {
        lastResolvedSessionRef.current = null;
      }
      setSessionFallbackVersion((value) => value + 1);
    }, remainingMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentSessionId, currentSessionSnapshot]);

  void sessionFallbackVersion;
  const currentSession = (() => {
    if (currentSessionSnapshot) {
      return currentSessionSnapshot;
    }

    if (!currentSessionId) {
      return null;
    }

    const cached = lastResolvedSessionRef.current;
    if (cached && cached.sessionId === currentSessionId && cached.expiresAt > Date.now()) {
      return cached.session;
    }

    return null;
  })();

  const worktreePath = useSessionUIStore((state) => {
    if (!currentSessionId) return '';
    return state.worktreeMetadata.get(currentSessionId)?.path ?? '';
  });
  const currentSessionWorktreeBranch = useSessionUIStore((state) => {
    if (!currentSessionId) return null;
    return state.worktreeMetadata.get(currentSessionId)?.branch?.trim() ?? null;
  });

  // Authoritative session↔worktree attachment from session-worktree-store
  const worktreeAttachment = useSessionWorktreeStore((state) =>
    currentSessionId ? state.getAttachment(currentSessionId) : undefined
  );

  const worktreeBadge = React.useMemo(() => {
    if (!worktreeAttachment) return null;
    return formatSessionWorktreeBadge(worktreeAttachment, {
      pending: t('gitView.empty.worktreeSetupInProgress'),
      missing: t('sessions.sidebar.group.worktreeMissing'),
    });
  }, [t, worktreeAttachment]);

  const worktreeBadgeKind = React.useMemo(() => {
    if (!worktreeAttachment) return null;
    if (worktreeAttachment.legacy) return 'legacy';
    if (worktreeAttachment.degraded) return 'degraded';
    if (worktreeAttachment.worktreeStatus === 'pending') return 'pending';
    if (worktreeAttachment.worktreeStatus === 'missing') return 'missing';
    if (worktreeAttachment.worktreeStatus === 'invalid') return 'invalid';
    if (worktreeAttachment.attentionReason) return 'attention';
    return null;
  }, [worktreeAttachment]);
  const worktreeDirectory = React.useMemo(() => {
    return normalize(worktreePath || '');
  }, [worktreePath]);

  const sessionDirectory = React.useMemo(() => {
    const raw = typeof currentSession?.directory === 'string' ? currentSession.directory : '';
    return normalize(raw || '');
  }, [currentSession?.directory]);
  const isCurrentSessionAiRenaming = useIsSessionAiRenamePending(currentSessionId ?? '', sessionDirectory);

  const draftDirectory = useSessionUIStore((state) => {
    if (!state.newSessionDraft?.open) {
      return '';
    }
    return normalize(state.newSessionDraft.bootstrapPendingDirectory ?? state.newSessionDraft.directoryOverride ?? '');
  });
  const draftTarget = useSessionUIStore((state) => state.newSessionDraft.target);
  const draftProjectId = useSessionUIStore((state) => state.newSessionDraft.selectedProjectId);
  const selectedSessionDirectory = useSessionUIStore((state) => state.currentSessionDirectory);
  const homeDirectory = useAppDirectoryStore((state) => state.homeDirectory);
  const effectiveDirectory = useEffectiveDirectory();

  const openDirectory = React.useMemo(() => {
    return worktreeDirectory || sessionDirectory || draftDirectory;
  }, [draftDirectory, sessionDirectory, worktreeDirectory]);

  const resolvedHeaderDirectory = React.useMemo(() => {
    return normalize(effectiveDirectory || openDirectory || homeDirectory || '__global__');
  }, [effectiveDirectory, homeDirectory, openDirectory]);

  const activeContextMode = useUIStore(React.useCallback((state) => {
    return resolvedHeaderDirectory ? getActiveContextMode(state.contextPanelByDirectory[resolvedHeaderDirectory]) : null;
  }, [resolvedHeaderDirectory]));

  const catalogWorktreeBranch = useSessionUIStore((state) => {
    const candidateDirectory = normalize(worktreeDirectory || sessionDirectory || '');
    if (!candidateDirectory) {
      return null;
    }

    for (const worktrees of state.availableWorktreesByProject.values()) {
      const match = worktrees.find((worktree) => normalize(worktree.path) === candidateDirectory);
      const branch = match?.branch?.trim();
      if (branch) {
        return branch;
      }
    }

    return null;
  });

  const gitBranchForDirectory = useGitBranchLabel(openDirectory || null);
  const currentBranchLabel = gitBranchForDirectory || currentSessionWorktreeBranch || catalogWorktreeBranch;
  const isChatContext = isNewSessionDraftOpen
    ? draftTarget === 'chat'
    : isChatDirectoryForHome(sessionDirectory || selectedSessionDirectory, homeDirectory);

  // Whether the title carries a second line under it. Hoisted because the
  // session menu's vertical alignment depends on the same answer.
  const showHeaderMetaRow = !isChatContext && !workStatusPanelVisible
    && Boolean(activeProjectLabel || currentBranchLabel || (!isNewSessionDraftOpen && worktreeBadgeKind));


  const currentSessionTitle = React.useMemo(() => {
    if (!currentSessionId) {
      return activeProjectLabel ?? 'OpencodeSilver';
    }
    const trimmedTitle = currentSession?.title?.trim();
    return trimmedTitle && trimmedTitle.length > 0 ? trimmedTitle : 'Untitled Session';
  }, [activeProjectLabel, currentSession?.title, currentSessionId]);
  const loadSessionRecords = useSessionMessageRecordsForExport();
  const updateSessionTitle = useSessionUIStore((state) => state.updateSessionTitle);
  const archiveSessions = useSessionUIStore((state) => state.archiveSessions);
  const deleteSessions = useSessionUIStore((state) => state.deleteSessions);
  const [isRenamingHeaderSession, setIsRenamingHeaderSession] = React.useState(false);
  const [isHeaderSessionMenuOpen, setIsHeaderSessionMenuOpen] = React.useState(false);
  /** Session id whose rename was requested from a tab menu; survives the
      activation that a Rename on an inactive tab performs first. */
  const pendingHeaderRenameRef = React.useRef<string | null>(null);
  const [headerSessionTitleDraft, setHeaderSessionTitleDraft] = React.useState('');
  const [pendingHeaderRetentionAction, setPendingHeaderRetentionAction] = React.useState<{ action: 'archive' | 'delete'; sessionId: string } | null>(null);
  const headerRenameFormRef = React.useRef<HTMLFormElement | null>(null);


  const beginHeaderSessionRename = React.useCallback(() => {
    if (!currentSessionId) return;
    setHeaderSessionTitleDraft(currentSession?.title?.trim() || currentSessionTitle);
    setIsRenamingHeaderSession(true);
  }, [currentSession?.title, currentSessionId, currentSessionTitle]);

  const beginHeaderSessionRenameRef = React.useRef(beginHeaderSessionRename);
  beginHeaderSessionRenameRef.current = beginHeaderSessionRename;

  // The rename field opens with the whole title selected, so the first
  // keystroke replaces it. Stable ref callback: an inline one would re-run on
  // every render and re-select the text mid-edit.
  const focusHeaderRenameInput = React.useCallback((node: HTMLInputElement | null) => {
    if (!node) return;
    node.focus();
    node.select();
  }, []);

  React.useEffect(() => {
    setIsHeaderSessionMenuOpen(false);
    setPendingHeaderRetentionAction(null);
    if (currentSessionId && pendingHeaderRenameRef.current === currentSessionId) {
      // Rename on an inactive tab activates it first; the switch itself is
      // when the rename can begin (the menu may close before or after it).
      pendingHeaderRenameRef.current = null;
      beginHeaderSessionRenameRef.current();
      return;
    }
    setIsRenamingHeaderSession(false);
    setHeaderSessionTitleDraft('');
  }, [currentSessionId]);

  const saveHeaderSessionRename = React.useCallback(async () => {
    if (!currentSessionId) return;
    const title = headerSessionTitleDraft.trim();
    if (title && title !== currentSession?.title?.trim()) {
      await updateSessionTitle(currentSessionId, title);
    }
    setIsRenamingHeaderSession(false);
  }, [currentSession?.title, currentSessionId, headerSessionTitleDraft, updateSessionTitle]);

  React.useEffect(() => {
    if (!isRenamingHeaderSession) return;
    const handleDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target || !headerRenameFormRef.current?.contains(target)) {
        void saveHeaderSessionRename();
      }
    };
    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, [isRenamingHeaderSession, saveHeaderSessionRename]);

  const copySessionIdFor = React.useCallback((sessionId: string) => {
    if (!sessionId) return;
    void copyTextToClipboard(sessionId).then((result) => {
      toast[result.ok ? 'success' : 'error'](t(result.ok
        ? 'sessions.sidebar.session.copyId.success'
        : 'sessions.sidebar.session.copyId.error'));
    }).catch(() => toast.error(t('sessions.sidebar.session.copyId.error')));
  }, [t]);

  const exportCurrentSession = React.useCallback(async () => {
    if (!currentSessionId || !openDirectory) {
      toast.error(t('sessions.sidebar.session.export.nothingToExport'));
      return;
    }
    const records = await loadSessionRecords({ sessionID: currentSessionId, directory: openDirectory }).catch(() => null);
    if (!records) {
      toast.error(t('sessions.sidebar.session.export.failedLoadHistory'));
      return;
    }
    if (records.length === 0) {
      toast.error(t('sessions.sidebar.session.export.nothingToExport'));
      return;
    }
    const markdown = formatSessionAsMarkdown(records, currentSession?.title ?? null);
    const filename = buildExportFilename(currentSession?.title ?? null);
    const savedPath = await saveAsMarkdownDesktop(markdown, filename);
    if (!savedPath) downloadAsMarkdown(markdown, filename);
    toast.success(t('sessions.sidebar.session.export.success'));
  }, [currentSession?.title, currentSessionId, loadSessionRecords, openDirectory, t]);

  // Extension session actions on the current session. The conversation is
  // loaded the same way Export as Markdown loads it.
  const guestActionEntries = useGuestActions();
  const guestSessionActionEntries = React.useMemo(() => guestSessionActions(guestActionEntries), [guestActionEntries]);
  const runCurrentSessionGuestAction = React.useCallback((entry: GuestActionEntry) => {
    if (!currentSessionId) return;
    void runGuestSessionAction({
      entry,
      t,
      session: { id: currentSessionId, title: currentSession?.title, directory: sessionDirectory ?? openDirectory },
      loadRecords: async () => {
        if (!openDirectory) return null;
        try {
          return await loadSessionRecords({ sessionID: currentSessionId, directory: openDirectory });
        } catch {
          return null;
        }
      },
      onLoadFailed: () => toast.error(t('sessions.sidebar.session.export.failedLoadHistory')),
    });
  }, [currentSession?.title, currentSessionId, loadSessionRecords, openDirectory, sessionDirectory, t]);
  const renderGuestSessionActionItems = React.useCallback((Item: React.ElementType) => guestSessionActionEntries.map((entry) => (
    <Item key={`${entry.guest.id}:${entry.action.id}`} onClick={() => runCurrentSessionGuestAction(entry)}>
      <GuestIcon icon={entry.icon} iconSrc={entry.iconSrc} className="mr-1 size-4" />{entry.action.label}
    </Item>
  )), [guestSessionActionEntries, runCurrentSessionGuestAction]);

  const isCurrentSessionActive = currentSessionStatus?.type === 'busy' || currentSessionStatus?.type === 'retry';
  const moveCurrentSessionToWorktree = React.useCallback(() => {
    if (!currentSessionId || !sessionDirectory || isCurrentSessionActive || isCurrentSessionMovingToWorktree) return;
    const sessions = useGlobalSessionsStore.getState().activeSessions;
    const root = sessions.find((session) => session.id === currentSessionId);
    if (!root) return;

    const descendants: typeof sessions = [];
    const pendingParentIds = [currentSessionId];
    for (let index = 0; index < pendingParentIds.length; index += 1) {
      const parentId = pendingParentIds[index];
      for (const session of sessions) {
        if (session.parentID !== parentId) continue;
        descendants.push(session);
        pendingParentIds.push(session.id);
      }
    }

    requestSessionTreeMove({
      kind: 'quick',
      root,
      descendants,
      sourceDirectory: sessionDirectory,
      messages: buildSessionTreeMoveMessages(t, {
        success: 'sessions.sidebar.session.moveToWorktree.success',
        failure: 'sessions.sidebar.session.moveToWorktree.failed',
      }),
    });
  }, [currentSessionId, isCurrentSessionActive, isCurrentSessionMovingToWorktree, sessionDirectory, t]);

  const runHeaderRetentionAction = React.useCallback(async (action: 'archive' | 'delete', sessionId: string) => {
    const ids = [sessionId, ...collectSessionSubtreeIds(sessionId, [], action === 'delete')];
    const reopenId = useSessionUIStore.getState().currentSessionId === sessionId ? sessionId : null;
    if (action === 'delete') {
      const { failedIds } = await deleteSessions(ids);
      if (failedIds.length > 0) toast.error(t('sessions.sidebar.session.delete.error'));
      else toast.success(t('sessions.sidebar.session.delete.success'));
      return;
    }
    const { archivedIds, failedIds } = await archiveSessions(ids);
    if (failedIds.length > 0) {
      toast.error(t('sessions.sidebar.session.archive.error'));
      return;
    }
    toast.success(t('sessions.sidebar.session.archive.success'), archiveUndoToastOptions(archivedIds, reopenId, t));
  }, [archiveSessions, deleteSessions, t]);

  const confirmHeaderRetentionAction = React.useCallback(async () => {
    if (!pendingHeaderRetentionAction) return;
    const { action, sessionId } = pendingHeaderRetentionAction;
    setPendingHeaderRetentionAction(null);
    await runHeaderRetentionAction(action, sessionId);
  }, [pendingHeaderRetentionAction, runHeaderRetentionAction]);

  // Full-page surfaces (Scheduled, Archive, Worktrees, Spaces, run overview) replace the
  // chat area; while one is open the header shows the surface identity
  // instead of the session switcher.
  const openGuestPageId = useUIStore((state) => state.openGuestPageId);
  const guestPage = useGuestsStore((state) => state.guests.find((guest) => guest.id === openGuestPageId));
  const isScheduledSurfaceOpen = useUIStore((state) => state.isScheduledTasksDialogOpen);
  const isArchiveSurfaceOpen = useUIStore((state) => state.isArchivePageOpen);
  const isUsageStatsSurfaceOpen = useUIStore((state) => state.isUsageStatsPageOpen);
  const worktreesSurfaceProjectId = useUIStore((state) => state.worktreesPageProjectId);
  const spacesSurfaceProjectId = useUIStore((state) => (state.isolatedSpacesEnabled ? state.spacesPageProjectId : null));
  const runOverviewKey = useUIStore((state) => state.runOverviewKey);
  const overviewRunTitle = useMultiRunTitle(runOverviewKey);
  const surfaceProjectId = worktreesSurfaceProjectId ?? spacesSurfaceProjectId;
  const surfaceProjectLabel = useProjectsStore((state) => {
    if (!surfaceProjectId) return null;
    const project = state.projects.find((entry) => entry.id === surfaceProjectId);
    return project?.label?.trim() || project?.path?.split('/').pop() || null;
  });
  const activeSurfaceHeader = React.useMemo<{ title: string; subtitle: string | null } | null>(() => {
    if (guestPage) return { title: guestPage.pageTitle ?? guestPage.name, subtitle: null };
    if (isScheduledSurfaceOpen) {
      return { title: t('sessions.scheduledTasks.dialog.title'), subtitle: null };
    }
    if (isArchiveSurfaceOpen) {
      return { title: t('sessions.archivePage.title'), subtitle: null };
    }
    if (isUsageStatsSurfaceOpen) {
      return { title: t('usageStats.title'), subtitle: null };
    }
    if (worktreesSurfaceProjectId) {
      return {
        title: t('sessions.worktreesPage.title', { project: surfaceProjectLabel ?? '' }),
        subtitle: null,
      };
    }
    if (spacesSurfaceProjectId) {
      return { title: t('spaces.page.title', { project: surfaceProjectLabel ?? '' }), subtitle: null };
    }
    if (runOverviewKey) {
      return { title: overviewRunTitle ?? t('multirun.overview.headerTitle'), subtitle: t('multirun.overview.headerTitle') };
    }
    return null;
  }, [guestPage, isArchiveSurfaceOpen, overviewRunTitle, runOverviewKey, isScheduledSurfaceOpen, isUsageStatsSurfaceOpen, spacesSurfaceProjectId, surfaceProjectLabel, t, worktreesSurfaceProjectId]);


  const actionDirectory = React.useMemo(() => {
    return normalize(openDirectory || activeProject?.path || '');
  }, [activeProject?.path, openDirectory]);

  // Same resolution the titlebar overlay used to own: worktree → session →
  // draft → project path, sticky across session switches.
  const projectActionsContext = useProjectActionsContext();


  const planModeEnabled = useFeatureFlagsStore((state) => state.planModeEnabled);
  const isSessionPlanAvailable = useSessionUIStore((state) => state.isSessionPlanAvailable);
  const planTabAvailable = planModeEnabled && currentSessionId ? isSessionPlanAvailable(currentSessionId) : false;
  const lastPlanSessionKeyRef = React.useRef<string>('');

  // Reset plan tab availability when session changes
  React.useEffect(() => {
    if (!planModeEnabled) {
      return;
    }

    if (!currentSessionId) return;

    const sessionKey = `${currentSessionId || 'none'}:${sessionDirectory || 'none'}:${currentSession?.created || 0}:${currentSession?.slug || 'none'}`;
    if (lastPlanSessionKeyRef.current !== sessionKey) {
      lastPlanSessionKeyRef.current = sessionKey;
    }
  }, [
    planModeEnabled,
    planTabAvailable,
    currentSession?.slug,
    currentSession?.created,
    currentSessionId,
    sessionDirectory,
  ]);

  const handleOpenDraftMiniChat = React.useCallback(() => {
    void invokeDesktop('desktop_open_draft_mini_chat_window', {
      directory: isChatContext ? '' : draftDirectory,
      projectId: isChatContext ? null : draftProjectId,
      apiBaseUrl: getRuntimeApiBaseUrl(),
      clientToken: getRuntimeBearerTokenSync(),
    }).catch((error) => {
      console.warn('[header] failed to open draft mini chat window', error);
    });
  }, [draftDirectory, draftProjectId, isChatContext]);

  const handleOpenCurrentMiniChat = React.useCallback(() => {
    if (isNewSessionDraftOpen) {
      handleOpenDraftMiniChat();
      return;
    }

    if (!currentSessionId) {
      return;
    }
    void invokeDesktop('desktop_open_session_mini_chat_window', {
      sessionId: currentSessionId,
      directory: sessionDirectory || normalize(selectedSessionDirectory || '') || worktreeDirectory,
      apiBaseUrl: getRuntimeApiBaseUrl(),
      clientToken: getRuntimeBearerTokenSync(),
    }).catch((error) => {
      console.warn('[header] failed to open session mini chat window', error);
    });
  }, [currentSessionId, handleOpenDraftMiniChat, isNewSessionDraftOpen, selectedSessionDirectory, sessionDirectory, worktreeDirectory]);

  const handleOpenContextPanel = React.useCallback(() => {
    const directory = resolvedHeaderDirectory;
    if (!directory) {
      return;
    }

    const panelState = useUIStore.getState().contextPanelByDirectory[directory];
    if (getActiveContextMode(panelState) === 'context') {
      closeContextPanel(directory);
      return;
    }

    openContextOverview(directory);
  }, [closeContextPanel, openContextOverview, resolvedHeaderDirectory]);

  const isContextPanelActive = activeContextMode === 'context';



  const desktopHeaderIconButtonClass = DESKTOP_HEADER_ICON_BUTTON_CLASS;
  // Left padding the header needs to clear the OS window controls (macOS
  // traffic lights / window-controls-overlay). When the sidebar is open this
  // space is owned by the sidebar's top strip instead, so the header drops back
  // to its normal content padding. The full value is published as
  // `--oc-titlebar-left-inset` so the sidebar strip can mirror it.
  const titlebarLeftInset = React.useMemo(() => {
    if (isDesktopApp && isMacPlatform && !isDesktopWindowFullscreen) {
      // Native traffic lights have a fixed physical footprint. Keep this
      // clearance in pixels so shrinking the interface cannot overlap them.
      return '88px';
    }
    if (isTabletStandalonePwa) {
      return 'max(calc(0.75rem + var(--oc-wco-left-inset, 0px)), 5.5rem)';
    }
    if ((!isDesktopApp || usesFramelessChrome) && !isVSCode) {
      return 'calc(0.75rem + var(--oc-wco-left-inset, 0px))';
    }
    return '0.75rem';
  }, [isDesktopApp, isDesktopWindowFullscreen, isMacPlatform, isTabletStandalonePwa, isVSCode, usesFramelessChrome]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.style.setProperty('--oc-titlebar-left-inset', titlebarLeftInset);
  }, [titlebarLeftInset]);

  // Space reserved on the header's left for the persistent overlay when the
  // sidebar is collapsed (the overlay sits over the header then). Split into two
  // spacers so the strip stays a window drag area while the buttons stay
  // clickable: a drag region for the window-controls inset (traffic lights) and
  // a no-drag carve under the control cluster. Both animate so the session title
  // slides in/out in lockstep with the sidebar. When the sidebar is open the
  // overlay is over the sidebar, so the header only keeps normal content padding.
  const headerInsetSpacerWidth = isSidebarOpen ? '0.75rem' : 'var(--oc-titlebar-left-inset, 0.75rem)';
  const headerControlsSpacerWidth = isSidebarOpen
    ? '0px'
    : 'calc(var(--oc-titlebar-controls-width, 5.5rem) + 0.5rem)';

  useEffect(() => {
    if (!isDesktopApp || !isMacPlatform) {
      setIsDesktopWindowFullscreen(false);
      return;
    }

    let disposed = false;

    const syncFullscreenState = async () => {
      try {
        const fullscreen = await invokeDesktop<boolean>('desktop_is_window_fullscreen');
        if (!disposed) {
          setIsDesktopWindowFullscreen(fullscreen === true);
        }
      } catch {
        if (!disposed) {
          setIsDesktopWindowFullscreen(false);
        }
      }
    };

    const onResize = () => {
      void syncFullscreenState();
    };

    void syncFullscreenState();
    window.addEventListener('opencodesilver:window-resized', onResize);

    return () => {
      disposed = true;
      window.removeEventListener('opencodesilver:window-resized', onResize);
    };
  }, [isDesktopApp, isMacPlatform]);

  const macosHeaderSizeClass = React.useMemo(() => {
    if (!isDesktopApp || !isMacPlatform || macosMajorVersion === null) {
      return '';
    }
    if (macosMajorVersion >= 26) {
      return 'h-12';
    }
    if (macosMajorVersion <= 15) {
      return 'h-14';
    }
    return '';
  }, [isDesktopApp, isMacPlatform, macosMajorVersion]);

  // Native window controls keep a fixed physical footprint, so their clearance
  // must be expressed in pixels. The interface font-size setting scales the
  // root rem unit, so a rem-based height floor collapses with it and lets
  // sidebar content slide underneath the macOS traffic lights. Mirrors the
  // pixel `--oc-titlebar-left-inset` above. macOS <= 15 uses the taller 56px
  // titlebar that `macosHeaderSizeClass` also encodes.
  const titlebarMinHeight = React.useMemo(() => {
    if (isDesktopApp && isMacPlatform && !isDesktopWindowFullscreen) {
      return macosMajorVersion !== null && macosMajorVersion <= 15 ? '56px' : '48px';
    }
    return '0px';
  }, [isDesktopApp, isDesktopWindowFullscreen, isMacPlatform, macosMajorVersion]);

  const headerChromeStyle = React.useMemo<React.CSSProperties>(() => {
    // Height is owned by the native chrome floor plus the browser's
    // window-controls overlay. The rem term keeps the header growing with the
    // interface scale on runtimes that have no native controls to clear.
    const height = `max(3rem, ${titlebarMinHeight}, var(--oc-wco-titlebar-height, 0px))`;

    // VS Code and non-frameless desktop size their own header, and frameless
    // Electron with right-side controls keeps the pr-0 class and no inline
    // padding so the close button sits flush with the window corner.
    const sizesItsOwnHeader = (isDesktopApp && !usesFramelessChrome) || isVSCode;
    const rightEdgeOwnedByInWindowControls = usesFramelessChrome && windowControlsSide === 'right';

    if (sizesItsOwnHeader && titlebarMinHeight === '0px') {
      return {};
    }

    const style: React.CSSProperties = { minHeight: height, height };
    if (!sizesItsOwnHeader && !rightEdgeOwnedByInWindowControls) {
      // Left inset is handled by the no-drag spacer (see renderDesktop); only
      // the right inset is owned by the window-controls overlay.
      style.paddingRight = 'calc(0.75rem + var(--oc-wco-right-inset, 0px))';
    }
    return style;
  }, [isDesktopApp, isVSCode, titlebarMinHeight, usesFramelessChrome, windowControlsSide]);

  const updateHeaderHeight = React.useCallback(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const height = headerRef.current?.getBoundingClientRect().height;
    if (height) {
      document.documentElement.style.setProperty('--oc-header-height', `${height}px`);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    updateHeaderHeight();

    const node = headerRef.current;
    if (!node || typeof ResizeObserver === 'undefined') {
      return () => { };
    }

    let rafId = 0;
    const scheduleUpdate = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        updateHeaderHeight();
      });
    };

    const observer = new ResizeObserver(scheduleUpdate);

    observer.observe(node);
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('orientationchange', scheduleUpdate);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('orientationchange', scheduleUpdate);
    };
  }, [updateHeaderHeight]);

  useEffect(() => {
    updateHeaderHeight();
  }, [updateHeaderHeight, isMobile, macosHeaderSizeClass]);

  const handleDragStart = React.useCallback(async (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.app-region-no-drag')) {
      return;
    }
    if (target.closest('button, a, input, select, textarea')) {
      return;
    }
    if (e.button !== 0) {
      return;
    }
    if (isDesktopApp) {
      await startDesktopWindowDrag();
    }
  }, [isDesktopApp]);

  const shortcutLabel = React.useCallback((actionId: ShortcutActionId) => {
    return formatShortcutForDisplay(getEffectiveShortcutCombo(actionId, shortcutOverrides));
  }, [shortcutOverrides]);



  useKeybinds({
    rename_current_session: () => {
      if (!currentSessionId || isMobile) return false;
      beginHeaderSessionRename();
    },
    archive_current_session: () => {
      if (!currentSessionId || isMobile) return false;
      if (useGlobalSessionsStore.getState().entityById.get(currentSessionId)?.time.archived) return false;
      if (useUIStore.getState().showDeletionDialog) {
        setPendingHeaderRetentionAction({ action: 'archive', sessionId: currentSessionId });
        return;
      }
      void runHeaderRetentionAction('archive', currentSessionId);
    },
    toggle_services_menu: () => {
      if (isDesktopServicesOpen) {
        setIsDesktopServicesOpen(false);
        return;
      }
      setIsDesktopServicesOpen(true);
      void refreshCurrentInstanceLabel();
    },
  });

  const openContextSurface = useUIStore((state) => state.openContextSurface);
  const toggleContextPanelExpanded = useUIStore((state) => state.toggleContextPanelExpanded);

  const isFilesModeTabActive =
    activeContextMode === 'file' ||
    activeContextMode === 'git' ||
    activeContextMode === 'diff' ||
    activeContextMode === 'pr' ||
    activeContextMode === 'walkthrough' ||
    activeContextMode === 'context';

  const isTerminalPreviewModeTabActive =
    activeContextMode === 'terminal' ||
    activeContextMode === 'browser' ||
    activeContextMode === 'plan' ||
    activeContextMode === 'notes' ||
    activeContextMode === 'chat';

  const isOverviewModeTabActive = !activeContextMode && workStatusToggleActive;

  const handleSelectOverviewTab = React.useCallback(() => {
    const dir = resolvedHeaderDirectory;
    if (dir && activeContextMode) {
      closeContextPanel(dir);
    }
    if (!workStatusToggleActive) {
      handleWorkStatusToggle();
    }
  }, [activeContextMode, closeContextPanel, handleWorkStatusToggle, resolvedHeaderDirectory, workStatusToggleActive]);

  const handleSelectFilesTab = React.useCallback(() => {
    const dir = resolvedHeaderDirectory;
    if (!dir) return;
    if (isFilesModeTabActive) return;
    openContextSurface(dir, 'file');
  }, [isFilesModeTabActive, openContextSurface, resolvedHeaderDirectory]);

  const handleSelectTerminalTab = React.useCallback(() => {
    const dir = resolvedHeaderDirectory;
    if (!dir) return;
    if (isTerminalPreviewModeTabActive) return;
    openContextSurface(dir, 'terminal');
  }, [isTerminalPreviewModeTabActive, openContextSurface, resolvedHeaderDirectory]);

  const handleInspectorToggle = React.useCallback(() => {
    const dir = resolvedHeaderDirectory;
    if (dir && activeContextMode) {
      closeContextPanel(dir);
      return;
    }
    handleWorkStatusToggle();
  }, [activeContextMode, closeContextPanel, handleWorkStatusToggle, resolvedHeaderDirectory]);

  const desktopSidebarActions = (
    <div className="app-region-no-drag flex shrink-0 items-center gap-1">
      {projectActionsContext ? (
        <ProjectActionsButton
          projectRef={projectActionsContext.projectRef}
          directory={projectActionsContext.directory}
          className="mr-0.5"
        />
      ) : null}
      <SpaceApplyButton directory={openDirectory} className={cn(DESKTOP_HEADER_ICON_BUTTON_CLASS, 'text-muted-foreground hover:text-foreground')} iconClassName="h-[18px] w-[18px]" />
      <SpaceAccessButton directory={openDirectory} className={cn(DESKTOP_HEADER_ICON_BUTTON_CLASS, 'text-muted-foreground hover:text-foreground')} iconClassName="h-[18px] w-[18px]" />
      {isDesktopApp ? (
        <DesktopServicesMenu
          isDesktopApp={isDesktopApp}
          currentInstanceLabel={currentInstanceLabel}
          currentInstanceIsLocal={currentInstanceIsLocal}
          isDesktopServicesOpen={isDesktopServicesOpen}
          setIsDesktopServicesOpen={setIsDesktopServicesOpen}
          refreshCurrentInstanceLabel={refreshCurrentInstanceLabel}
          shortcutLabel={shortcutLabel}
          remoteUpdateInfo={remoteUpdateInfo}
          remoteUpdateChecking={remoteUpdateChecking}
          remoteUpdateError={remoteUpdateError}
          onOpenRemoteUpdate={openRemoteInstanceUpdate}
        />
      ) : null}
      <OpenInAppButton directory={actionDirectory} />
    </div>
  );

  const showMiniChatHeaderAction = hasElectronDesktopIPC && (isNewSessionDraftOpen || Boolean(currentSessionId));

  const renderSessionTabMenu = React.useCallback(({ session, open, isActive, select, closeOtherTabs, components }: SessionTabMenuArgs) => {
    const { Item, Separator } = components;
    const canMoveToWorktree = isActive && !isVSCode && !isChatContext && currentSession && !currentSession.parentId;
    return (
      <>
        <SessionMenuItemHint hint={t('sessions.sidebar.session.menuHint.rename')}>
          <Item onClick={() => { if (!isActive) select(); pendingHeaderRenameRef.current = session.id; }}>
            <Icon name="pencil-ai" className="mr-1 size-4" />{t('sessions.sidebar.session.menu.rename')}
          </Item>
        </SessionMenuItemHint>
        <SessionAiRenameMenuItem sessionID={session.id} directory={session.directory} open={open} Item={Item} />
        <SessionMenuItemHint hint={t('sessions.sidebar.session.menuHint.copyId')}>
          <Item onClick={() => copySessionIdFor(session.id)}>
            <Icon name="file-copy" className="mr-1 size-4" />{t('sessions.sidebar.session.menu.copyId')}
          </Item>
        </SessionMenuItemHint>
        <Separator />
        {isActive ? (
          <SessionMenuItemHint hint={t('sessions.sidebar.session.menuHint.exportMarkdown')}>
            <Item onClick={() => void exportCurrentSession()}>
              <Icon name="download" className="mr-1 size-4" />{t('sessions.sidebar.session.menu.exportMarkdown')}
            </Item>
          </SessionMenuItemHint>
        ) : null}
        {isActive ? renderGuestSessionActionItems(Item) : null}
        {canMoveToWorktree ? (
          <SessionMenuItemHint hint={isCurrentSessionMovingToWorktree
            ? t('sessions.sidebar.session.moveToWorktree.tooltipMoving')
            : isCurrentSessionActive
              ? t('sessions.sidebar.session.moveToWorktree.tooltipBusy')
              : t('sessions.sidebar.session.moveToWorktree.tooltip')}>
            <span className="block">
              <Item
                disabled={!sessionDirectory || isCurrentSessionActive || isCurrentSessionMovingToWorktree}
                onClick={moveCurrentSessionToWorktree}
                className="w-full"
              >
                <Icon name="folder-shared" className="mr-1 size-4" />
                {t('sessions.sidebar.session.menu.moveToWorktree')}
              </Item>
            </span>
          </SessionMenuItemHint>
        ) : null}
        <Separator />
        <SessionMenuItemHint hint={t('sessions.sidebar.session.menuHint.closeOtherTabs')}>
          <Item onClick={closeOtherTabs}>
            <Icon name="close-circle" className="mr-1 size-4" />{t('header.sessionTabs.closeOtherTabs')}
          </Item>
        </SessionMenuItemHint>
        <Separator />
        <HeaderSessionArchiveMenuItem
          sessionId={session.id}
          Item={Item}
          onArchive={() => setPendingHeaderRetentionAction({ action: 'archive', sessionId: session.id })}
        />
        <SessionMenuItemHint hint={t('sessions.sidebar.session.menuHint.delete')}>
          <Item className="text-destructive focus:text-destructive" onClick={() => setPendingHeaderRetentionAction({ action: 'delete', sessionId: session.id })}>
            <Icon name="delete-bin" className="mr-1 size-4" />{t('sessions.sidebar.bulkActions.delete')}
          </Item>
        </SessionMenuItemHint>
      </>
    );
  }, [copySessionIdFor, currentSession, exportCurrentSession, isChatContext, isCurrentSessionActive, isCurrentSessionMovingToWorktree, isVSCode, moveCurrentSessionToWorktree, renderGuestSessionActionItems, sessionDirectory, t]);

  const renderDesktop = () => (
    <div
      onMouseDown={handleDragStart}
      className={cn(
        'app-region-drag relative flex h-12 select-none items-center',
        usesFramelessChrome && windowControlsSide === 'right' ? 'pr-0' : 'pr-3',
        macosHeaderSizeClass
      )}
      style={headerChromeStyle}
      role="tablist"
      aria-label={t('header.navigation.mainAria')}
    >
      {/* Drag region for the window-controls inset (traffic lights) to the left
          of the overlay buttons — stays a window drag area. */}
      <div
        aria-hidden
        className="shrink-0 self-stretch transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{ width: headerInsetSpacerWidth }}
      />
      {/* No-drag carve under the persistent TitlebarLeftControls overlay so its
          buttons stay clickable. Width animates with the sidebar so the session
          title slides in lockstep instead of snapping. */}
      <div
        aria-hidden
        className="app-region-no-drag shrink-0 self-stretch transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{ width: headerControlsSpacerWidth }}
      />
      {/* Sidebar toggle + project actions live in the persistent
          TitlebarLeftControls overlay; the spacers above reserve its footprint
          while the sidebar is closed. */}
      <div className="flex min-w-0 flex-1 items-center">
        {activeSurfaceHeader ? (
          <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="app-region-no-drag mr-1 text-muted-foreground hover:bg-transparent hover:text-foreground"
                aria-label={t('header.mainSurface.backToChat')}
                onClick={() => useUIStore.getState().closeMainSurfaces()}
              >
                <Icon name="arrow-left" className="size-[18px]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('header.mainSurface.backToChat')}</TooltipContent>
          </Tooltip>
          <div className="mr-3 flex min-w-0 flex-col items-start px-1 py-0.5 -my-0.5 text-left">
            <span className="truncate typography-ui-label text-[14px] font-normal leading-tight text-foreground max-w-full">
              {activeSurfaceHeader.title}
            </span>
            {activeSurfaceHeader.subtitle ? (
              <span className="truncate typography-micro text-[10.5px] font-normal leading-tight text-muted-foreground/75 max-w-full">
                {activeSurfaceHeader.subtitle}
              </span>
            ) : null}
          </div>
          </>
        ) : (isVSCode || !sessionTabsEnabled) ? (
          <div className="app-region-no-drag mr-3 flex min-w-0 max-w-full items-center gap-1 py-0.5 -my-0.5 text-left">
            {isCurrentSessionAiRenaming ? <Icon name="loader-4" className="mr-1 size-3 shrink-0 animate-spin text-primary" aria-label={t('sessions.aiRename.generating')} /> : null}
            {!isSidebarOpen ? (
              <SessionSwitcherDropdown align="start">
                <button
                  type="button"
                  className={desktopHeaderIconButtonClass}
                  aria-label={t('sessions.switcher.openAria')}
                >
                  <Icon name="history" className="h-[18px] w-[18px]" />
                </button>
              </SessionSwitcherDropdown>
            ) : null}
            <div
              className="flex min-w-0 flex-col justify-center px-1"
              onDoubleClick={() => {
                if (currentSessionId && !isNewSessionDraftOpen) {
                  beginHeaderSessionRename();
                }
              }}
            >
              {isRenamingHeaderSession ? (
                <form
                  ref={headerRenameFormRef}
                  className="flex w-full min-w-0 items-center gap-2 leading-tight"
                  onPointerDown={(event) => event.stopPropagation()}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveHeaderSessionRename();
                  }}
                >
                  <input
                    ref={focusHeaderRenameInput}
                    value={headerSessionTitleDraft}
                    onChange={(event) => setHeaderSessionTitleDraft(event.target.value)}
                    onKeyDown={(event) => handleSessionRenameKeyDown(event, () => setIsRenamingHeaderSession(false))}
                    placeholder={t('sessions.sidebar.session.menu.rename')}
                    className="min-w-0 flex-1 bg-transparent typography-ui-label text-[14px] font-normal leading-tight outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="submit"
                    aria-label={t('sessions.sidebar.session.rename.save')}
                    title={t('sessions.sidebar.session.rename.save')}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <Icon name="check" className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRenamingHeaderSession(false)}
                    aria-label={t('sessions.sidebar.session.rename.cancel')}
                    title={t('sessions.sidebar.session.rename.cancel')}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <Icon name="close" className="size-4" />
                  </button>
                </form>
              ) : (
                <span dir="auto" className="truncate typography-ui-label text-[13.5px] font-normal leading-tight text-foreground max-w-full">
                  {activeProjectLabel && !isChatContext ? (
                    <>
                      <span className="text-muted-foreground">{activeProjectLabel}</span>
                      <span className="mx-1.5 text-muted-foreground/60">/</span>
                    </>
                  ) : null}
                  <span>{isNewSessionDraftOpen ? 'New Conversation' : currentSessionTitle}</span>
                </span>
              )}
              {showHeaderMetaRow ? (
                <span className={cn(
                  'flex min-w-0 max-w-full items-center gap-1.5 truncate font-normal leading-tight',
                  'typography-micro text-[10.5px] text-muted-foreground/75',
                )}>
                  {currentBranchLabel ? (
                    <span className="inline-flex min-w-0 items-center gap-0.5">
                      <Icon name="git-branch" className="h-3 w-3 flex-shrink-0 text-muted-foreground/70" />
                      <span className="truncate">{currentBranchLabel}</span>
                    </span>
                  ) : null}
                  {!isNewSessionDraftOpen && worktreeBadgeKind ? (
                    <span className={cn(
                      "inline-flex min-w-0 items-center gap-0.5",
                      worktreeBadgeKind === 'attention' || worktreeBadgeKind === 'invalid' || worktreeBadgeKind === 'missing' ? 'text-status-warning' : 'text-muted-foreground/60'
                    )}>
                      <Icon name="alert" className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{worktreeBadge}</span>
                    </span>
                  ) : null}
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="app-region-no-drag flex h-full min-w-0 flex-1 items-center gap-0.5 text-left">
            {!isSidebarOpen ? (
              <SessionSwitcherDropdown align="start">
                <button
                  type="button"
                  className={desktopHeaderIconButtonClass}
                  aria-label={t('sessions.switcher.openAria')}
                >
                  <Icon name="history" className="h-[18px] w-[18px]" />
                </button>
              </SessionSwitcherDropdown>
            ) : null}
            <SessionTabsStrip
              renderMenu={renderSessionTabMenu}
              suppressActiveTabControls={isRenamingHeaderSession}
              onMenuOpenChangeComplete={(open) => {
                if (!open && pendingHeaderRenameRef.current && pendingHeaderRenameRef.current === currentSessionId) {
                  pendingHeaderRenameRef.current = null;
                  beginHeaderSessionRename();
                }
              }}
            >
            <div className="flex min-w-0 flex-col justify-center">
              {isRenamingHeaderSession ? (
                <form
                  ref={headerRenameFormRef}
                  className="flex w-full min-w-0 items-center gap-2 leading-tight"
                  onPointerDown={(event) => event.stopPropagation()}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveHeaderSessionRename();
                  }}
                >
                  <input
                    ref={focusHeaderRenameInput}
                    value={headerSessionTitleDraft}
                    onChange={(event) => setHeaderSessionTitleDraft(event.target.value)}
                    onKeyDown={(event) => handleSessionRenameKeyDown(event, () => setIsRenamingHeaderSession(false))}
                    placeholder={t('sessions.sidebar.session.menu.rename')}
                    className="min-w-0 flex-1 bg-transparent text-[13px] font-medium leading-4 outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="submit"
                    aria-label={t('sessions.sidebar.session.rename.save')}
                    title={t('sessions.sidebar.session.rename.save')}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <Icon name="check" className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRenamingHeaderSession(false)}
                    aria-label={t('sessions.sidebar.session.rename.cancel')}
                    title={t('sessions.sidebar.session.rename.cancel')}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <Icon name="close" className="size-4" />
                  </button>
                </form>
              ) : (
                <span dir="auto" className="block overflow-hidden whitespace-nowrap text-left text-[13px] font-medium leading-4 text-foreground max-w-full">
                  {activeProjectLabel && !isChatContext ? (
                    <>
                      <span className="text-muted-foreground">{activeProjectLabel}</span>
                      <span className="mx-1 text-muted-foreground/60">/</span>
                    </>
                  ) : null}
                  {isNewSessionDraftOpen ? t('sessions.switcher.draftTitle') : currentSessionTitle}
                </span>
              )}
            </div>
            </SessionTabsStrip>
          </div>
        )}

        {activeSurfaceHeader || isVSCode || !sessionTabsEnabled ? <div className="flex-1" /> : null}

        {/* Center-Right Cluster: Context Usage + ⋮ Session Menu + Open IDE Button */}
        <div className="app-region-no-drag flex shrink-0 items-center gap-1">
          {showDesktopHeaderContextUsage && stableDesktopContextUsage ? (
            <ContextUsageDisplay
              reading={toContextUsageReading(stableDesktopContextUsage)}
              contextLimit={stableDesktopContextUsage.contextLimit}
              outputLimit={stableDesktopContextUsage.outputLimit ?? 0}
              size="compact"
              hideIcon
              showPercentIcon
              onClick={handleOpenContextPanel}
              pressed={isContextPanelActive}
              className="mr-1"
              valueClassName="typography-ui-label font-medium leading-none text-foreground"
              percentIconClassName="h-4.5 w-4.5"
            />
          ) : null}

          <HeaderIconActionButton
            visible={showMiniChatHeaderAction}
            title={isNewSessionDraftOpen ? t('header.actions.newMiniChat') : t('header.actions.openSessionMiniChat')}
            ariaLabel={isNewSessionDraftOpen ? t('header.actions.newMiniChatAria') : t('header.actions.openSessionMiniChatAria')}
            onClick={handleOpenCurrentMiniChat}
            className={desktopHeaderIconButtonClass}
            Icon={'picture-in-picture-2'}
          />

          {/* Vertical '⋮' Menu (Image B: positioned right before 'Open IDE') */}
          <DropdownMenu
            open={isHeaderSessionMenuOpen}
            onOpenChange={setIsHeaderSessionMenuOpen}
            onOpenChangeComplete={(open) => {
              if (!open && pendingHeaderRenameRef.current && pendingHeaderRenameRef.current === currentSessionId) {
                pendingHeaderRenameRef.current = null;
                beginHeaderSessionRename();
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(desktopHeaderIconButtonClass, 'h-7 w-7 text-muted-foreground hover:text-foreground')}
                aria-label={t('header.sessionActions.openAria')}
              >
                <Icon name="more-2" className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              {currentSessionId && !isNewSessionDraftOpen ? (
                <>
                  <SessionMenuItemHint hint={t('sessions.sidebar.session.menuHint.rename')}>
                    <DropdownMenuItem onClick={() => { pendingHeaderRenameRef.current = currentSessionId; }}>
                      <Icon name="pencil-ai" className="mr-1 size-4" />
                      {t('sessions.sidebar.session.menu.rename')}
                    </DropdownMenuItem>
                  </SessionMenuItemHint>
                  <SessionAiRenameMenuItem sessionID={currentSessionId} directory={sessionDirectory} open={isHeaderSessionMenuOpen} Item={DropdownMenuItem} />
                  <SessionMenuItemHint hint={t('sessions.sidebar.session.menuHint.copyId')}>
                    <DropdownMenuItem onClick={() => currentSessionId && copySessionIdFor(currentSessionId)}>
                      <Icon name="file-copy" className="mr-1 size-4" />
                      {t('sessions.sidebar.session.menu.copyId')}
                    </DropdownMenuItem>
                  </SessionMenuItemHint>
                  <DropdownMenuSeparator />
                  <SessionMenuItemHint hint={t('sessions.sidebar.session.menuHint.exportMarkdown')}>
                    <DropdownMenuItem onClick={() => void exportCurrentSession()}>
                      <Icon name="download" className="mr-1 size-4" />
                      {t('sessions.sidebar.session.menu.exportMarkdown')}
                    </DropdownMenuItem>
                  </SessionMenuItemHint>
                  {renderGuestSessionActionItems(DropdownMenuItem)}
                  {!isVSCode && !isChatContext && currentSession && !currentSession.parentId ? (
                    <SessionMenuItemHint
                      hint={
                        isCurrentSessionMovingToWorktree
                          ? t('sessions.sidebar.session.moveToWorktree.tooltipMoving')
                          : isCurrentSessionActive
                            ? t('sessions.sidebar.session.moveToWorktree.tooltipBusy')
                            : t('sessions.sidebar.session.moveToWorktree.tooltip')
                      }
                    >
                      <span className="block">
                        <DropdownMenuItem
                          disabled={!sessionDirectory || isCurrentSessionActive || isCurrentSessionMovingToWorktree}
                          onClick={moveCurrentSessionToWorktree}
                          className="w-full"
                        >
                          <Icon name="folder-shared" className="mr-1 size-4" />
                          {t('sessions.sidebar.session.menu.moveToWorktree')}
                        </DropdownMenuItem>
                      </span>
                    </SessionMenuItemHint>
                  ) : null}
                  <DropdownMenuSeparator />
                  <HeaderSessionArchiveMenuItem
                    sessionId={currentSessionId}
                    Item={DropdownMenuItem}
                    onArchive={() => setPendingHeaderRetentionAction({ action: 'archive', sessionId: currentSessionId })}
                  />
                  <SessionMenuItemHint hint={t('sessions.sidebar.session.menuHint.delete')}>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        if (currentSessionId) setPendingHeaderRetentionAction({ action: 'delete', sessionId: currentSessionId });
                      }}
                    >
                      <Icon name="delete-bin" className="mr-1 size-4" />
                      {t('sessions.sidebar.bulkActions.delete')}
                    </DropdownMenuItem>
                  </SessionMenuItemHint>
                </>
              ) : (
                <DropdownMenuItem onClick={() => useUIStore.getState().setSettingsDialogOpen(true)}>
                  <Icon name="settings-3" className="mr-1 size-4" />
                  <span>{t('sessions.sidebar.footer.actions.settings')}</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {desktopSidebarActions}

          {/* Antigravity v2 Right Inspector Mode Tabs + Actions (Image B right header zone) */}
          {!isVSCode ? (
            <div className="ml-2 flex items-center gap-1 border-l border-border pl-2.5">
              {/* 3 Mode Tabs: 1. Overview, 2. Files & Diffs, 3. Terminal/Preview/Plan */}
              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      data-work-status-toggle="true"
                      onClick={handleSelectOverviewTab}
                      aria-pressed={isOverviewModeTabActive}
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                        isOverviewModeTabActive
                          ? 'bg-interactive-selection text-foreground'
                          : 'text-muted-foreground hover:bg-interactive-hover/60 hover:text-foreground',
                      )}
                      aria-label={t('ag.header.missionControlOverview')}
                    >
                      <Icon name="layout-right" className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t('ag.header.overview')}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      disabled={!resolvedHeaderDirectory}
                      onClick={handleSelectFilesTab}
                      aria-pressed={isFilesModeTabActive}
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-40',
                        isFilesModeTabActive
                          ? 'bg-interactive-selection text-foreground'
                          : 'text-muted-foreground hover:bg-interactive-hover/60 hover:text-foreground',
                      )}
                      aria-label={t('ag.header.filesAndDiffs')}
                    >
                      <Icon name="folder" className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t('ag.header.filesAndDiffs')}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      disabled={!resolvedHeaderDirectory}
                      onClick={handleSelectTerminalTab}
                      aria-pressed={isTerminalPreviewModeTabActive}
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-40',
                        isTerminalPreviewModeTabActive
                          ? 'bg-interactive-selection text-foreground'
                          : 'text-muted-foreground hover:bg-interactive-hover/60 hover:text-foreground',
                      )}
                      aria-label={t('ag.header.terminalBrowserPlan')}
                    >
                      <Icon name="window" className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t('ag.header.terminalBrowserPlan')}</TooltipContent>
                </Tooltip>
              </div>

              {/* Far-right Inspector Controls: '+', Expand, Hide/Show Inspector */}
              <div className="ml-2 flex items-center gap-0.5">
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          disabled={!resolvedHeaderDirectory}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-interactive-hover/60 hover:text-foreground disabled:opacity-40"
                          aria-label={t('ag.header.openSurfaceTab')}
                        >
                          <Icon name="add" className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t('ag.header.openSurfaceTab')}</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="min-w-[185px]">
                    <DropdownMenuItem
                      disabled={!resolvedHeaderDirectory}
                      onClick={() => resolvedHeaderDirectory && openContextSurface(resolvedHeaderDirectory, 'file')}
                    >
                      <Icon name="folder" className="mr-2 size-4 text-muted-foreground" />
                      <span>{t('contextPanel.mode.files')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!resolvedHeaderDirectory}
                      onClick={() => resolvedHeaderDirectory && openContextSurface(resolvedHeaderDirectory, 'git')}
                    >
                      <Icon name="git-branch" className="mr-2 size-4 text-muted-foreground" />
                      <span>{t('layout.rightSidebar.git')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!resolvedHeaderDirectory}
                      onClick={() => resolvedHeaderDirectory && openContextSurface(resolvedHeaderDirectory, 'diff')}
                    >
                      <Icon name="layout-column" className="mr-2 size-4 text-muted-foreground" />
                      <span>{t('contextPanel.mode.diff')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!resolvedHeaderDirectory}
                      onClick={() => resolvedHeaderDirectory && openContextSurface(resolvedHeaderDirectory, 'pr')}
                    >
                      <Icon name="git-pull-request" className="mr-2 size-4 text-muted-foreground" />
                      <span>{t('ag.header.pullRequests')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!resolvedHeaderDirectory}
                      onClick={() => resolvedHeaderDirectory && openContextSurface(resolvedHeaderDirectory, 'walkthrough')}
                    >
                      <Icon name="git-merge" className="mr-2 size-4 text-muted-foreground" />
                      <span>{t('contextPanel.mode.walkthrough')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={!resolvedHeaderDirectory}
                      onClick={() => resolvedHeaderDirectory && openContextSurface(resolvedHeaderDirectory, 'terminal')}
                    >
                      <Icon name="terminal-box" className="mr-2 size-4 text-muted-foreground" />
                      <span>{t('layout.mainTab.terminal')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!resolvedHeaderDirectory}
                      onClick={() => resolvedHeaderDirectory && openContextSurface(resolvedHeaderDirectory, 'browser')}
                    >
                      <Icon name="global" className="mr-2 size-4 text-muted-foreground" />
                      <span>{t('ag.header.browserPreview')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!resolvedHeaderDirectory}
                      onClick={() => resolvedHeaderDirectory && openContextSurface(resolvedHeaderDirectory, 'plan')}
                    >
                      <Icon name="edit" className="mr-2 size-4 text-muted-foreground" />
                      <span>{t('contextPanel.mode.plan')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!resolvedHeaderDirectory}
                      onClick={() => resolvedHeaderDirectory && openContextSurface(resolvedHeaderDirectory, 'notes')}
                    >
                      <Icon name="book" className="mr-2 size-4 text-muted-foreground" />
                      <span>{t('contextRail.surface.notes')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      disabled={!resolvedHeaderDirectory}
                      onClick={() => {
                        if (!resolvedHeaderDirectory) return;
                        if (activeContextMode) {
                          toggleContextPanelExpanded(resolvedHeaderDirectory);
                        } else {
                          handleOpenContextPanel();
                        }
                      }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-interactive-hover/60 hover:text-foreground disabled:opacity-40"
                      aria-label={t('ag.header.expandInspector')}
                    >
                      <Icon name="fullscreen" className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t('ag.header.expandInspector')}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      data-work-status-toggle="true"
                      onClick={handleInspectorToggle}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-interactive-hover/60 hover:text-foreground"
                      aria-label={t('header.workStatusPanel.toggleAria')}
                    >
                      <Icon name="layout-right" className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{t('ag.header.hideInspector')}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          ) : null}

          <WindowsWindowControls visible={usesFramelessChrome && windowControlsSide === 'right'} position="right" />
        </div>
      </div>
    </div>
  );

  // The divider lives on the chat content wrapper instead of the header, so it
  // doesn't run between the header and the right sidebar (they read as one
  // continuous surface).
  const headerClassName = 'header-safe-area relative z-10 bg-background';

  return (
    <>
      <header
        ref={headerRef}
        className={headerClassName}
        style={{ ['--padding-scale' as string]: '1' } as React.CSSProperties}
      >
        {renderDesktop()}
      </header>
      <Dialog open={pendingHeaderRetentionAction !== null} onOpenChange={(open) => { if (!open) setPendingHeaderRetentionAction(null); }}>
        <DialogContent showCloseButton={false} className="max-w-sm gap-5">
          <DialogHeader>
            <DialogTitle>{pendingHeaderRetentionAction?.action === 'delete'
              ? t('sessions.sidebar.dialogs.deleteSession.title')
              : t('sessions.sidebar.dialogs.archiveSession.title')}</DialogTitle>
            <DialogDescription>{pendingHeaderRetentionAction?.action === 'delete'
              ? t('sessions.sidebar.dialogs.deleteSession.single', { sessionTitle: currentSessionTitle })
              : t('sessions.sidebar.dialogs.archiveSession.single', { sessionTitle: currentSessionTitle })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPendingHeaderRetentionAction(null)}>
              {t('sessions.sidebar.dialogs.cancel')}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => void confirmHeaderRetentionAction()}>
              {pendingHeaderRetentionAction?.action === 'delete'
                ? t('sessions.sidebar.bulkActions.delete')
                : t('sessions.sidebar.bulkActions.archive')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <UpdateDialog
        open={remoteUpdateDialogOpen}
        onOpenChange={setRemoteUpdateDialogOpen}
        info={remoteUpdateInfo}
        downloading={false}
        downloaded={false}
        progress={null}
        error={remoteUpdateError}
        onDownload={() => {}}
        onRestart={() => {}}
        runtimeType="web"
      />
    </>
  );
};
