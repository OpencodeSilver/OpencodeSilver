/**
 * Building blocks the Customize hub views share: kind icons, cards and their
 * grid, section headers, bordered panels, scope/status badges, the on/off
 * switch and the hero banner at the top of Discover.
 */

import React from 'react';

import { Icon } from '@/components/icon/Icon';
import { McpIcon } from '@/components/icons/McpIcon';
import {
  SETTINGS_DESCRIPTION_CLASS,
  SETTINGS_HELPER_CLASS,
  SETTINGS_SECTION_TITLE_CLASS,
} from '@/components/sections/shared/SettingsSection';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useI18n } from '@/lib/i18n';
import type { I18nKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { CustomizeItem } from '@/stores/useCustomizeHubStore';

import { itemLabel, kindIconName, statusDotClass, type CustomizeDotStatus } from './customizeModel';
import { useCustomizeVariant } from './customizeVariant';

export const CustomizeKindIcon: React.FC<{ kind: string; className?: string }> = ({ kind, className }) => {
  if (kind === 'mcp' || kind === 'connector') return <McpIcon className={className} />;
  return <Icon name={kindIconName(kind)} className={className} />;
};

export interface CustomizeCardProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  testId?: string;
}

/** A tile in a Discover or Overview grid. Clickable tiles are buttons for keyboard users. */
export const CustomizeCard: React.FC<CustomizeCardProps> = ({
  icon, title, description, meta, badge, actions, className, onClick, testId,
}) => {
  const titleText = typeof title === 'string' ? title : undefined;
  const descriptionText = typeof description === 'string' ? description : undefined;
  const onKeyDown = onClick
    ? (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }
    : undefined;
  return (
    <div
      onClick={onClick}
      onKeyDown={onKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      data-testid={testId}
      className={cn(
        'group relative flex h-full flex-col justify-between rounded-xl border border-border/70 p-3.5 transition-colors duration-150 sm:p-4',
        'hover:border-border hover:bg-surface-elevated/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3 sm:gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-surface-background text-foreground/80 sm:h-12 sm:w-12">
          {icon}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex min-w-0 items-center gap-2">
            <h4 title={titleText} className="truncate text-sm font-semibold text-foreground sm:text-[15px]">{title}</h4>
            {badge}
          </div>
          {description ? (
            <p title={descriptionText} className="line-clamp-2 text-xs leading-snug text-foreground/80 sm:text-sm">{description}</p>
          ) : null}
        </div>
      </div>
      {meta || actions ? (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/30 pt-2.5 sm:mt-3.5">
          <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{meta}</div>
          {actions ? (
            <div className="ms-auto flex shrink-0 items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export const CustomizeGrid: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const variant = useCustomizeVariant();
  return (
    <div
      className={cn(
        'grid items-stretch gap-3 sm:gap-3.5',
        variant === 'settings'
          ? '[grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr))]'
          : '[grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr))]',
        className,
      )}
    >
      {children}
    </div>
  );
};

export const CustomizeSectionHeader: React.FC<{
  title: React.ReactNode;
  count?: number | string;
  actionLabel?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
}> = ({ title, count, actionLabel, isExpanded, onToggleExpand, className }) => (
  <div className={cn('flex items-center justify-between', className)}>
    <div className="flex items-center gap-2">
      <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      {count !== undefined ? (
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">{count}</span>
      ) : null}
    </div>
    {actionLabel && onToggleExpand ? (
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
        className="flex items-center gap-1 text-sm font-medium text-foreground hover:bg-interactive-hover"
      >
        <span>{actionLabel}</span>
        <Icon name={isExpanded ? 'arrow-left' : 'arrow-right'} className="h-4 w-4 rtl:rotate-180" />
      </Button>
    ) : null}
  </div>
);

export const CustomizePanel: React.FC<{ title: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  title, children, className,
}) => (
  <div className={cn('rounded-xl border border-border/70 p-4', className)}>
    <h3 className={cn('mb-2', SETTINGS_SECTION_TITLE_CLASS)}>{title}</h3>
    {children}
  </div>
);

export const ScopeBadge: React.FC<{ scope: string }> = ({ scope }) => {
  const { t } = useI18n();
  const label = scope === 'user'
    ? t('settings.customize.scope.user')
    : scope === 'project'
      ? t('settings.customize.scope.project')
      : scope;
  return (
    <span
      data-scope={scope}
      className="typography-micro shrink-0 rounded-full border border-[var(--interactive-border)] bg-[var(--surface-elevated)] px-2 py-0.5 font-medium text-muted-foreground"
    >
      {label}
    </span>
  );
};

export const StatusDot: React.FC<{ status: CustomizeDotStatus | undefined }> = ({ status }) => (
  <span className={cn('h-2 w-2 shrink-0 rounded-full', statusDotClass(status))} aria-hidden />
);

export const ItemToggle: React.FC<{ item: CustomizeItem; pending: boolean; onToggle: (enabled: boolean) => void }> = ({
  item, pending, onToggle,
}) => {
  const { t } = useI18n();
  return (
    <Switch
      checked={item.enabled}
      loading={pending}
      disabled={pending}
      onCheckedChange={onToggle}
      aria-label={t(item.enabled ? 'settings.customize.item.toggleOff' : 'settings.customize.item.toggleOn', { name: itemLabel(item) })}
    />
  );
};

export const DiagnosticIcon: React.FC<{ level: string }> = ({ level }) => {
  if (level === 'error') return <Icon name="error-warning" className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />;
  if (level === 'warning') return <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />;
  return <Icon name="information" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />;
};

export const DetailField: React.FC<{ label: React.ReactNode; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1">
    <div className={SETTINGS_HELPER_CLASS}>{label}</div>
    <div className="min-w-0 typography-meta text-foreground">{children}</div>
  </div>
);

export const CustomizeHero: React.FC<{
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  tintTone?: 'success' | 'info';
  addButtonLabel: React.ReactNode;
  onAdd: () => void;
  disabled?: boolean;
}> = ({ eyebrow, title, description, tintTone, addButtonLabel, onAdd, disabled = false }) => (
  <div
    style={{
      background: `color-mix(in srgb, ${tintTone === 'success' ? 'var(--status-success)' : 'var(--status-info)'} 28%, var(--surface-background))`,
    }}
    className="relative flex min-h-[160px] w-full shrink-0 flex-col justify-between overflow-hidden rounded-2xl p-5 text-foreground transition-colors sm:p-6 md:min-h-[175px] md:flex-row md:items-center"
    data-testid="customize-hero"
  >
    <div className="z-10 flex min-w-0 max-w-xl flex-1 flex-col items-start gap-3 sm:gap-4">
      <div className="space-y-1">
        <span className="text-xs font-medium text-foreground/75 sm:text-sm">{eyebrow}</span>
        <h2 className="text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl">{title}</h2>
        <p className="line-clamp-2 text-xs text-foreground/80 sm:text-sm">{description}</p>
      </div>
      <Button
        variant="default"
        size="default"
        className="h-8.5 rounded-lg border-0 bg-foreground px-3.5 text-xs font-medium text-background shadow-xs hover:bg-foreground/90 sm:h-9 sm:text-sm"
        onClick={onAdd}
        disabled={disabled}
      >
        {addButtonLabel}
      </Button>
    </div>
    <div className="relative mt-3 hidden shrink-0 items-center justify-center md:mt-0 md:flex md:w-40 lg:w-48">
      <svg viewBox="0 0 160 120" fill="none" className="h-28 w-36 text-foreground @7xl:h-32 @7xl:w-44" aria-hidden="true">
        <rect x="4" y="4" width="116" height="92" rx="6" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
        <line x1="43" y1="4" x2="43" y2="96" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <line x1="82" y1="4" x2="82" y2="96" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <line x1="4" y1="27" x2="120" y2="27" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <line x1="4" y1="50" x2="120" y2="50" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <line x1="4" y1="73" x2="120" y2="73" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <circle cx="116" cy="86" r="30" style={{ fill: 'color-mix(in srgb, var(--status-success) 60%, var(--surface-background))' }} stroke="currentColor" strokeWidth="2.5" />
        <path d="M99 94 L110 83 L118 90 L132 76" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M123 76 H132 V85" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  </div>
);

/** Shown for kinds OpenCode has no concept of yet (hooks, extensions). */
export const CustomizeUnavailable: React.FC<{
  titleKey: I18nKey;
  bodyKey: I18nKey;
  settingsSlug?: string;
  settingsTitleKey: I18nKey;
  onOpenSettings: (slug: string) => void;
}> = ({ titleKey, bodyKey, settingsSlug, settingsTitleKey, onOpenSettings }) => {
  const { t } = useI18n();
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md space-y-3 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-muted-foreground">
          <Icon name="box-3" className="h-5 w-5" />
        </span>
        <h2 className={SETTINGS_SECTION_TITLE_CLASS}>{t(titleKey)}</h2>
        <p className={cn('mx-auto max-w-sm', SETTINGS_DESCRIPTION_CLASS)}>{t(bodyKey)}</p>
        {settingsSlug ? (
          <Button variant="secondary" size="sm" onClick={() => onOpenSettings(settingsSlug)}>
            <Icon name="settings-3" className="h-4 w-4" />
            {t('settings.customize.openSettings', { title: t(settingsTitleKey) })}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
