/**
 * Discover › Connectors: a rotating "collections" banner, one-click cards for
 * well-known MCP servers and the categories grid.
 */

import React from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Icon } from '@/components/icon/Icon';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useI18n } from '@/lib/i18n';
import { rankByQuery } from '@/lib/search/fuzzySearch';
import { cn } from '@/lib/utils';
import { useCustomizeHubStore } from '@/stores/useCustomizeHubStore';
import { selectMcpServersForDirectory, useMcpConfigStore } from '@/stores/useMcpConfigStore';

import { CustomizeCard, CustomizeGrid, CustomizeSectionHeader } from './CustomizeParts';
import { DiscoverActiveCategoryHeader, DiscoverCategoriesSection } from './DiscoverCategoryParts';
import {
  CONNECTOR_COLLECTIONS,
  CONNECTOR_PRESETS,
  connectorPresetById,
  draftFromPreset,
  type ConnectorPreset,
} from './connectorPresets';
import { categoriesForItem, DISCOVER_CATEGORY_BY_ID } from './discoverCategories';
import { useActiveCategoryFocus } from './useActiveCategoryFocus';

const COLLAPSED_COUNT = 6;
const ROTATE_MS = 6_000;

const ConnectorsCarousel: React.FC<{ onExplore: (ids: readonly string[]) => void }> = ({ onExplore }) => {
  const { t } = useI18n();
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const count = CONNECTOR_COLLECTIONS.length;
  const collection = CONNECTOR_COLLECTIONS[index] ?? CONNECTOR_COLLECTIONS[0];
  const next = React.useCallback(() => setIndex((value) => (value + 1) % count), [count]);
  const previous = () => setIndex((value) => (value - 1 + count) % count);

  React.useEffect(() => {
    if (paused || count < 2) return;
    const timer = setInterval(next, ROTATE_MS);
    return () => clearInterval(timer);
  }, [paused, next, count]);

  const presets = collection.connectorIds.map(connectorPresetById).filter((preset): preset is ConnectorPreset => preset != null);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--interactive-selection) 40%, var(--surface-background)), color-mix(in srgb, var(--surface-elevated) 80%, var(--surface-background)))',
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="relative flex min-h-[180px] w-full flex-col justify-between overflow-hidden rounded-2xl p-6 text-foreground shadow-xs transition-colors @7xl:min-h-[220px] @7xl:p-7"
      data-testid="customize-carousel"
    >
      <div className="flex flex-col justify-between gap-6 @2xl:flex-row @2xl:items-center">
        <div className="z-10 flex max-w-xl flex-col items-start gap-4">
          <div className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('settings.customize.discover.connectors.carousel.eyebrow')}</span>
            <h2 className="font-serif text-[24px] font-normal leading-tight tracking-tight text-foreground @7xl:text-[28px]">{t(collection.titleKey)}</h2>
            <p className="line-clamp-2 text-base text-foreground/80">{t(collection.subtitleKey)}</p>
          </div>
          <Button variant="default" size="default" className="rounded-full px-5 font-medium shadow-xs" onClick={() => onExplore(collection.connectorIds)}>
            {t('settings.customize.discover.connectors.carousel.explore')}
          </Button>
        </div>
        <div className="relative hidden shrink-0 items-center justify-center gap-3 @2xl:flex">
          {presets.map((preset, position) => (
            <div
              key={preset.id}
              className={cn(
                'flex w-32 flex-col items-center justify-center gap-2 rounded-xl border border-border/60 bg-surface-elevated/80 p-4 text-center shadow-xs backdrop-blur-xs transition-transform duration-300',
                position === 1 ? 'translate-y-2' : '-translate-y-1',
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted text-foreground">
                <Icon name={preset.transport.type === 'local' ? 'server' : 'global'} className="h-5 w-5" />
              </div>
              <span className="line-clamp-1 text-xs font-medium text-foreground">{preset.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border/30 pt-3">
        <div className="flex items-center gap-1.5" role="tablist" aria-label={t('settings.customize.discover.connectors.carousel.paginationAria')}>
          {CONNECTOR_COLLECTIONS.map((entry, position) => {
            const selected = position === index;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={t('settings.customize.discover.connectors.carousel.dotAria', { index: position + 1 })}
                onClick={() => setIndex(position)}
                className={cn('h-2 rounded-full transition-all duration-300', selected ? 'w-6 bg-foreground' : 'w-2 bg-foreground/30 hover:bg-foreground/50')}
              />
            );
          })}
        </div>
        <div className="hidden items-center gap-1 sm:flex">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-foreground/70 hover:bg-surface-elevated/50 hover:text-foreground" onClick={previous} aria-label={t('settings.customize.discover.connectors.carousel.prev')}>
            <Icon name="arrow-left-s" className="h-4 w-4 rtl:rotate-180" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-foreground/70 hover:bg-surface-elevated/50 hover:text-foreground" onClick={next} aria-label={t('settings.customize.discover.connectors.carousel.next')}>
            <Icon name="arrow-right-s" className="h-4 w-4 rtl:rotate-180" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const DiscoverConnectors: React.FC<{ directory: string | null }> = ({ directory }) => {
  const { t } = useI18n();
  const query = useCustomizeHubStore((state) => state.query);
  const typeFilter = useCustomizeHubStore((state) => state.discoverTypeFilter);
  const category = useCustomizeHubStore((state) => state.discoverCategory);
  const setCategory = useCustomizeHubStore((state) => state.setDiscoverCategory);
  const refreshHub = useCustomizeHubStore((state) => state.refresh);
  const [expanded, setExpanded] = React.useState(false);
  const [addingId, setAddingId] = React.useState<string | null>(null);
  const [featuredIds, setFeaturedIds] = React.useState<readonly string[] | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const clearCategory = React.useCallback(() => setCategory(null), [setCategory]);
  const headingRef = useActiveCategoryFocus(category, clearCategory);

  const { createMcp, loadMcpConfigs } = useMcpConfigStore(
    useShallow((state) => ({ createMcp: state.createMcp, loadMcpConfigs: state.loadMcpConfigs })),
  );
  const servers = useMcpConfigStore((state) => selectMcpServersForDirectory(state, directory));

  React.useEffect(() => {
    void loadMcpConfigs({ directory });
  }, [loadMcpConfigs, directory]);

  const configuredNames = React.useMemo(() => new Set(servers.map((server) => server.name.toLowerCase())), [servers]);

  const addConnector = React.useCallback(async (preset: ConnectorPreset) => {
    setAddingId(preset.id);
    try {
      const result = await createMcp(draftFromPreset(preset), directory);
      if (!result.ok) {
        toast.error(t('settings.customize.store.mcp.toast.failed', { name: preset.label }), result.message ? { description: result.message } : undefined);
        return;
      }
      if (result.reloadFailed) {
        toast.warning(result.message || t('settings.customize.store.mcp.toast.addedReloadFailed', { name: preset.label }), { description: result.warning });
      } else {
        toast.success(t('settings.customize.store.mcp.toast.added', { name: preset.label }));
      }
      void refreshHub(directory);
    } finally {
      setAddingId(null);
    }
  }, [createMcp, directory, refreshHub, t]);

  const ordered = React.useMemo(() => {
    const byType = typeFilter === 'all' ? CONNECTOR_PRESETS : CONNECTOR_PRESETS.filter((preset) => preset.transport.type === typeFilter);
    const inCategory = category ? byType.filter((preset) => categoriesForItem(preset).includes(category)) : byType;
    const ranked = rankByQuery(inCategory, query, (preset) => [preset.label, preset.id, t(preset.descriptionKey)]);
    if (!featuredIds || featuredIds.length === 0) return ranked;
    const featured = new Set(featuredIds);
    return [...ranked.filter((preset) => featured.has(preset.id)), ...ranked.filter((preset) => !featured.has(preset.id))];
  }, [typeFilter, category, query, t, featuredIds]);

  const visible = expanded || category ? ordered : ordered.slice(0, COLLAPSED_COUNT);
  const categoryEntry = category ? DISCOVER_CATEGORY_BY_ID.get(category) : undefined;
  const categoryTitle = category ? (categoryEntry ? t(categoryEntry.labelKey) : category) : null;

  const explore = (ids: readonly string[]) => {
    setFeaturedIds(ids);
    setExpanded(true);
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-6 @7xl:space-y-8" data-testid="customize-discover-connectors">
      {category ? null : <ConnectorsCarousel onExplore={explore} />}
      <div ref={listRef} className="space-y-4">
        {category ? (
          <DiscoverActiveCategoryHeader title={categoryTitle} count={ordered.length} onClear={clearCategory} headingRef={headingRef} />
        ) : (
          <CustomizeSectionHeader
            title={t('settings.customize.discover.connectors.sectionTitle')}
            actionLabel={ordered.length > COLLAPSED_COUNT
              ? t(expanded ? 'settings.customize.discover.showLess' : 'settings.customize.discover.showAll')
              : undefined}
            isExpanded={expanded}
            onToggleExpand={() => setExpanded((value) => !value)}
          />
        )}
        {ordered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-muted-foreground">
            <p className="text-sm">{t('settings.customize.store.empty', { query: query.trim() })}</p>
          </div>
        ) : (
          <CustomizeGrid>
            {visible.map((preset) => {
              const configured = configuredNames.has(preset.id.toLowerCase());
              const adding = addingId === preset.id;
              const local = preset.transport.type === 'local';
              return (
                <CustomizeCard
                  key={preset.id}
                  testId={`connector-card-${preset.id}`}
                  icon={<Icon name={local ? 'server' : 'global'} className="h-5 w-5 text-foreground/80" />}
                  title={preset.label}
                  description={t(preset.descriptionKey)}
                  meta={t(local ? 'settings.customize.store.mcp.type.local' : 'settings.customize.store.mcp.type.remote')}
                  actions={configured ? (
                    <Button
                      variant="outline"
                      size="icon"
                      disabled
                      className="h-8 w-8 rounded-lg border-0 bg-surface-muted text-status-success"
                      title={t('settings.customize.store.mcp.connected')}
                      aria-label={t('settings.customize.store.mcp.connected')}
                    >
                      <Icon name="check" className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={adding}
                      onClick={() => { void addConnector(preset); }}
                      className="h-8 w-8 rounded-lg border-0 bg-surface-muted text-foreground hover:bg-interactive-hover"
                      title={t('settings.customize.store.mcp.connect')}
                      aria-label={t('settings.customize.discover.connectMcp', { name: preset.label })}
                    >
                      <Icon name={adding ? 'refresh' : 'add'} className={cn('h-3.5 w-3.5', adding && 'animate-spin')} />
                    </Button>
                  )}
                />
              );
            })}
          </CustomizeGrid>
        )}
      </div>
      <DiscoverCategoriesSection items={CONNECTOR_PRESETS} selectedCategoryId={category} onSelectCategory={setCategory} />
    </div>
  );
};
