/**
 * The Customize hub: tabs per kind (Skills and Plugins up front, the rest
 * under "More"), a Yours / Discover switch, search, scope/source/type
 * filters, sort and an Add menu. Rendered inside Settings and as the
 * full-screen Skills & MCP store.
 */

import React from 'react';

import { Icon } from '@/components/icon/Icon';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollableOverlay } from '@/components/ui/ScrollableOverlay';
import { useI18n } from '@/lib/i18n';
import type { CustomizeTab } from '@/lib/settings/metadata';
import { cn } from '@/lib/utils';
import { getConfigDirectory } from '@/stores/useAgentsStore';
import { useCustomizeHubStore, type CustomizeMode } from '@/stores/useCustomizeHubStore';
import { useProjectsStore } from '@/stores/useProjectsStore';
import { useSkillsCatalogStore } from '@/stores/useSkillsCatalogStore';
import { useUIStore } from '@/stores/useUIStore';

import { AddRepoDialog } from './AddRepoDialog';
import { CustomizeKindList } from './CustomizeKindList';
import { CustomizeOverview } from './CustomizeOverview';
import { CustomizeUnavailable } from './CustomizeParts';
import { CustomizeSources } from './CustomizeSources';
import { DiscoverConnectors } from './DiscoverConnectors';
import { DiscoverPlugins } from './DiscoverPlugins';
import { DiscoverSkills } from './DiscoverSkills';
import { YourSkills } from './YourSkills';
import { getTabConfig, isPrimaryTab, MORE_TABS, nextTabForKey, PRIMARY_TABS, tabRowOrder } from './customizeModel';
import { CustomizeVariantContext, type CustomizeVariant } from './customizeVariant';

/** The project the hub reads: the one picked in Settings, else the active one. */
const useHubDirectory = (): string | null => {
  const settingsProjectPath = useUIStore((state) => state.settingsProjectPath);
  const projects = useProjectsStore((state) => state.projects);
  const activeProjectId = useProjectsStore((state) => state.activeProjectId);
  if (settingsProjectPath && projects.some((project) => project.path === settingsProjectPath)) return settingsProjectPath;
  const picked = (projects.find((project) => project.id === activeProjectId) ?? projects[0])?.path ?? null;
  return picked ?? getConfigDirectory();
};

const CheckMark: React.FC<{ on: boolean }> = ({ on }) => (on ? <Icon name="check" className="h-3.5 w-3.5" /> : null);

export interface CustomizeHubProps {
  tab: CustomizeTab;
  onSelectTab: (tab: CustomizeTab) => void;
  onOpenSettings: (slug: string) => void;
  onClose?: () => void;
  variant?: CustomizeVariant;
  initialMode?: CustomizeMode;
  title?: string;
}

