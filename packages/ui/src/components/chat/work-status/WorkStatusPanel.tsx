import React from 'react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ScrollShadow } from '@/components/ui/ScrollShadow';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/useUIStore';
import { WORK_STATUS_PANEL_WIDTH } from './useWorkStatusVisibility';
import { WorkStatusGoalRow } from './WorkStatusGoalRow';
import { WorkStatusPrimaryGroup } from './WorkStatusPrimaryGroup';
import { WorkStatusUsageSection } from './WorkStatusUsageSection';
import { WorkStatusTelemetrySection } from './WorkStatusTelemetrySection';
import { WorkStatusSubagentsSection } from './WorkStatusSubagentsSection';
import { WorkStatusMcpSection } from './WorkStatusMcpSection';
import { WorkStatusPinnedSection } from './WorkStatusPinnedSection';
import { WorkStatusContextSection } from './WorkStatusContextSection';
import { WorkStatusSectionsDialog } from './WorkStatusSectionsDialog';
import { WorkStatusExtensionSection } from './WorkStatusExtensionSection';
import { WorkStatusAntigravitySections } from './WorkStatusAntigravitySections';
import {
  areAllWorkStatusSectionsHidden,
  getWorkStatusPanelPresentation,
  isExtensionSectionId,
  isWorkStatusSectionVisible,
  resolveWorkStatusSectionOrder,
  type WorkStatusSectionId,
} from './sections';
import { useWorkStatusExtensionSections } from './useWorkStatusExtensionSections';
import { WorkStatusPresenceProvider } from './presence';
import { Icon } from '@/components/icon/Icon';

type Props = {
  /** Null on a new-session draft: repository readouts still apply. */
  sessionId: string | null;
  directory: string | null;
  /** Managed Chats have no project repository, even if another project remains active. */
  repositoryEnabled?: boolean;
  /** Whether the panel should currently occupy space. */
  visible: boolean;
  /**
   * Floats over the transcript instead of sitting beside it, for when the chat
   * is too narrow to give it a column of its own.
   */
  overlay?: boolean;
};

const PANEL_TRANSITION_MS = 200;
const PANEL_TRANSITION_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

