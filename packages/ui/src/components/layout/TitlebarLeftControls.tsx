import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Icon } from '@/components/icon/Icon';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';
import { useSessionUIStore } from '@/sync/session-ui-store';
import { useI18n } from '@/lib/i18n';
import { WindowsWindowControls } from '@/components/desktop/WindowsWindowControls';
import { formatShortcutForDisplay, getEffectiveShortcutCombo } from '@/lib/shortcuts';
import { invokeDesktop } from '@/lib/desktop';
import { useDesktopWindowControlsLayout } from '@/hooks/useDesktopWindowControlsLayout';

const ICON_BUTTON_CLASS =
  'app-region-no-drag inline-flex h-8 w-8 items-center justify-center gap-2 rounded-md typography-ui-label font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-interactive-hover transition-colors';

/**
 * Persistent top-left titlebar controls (app menu on frameless chrome + sidebar toggle).
 *
 * Rendered exactly once as an absolutely-positioned overlay above both the
 * sidebar and the header, so the buttons never migrate / re-mount between the
 * two while the sidebar animates open or closed — the panels slide *underneath*
 * a fixed control cluster instead. Its height tracks `--oc-header-height` and
 * its left padding clears the OS window controls via `--oc-titlebar-left-inset`.
 * The cluster's measured width is published as `--oc-titlebar-controls-width`
 * so the header can reserve matching space when the sidebar is collapsed.
 */
export const TitlebarLeftControls: React.FC = () => {
  const { t, locale } = useI18n();
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const shortcutOverrides = useUIStore((state) => state.shortcutOverrides);
  const currentSessionId = useSessionUIStore((state) => state.currentSessionId);
  const currentSessionDirectory = useSessionUIStore((state) => state.currentSessionDirectory);
  const setCurrentSession = useSessionUIStore((state) => state.setCurrentSession);
  const clusterRef = React.useRef<HTMLDivElement | null>(null);

  const historyRef = React.useRef<{ entries: Array<{ id: string; directory: string | null }>; index: number; navigating: boolean }>({
    entries: [],
    index: -1,
    navigating: false,
  });
  const [navState, setNavState] = React.useState({ canGoBack: false, canGoForward: false });

  React.useEffect(() => {
    if (!currentSessionId) return;
    const h = historyRef.current;
    if (h.navigating) {
      h.navigating = false;
      setNavState({
        canGoBack: h.index > 0,
        canGoForward: h.index >= 0 && h.index < h.entries.length - 1,
      });
      return;
    }
    const currentEntry = h.entries[h.index];
    if (currentEntry?.id === currentSessionId) {
      return;
    }
    const nextEntries = h.entries.slice(0, h.index + 1);
    nextEntries.push({ id: currentSessionId, directory: currentSessionDirectory ?? null });
    if (nextEntries.length > 50) {
      nextEntries.shift();
    }
    h.entries = nextEntries;
    h.index = nextEntries.length - 1;
    setNavState({
      canGoBack: h.index > 0,
      canGoForward: false,
    });
  }, [currentSessionId, currentSessionDirectory]);

  const handleGoBack = React.useCallback(() => {
    const h = historyRef.current;
    if (h.index <= 0) return;
    h.index -= 1;
    const target = h.entries[h.index];
    if (!target) return;
    h.navigating = true;
    useUIStore.getState().closeMainSurfaces();
    setCurrentSession(target.id, target.directory);
    setNavState({
      canGoBack: h.index > 0,
      canGoForward: h.index < h.entries.length - 1,
    });
  }, [setCurrentSession]);

  const handleGoForward = React.useCallback(() => {
    const h = historyRef.current;
    if (h.index < 0 || h.index >= h.entries.length - 1) return;
    h.index += 1;
    const target = h.entries[h.index];
    if (!target) return;
    h.navigating = true;
    useUIStore.getState().closeMainSurfaces();
    setCurrentSession(target.id, target.directory);
    setNavState({
      canGoBack: h.index > 0,
      canGoForward: h.index < h.entries.length - 1,
    });
  }, [setCurrentSession]);

  const toggleShortcut = formatShortcutForDisplay(getEffectiveShortcutCombo('toggle_sidebar', shortcutOverrides));
  const handleNewSession = React.useCallback(() => {
    useUIStore.getState().closeMainSurfaces();
    useSessionUIStore.getState().openNewSessionDraft();
  }, []);
  const { usesFramelessChrome, side: windowControlsSide } = useDesktopWindowControlsLayout();

  const handleOpenWindowsAppMenu = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    void invokeDesktop('desktop_show_app_menu', {
      x: rect.left,
      y: rect.bottom,
      locale,
    }).catch((error) => {
      console.warn('[titlebar] failed to open app menu', error);
    });
  }, [locale]);

  React.useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const node = clusterRef.current;
    if (!node) {
      return;
    }

    const publishWidth = () => {
      const width = Math.max(node.getBoundingClientRect().width, node.scrollWidth);
      document.documentElement.style.setProperty('--oc-titlebar-controls-width', `${Math.round(width)}px`);
    };

    publishWidth();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(publishWidth);
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      className="app-region-no-drag absolute left-0 top-0 z-30 flex select-none items-center pr-2"
      style={{
        height: 'var(--oc-header-height, 3rem)',
        paddingLeft: 'var(--oc-titlebar-left-inset, 0.75rem)',
      }}
    >
      <div ref={clusterRef} className="flex items-center gap-1">
        {usesFramelessChrome && windowControlsSide === 'left' ? (
          <WindowsWindowControls visible position="left" />
        ) : null}

        {usesFramelessChrome ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleOpenWindowsAppMenu}
                aria-label={t('header.actions.openAppMenuAria')}
                className={cn(ICON_BUTTON_CLASS, 'shrink-0')}
              >
                <Icon name="opencodesilver" className="h-[17px] w-[17px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('header.actions.openAppMenu')}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-foreground/90">
            <Icon name="opencodesilver" className="h-[17px] w-[17px]" />
          </span>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={t('header.actions.openSessionsAria')}
              className={cn(ICON_BUTTON_CLASS, 'h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground')}
            >
              <Icon name="layout-left" className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('header.actions.openSessionsWithShortcut', { shortcut: toggleShortcut })}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleGoBack}
              disabled={!navState.canGoBack}
              aria-label={t('ag.titlebar.back')}
              className={cn(
                ICON_BUTTON_CLASS,
                'h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-30',
              )}
            >
              <Icon name="arrow-left" className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('ag.titlebar.back')}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleGoForward}
              disabled={!navState.canGoForward}
              aria-label={t('ag.titlebar.forward')}
              className={cn(
                ICON_BUTTON_CLASS,
                'h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-30',
              )}
            >
              <Icon name="arrow-right" className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('ag.titlebar.forward')}</p>
          </TooltipContent>
        </Tooltip>

        {!isSidebarOpen ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleNewSession}
                aria-label={t('sessions.sidebar.header.actions.newSession')}
                className={cn(ICON_BUTTON_CLASS, 'h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground')}
              >
                <Icon name="add" className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('sessions.sidebar.header.actions.newSession')}</p>
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
};