export const CustomizeHub: React.FC<CustomizeHubProps> = ({ tab, onSelectTab, onOpenSettings, onClose, variant = 'page', initialMode, title }) => {
  const { t } = useI18n();
  const inSettings = variant === 'settings';
  const mode = useCustomizeHubStore((state) => state.mode);
  const setMode = useCustomizeHubStore((state) => state.setMode);
  const query = useCustomizeHubStore((state) => state.query);
  const setQuery = useCustomizeHubStore((state) => state.setQuery);
  const scopeFilter = useCustomizeHubStore((state) => state.scopeFilter);
  const setScopeFilter = useCustomizeHubStore((state) => state.setScopeFilter);
  const sort = useCustomizeHubStore((state) => state.sort);
  const setSort = useCustomizeHubStore((state) => state.setSort);
  const sourceFilter = useCustomizeHubStore((state) => state.discoverSourceFilter);
  const setSourceFilter = useCustomizeHubStore((state) => state.setDiscoverSourceFilter);
  const typeFilter = useCustomizeHubStore((state) => state.discoverTypeFilter);
  const setTypeFilter = useCustomizeHubStore((state) => state.setDiscoverTypeFilter);
  const setCategory = useCustomizeHubStore((state) => state.setDiscoverCategory);
  const load = useCustomizeHubStore((state) => state.load);
  const catalogSources = useSkillsCatalogStore((state) => state.sources);
  const [addRepoOpen, setAddRepoOpen] = React.useState(false);
  const directory = useHubDirectory();
  const config = getTabConfig(tab);

  React.useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode, setMode]);

  React.useEffect(() => {
    void load({ directory });
  }, [load, directory]);

  const selectTab = (next: CustomizeTab) => {
    setCategory(null);
    onSelectTab(next);
  };

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const order = tabRowOrder(tab);
    const current = isPrimaryTab(tab) ? tab : 'more';
    const target = nextTabForKey(order, current, event.key);
    if (target === null) return;
    event.preventDefault();
    if (target !== 'more' && target !== tab) selectTab(target);
    document.getElementById(target === 'more' ? 'customize-tab-more' : `customize-tab-${target}`)?.focus();
  };

  const renderYours = () => {
    if (tab === 'overview') return <CustomizeOverview onSelectTab={onSelectTab} directory={directory} />;
    if (tab === 'sources') return <CustomizeSources />;
    if (config.unavailable) {
      return (
        <CustomizeUnavailable
          titleKey={config.unavailable.titleKey}
          bodyKey={config.unavailable.bodyKey}
          settingsSlug={config.settingsSlug}
          settingsTitleKey={config.titleKey}
          onOpenSettings={onOpenSettings}
        />
      );
    }
    if (tab === 'skills') return <YourSkills directory={directory} onDiscover={() => setMode('discover')} />;
    if (config.kind) return <CustomizeKindList kind={config.kind} titleKey={config.titleKey} directory={directory} />;
    return null;
  };

  const renderPanel = () => {
    if (mode === 'discover') {
      if (tab === 'skills') return <DiscoverSkills />;
      if (tab === 'connectors') return <DiscoverConnectors directory={directory} />;
      if (tab === 'plugins') return <DiscoverPlugins onOpenSettings={() => onOpenSettings('plugins')} />;
    }
    return renderYours();
  };

  const tabButtonClass = (selected: boolean) => cn(
    'h-8.5 shrink-0 whitespace-nowrap rounded-lg px-2.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm',
    selected ? 'border border-border/50 bg-surface-elevated text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
  );
  const modeButtonClass = (selected: boolean) => cn(
    'h-7.5 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors sm:text-sm',
    selected ? 'border border-border/50 bg-surface-elevated text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
  );
  const iconButtonClass = 'h-9 w-9 shrink-0 rounded-lg text-muted-foreground hover:bg-surface-elevated hover:text-foreground';

  return (
    <CustomizeVariantContext.Provider value={variant}>
      <div className="@container flex h-full min-h-0 flex-col">
        <ScrollableOverlay outerClassName="h-full min-h-0" className="px-4 pb-10 pt-4 sm:px-6">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 sm:gap-6">
            <div className="flex items-center justify-between">
              <h1
                className={cn(
                  'leading-tight tracking-tight text-foreground',
                  inSettings ? 'text-xl font-semibold sm:text-2xl' : 'font-serif text-2xl font-normal sm:text-[28px]',
                )}
              >
                {title ?? t('settings.page.customize.title')}
              </h1>
              {onClose ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8.5 w-8.5 rounded-lg text-muted-foreground hover:bg-[var(--interactive-hover)] hover:text-foreground"
                  onClick={onClose}
                  aria-label={t('settings.skillsStore.closeAria')}
                  title={t('settings.skillsStore.closeAria')}
                >
                  <Icon name="close" className="size-4.5" />
                </Button>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2 border-b border-border/40 pb-2 sm:gap-3 @3xl:flex-nowrap">
              <div className="flex shrink-0 items-center gap-2">
                <div role="tablist" aria-label={t('settings.page.customize.title')} onKeyDown={onTabKeyDown} className="flex shrink-0 items-center gap-1">
                  {PRIMARY_TABS.map((entry) => {
                    const selected = tab === entry;
                    return (
                      <button
                        key={entry}
                        type="button"
                        role="tab"
                        id={`customize-tab-${entry}`}
                        aria-selected={selected}
                        aria-controls={`customize-tabpanel-${entry}`}
                        tabIndex={selected ? 0 : -1}
                        onClick={() => selectTab(entry)}
                        className={tabButtonClass(selected)}
                      >
                        {t(getTabConfig(entry).titleKey)}
                      </button>
                    );
                  })}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        role="tab"
                        id="customize-tab-more"
                        aria-selected={!isPrimaryTab(tab)}
                        tabIndex={isPrimaryTab(tab) ? -1 : 0}
                        className={cn(tabButtonClass(!isPrimaryTab(tab)), 'flex items-center gap-1 px-2 sm:px-2.5')}
                      >
                        <span>{isPrimaryTab(tab) ? t('settings.customize.tab.more') : t(config.titleKey)}</span>
                        <Icon name="arrow-down-s" className="h-3.5 w-3.5 opacity-70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      {MORE_TABS.map((entry) => (
                        <DropdownMenuItem key={entry} onClick={() => selectTab(entry)} className="flex items-center justify-between">
                          <span>{t(getTabConfig(entry).titleKey)}</span>
                          <CheckMark on={tab === entry} />
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="hidden h-5 w-px shrink-0 bg-border/60 @lg:block" />
                <div role="group" aria-label={t('settings.customize.mode.aria')} className="inline-flex h-8.5 shrink-0 items-center rounded-lg bg-surface-muted p-0.5">
                  <button type="button" aria-pressed={mode === 'yours'} onClick={() => setMode('yours')} className={modeButtonClass(mode === 'yours')}>
                    {t('settings.customize.mode.yours')}
                  </button>
                  <button type="button" aria-pressed={mode === 'discover'} onClick={() => setMode('discover')} className={modeButtonClass(mode === 'discover')}>
                    {t('settings.customize.mode.discover')}
                  </button>
                </div>
              </div>

              <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2">
                <div className="relative min-w-[2.25rem] max-w-xs flex-1">
                  <Icon name="search" className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t('settings.customize.search.placeholder')}
                    aria-label={t('settings.customize.search.aria')}
                    className="h-8.5 w-full min-w-0 text-ellipsis rounded-lg border-border/70 pe-2.5 ps-8 text-xs focus-visible:ring-1 sm:text-sm"
                  />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className={iconButtonClass} aria-label={t('settings.customize.filter.aria')}>
                      <Icon name="equalizer-2" className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>{t('settings.customize.filter.scope')}</DropdownMenuLabel>
                    {(['all', 'project', 'user'] as const).map((scope) => (
                      <DropdownMenuItem key={scope} onClick={() => setScopeFilter(scope)} className="flex items-center justify-between">
                        <span>{t(`settings.customize.scope.${scope}`)}</span>
                        <CheckMark on={scopeFilter === scope} />
                      </DropdownMenuItem>
                    ))}
                    {mode === 'discover' && tab === 'skills' && catalogSources.length > 0 ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>{t('settings.customize.filter.sources')}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setSourceFilter(null)} className="flex items-center justify-between">
                          <span>{t('settings.customize.filter.allSources')}</span>
                          <CheckMark on={sourceFilter === null} />
                        </DropdownMenuItem>
                        {catalogSources.map((source) => (
                          <DropdownMenuItem key={source.id} onClick={() => setSourceFilter(source.id)} className="flex items-center justify-between">
                            <span className="line-clamp-1">{source.label}</span>
                            <CheckMark on={sourceFilter === source.id} />
                          </DropdownMenuItem>
                        ))}
                      </>
                    ) : null}
                    {mode === 'discover' && tab === 'connectors' ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>{t('settings.customize.filter.types')}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setTypeFilter('all')} className="flex items-center justify-between">
                          <span>{t('settings.customize.filter.allTypes')}</span>
                          <CheckMark on={typeFilter === 'all'} />
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTypeFilter('local')} className="flex items-center justify-between">
                          <span>{t('settings.customize.store.mcp.type.local')}</span>
                          <CheckMark on={typeFilter === 'local'} />
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTypeFilter('remote')} className="flex items-center justify-between">
                          <span>{t('settings.customize.store.mcp.type.remote')}</span>
                          <CheckMark on={typeFilter === 'remote'} />
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>

                {mode === 'discover' && tab === 'skills' ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className={iconButtonClass} aria-label={t('settings.customize.sort.aria')}>
                        <Icon name="expand-up-down" className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => setSort('name')} className="flex items-center justify-between">
                        <span>{t('settings.customize.sort.name')}</span>
                        <CheckMark on={sort === 'name'} />
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSort('stars')} className="flex items-center justify-between">
                        <span>{t('settings.customize.sort.stars')}</span>
                        <CheckMark on={sort === 'stars'} />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="default"
                      size="default"
                      className="h-9 shrink-0 gap-1.5 rounded-lg border-0 bg-foreground px-3.5 font-medium text-background shadow-xs hover:bg-foreground/90"
                      aria-label={t('settings.customize.add.title')}
                    >
                      <Icon name="add" className="h-4 w-4" />
                      <span className="hidden @3xl:inline">{t('settings.customize.add.title')}</span>
                      <Icon name="arrow-down-s" className="ms-1 h-3.5 w-3.5 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => setMode('discover')}>
                      <Icon name="global" className="me-2 h-4 w-4" />
                      <span>{t('settings.customize.add.browse')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setAddRepoOpen(true)}>
                      <Icon name="github" className="me-2 h-4 w-4" />
                      <span>{t('settings.customize.add.install')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onOpenSettings('mcp')}>
                      <Icon name="server" className="me-2 h-4 w-4" />
                      <span>{t('settings.customize.tab.connectors')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onOpenSettings('skills.installed')}>
                      <Icon name="add" className="me-2 h-4 w-4" />
                      <span>{t('settings.customize.add.create')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div role="tabpanel" id={`customize-tabpanel-${tab}`} aria-labelledby={isPrimaryTab(tab) ? `customize-tab-${tab}` : 'customize-tab-more'} className="min-h-0 flex-1 pt-2">
              {renderPanel()}
            </div>
          </div>
        </ScrollableOverlay>
        <AddRepoDialog open={addRepoOpen} onOpenChange={setAddRepoOpen} />
      </div>
    </CustomizeVariantContext.Provider>
  );
};
