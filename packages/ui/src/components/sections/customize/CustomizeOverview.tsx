import React from 'react';

import { Icon } from '@/components/icon/Icon';
import { SETTINGS_DESCRIPTION_CLASS, SETTINGS_HELPER_CLASS } from '@/components/sections/shared/SettingsSection';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import type { CustomizeTab } from '@/lib/settings/metadata';
import { cn } from '@/lib/utils';
import { useCustomizeHubStore } from '@/stores/useCustomizeHubStore';
import { useEnterpriseMode } from '@/stores/useEnterprisePolicyStore';

import { CustomizeCard, CustomizeGrid, CustomizeKindIcon, CustomizePanel, CustomizeSectionHeader } from './CustomizeParts';
import { CUSTOMIZE_TAB_CONFIGS, kindTitleKey } from './customizeModel';

const KIND_TABS = CUSTOMIZE_TAB_CONFIGS.flatMap((config) => (config.kind ? [{ tab: config.tab, kind: config.kind, titleKey: config.titleKey }] : []));

/** Health and counts across every kind, with a card per kind that opens its tab. */
export const CustomizeOverview: React.FC<{ directory: string | null; onSelectTab: (tab: CustomizeTab) => void }> = ({
  directory, onSelectTab,
}) => {
  const { t } = useI18n();
  const enterprise = useEnterpriseMode();
  const items = useCustomizeHubStore((state) => state.items);
  const counts = useCustomizeHubStore((state) => state.counts);
  const total = useCustomizeHubStore((state) => state.total);
  const unavailableKinds = useCustomizeHubStore((state) => state.unavailableKinds);
  const isLoading = useCustomizeHubStore((state) => state.isLoading);
  const loadError = useCustomizeHubStore((state) => state.loadError);
  const load = useCustomizeHubStore((state) => state.load);

  const { errorCount, warningCount, effectiveCount } = React.useMemo(() => {
    let errors = 0;
    let warnings = 0;
    let effective = 0;
    for (const item of items) {
      if (item.status === 'error' || item.status === 'blocked') errors += 1;
      else if (item.status === 'warning') warnings += 1;
      if (!item.shadowedBy && item.enabled !== false) effective += 1;
    }
    return { errorCount: errors, warningCount: warnings, effectiveCount: effective };
  }, [items]);

  if (loadError && items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-sm space-y-3 text-center">
          <p className="typography-meta text-foreground">{t('settings.customize.loadError')}</p>
          <Button variant="secondary" size="sm" onClick={() => { void load({ directory, force: true }); }}>
            {t('settings.customize.retry')}
          </Button>
        </div>
      </div>
    );
  }
  if (isLoading && items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className={SETTINGS_HELPER_CLASS}>{t('settings.customize.list.loading')}</p>
      </div>
    );
  }

  const healthy = errorCount === 0 && warningCount === 0 && total > 0;

  return (
    <div className="flex flex-col gap-6">
      {enterprise ? (
        <div className="flex items-start gap-2 rounded-xl border border-border/70 px-4 py-3">
          <Icon name="shield-check" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className={SETTINGS_HELPER_CLASS}>{t('settings.customize.overview.policy')}</p>
        </div>
      ) : null}

      {total === 0 ? (
        <CustomizePanel title={t('settings.customize.tab.overview')}>
          <p className={SETTINGS_HELPER_CLASS}>{t('settings.customize.overview.empty')}</p>
        </CustomizePanel>
      ) : (
        <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
          <CustomizePanel title={t('settings.customize.overview.health')}>
            {healthy ? (
              <div className="flex items-center gap-2">
                <Icon name="check" className="h-4 w-4 text-emerald-500" />
                <span className="typography-meta text-foreground">{t('settings.customize.overview.healthy')}</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                {errorCount > 0 ? (
                  <span className="flex items-center gap-1.5 text-red-500">
                    <Icon name="error-warning" className="h-4 w-4" />
                    <span className="typography-meta">{t('settings.customize.overview.errors', { count: errorCount })}</span>
                  </span>
                ) : null}
                {warningCount > 0 ? (
                  <span className="flex items-center gap-1.5 text-amber-500">
                    <Icon name="alert" className="h-4 w-4" />
                    <span className="typography-meta">{t('settings.customize.overview.warnings', { count: warningCount })}</span>
                  </span>
                ) : null}
              </div>
            )}
          </CustomizePanel>
          <CustomizePanel title={t('settings.customize.overview.effective')}>
            <p className={SETTINGS_DESCRIPTION_CLASS}>
              {t('settings.customize.overview.effectiveDescription', { count: effectiveCount, total })}
            </p>
          </CustomizePanel>
        </div>
      )}

      <div className="space-y-3">
        <CustomizeSectionHeader title={t('settings.customize.overview.byType')} />
        <CustomizeGrid>
          {KIND_TABS.map((entry) => (
            <CustomizeCard
              key={entry.tab}
              onClick={() => onSelectTab(entry.tab)}
              icon={<CustomizeKindIcon kind={entry.kind} className="h-6 w-6 text-foreground/80" />}
              title={t(entry.titleKey)}
              meta={<span className="tabular-nums">{counts[entry.kind] ?? 0}</span>}
            />
          ))}
        </CustomizeGrid>
      </div>

      {unavailableKinds.length > 0 ? (
        <CustomizePanel title={t('settings.customize.overview.unavailable')}>
          <p className={cn('mb-3', SETTINGS_DESCRIPTION_CLASS)}>{t('settings.customize.overview.unavailableDescription')}</p>
          <ul className="flex flex-wrap gap-2">
            {unavailableKinds.map((kind) => {
              const key = kindTitleKey(kind);
              return (
                <li key={kind} className={cn('rounded-full border border-border/70 bg-surface-muted px-2.5 py-1', SETTINGS_HELPER_CLASS)}>
                  {key ? t(key) : kind}
                </li>
              );
            })}
          </ul>
        </CustomizePanel>
      ) : null}
    </div>
  );
};
