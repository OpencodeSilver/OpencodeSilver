/**
 * One kind's items (agents, commands, connectors, …): a virtualized list on
 * the left and the selected item's details on the right; on narrow widths
 * the details replace the list with a back button.
 */

import React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import { Icon } from '@/components/icon/Icon';
import {
  SETTINGS_DESCRIPTION_CLASS,
  SETTINGS_HELPER_CLASS,
  SETTINGS_SECTION_TITLE_CLASS,
} from '@/components/sections/shared/SettingsSection';
import { Button } from '@/components/ui/button';
import { ScrollableOverlay } from '@/components/ui/ScrollableOverlay';
import { useI18n } from '@/lib/i18n';
import type { I18nKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useCustomizeHubStore, type CustomizeItem, type CustomizeKind } from '@/stores/useCustomizeHubStore';
import { useMcpStore, type McpStatusMap } from '@/stores/useMcpStore';

import {
  CustomizeKindIcon,
  DetailField,
  DiagnosticIcon,
  ItemToggle,
  ScopeBadge,
  StatusDot,
} from './CustomizeParts';
import {
  isItemToggleable,
  itemLabel,
  itemMatchesQuery,
  itemStatusLabelKey,
  mcpStatusLabelKey,
  mergeLiveStatus,
  type CustomizeDotStatus,
  type McpLiveStatus,
} from './customizeModel';
import { useToggleItem } from './useToggleItem';

const liveStatusOf = (statusMap: McpStatusMap | null, name: string): McpLiveStatus | undefined => {
  const entry = statusMap?.[name] as { status?: { status?: string } | string } | undefined;
  if (!entry) return undefined;
  if (typeof entry.status === 'string') return entry.status;
  return entry.status?.status;
};


const CustomizeRow: React.FC<{
  item: CustomizeItem;
  selected: boolean;
  pending: boolean;
  statusOverride?: CustomizeDotStatus;
  onSelect: () => void;
  onToggle: (enabled: boolean) => void;
}> = ({ item, selected, pending, statusOverride, onSelect, onToggle }) => {
  const { t } = useI18n();
  const problemCount = item.diagnostics.filter((diagnostic) => diagnostic.level !== 'info').length;
  const status = statusOverride ?? item.status;
  const authProblem = statusOverride === 'needs_auth' || statusOverride === 'failed';
  return (
    <div
      className={cn(
        'flex w-full items-start gap-4 rounded-xl border p-4 transition-colors',
        selected ? 'border-border bg-[var(--interactive-active)]' : 'border-border/70 hover:border-border hover:bg-surface-elevated/40',
      )}
    >
      <button type="button" onClick={onSelect} aria-current={selected || undefined} className="flex min-w-0 flex-1 items-start gap-4 text-start">
        <span className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-xl border border-border/60 bg-surface-background text-foreground/80">
          <CustomizeKindIcon kind={item.kind} className="h-6 w-6" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-2">
            <StatusDot status={status} />
            <span className="truncate text-[15px] font-semibold text-foreground">{itemLabel(item)}</span>
            {problemCount > 0 ? (
              <span
                className={cn(
                  'typography-micro shrink-0 rounded-full px-1.5 py-0.5 font-medium',
                  item.status === 'error' || item.status === 'blocked' ? 'bg-red-500/15 text-red-500' : 'bg-amber-500/15 text-amber-500',
                )}
              >
                {problemCount}
              </span>
            ) : null}
            {authProblem ? (
              <span className="typography-micro shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-500">
                {t(mcpStatusLabelKey(statusOverride))}
              </span>
            ) : null}
          </span>
          {item.description ? <span className="line-clamp-2 typography-meta text-muted-foreground">{item.description}</span> : null}
          <span className="mt-0.5 flex items-center gap-2">
            <ScopeBadge scope={item.scope} />
            {item.legacy ? <span className="typography-micro text-amber-500">{t('settings.customize.detail.legacy')}</span> : null}
            {item.shadowedBy ? <span className="typography-micro text-muted-foreground">{t('settings.customize.status.shadowed')}</span> : null}
          </span>
        </span>
      </button>
      {isItemToggleable(item) ? <ItemToggle item={item} pending={pending} onToggle={onToggle} /> : null}
    </div>
  );
};

