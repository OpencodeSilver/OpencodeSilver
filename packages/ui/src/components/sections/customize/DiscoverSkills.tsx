/**
 * Discover › Skills: a hero for one curated skill, the catalog skills from
 * every source (or the picked one) as cards with Try / Install, and the
 * categories grid that narrows the list.
 */

import React from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Icon } from '@/components/icon/Icon';
import { InstallSkillDialog } from '@/components/sections/skills/catalog/InstallSkillDialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import type { SkillsCatalogItem } from '@/lib/api/types';
import { useI18n } from '@/lib/i18n';
import { rankByQuery } from '@/lib/search/fuzzySearch';
import { useCustomizeHubStore } from '@/stores/useCustomizeHubStore';
import { useSkillsCatalogStore } from '@/stores/useSkillsCatalogStore';

import { AddRepoDialog } from './AddRepoDialog';
import { CustomizeCard, CustomizeGrid, CustomizeHero, CustomizeSectionHeader } from './CustomizeParts';
import { DiscoverActiveCategoryHeader, DiscoverCategoriesSection } from './DiscoverCategoryParts';
import { categoriesForItem, DISCOVER_CATEGORY_BY_ID } from './discoverCategories';
import { trySkillInNewChat } from './trySkill';
import { useActiveCategoryFocus } from './useActiveCategoryFocus';

const COLLAPSED_COUNT = 6;

const skillTitle = (item: SkillsCatalogItem) => item.frontmatterName || item.skillName;


