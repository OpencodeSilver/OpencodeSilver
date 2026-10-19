/** Customize › Sources: the repositories Discover reads skills from, with trust and health. */

import React from 'react';

import { Icon } from '@/components/icon/Icon';
import { Button } from '@/components/ui/button';
import { getCurrentIntlLocale, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useSkillsCatalogStore } from '@/stores/useSkillsCatalogStore';

import { AddRepoDialog } from './AddRepoDialog';

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(getCurrentIntlLocale(), { dateStyle: 'medium' }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
};

export const CustomizeSources: React.FC = () => {
  const { t } = useI18n();
  const sources = useSkillsCatalogStore((state) => state.sources);
  const isLoading = useSkillsCatalogStore((state) => state.isLoadingCatalog);
  const error = useSkillsCatalogStore((state) => state.lastCatalogError);
  const loadCatalog = useSkillsCatalogStore((state) => state.loadCatalog);
  const [addOpen, setAddOpen] = React.useState(false);

  React.useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const addButton = (
    <Button type="button" variant="secondary" size="sm" onClick={() => setAddOpen(true)} className="shrink-0 gap-1.5">
      <Icon name="github" className="h-4 w-4" />
      <span>{t('settings.customize.sources.addRepo')}</span>
    </Button>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-1">
      <div className="flex items-center justify-end gap-3 pb-1">{addButton}</div>
      {error ? (
        <div role="status" className="flex items-start gap-2.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
          <Icon name="cloud-off" className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span className="space-y-0.5">
            <span className="typography-settings-field-label text-amber-500">{t('settings.customize.sources.offline.title')}</span>
            <span className="block typography-meta text-muted-foreground">{t('settings.customize.sources.offline.body')}</span>
          </span>
        </div>
      ) : null}
      {isLoading && sources.length === 0 ? (
        <p className="typography-meta text-muted-foreground" role="status">{t('settings.customize.sources.loading')}</p>
      ) : sources.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/80 p-8 text-center">
          <p className="typography-meta text-muted-foreground">{t('settings.customize.sources.empty')}</p>
          {addButton}
        </div>
      ) : (
        <ul data-customize-sources-list className="space-y-2">
          {sources.map((source) => {
            const updated = formatDate(source.repoUpdatedAt);
            return (
              <li key={source.id} data-customize-source-row className="rounded-md border border-border/60 bg-[var(--surface-elevated)] px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate typography-settings-field-label text-foreground">{source.label}</span>
                    {source.policyBlocked ? (
                      <span className="typography-micro shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-500">
                        {t('settings.customize.sources.policy.blocked')}
                      </span>
                    ) : source.custom !== undefined ? (
                      <span
                        className={cn(
                          'typography-micro shrink-0 rounded-full border px-1.5 py-0.5 font-medium',
                          source.custom
                            ? 'border-border/60 bg-[var(--surface-elevated)] text-muted-foreground'
                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
                        )}
                      >
                        {t(source.custom ? 'settings.customize.sources.trust.community' : 'settings.customize.sources.trust.verified')}
                      </span>
                    ) : null}
                  </span>
                  {source.stars != null ? (
                    <span className="typography-micro shrink-0 rounded-full border border-border/60 bg-[var(--surface-elevated)] px-1.5 py-0.5 text-muted-foreground">
                      {t('settings.customize.sources.health.stars', { count: source.stars })}
                    </span>
                  ) : null}
                </div>
                <span className="block line-clamp-2 typography-meta text-muted-foreground">{source.description || source.source}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 typography-micro text-muted-foreground">
                  <span className="truncate" dir="ltr">{source.source}</span>
                  {updated ? <span>{t('settings.customize.sources.health.updated', { date: updated })}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <AddRepoDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
};