const VirtualRows: React.FC<{
  items: CustomizeItem[];
  pendingIds: Record<string, boolean>;
  selectedId: string | null;
  liveStatusByName: McpStatusMap | null;
  onSelect: (id: string) => void;
  onToggle: (item: CustomizeItem, enabled: boolean) => void;
}> = ({ items, pendingIds, selectedId, liveStatusByName, onSelect, onToggle }) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [scrollMargin, setScrollMargin] = React.useState(0);
  const getScrollElement = React.useCallback(
    () => (containerRef.current?.closest('.overlay-scrollbar-target') as HTMLElement | null) ?? null,
    [],
  );
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement,
    estimateSize: () => 104,
    overscan: 8,
    scrollMargin,
    getItemKey: (index) => items[index]?.id ?? index,
  });

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    const scroller = getScrollElement();
    if (!container || !scroller) return;
    const measure = () => {
      const offset = container.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      setScrollMargin((previous) => (Math.abs(previous - offset) < 0.5 ? previous : offset));
    };
    measure();
    const content = scroller.firstElementChild;
    if (!content) return;
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [getScrollElement, items.length]);

  return (
    <div ref={containerRef} data-customize-virtual-list className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((row) => {
        const item = items[row.index];
        if (!item) return null;
        const live = liveStatusByName ? liveStatusOf(liveStatusByName, item.name) : undefined;
        return (
          <div
            key={row.key}
            data-index={row.index}
            ref={virtualizer.measureElement}
            data-customize-row
            className="absolute left-0 top-0 w-full py-1"
            style={{ transform: `translateY(${row.start - scrollMargin}px)` }}
          >
            <CustomizeRow
              item={item}
              selected={item.id === selectedId}
              pending={pendingIds[item.id] === true}
              statusOverride={live !== undefined ? mergeLiveStatus(item.status, live) : undefined}
              onSelect={() => onSelect(item.id)}
              onToggle={(enabled) => onToggle(item, enabled)}
            />
          </div>
        );
      })}
    </div>
  );
};

const McpStatusSection: React.FC<{ item: CustomizeItem; liveStatus: McpLiveStatus | undefined; directory: string | null }> = ({
  item, liveStatus, directory,
}) => {
  const { t } = useI18n();
  const refresh = useMcpStore((state) => state.refresh);
  const status = mergeLiveStatus(item.status, liveStatus);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className={SETTINGS_SECTION_TITLE_CLASS}>{t('settings.customize.mcpStatus.title')}</h3>
        <Button variant="secondary" size="sm" aria-label={t('settings.customize.mcpStatus.refreshAria')} onClick={() => { void refresh({ directory, silent: true }); }}>
          <Icon name="refresh" className="h-3.5 w-3.5" />
          {t('settings.customize.mcpStatus.refresh')}
        </Button>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2.5">
        <StatusDot status={status} />
        <span className="typography-meta text-foreground">
          {t(liveStatus === undefined ? itemStatusLabelKey(item.status) : mcpStatusLabelKey(status))}
        </span>
      </div>
      <p className={SETTINGS_HELPER_CLASS}>{t('settings.customize.mcpStatus.authHint')}</p>
    </div>
  );
};

