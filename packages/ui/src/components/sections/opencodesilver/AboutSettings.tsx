import React from 'react';
import { checkConnectedServerForUpdates, useUpdateStore } from '@/stores/useUpdateStore';
import type { UpdateInfo } from '@/lib/desktop';
import { isCapacitorApp } from '@/lib/platform';
import { useShallow } from 'zustand/react/shallow';
import { UpdateDialog } from '@/components/ui/UpdateDialog';
import { useDeviceInfo } from '@/lib/device';
import { toast } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from "@/components/icon/Icon";
import { OpencodeSilverLogo } from '@/components/ui/OpencodeSilverLogo';
import { useI18n } from '@/lib/i18n';
import { runtimeFetch } from '@/lib/runtime-fetch';
import { copyTextToClipboard } from '@/lib/clipboard';
import { reloadOpenCodeConfiguration } from '@/stores/useAgentsStore';
import { fetchOpenCodeUpgradeStatus, runOpenCodeUpgrade, type OpenCodeUpgradeStatus } from '@/components/update/openCodeUpgrade';
import { InstanceServiceUrls } from './InstanceServiceUrls';
import {
  SettingsSection,
  SETTINGS_BRAND_TITLE_CLASS,
  SETTINGS_FIELD_LABEL_CLASS,
} from '@/components/sections/shared/SettingsSection';



const MIN_CHECKING_DURATION = 800; // ms

type ConnectedServerUpdate = {
  info: UpdateInfo | null;
  checking: boolean;
  available: boolean;
  error: string | null;
};

const IDLE_SERVER_UPDATE: ConnectedServerUpdate = { info: null, checking: false, available: false, error: null };

/**
 * The native app's About page is about the server it is connected to. The
 * shared update store checks the app build itself on Capacitor (store/APK),
 * so the server check lives here, in page-local state, and installs through
 * the server's own update route (the dialog's `web` flow).
 */
