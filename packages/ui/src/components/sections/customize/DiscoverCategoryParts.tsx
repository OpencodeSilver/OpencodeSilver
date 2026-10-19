/** The categories grid under a Discover list and the header shown while one is picked. */

import React from 'react';

import { Icon } from '@/components/icon/Icon';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { getCurrentIntlLocale, type I18nKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import {
  categoryCardAria,
  categoryResultsAnnouncement,
  countCategories,
  DISCOVER_CATEGORY_BY_ID,
  formatCount,
  type CategorizableItem,
} from './discoverCategories';

const COLLAPSED_CATEGORY_COUNT = 9;

export const DiscoverCategoriesSection: React.FC<{
  items: readonly CategorizableItem[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string) => void;
  className?: string;
}> = ({ items, selectedCategoryId, onSelectCategory, className }) => {
  const { t } = useI18n();
  const locale = getCurrentIntlLocale();
  const [expanded, setExpanded] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState<string | null>(null);

  const categories = React.useMemo(
    () => countCategories(items, { locale, translate: (key: I18nKey) => t(key) }),
    [items, locale, t],
  );
  if (categories.length === 0) return null;
  const visible = expanded ? categories : categories.slice(0, COLLAPSED_CATEGORY_COUNT);

  const select = (id: string, count: number) => {
    onSelectCategory(id);
    const entry = DISCOVER_CATEGORY_BY_ID.get(id);
    setAnnouncement(categoryResultsAnnouncement(entry ? t(entry.labelKey) : id, count, locale, t));
  };

  return (
    <section aria-labelledby="customize-categories-heading" className={cn('pt-8', className)} data-testid="customize-categories-section">
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>
      <div className="mb-3.5 flex items-center justify-between">
        <h3 id="customize-categories-heading" className="text-base font-semibold tracking-tight text-foreground">
          {t('settings.customize.discover.categories.title')}
        </h3>
        {categories.length > COLLAPSED_CATEGORY_COUNT ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="group flex items-center gap-1.5 rounded-md px-1 py-0.5 text-sm font-normal text-foreground transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span>
              {expanded
                ? t('settings.customize.discover.categories.showFewer')
                : t('settings.customize.discover.categories.showAll', { count: formatCount(categories.length, locale) })}
            </span>
            <Icon
              name="arrow-down-s"
              className={cn('size-4 text-foreground transition-transform duration-200 group-hover:text-muted-foreground', expanded && 'rotate-180')}
            />
          </button>
        ) : null}
      </div>
      <div role="list" className="grid grid-cols-1 gap-3 @xl:grid-cols-2 @3xl:grid-cols-3">
        {visible.map(({ category, count }) => {
          const selected = selectedCategoryId === category.id;
          const label = t(category.labelKey);
          const Illustration = category.illustration;
          return (
            <div role="listitem" key={category.id}>
              <button
                type="button"
                onClick={() => select(category.id, count)}
                aria-pressed={selected}
                aria-label={categoryCardAria(label, count, locale, t)}
                data-testid={`category-card-${category.id}`}
                className={cn(
                  'group flex h-[72px] w-full items-center gap-3 rounded-xl border p-3 text-start transition-all',
                  'border-border/70 bg-surface-elevated/40 hover:border-border hover:bg-surface-elevated/70',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  selected && 'border-[var(--interactive-selection)] bg-surface-elevated/90 ring-1 ring-[var(--interactive-selection)]',
                )}
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-[10px] bg-surface-muted transition-colors group-hover:bg-surface-muted/90">
                  <Illustration className="size-6 text-foreground/90 transition-transform duration-200 group-hover:scale-105" />
                </div>
                <bdi className="truncate text-sm font-medium text-foreground">{label}</bdi>
                <span className="ms-auto shrink-0 whitespace-nowrap text-xs tabular-nums text-muted-foreground">{formatCount(count, locale)}</span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export const DiscoverActiveCategoryHeader: React.FC<{
  title: React.ReactNode;
  count: number;
  onClear: () => void;
  headingRef?: React.Ref<HTMLHeadingElement>;
}> = ({ title, count, onClear, headingRef }) => {
  const { t } = useI18n();
  return (
    <div className="space-y-3" data-testid="customize-active-category">
      <Button variant="ghost" size="sm" onClick={onClear} className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground">
        <Icon name="arrow-left" className="h-4 w-4 rtl:rotate-180" />
        <span>{t('settings.customize.discover.categories.backToAll')}</span>
      </Button>
      <div className="flex flex-wrap items-center gap-2.5">
        <h3 tabIndex={-1} ref={headingRef} className="text-xl font-semibold tracking-tight text-foreground outline-none">{title}</h3>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
          <span>{title}</span>
          <button type="button" onClick={onClear} className="text-muted-foreground hover:text-foreground" aria-label={t('settings.customize.discover.categories.clearFilter')}>
            <Icon name="close" className="size-3" />
          </button>
        </span>
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">{count}</span>
      </div>
    </div>
  );
};