const ItemDetail: React.FC<{
  item: CustomizeItem;
  pending: boolean;
  onToggle: (enabled: boolean) => void;
  mcpStatusSection?: React.ReactNode;
}> = ({ item, pending, onToggle, mcpStatusSection }) => {
  const { t } = useI18n();
  return (
    <div className="space-y-6 px-4 py-5 sm:px-6 @3xl:px-5">
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground">
            <CustomizeKindIcon kind={item.kind} className="h-5 w-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <h2 className={SETTINGS_SECTION_TITLE_CLASS}>{itemLabel(item)}</h2>
            {item.description ? <p className={SETTINGS_DESCRIPTION_CLASS}>{item.description}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5">
            <StatusDot status={item.status} />
            <span className="typography-meta text-foreground">{t(itemStatusLabelKey(item.status))}</span>
          </span>
          <ScopeBadge scope={item.scope} />
        </div>
      </div>
      {mcpStatusSection}
      {isItemToggleable(item) ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5">
          <div className="min-w-0 space-y-0.5">
            <div className="typography-meta font-medium text-foreground">{t('settings.customize.item.enabledLabel')}</div>
            <p className={SETTINGS_HELPER_CLASS}>
              {t(item.kind === 'mcp' ? 'settings.customize.item.enabledHelpConnector' : 'settings.customize.item.enabledHelp')}
            </p>
          </div>
          <ItemToggle item={item} pending={pending} onToggle={onToggle} />
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2">
        <DetailField label={t('settings.customize.detail.scope')}><span className="capitalize">{item.scope}</span></DetailField>
        <DetailField label={t('settings.customize.detail.origin')}><span>{item.origin}</span></DetailField>
      </div>
      {item.path ? (
        <DetailField label={t('settings.customize.detail.path')}>
          <code className="break-all font-mono typography-micro text-muted-foreground">{item.path}</code>
        </DetailField>
      ) : null}
      {item.shadowedBy ? (
        <div className="rounded-xl border border-border/70 px-3 py-2">
          <p className={SETTINGS_HELPER_CLASS}>{t('settings.customize.detail.shadowedBy', { scope: item.shadowedBy.scope })}</p>
          {item.shadowedBy.path ? <code className="break-all font-mono typography-micro text-muted-foreground">{item.shadowedBy.path}</code> : null}
        </div>
      ) : null}
      {item.diagnostics.length > 0 ? (
        <div className="space-y-2 border-t border-border/60 pt-4">
          <h3 className={SETTINGS_SECTION_TITLE_CLASS}>{t('settings.customize.detail.diagnostics')}</h3>
          {item.diagnostics.map((diagnostic, index) => (
            <div key={`${diagnostic.code ?? diagnostic.message}-${index}`} className="flex items-start gap-2">
              <DiagnosticIcon level={diagnostic.level} />
              <div className="min-w-0 space-y-0.5">
                <p className="typography-meta text-foreground">{diagnostic.message}</p>
                {diagnostic.file ? (
                  <code className="break-all font-mono typography-micro text-muted-foreground">
                    {diagnostic.file}{diagnostic.line != null ? `:${diagnostic.line}` : ''}
                  </code>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const CustomizeKindList: React.FC<{ kind: CustomizeKind; titleKey: I18nKey; directory: string | null }> = ({
  kind, titleKey, directory,
}) => {
  const { t } = useI18n();
  const allItems = useCustomizeHubStore((state) => state.items);
  const scopeFilter = useCustomizeHubStore((state) => state.scopeFilter);
  const query = useCustomizeHubStore((state) => state.query);
  const isLoading = useCustomizeHubStore((state) => state.isLoading);
  const loadError = useCustomizeHubStore((state) => state.loadError);
  const load = useCustomizeHubStore((state) => state.load);
  const pendingIds = useCustomizeHubStore((state) => state.pendingIds);
  const liveStatusMap = useMcpStore((state) => state.getStatusForDirectory(directory));
  const ensureFresh = useMcpStore((state) => state.ensureFresh);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const toggle = useToggleItem(directory);

  const items = React.useMemo(
    () => allItems.filter((item) => item.kind === kind && (scopeFilter === 'all' || item.scope === scopeFilter) && itemMatchesQuery(item, query)),
    [allItems, kind, scopeFilter, query],
  );
  const selected = items.find((item) => item.id === selectedId) ?? null;

  React.useEffect(() => {
    if (kind === 'mcp' && selected) void ensureFresh({ directory, silent: true, maxAgeMs: 60_000 });
  }, [ensureFresh, kind, selected, directory]);

  const trimmed = query.trim();
  let listBody: React.ReactNode;
  if (loadError && allItems.length === 0) {
    listBody = (
      <div className="mx-1 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-3">
        <p className="typography-meta text-foreground">{t('settings.customize.loadError')}</p>
        <Button variant="secondary" size="sm" className="mt-2" onClick={() => { void load({ directory, force: true }); }}>
          {t('settings.customize.retry')}
        </Button>
      </div>
    );
  } else if (isLoading && allItems.length === 0) {
    listBody = <p className={cn('px-1 py-3', SETTINGS_HELPER_CLASS)}>{t('settings.customize.list.loading')}</p>;
  } else if (items.length === 0) {
    listBody = (
      <p className={cn('px-1 py-3', SETTINGS_HELPER_CLASS)}>
        {trimmed ? t('settings.customize.list.emptySearch', { query: trimmed }) : t('settings.customize.list.empty')}
      </p>
    );
  } else {
    listBody = (
      <VirtualRows
        items={items}
        pendingIds={pendingIds}
        selectedId={selectedId}
        liveStatusByName={kind === 'mcp' ? liveStatusMap : null}
        onSelect={setSelectedId}
        onToggle={(item, enabled) => { void toggle(item, enabled); }}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <ScrollableOverlay outerClassName={cn('min-h-0 flex-1 border-border/60', selected ? 'hidden @3xl:block' : 'block')} className="px-2 py-3 sm:px-3">
        <div className="mb-2 flex items-baseline gap-2 px-1">
          <h2 className={SETTINGS_SECTION_TITLE_CLASS}>{t(titleKey)}</h2>
          <span className={cn('tabular-nums', SETTINGS_HELPER_CLASS)}>{items.length}</span>
        </div>
        {listBody}
      </ScrollableOverlay>
      <div className={cn('min-h-0 flex-1 border-s border-border/60 @3xl:max-w-[26rem]', selected ? 'block' : 'hidden @3xl:block')}>
        {selected ? (
          <>
            <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2 @3xl:hidden">
              <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
                <Icon name="arrow-left-s" className="h-4 w-4 rtl:rotate-180" />
                {t('settings.customize.back')}
              </Button>
            </div>
            <ScrollableOverlay outerClassName="h-full min-h-0" className="pb-8">
              <ItemDetail
                item={selected}
                pending={pendingIds[selected.id] === true}
                onToggle={(enabled) => { void toggle(selected, enabled); }}
                mcpStatusSection={kind === 'mcp'
                  ? <McpStatusSection item={selected} liveStatus={liveStatusOf(liveStatusMap, selected.name)} directory={directory} />
                  : undefined}
              />
            </ScrollableOverlay>
          </>
        ) : (
          <ScrollableOverlay outerClassName="h-full min-h-0" className="flex items-center justify-center px-6">
            <p className={cn('text-center', SETTINGS_HELPER_CLASS)}>{t('settings.customize.detail.noSelection')}</p>
          </ScrollableOverlay>
        )}
      </div>
    </div>
  );
};