export const DiscoverSkills: React.FC = () => {
  const { t } = useI18n();
  const query = useCustomizeHubStore((state) => state.query);
  const sort = useCustomizeHubStore((state) => state.sort);
  const sourceFilter = useCustomizeHubStore((state) => state.discoverSourceFilter);
  const category = useCustomizeHubStore((state) => state.discoverCategory);
  const setCategory = useCustomizeHubStore((state) => state.setDiscoverCategory);
  const hubItems = useCustomizeHubStore((state) => state.items);
  const [expanded, setExpanded] = React.useState(false);
  const [installItem, setInstallItem] = React.useState<SkillsCatalogItem | null>(null);
  const [installOpen, setInstallOpen] = React.useState(false);
  const [addRepoOpen, setAddRepoOpen] = React.useState(false);
  const clearCategory = React.useCallback(() => setCategory(null), [setCategory]);
  const headingRef = useActiveCategoryFocus(category, clearCategory);

  const { sources, itemsBySource, loadedSourceIds, loadCatalog, loadSource, isLoadingCatalog, isLoadingSource } = useSkillsCatalogStore(
    useShallow((state) => ({
      sources: state.sources,
      itemsBySource: state.itemsBySource,
      loadedSourceIds: state.loadedSourceIds,
      loadCatalog: state.loadCatalog,
      loadSource: state.loadSource,
      isLoadingCatalog: state.isLoadingCatalog,
      isLoadingSource: state.isLoadingSource,
    })),
  );

  React.useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  // Load every source's skills one after another (not all at once).
  React.useEffect(() => {
    const pending = sources.filter((source) => !loadedSourceIds[source.id]);
    if (pending.length === 0) return;
    let cancelled = false;
    void (async () => {
      for (const source of pending) {
        if (cancelled) return;
        await loadSource(source.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sources, loadedSourceIds, loadSource]);

  const installedNames = React.useMemo(() => {
    const names = new Set<string>();
    for (const item of hubItems) {
      if (item.kind !== 'skill') continue;
      names.add(item.name.toLowerCase());
      if (item.engineId) names.add(item.engineId.toLowerCase());
    }
    return names;
  }, [hubItems]);
  const sourceById = React.useMemo(() => new Map(sources.map((source) => [source.id, source])), [sources]);

  const heroSource = sources.find((source) => !source.custom) ?? sources[0];
  const heroItem = heroSource ? (itemsBySource[heroSource.id] ?? [])[0] ?? null : null;

  const allItems = React.useMemo(
    () => (sourceFilter ? itemsBySource[sourceFilter] ?? [] : sources.flatMap((source) => itemsBySource[source.id] ?? [])),
    [sourceFilter, itemsBySource, sources],
  );
  const sorted = React.useMemo(() => {
    const inCategory = category ? allItems.filter((item) => categoriesForItem(item).includes(category)) : allItems;
    const ranked = [...rankByQuery(inCategory, query, (item) => [item.skillName, item.frontmatterName, item.description])];
    if (query.trim()) return ranked;
    if (sort === 'stars') {
      ranked.sort((a, b) => (sourceById.get(b.sourceId)?.stars ?? 0) - (sourceById.get(a.sourceId)?.stars ?? 0));
    } else {
      ranked.sort((a, b) => skillTitle(a).toLowerCase().localeCompare(skillTitle(b).toLowerCase()));
    }
    return ranked;
  }, [allItems, category, query, sort, sourceById]);

  const visible = expanded || category ? sorted : sorted.slice(0, COLLAPSED_COUNT);
  const loading = (isLoadingCatalog || isLoadingSource) && sorted.length === 0;
  const categoryEntry = category ? DISCOVER_CATEGORY_BY_ID.get(category) : undefined;
  const categoryTitle = category ? (categoryEntry ? t(categoryEntry.labelKey) : category) : null;

  const openInstall = (item: SkillsCatalogItem) => {
    setInstallItem(item);
    setInstallOpen(true);
  };

  return (
    <div className="space-y-6 @7xl:space-y-8" data-testid="customize-discover-skills">
      {category ? null : (
        <CustomizeHero
          eyebrow={t('settings.customize.discover.hero.from', { source: heroSource?.label ?? 'OpencodeSilver' })}
          title={heroItem ? skillTitle(heroItem) : heroSource ? heroSource.label : t('settings.customize.discover.skills.hero.fallbackTitle')}
          description={heroItem?.description || heroSource?.description || t('settings.customize.discover.skills.hero.fallbackDesc')}
          tintTone="success"
          addButtonLabel={t('settings.customize.discover.hero.add')}
          onAdd={() => { if (heroItem) openInstall(heroItem); }}
          disabled={!heroItem}
        />
      )}

      <div className="space-y-4">
        {category ? (
          <DiscoverActiveCategoryHeader title={categoryTitle} count={sorted.length} onClear={clearCategory} headingRef={headingRef} />
        ) : (
          <CustomizeSectionHeader
            title={t('settings.customize.discover.skills.sectionTitle')}
            actionLabel={sorted.length > COLLAPSED_COUNT
              ? t(expanded ? 'settings.customize.discover.showLess' : 'settings.customize.discover.showAll')
              : undefined}
            isExpanded={expanded}
            onToggleExpand={() => setExpanded((value) => !value)}
          />
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Icon name="refresh" className="me-2 h-5 w-5 animate-spin" />
            <span className="text-sm">{t('settings.customize.discover.loading')}</span>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 p-8 text-center text-muted-foreground">
            <p className="text-sm">
              {query.trim()
                ? t('settings.customize.store.empty', { query: query.trim() })
                : t('settings.customize.discover.skills.noneAvailable')}
            </p>
            <Button type="button" variant="secondary" size="sm" onClick={() => setAddRepoOpen(true)} className="gap-1.5">
              <Icon name="github" className="h-4 w-4" />
              <span>{t('settings.customize.discover.skills.addRepo')}</span>
            </Button>
          </div>
        ) : (
          <CustomizeGrid>
            {visible.map((item) => {
              const title = skillTitle(item);
              const installed = installedNames.has(item.skillName.toLowerCase())
                || Boolean(item.frontmatterName && installedNames.has(item.frontmatterName.toLowerCase()))
                || item.installed?.isInstalled === true;
              return (
                <CustomizeCard
                  key={`${item.sourceId}:${item.skillName}`}
                  testId={`skill-card-${item.skillName}`}
                  icon={<Icon name="book-open" className="h-5 w-5 text-foreground/80" />}
                  title={title}
                  description={item.description || t('settings.customize.discover.noDescription')}
                  meta={sourceById.get(item.sourceId)?.label ?? item.sourceId}
                  actions={(
                    <>
                      {installed ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 gap-1.5 rounded-lg border-0 bg-surface-muted px-2.5 text-xs font-medium text-foreground hover:bg-interactive-hover"
                          title={t('settings.customize.discover.tryTitle', { name: title })}
                          onClick={() => {
                            trySkillInNewChat(title);
                            toast.success(t('settings.customize.discover.tryToast', { name: title }));
                          }}
                        >
                          <Icon name="chat-4" className="h-3.5 w-3.5" />
                          <span>{t('settings.customize.discover.try')}</span>
                        </Button>
                      ) : null}
                      {installed ? (
                        <Button
                          variant="secondary"
                          size="icon"
                          disabled
                          className="h-8 w-8 rounded-lg border-0 bg-surface-muted text-status-success"
                          title={t('settings.customize.discover.installed')}
                          aria-label={t('settings.customize.discover.installed')}
                        >
                          <Icon name="check" className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="icon"
                          disabled={!item.installable}
                          onClick={() => openInstall(item)}
                          className="h-8 w-8 rounded-lg border-0 bg-surface-muted text-foreground hover:bg-interactive-hover"
                          title={item.installable ? t('settings.customize.discover.install') : t('settings.customize.store.skill.unavailable')}
                          aria-label={t('settings.customize.discover.installSkill', { name: title })}
                        >
                          <Icon name="add" className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </>
                  )}
                />
              );
            })}
          </CustomizeGrid>
        )}
      </div>

      <DiscoverCategoriesSection items={allItems} selectedCategoryId={category} onSelectCategory={setCategory} />

      <InstallSkillDialog
        open={installOpen}
        onOpenChange={(open) => {
          setInstallOpen(open);
          if (!open) setInstallItem(null);
        }}
        item={installItem}
      />
      <AddRepoDialog open={addRepoOpen} onOpenChange={setAddRepoOpen} />
    </div>
  );
};
