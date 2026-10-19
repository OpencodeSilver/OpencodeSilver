/**
 * Customize hub model: the tabs, which item kind each one lists, where its
 * full settings page lives, and the small status/icon mappings the views
 * share.
 */

import type { IconName } from '@/components/icon/icons';
import type { I18nKey } from '@/lib/i18n';
import type { CustomizeTab } from '@/lib/settings/metadata';
import type { CustomizeItem, CustomizeItemStatus, CustomizeKind } from '@/stores/useCustomizeHubStore';

export interface CustomizeTabConfig {
  tab: CustomizeTab;
  titleKey: I18nKey;
  kind?: CustomizeKind;
  /** The full settings page for this kind (the hub's "Open settings" target). */
  settingsSlug?: string;
  unavailable?: { titleKey: I18nKey; bodyKey: I18nKey };
}

export const CUSTOMIZE_TAB_CONFIGS: readonly CustomizeTabConfig[] = [
  { tab: 'overview', titleKey: 'settings.customize.tab.overview' },
  { tab: 'skills', titleKey: 'settings.customize.tab.skills', kind: 'skill', settingsSlug: 'skills.installed' },
  { tab: 'connectors', titleKey: 'settings.customize.tab.connectors', kind: 'mcp', settingsSlug: 'mcp' },
  { tab: 'agents', titleKey: 'settings.customize.tab.agents', kind: 'agent', settingsSlug: 'agents' },
  { tab: 'commands', titleKey: 'settings.customize.tab.commands', kind: 'command', settingsSlug: 'commands' },
  { tab: 'rules', titleKey: 'settings.customize.tab.rules', kind: 'rule', settingsSlug: 'behavior' },
  { tab: 'plugins', titleKey: 'settings.customize.tab.plugins', kind: 'plugin', settingsSlug: 'plugins' },
  {
    tab: 'hooks',
    titleKey: 'settings.customize.tab.hooks',
    settingsSlug: 'plugins',
    unavailable: {
      titleKey: 'settings.customize.unavailable.hooks.title',
      bodyKey: 'settings.customize.unavailable.hooks.body',
    },
  },
  {
    tab: 'extensions',
    titleKey: 'settings.customize.tab.extensions',
    settingsSlug: 'extensions',
    unavailable: {
      titleKey: 'settings.customize.unavailable.extensions.title',
      bodyKey: 'settings.customize.unavailable.extensions.body',
    },
  },
  { tab: 'sources', titleKey: 'settings.customize.tab.sources', settingsSlug: 'skills.catalog' },
];

const OVERVIEW_TAB: CustomizeTabConfig = CUSTOMIZE_TAB_CONFIGS[0];

/** Tabs always shown in the tab row; the rest live under "More". */
export const PRIMARY_TABS: readonly CustomizeTab[] = ['skills', 'plugins'];
export const MORE_TABS: readonly CustomizeTab[] = ['connectors', 'overview', 'agents', 'commands', 'rules', 'hooks', 'extensions', 'sources'];

export const isPrimaryTab = (tab: CustomizeTab): boolean => PRIMARY_TABS.includes(tab);

/** Keyboard order of the tab row: the primary tabs, then "More" (or the open secondary tab). */
export const tabRowOrder = (tab: CustomizeTab): Array<CustomizeTab | 'more'> => (
  isPrimaryTab(tab) ? [...PRIMARY_TABS, 'more'] : [...PRIMARY_TABS, tab]
);

export const getTabConfig = (tab: CustomizeTab): CustomizeTabConfig => (
  CUSTOMIZE_TAB_CONFIGS.find((config) => config.tab === tab) ?? OVERVIEW_TAB
);

/** Arrow / Home / End navigation inside a tab row. */
export function nextTabForKey<T>(order: readonly T[], current: T, key: string): T | null {
  const index = order.indexOf(current);
  if (index === -1 || order.length === 0) return null;
  const last = order.length - 1;
  if (key === 'ArrowRight' || key === 'ArrowDown') return order[index === last ? 0 : index + 1];
  if (key === 'ArrowLeft' || key === 'ArrowUp') return order[index === 0 ? last : index - 1];
  if (key === 'Home') return order[0];
  if (key === 'End') return order[last];
  return null;
}

export const kindTitleKey = (kind: CustomizeKind): I18nKey | null => (
  CUSTOMIZE_TAB_CONFIGS.find((config) => config.kind === kind)?.titleKey ?? null
);

/** Icon per kind; MCP connectors use the dedicated MCP glyph instead. */
export function kindIconName(kind: CustomizeKind | string): IconName {
  switch (kind) {
    case 'skill': return 'book-open';
    case 'agent': return 'ai-agent';
    case 'command': return 'slash-commands-2';
    case 'rule': return 'braces';
    case 'plugin': return 'plug-2';
    case 'hook': return 'flashlight';
    case 'extension': return 'apps';
    case 'bundle': return 'stack';
    case 'source': return 'global';
    default: return 'box-3';
  }
}

/** Live MCP connection states reported by OpenCode. */
export type McpLiveStatus = 'connected' | 'needs_auth' | 'failed' | 'pending' | 'disabled' | string;
export type CustomizeDotStatus = CustomizeItemStatus | McpLiveStatus;

export function statusDotClass(status: CustomizeDotStatus | undefined): string {
  switch (status) {
    case 'ok':
    case 'connected':
      return 'bg-emerald-500';
    case 'info':
    case 'pending':
      return 'bg-sky-500';
    case 'warning':
    case 'needs_auth':
      return 'bg-amber-500';
    case 'error':
    case 'blocked':
    case 'failed':
      return 'bg-red-500';
    default:
      return 'bg-muted-foreground/50';
  }
}

export function mcpStatusLabelKey(status: McpLiveStatus | undefined): I18nKey {
  switch (status) {
    case 'connected': return 'settings.customize.mcpStatus.connected';
    case 'needs_auth': return 'settings.customize.mcpStatus.needsAuth';
    case 'failed': return 'settings.customize.mcpStatus.failed';
    case 'pending': return 'settings.customize.mcpStatus.pending';
    case 'disabled': return 'settings.customize.status.disabled';
    default: return 'settings.customize.mcpStatus.unknown';
  }
}

/** A live MCP state replaces a plain "ok"; a real problem on the item still shows. */
export const mergeLiveStatus = (status: CustomizeDotStatus, live: McpLiveStatus | undefined): CustomizeDotStatus => (
  live === undefined ? status : status === 'ok' ? live : status
);

export function itemStatusLabelKey(status: CustomizeItemStatus): I18nKey {
  switch (status) {
    case 'ok': return 'settings.customize.status.ok';
    case 'warning': return 'settings.customize.status.warning';
    case 'error': return 'settings.customize.status.error';
    case 'blocked': return 'settings.customize.status.blocked';
    case 'disabled': return 'settings.customize.status.disabled';
    case 'shadowed': return 'settings.customize.status.shadowed';
    default: return 'settings.customize.status.info';
  }
}

/** Only skills OpenCode loads and MCP connectors have an on/off switch. */
export const isItemToggleable = (item: CustomizeItem): boolean => {
  if (item.status === 'shadowed') return false;
  if (item.kind === 'skill') return Boolean(item.engineId);
  return item.kind === 'mcp';
};

export const itemLabel = (item: Pick<CustomizeItem, 'displayName' | 'name'>): string => item.displayName || item.name;

export const itemMatchesQuery = (item: CustomizeItem, query: string): boolean => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return `${item.name} ${item.displayName ?? ''} ${item.description ?? ''}`.toLowerCase().includes(needle);
};