export const WorkStatusPanel: React.FC<Props> = ({ sessionId, directory, visible, repositoryEnabled = true, overlay = false }) => {
  const { t } = useI18n();
  const setScrollTop = useUIStore((state) => state.setWorkStatusScrollTop);
  const setOverlayOpen = useUIStore((state) => state.setWorkStatusOverlayOpen);
  const hiddenSections = useUIStore((state) => state.workStatusHiddenSections);
  const storedOrder = useUIStore((state) => state.workStatusSectionOrder);
  const extensionSections = useWorkStatusExtensionSections();
  const sectionOrder = React.useMemo(
    () => resolveWorkStatusSectionOrder(storedOrder, extensionSections.ids),
    [extensionSections.ids, storedOrder],
  );
  const [sectionsDialogOpen, setSectionsDialogOpen] = React.useState(false);
  const [renderedSections, setRenderedSections] = React.useState(1);
  const sectionVisible = React.useCallback(
    (sectionId: Parameters<typeof isWorkStatusSectionVisible>[1]) =>
      isWorkStatusSectionVisible(hiddenSections, sectionId),
    [hiddenSections],
  );
  const frameRef = React.useRef<number | null>(null);

  const [contentMounted, setContentMounted] = React.useState(visible);
  const allSectionsHidden = areAllWorkStatusSectionsHidden(hiddenSections, extensionSections.ids);
  const { interactive, showEmptyState } = getWorkStatusPanelPresentation({
    visible,
    contentMounted,
    renderedSections,
    allSectionsHidden,
  });
  React.useEffect(() => {
    if (visible) {
      setContentMounted(true);
      return undefined;
    }
    const timer = window.setTimeout(() => setContentMounted(false), PANEL_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [visible]);

  const restore = React.useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const stored = useUIStore.getState().workStatusScrollTop;
    if (stored > 0) node.scrollTop = stored;
  }, []);

  const handleScroll = React.useCallback((event: React.UIEvent<HTMLElement>) => {
    const { scrollTop } = event.currentTarget;
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      setScrollTop(scrollTop);
    });
  }, [setScrollTop]);

  React.useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  React.useEffect(() => {
    setScrollTop(0);
  }, [sessionId, setScrollTop]);

  const overlayRef = React.useRef<HTMLElement | null>(null);
  React.useEffect(() => {
    if (!overlay || !visible || sectionsDialogOpen) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (overlayRef.current?.contains(target)) return;
      if (target?.closest('[data-work-status-toggle]')) return;
      if (target?.closest('[data-work-status-popup]')) return;
      setOverlayOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOverlayOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [overlay, setOverlayOpen, visible, sectionsDialogOpen]);

  const secondarySections = {
    usage: <WorkStatusUsageSection />,
    telemetry: <WorkStatusTelemetrySection sessionId={sessionId} directory={directory} />,
    subagents: null,
    mcp: <WorkStatusMcpSection directory={directory} />,
    pinned: <WorkStatusPinnedSection sessionId={sessionId} directory={directory} />,
    contextSources: <WorkStatusContextSection sessionId={sessionId} directory={directory} />,
  } satisfies Record<Exclude<WorkStatusSectionId, 'session' | 'repository'>, React.ReactNode>;

  return (
    <aside
      ref={overlayRef}
      aria-label={t('chat.workStatus.ariaLabel')}
      aria-hidden={!interactive}
      inert={!interactive}
      className={cn(
        'relative flex shrink-0 flex-col overflow-hidden',
        !overlay && [
          'h-full self-stretch border-l border-[var(--interactive-border)] bg-background',
        ],
        overlay && [
          'absolute right-3 top-3 z-30 mx-0 my-0 self-start',
          'max-h-[calc(100%-1.5rem)] rounded-xl border border-[var(--interactive-border)]',
          'shadow-[0_8px_28px_-8px_rgb(0_0_0_/_0.28)]',
        ],
        'motion-reduce:transition-none',
      )}
      style={{
        width: overlay || interactive ? WORK_STATUS_PANEL_WIDTH : 0,
        opacity: interactive ? 1 : 0,
        transform: visible
          ? 'translateY(0) scale(1)'
          : overlay
            ? 'translateY(-6px) scale(0.98)'
            : `translateX(${WORK_STATUS_PANEL_WIDTH / 4}px)`,
        transformOrigin: 'top right',
        transitionProperty: 'width, opacity, transform, margin',
        transitionDuration: `${PANEL_TRANSITION_MS}ms`,
        transitionTimingFunction: PANEL_TRANSITION_EASING,
        pointerEvents: interactive ? undefined : 'none',
      }}
    >
      <div className={cn('flex min-h-0 flex-1 flex-col', overlay && 'oc-glass-panel')}>
        {contentMounted ? (
          <WorkStatusPresenceProvider onChange={setRenderedSections}>
            <ScrollShadow
              ref={restore}
              onScroll={handleScroll}
              size={24}
              className="oc-hide-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3"
            >
              {sectionVisible('subagents') ? (
                <WorkStatusSubagentsSection sessionId={sessionId} directory={directory} />
              ) : null}
              <WorkStatusAntigravitySections
                sessionId={sessionId}
                directory={directory}
                repositoryEnabled={repositoryEnabled}
              />
              <WorkStatusPrimaryGroup
                sessionId={sessionId}
                directory={directory}
                showSession={sectionVisible('session')}
                showRepository={repositoryEnabled && sectionVisible('repository')}
                goalRow={<WorkStatusGoalRow sessionId={sessionId} directory={directory} />}
              >
                {(primary) => sectionOrder.map((id) => {
                  if (id === 'subagents' || !sectionVisible(id)) return null;
                  if (isExtensionSectionId(id)) {
                    const guest = extensionSections.byId.get(id);
                    return guest ? <WorkStatusExtensionSection key={id} guest={guest} directory={directory} /> : null;
                  }
                  return <React.Fragment key={id}>{id === 'session' || id === 'repository' ? primary[id] : secondarySections[id]}</React.Fragment>;
                })}
              </WorkStatusPrimaryGroup>
              <div className="mt-4 flex items-center justify-end border-t border-[var(--interactive-border)] pt-2">
                <button
                  type="button"
                  onClick={() => setSectionsDialogOpen(true)}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground/75 transition-colors hover:text-foreground"
                >
                  <Icon name="equalizer-2" className="size-3" />
                  <span>{t('chat.workStatus.sections.open')}</span>
                </button>
              </div>
            </ScrollShadow>
          </WorkStatusPresenceProvider>
        ) : null}

        {showEmptyState ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <span className="text-sm text-muted-foreground">{t('chat.workStatus.sections.allHidden')}</span>
            <Button
              variant="link"
              size="xs"
              onClick={() => setSectionsDialogOpen(true)}
              className="mt-2 normal-case text-muted-foreground hover:text-foreground"
            >
              {t('chat.workStatus.sections.open')}
            </Button>
          </div>
        ) : null}
      </div>

      <WorkStatusSectionsDialog open={sectionsDialogOpen} onOpenChange={setSectionsDialogOpen} />
    </aside>
  );
};
