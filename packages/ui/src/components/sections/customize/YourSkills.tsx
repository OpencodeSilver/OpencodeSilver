/** Customize › Skills › Yours: installed skills grouped by scope, each with an on/off menu. */

import React from 'react';

import { Icon } from '@/components/icon/Icon';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useCustomizeHubStore, type CustomizeItem } from '@/stores/useCustomizeHubStore';

import { CustomizeKindIcon } from './CustomizeParts';
import { useToggleItem } from './useToggleItem';
import { isItemToggleable, itemLabel, itemMatchesQuery } from './customizeModel';

const SCOPE_ORDER = ['user', 'project'];

const EmptyIllustration: React.FC = () => (
  <svg viewBox="0 0 64 64" className="h-16 w-16 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
    <path d="M58 6 6 27l17 8 4 17 9-11 14 10L58 6Z" />
    <path d="m23 35 35-29-31 46" />
  </svg>
);

export const YourSkills: React.FC<{ directory: string | null; onDiscover: () => void }> = ({ directory, onDiscover }) => {
  const { t } = useI18n();
  const items = useCustomizeHubStore((state) => state.items);
  const scopeFilter = useCustomizeHubStore((state) => state.scopeFilter);
  const query = useCustomizeHubStore((state) => state.query);
  const isLoading = useCustomizeHubStore((state) => state.isLoading);
  const pendingIds = useCustomizeHubStore((state) => state.pendingIds);
  const toggle = useToggleItem(directory);

  const skills = React.useMemo(() => items.filter((item) => item.kind === 'skill'), [items]);
  const groups = React.useMemo(() => {
    const visible = skills
      .filter((item) => (scopeFilter === 'all' || item.scope === scopeFilter) && itemMatchesQuery(item, query))
      .sort((a, b) => itemLabel(a).localeCompare(itemLabel(b)));
    const byScope = new Map<string, CustomizeItem[]>();
    for (const item of visible) {
      const list = byScope.get(item.scope) ?? [];
      list.push(item);
      byScope.set(item.scope, list);
    }
    const scopes = [...SCOPE_ORDER.filter((scope) => byScope.has(scope)), ...[...byScope.keys()].filter((scope) => !SCOPE_ORDER.includes(scope))];
    return scopes.map((scope) => ({ scope, items: byScope.get(scope) ?? [] }));
  }, [skills, scopeFilter, query]);
  const visibleCount = groups.reduce((sum, group) => sum + group.items.length, 0);

  if (isLoading && items.length === 0) {
    return <p className="typography-meta text-muted-foreground">{t('settings.customize.list.loading')}</p>;
  }

  const scopeLabel = (scope: string) => (scope === 'user'
    ? t('settings.customize.scope.user')
    : scope === 'project'
      ? t('settings.customize.scope.project')
      : scope);

  return (
    <div className="space-y-8">
      {skills.length === 0 ? (
        <div className="flex items-center justify-between gap-6 rounded-xl border border-border/70 p-6">
          <div className="min-w-0 space-y-2">
            <h2 className="font-serif text-xl font-normal text-foreground">{t('settings.customize.yours.skills.empty.title')}</h2>
            <p className="max-w-xl typography-meta text-muted-foreground">{t('settings.customize.yours.skills.empty.description')}</p>
            <Button
              variant="default"
              size="default"
              className="mt-2 rounded-lg border-0 bg-foreground px-3.5 font-medium text-background shadow-xs hover:bg-foreground/90"
              onClick={onDiscover}
            >
              {t('settings.customize.yours.skills.empty.action')}
            </Button>
          </div>
          <div className="hidden shrink-0 @2xl:block"><EmptyIllustration /></div>
        </div>
      ) : visibleCount === 0 ? (
        <p className="typography-meta text-muted-foreground">
          {query.trim() ? t('settings.customize.list.emptySearch', { query: query.trim() }) : t('settings.customize.list.empty')}
        </p>
      ) : null}

      {groups.map((group) => (
        <section key={group.scope} aria-label={scopeLabel(group.scope)}>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{scopeLabel(group.scope)}</h2>
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{group.items.length}</span>
          </div>
          <ul className="grid grid-cols-1 gap-4 @3xl:grid-cols-2">
            {group.items.map((item) => {
              const label = itemLabel(item);
              const pending = pendingIds[item.id] === true;
              return (
                <li key={item.id} className="group relative flex items-start gap-4 rounded-xl border border-border/70 p-4 transition-colors hover:border-border hover:bg-surface-elevated/40">
                  <span className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-xl border border-border/60 bg-surface-background text-foreground/80">
                    <CustomizeKindIcon kind={item.kind} className="size-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={cn('truncate text-[15px] font-semibold text-foreground', !item.enabled && 'opacity-60')}>{label}</span>
                      {item.enabled ? null : (
                        <span className="shrink-0 rounded-full bg-surface-muted px-1.5 py-0.5 text-xs text-muted-foreground">{t('settings.customize.status.disabled')}</span>
                      )}
                      {item.status === 'shadowed' ? (
                        <span className="shrink-0 rounded-full bg-surface-muted px-1.5 py-0.5 text-xs text-muted-foreground">{t('settings.customize.status.shadowed')}</span>
                      ) : null}
                    </div>
                    {item.description ? <p className="line-clamp-2 text-sm text-foreground/80">{item.description}</p> : null}
                  </div>
                  {isItemToggleable(item) ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9 shrink-0 rounded-lg border-0 bg-surface-muted text-muted-foreground hover:text-foreground"
                          disabled={pending}
                          aria-label={label}
                        >
                          <Icon name={pending ? 'loader-4' : 'more-2'} className={cn('size-4', pending && 'animate-spin')} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => { void toggle(item, !item.enabled); }}>
                          {t(item.enabled ? 'settings.customize.item.toggleOff' : 'settings.customize.item.toggleOn', { name: label })}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
};