function useConnectedServerUpdate(enabled: boolean) {
  const [state, setState] = React.useState<ConnectedServerUpdate>(IDLE_SERVER_UPDATE);

  const check = React.useCallback(async () => {
    if (!enabled) return;
    setState((current) => ({ ...current, checking: true, error: null }));
    try {
      const info = await checkConnectedServerForUpdates();
      setState({ info, checking: false, available: info.available, error: null });
    } catch (error) {
      setState({
        info: null,
        checking: false,
        available: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [enabled]);

  return { ...state, check };
}

type OpenCodeUpgradePhase =
  | { kind: 'idle' }
  | { kind: 'upgrading' }
  | { kind: 'installed'; version: string | null }
  | { kind: 'failed'; error: string };

/**
 * OpenCode on the connected server, checked and upgraded through the same
 * routes as the OpenCode update toast. Separate from the OpencodeSilver update:
 * it replaces the OpenCode CLI, not OpencodeSilver.
 */
function useOpenCodeUpgrade(failedFallback: string) {
  const [status, setStatus] = React.useState<OpenCodeUpgradeStatus | null>(null);
  const [phase, setPhase] = React.useState<OpenCodeUpgradePhase>({ kind: 'idle' });

  const refresh = React.useCallback(async (): Promise<OpenCodeUpgradeStatus | null> => {
    try {
      const next = await fetchOpenCodeUpgradeStatus();
      setStatus(next);
      return next;
    } catch {
      // Best effort: About still shows the OpencodeSilver half. The stale status
      // stays rather than turning into "no update".
      return null;
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const upgrade = React.useCallback(async () => {
    setPhase({ kind: 'upgrading' });
    try {
      const version = await runOpenCodeUpgrade(failedFallback);
      setPhase({ kind: 'installed', version });
    } catch (error) {
      setPhase({ kind: 'failed', error: error instanceof Error ? error.message : failedFallback });
    }
  }, [failedFallback]);

  /**
   * Restarts OpenCode after an upgrade, then re-reads the running version.
   * The "installed, reload to use it" phase is a temporary stand-in: once the
   * server reports the installed version as running, the authoritative status
   * replaces it.
   */
  const reloadAfterUpgrade = React.useCallback(async (reload: () => Promise<void>) => {
    await reload().catch(() => undefined);
    const next = await refresh();
    if (!next?.currentVersion) return;
    setPhase((current) => {
      if (current.kind !== 'installed') return current;
      if (current.version && current.version.replace(/^v/, '') !== next.currentVersion) return current;
      return { kind: 'idle' };
    });
  }, [refresh]);

  return { status, phase, refresh, upgrade, reloadAfterUpgrade };
}

/** Version of the installed native app build (Capacitor only). */
function useNativeAppVersion(enabled: boolean): string | null {
  const [version, setVersion] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void import('@capacitor/app')
      .then(({ App }) => App.getInfo())
      .then((info) => {
        if (!cancelled) setVersion(info.version.trim() || null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return version;
}

type AboutSettingsProps = {
  initialUpdateDialogOpen?: boolean;
};

export const AboutSettings: React.FC<AboutSettingsProps> = ({ initialUpdateDialogOpen = false }) => {
  const { t } = useI18n();
  const [updateDialogOpen, setUpdateDialogOpen] = React.useState(initialUpdateDialogOpen);
  const [showChecking, setShowChecking] = React.useState(false);
  const [opencodeSilverVersion, setOpencodeSilverVersion] = React.useState<string | null>(null);
  const updateStore = useUpdateStore(useShallow((s) => ({
    info: s.info,
    checking: s.checking,
    available: s.available,
    error: s.error,
    downloading: s.downloading,
    downloaded: s.downloaded,
    installing: s.installing,
    progress: s.progress,
    runtimeType: s.runtimeType,
    checkForUpdates: s.checkForUpdates,
    downloadUpdate: s.downloadUpdate,
    restartToUpdate: s.restartToUpdate,
  })));
  const { isMobile } = useDeviceInfo();
  // Native app: updates target the connected server; the app itself updates
  // through its store, which is not actionable from here.
  const isNativeApp = React.useMemo(() => isCapacitorApp(), []);
  const serverUpdate = useConnectedServerUpdate(isNativeApp);
  const nativeAppVersion = useNativeAppVersion(isNativeApp);
  const update = isNativeApp
    ? {
      info: serverUpdate.info,
      checking: serverUpdate.checking,
      available: serverUpdate.available,
      error: serverUpdate.error,
      checkForUpdates: serverUpdate.check,
      runtimeType: 'web' as const,
    }
    : {
      info: updateStore.info,
      checking: updateStore.checking,
      available: updateStore.available,
      error: updateStore.error,
      checkForUpdates: updateStore.checkForUpdates,
      runtimeType: updateStore.runtimeType,
    };

  const currentVersion = opencodeSilverVersion || update.info?.currentVersion || 'unknown';
  const openCode = useOpenCodeUpgrade(t('opencodeUpdate.toast.failed.description'));
  const openCodeVersion = openCode.status?.currentVersion ?? null;
  const openCodeUpdateVersion = openCode.phase.kind === 'installed' ? null : openCode.status?.availableVersion ?? null;
  const [commandCopied, setCommandCopied] = React.useState(false);

  // The OpencodeSilver button names what it replaces. In the native app that is
  // the server the phone is connected to (or the desktop app serving it),
  // never the phone app itself, which updates through its store.
  const opencodeSilverUpdateLabel = (() => {
    const version = update.info?.version || '';
    if (!isNativeApp) return t('settings.opencodesilver.about.actions.updateOpencodeSilverToVersion', { version });
    return update.info?.packageManager === 'electron'
      ? t('settings.opencodesilver.about.actions.updateDesktopToVersion', { version })
      : t('settings.opencodesilver.about.actions.updateServerToVersion', { version });
  })();
  const installBlocked = update.available && update.info?.installBlocked === 'service-manager';
  const manualUpdateCommand = update.info?.updateCommand || 'opencodesilver update';

  const checkAll = async () => {
    toast.info('جاري فحص التحديثات من مستودع GitHub...');
    try {
      await update.checkForUpdates();
      await openCode.refresh();
      // Check result from store after check finishes
      setTimeout(() => {
        const store = useUpdateStore.getState();
        if (store.available && store.info?.version) {
          toast.success(`🎉 يوجد تحديث جديد متاح: v${store.info.version}! اضغط لتنزيله.`, {
            action: {
              label: 'تثبيت الآن',
              onClick: () => setUpdateDialogOpen(true),
            },
            duration: 8000,
          });
        } else if (!store.error) {
          toast.success(`أنت تستخدم أحدث إصدار من البرنامج (OpencodeSilver v${currentVersion !== 'unknown' ? currentVersion : '2.9.0'}).`);
        } else {
          toast.error(`تعذر فحص التحديثات: ${store.error}`);
        }
      }, 1000);
    } catch (e) {
      toast.error('حدث خطأ أثناء الاتصال للتحقق من التحديث.');
    }
  };

  const copyManualCommand = async () => {
    const result = await copyTextToClipboard(manualUpdateCommand);
    if (!result.ok) return;
    setCommandCopied(true);
    setTimeout(() => setCommandCopied(false), 2000);
  };

  const reloadOpenCode = () => {
    void openCode.reloadAfterUpgrade(async () => {
      await reloadOpenCodeConfiguration({
        message: t('opencodeUpdate.toast.reload.message'),
        mode: 'projects',
        scopes: ['all'],
      });
    });
  };

  const manualUpdateNotice = installBlocked ? (
    <div className="space-y-2">
      <p className="typography-meta text-muted-foreground">
        {t('settings.opencodesilver.about.serviceManagerUpdate', { version: update.info?.version || '' })}
      </p>
      <div className="flex items-center gap-2 rounded-md border border-border bg-surface-elevated/50 p-1 pl-3">
        <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-foreground">{manualUpdateCommand}</code>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => void copyManualCommand()}
          aria-label={commandCopied ? t('updateDialog.actions.copied') : t('updateDialog.actions.copyCommand')}
        >
          <Icon name={commandCopied ? 'check' : 'clipboard'} className="size-4" />
        </Button>
      </div>
    </div>
  ) : null;

  const openCodeUpdateControls = (() => {
    const { phase } = openCode;
    if (phase.kind === 'installed') {
      return (
        <div className="flex flex-wrap items-center gap-3">
          <span className="typography-meta text-muted-foreground">
            {phase.version
              ? t('settings.opencodesilver.about.openCode.installedVersion', { version: phase.version })
              : t('settings.opencodesilver.about.openCode.installed')}
          </span>
          <Button type="button" size="sm" variant="outline" onClick={reloadOpenCode}>
            {t('opencodeUpdate.toast.actions.reload')}
          </Button>
        </div>
      );
    }
    if (!openCodeUpdateVersion) return null;
    if (!openCode.status?.supported) {
      return (
        <p className="typography-meta text-muted-foreground">
          {t('settings.opencodesilver.about.openCode.manualUpdate', { version: openCodeUpdateVersion })}
        </p>
      );
    }
    const upgrading = phase.kind === 'upgrading';
    return (
      <div className="space-y-2">
        <Button type="button" size="sm" variant="outline" onClick={() => void openCode.upgrade()} disabled={upgrading}>
          <Icon name={upgrading ? 'loader' : 'download'} className={upgrading ? 'size-4 animate-spin' : 'size-4'} />
          {upgrading
            ? t('opencodeUpdate.toast.upgrading.title')
            : t('settings.opencodesilver.about.actions.updateOpenCodeToVersion', { version: openCodeUpdateVersion })}
        </Button>
        {phase.kind === 'failed' && (
          <p className="typography-meta text-[var(--status-error)]">{phase.error}</p>
        )}
      </div>
    );
  })();

  React.useEffect(() => {
    let cancelled = false;

    const loadOpencodeSilverVersion = async () => {
      try {
        const response = await runtimeFetch('/api/system/info', {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) return;
        const data = await response.json().catch(() => null) as { opencodesilverVersion?: unknown } | null;
        const version = typeof data?.opencodesilverVersion === 'string' && data.opencodesilverVersion.trim().length > 0
          ? data.opencodesilverVersion.trim()
          : null;
        if (!cancelled) setOpencodeSilverVersion(version);
      } catch {
        if (!cancelled) setOpencodeSilverVersion(null);
      }
    };

    void loadOpencodeSilverVersion();

    return () => {
      cancelled = true;
    };
  }, []);

  // Track if we initiated a check to show toast on completion
  const didInitiateCheck = React.useRef(false);

  // Ensure minimum visible duration for checking animation
  React.useEffect(() => {
    if (update.checking) {
      setShowChecking(true);
      didInitiateCheck.current = true;
    } else if (showChecking) {
      const timer = setTimeout(() => {
        setShowChecking(false);
        // Show toast if check completed with no update available
        if (didInitiateCheck.current && !update.available && !update.error) {
          toast.success(isNativeApp
            ? t('settings.opencodesilver.about.toast.serverLatestVersion')
            : t('settings.opencodesilver.about.toast.latestVersion'));
          didInitiateCheck.current = false;
        }
      }, MIN_CHECKING_DURATION);
      return () => clearTimeout(timer);
    }
  }, [t, isNativeApp, update.checking, showChecking, update.available, update.error]);

  const isChecking = update.checking || showChecking;

  if (isMobile) {
    return (
      <div className="w-full space-y-6 pb-2">
        <div className="flex flex-col items-center text-center">
          <OpencodeSilverLogo width={72} height={72} />
          <h2 className={`mt-4 ${SETTINGS_BRAND_TITLE_CLASS}`}>OpencodeSilver</h2>
          <div className="mt-2 space-y-1 typography-ui text-muted-foreground">
            {isNativeApp ? (
              <>
                <p>{t('settings.opencodesilver.about.native.serverOpencodeSilverVersion', { version: currentVersion })}</p>
                <p>{t('settings.opencodesilver.about.native.serverOpenCodeVersion', { version: openCodeVersion || t('settings.opencodesilver.about.state.unknown') })}</p>
                {nativeAppVersion && <p>{t('settings.opencodesilver.about.native.appVersion', { version: nativeAppVersion })}</p>}
              </>
            ) : (
              <>
                <p>{t('aboutDialog.opencodeSilverVersionLabel', { version: currentVersion })}</p>
                <p>{t('aboutDialog.openCodeVersionLabel', { version: openCodeVersion || t('settings.opencodesilver.about.state.unknown') })}</p>
              </>
            )}
          </div>
          <InstanceServiceUrls />
        </div>

        <div className="flex justify-center">
          {!update.available && !update.error && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={checkAll}
              disabled={isChecking}
              className="h-10 w-auto justify-center gap-2 rounded-xl px-4"
            >
              {isChecking ? <Icon name="loader" className="size-4 animate-spin" /> : <Icon name="update-sync" className="size-4" />}
              {isChecking
                ? t('settings.opencodesilver.about.state.checking')
                : isNativeApp
                  ? t('settings.opencodesilver.about.actions.checkServerForUpdates')
                  : t('settings.opencodesilver.about.actions.checkForUpdates')}
            </Button>
          )}

          {!isChecking && update.available && !installBlocked && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setUpdateDialogOpen(true)}
              className="h-10 w-auto justify-center gap-2 rounded-xl px-4"
            >
              <Icon name="download" className="size-4" />
              {opencodeSilverUpdateLabel}
            </Button>
          )}
        </div>

        {manualUpdateNotice}

        {openCodeUpdateControls && (
          <div className="flex justify-center text-center">{openCodeUpdateControls}</div>
        )}

        {update.error && (
          <p className="rounded-xl border border-[var(--status-error-border)] bg-[var(--status-error-background)] px-3 py-2 typography-meta text-[var(--status-error)]">
            {update.error}
          </p>
        )}
        <div className="flex flex-col gap-2.5 w-full pt-2">
          {/* كارت الشكاوى */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50">
            <div className="flex items-center gap-2">
              <Icon name="report-issue" className="h-4 w-4 text-foreground" />
              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold">الإبلاغات والشكاوى</span>
                <span className="text-[10px] text-muted-foreground">تقديم تقرير عن خطأ</span>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 px-2.5"
              onClick={() => window.open('https://github.com/OpencodeSilver/OpencodeSilver/issues/new', '_blank', 'noopener,noreferrer')}
            >
              فتح الشكوى
            </Button>
          </div>

          {/* كارت الأفكار */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50">
            <div className="flex items-center gap-2">
              <Icon name="idea-spark" className="h-4 w-4 text-foreground" />
              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold">طلب واقتراح الأفكار</span>
                <span className="text-[10px] text-muted-foreground">اقتراح ميزة جديدة</span>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 px-2.5"
              onClick={() => window.open('https://github.com/OpencodeSilver/OpencodeSilver/discussions', '_blank', 'noopener,noreferrer')}
            >
              اقتراح فكرة
            </Button>
          </div>
        </div>

        <p className="text-center typography-ui text-muted-foreground/60">
          {t('aboutDialog.footerNote')}
        </p>

        <UpdateDialog
          open={updateDialogOpen}
          onOpenChange={setUpdateDialogOpen}
          info={update.info}
          downloading={updateStore.downloading}
          downloaded={updateStore.downloaded}
          installing={updateStore.installing}
          progress={updateStore.progress}
          error={update.error}
          onDownload={updateStore.downloadUpdate}
          onRestart={updateStore.restartToUpdate}
          runtimeType={update.runtimeType}
        />
      </div>
    );
  }

  // Desktop layout
  return (
    <SettingsSection divider={false}>
      <div className="rounded-lg bg-[var(--surface-elevated)]/70 overflow-hidden flex flex-col">
        {/* 1. قسم تحديث البرنامج المستقل */}
        <div className="flex flex-col @xl:flex-row @xl:items-center justify-between gap-4 px-4 py-3 border-b border-border/40">
          <div className="flex min-w-0 flex-col">
            <span className={SETTINGS_FIELD_LABEL_CLASS}>تحديث البرنامج (OpencodeSilver)</span>
            <span className="typography-meta text-muted-foreground">
              الإصدار الحالي: <span className="font-mono text-foreground">{currentVersion}</span>
              {openCodeVersion && (
                <> • نواة OpenCode: <span className="font-mono text-foreground">{openCodeVersion}</span></>
              )}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {update.checking && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon name="loader" className="h-4 w-4 animate-spin text-foreground" />
                <span className="typography-meta">جاري التحقق من التحديثات...</span>
              </div>
            )}

            {!update.checking && update.available && !installBlocked && (
              <Button size="sm"
                variant="default"
                className="font-medium"
                onClick={() => setUpdateDialogOpen(true)}
              >
                <Icon name="download" className="h-4 w-4 mr-1.5" />
                {opencodeSilverUpdateLabel}
              </Button>
            )}

            {!update.checking && !update.available && !update.error && (
              <span className="typography-meta text-muted-foreground flex items-center gap-1">
                <Icon name="check" className="h-4 w-4 text-foreground" />
                أنت على أحدث إصدار
              </span>
            )}

            <Button size="sm"
              variant="outline"
              onClick={checkAll}
              disabled={update.checking}
              className="gap-1.5"
            >
              <Icon name="update-sync" className={`h-4 w-4 ${update.checking ? 'animate-spin' : ''}`} />
              <span>فحص التحديثات الآن</span>
            </Button>
          </div>
        </div>

        {/* 2. قسم الشكاوى والإبلاغات المستقل */}
        <div className="flex flex-col @xl:flex-row @xl:items-center justify-between gap-4 px-4 py-3 border-b border-border/40">
          <div className="flex min-w-0 flex-col">
            <span className={SETTINGS_FIELD_LABEL_CLASS}>الإبلاغات والشكاوى</span>
            <span className="typography-meta text-muted-foreground">
              واجهتك مشكلة أو خطأ في البرنامج؟ أرسل تقريراً أو شكوى مباشرة لفريق التطوير.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-1.5 shrink-0"
            onClick={() => window.open('https://github.com/OpencodeSilver/OpencodeSilver/issues/new', '_blank', 'noopener,noreferrer')}
          >
            <Icon name="report-issue" className="h-4 w-4" />
            <span>تقديم شكوى أو إبلاغ</span>
          </Button>
        </div>

        {/* 3. قسم اقتراح الأفكار المستقل */}
        <div className="flex flex-col @xl:flex-row @xl:items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 flex-col">
            <span className={SETTINGS_FIELD_LABEL_CLASS}>طلب واقتراح الأفكار</span>
            <span className="typography-meta text-muted-foreground">
              لديك فكرة لتطوير البرنامج أو ميزة جديدة ترغب برؤيتها؟ شاركنا أفكارك واقتراحاتك.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-1.5 shrink-0"
            onClick={() => window.open('https://github.com/OpencodeSilver/OpencodeSilver/discussions', '_blank', 'noopener,noreferrer')}
          >
            <Icon name="idea-spark" className="h-4 w-4" />
            <span>اقتراح فكرة جديدة</span>
          </Button>
        </div>

      </div>

      <UpdateDialog
        open={updateDialogOpen}
        onOpenChange={setUpdateDialogOpen}
        info={update.info}
        downloading={updateStore.downloading}
        downloaded={updateStore.downloaded}
        installing={updateStore.installing}
        progress={updateStore.progress}
        error={update.error}
        onDownload={updateStore.downloadUpdate}
        onRestart={updateStore.restartToUpdate}
        runtimeType={update.runtimeType}
      />
    </SettingsSection>
  );
};
