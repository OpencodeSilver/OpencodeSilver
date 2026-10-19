/**
 * The composer's tool-permission chip ("Full access ▾"): shows the session's
 * current mode and opens a menu to pick Ask first / Auto edit / Full access.
 *
 * Picking a mode applies that exact mode when `onSelectMode` is wired; without
 * it the menu falls back to cycling, like the old shield button.
 */

import React from 'react';

import { Icon } from '@/components/icon/Icon';
import type { IconName } from '@/components/icon/icons';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { PermissionMode } from '@/stores/utils/permissionAutoAccept';

type PermissionModeChipProps = {
    isInteractive: boolean;
    /** Already passed through `displayedPermissionMode`. */
    permissionMode: PermissionMode;
    handlePermissionModeCycle: () => void;
    onSelectMode?: (mode: PermissionMode) => void;
    /** Label + caret chip (default) or a round icon button. */
    asChip?: boolean;
};

const MODE_ICON = {
    ask: { icon: 'shield-user', color: undefined },
    safety: { icon: 'shield-star', color: 'var(--status-success)' },
    auto: { icon: 'shield-check', color: 'var(--status-info)' },
} satisfies Record<PermissionMode, { icon: IconName; color: string | undefined }>;

const MODE_ORDER: readonly PermissionMode[] = ['ask', 'safety', 'auto'];

const MODE_LABEL_KEY = {
    ask: 'chat.chatInput.permissionChip.ask',
    safety: 'chat.chatInput.permissionChip.safety',
    auto: 'chat.chatInput.permissionChip.auto',
} as const;

const MODE_DESC_KEY = {
    ask: 'chat.chatInput.permissionChip.askDesc',
    safety: 'chat.chatInput.permissionChip.safetyDesc',
    auto: 'chat.chatInput.permissionChip.autoDesc',
} as const;

const MODE_ARIA_KEY = {
    ask: 'chat.chatInput.permissionMode.ask',
    safety: 'chat.chatInput.permissionMode.safety',
    auto: 'chat.chatInput.permissionMode.auto',
} as const;

const CHIP_CLASS = 'inline-flex h-7 shrink-0 cursor-pointer select-none items-center gap-1.5 px-1.5 text-xs font-normal text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus:outline-none';
const ICON_BUTTON_CLASS = 'flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--interactive-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';
const ITEM_CLASS = 'flex cursor-pointer items-start gap-2 rounded-[8px] p-2 text-xs text-[var(--text-primary)] hover:bg-[var(--surface-raised-hover)] focus:bg-[var(--surface-raised-hover)]';

export const PermissionModeChip = React.memo(function PermissionModeChip(props: PermissionModeChipProps) {
    const { t } = useI18n();
    const { isInteractive, permissionMode, handlePermissionModeCycle, onSelectMode, asChip = true } = props;

    const ariaLabel = t(MODE_ARIA_KEY[permissionMode]);
    const chipLabel = t(MODE_LABEL_KEY[permissionMode]);
    const { icon, color } = MODE_ICON[permissionMode];

    const choose = React.useCallback((mode: PermissionMode) => {
        if (onSelectMode) {
            onSelectMode(mode);
            return;
        }
        if (mode !== permissionMode) {
            handlePermissionModeCycle();
        }
    }, [handlePermissionModeCycle, onSelectMode, permissionMode]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className={cn(asChip ? CHIP_CLASS : ICON_BUTTON_CLASS, !isInteractive && 'cursor-not-allowed opacity-40')}
                    // Keep the composer (and the mobile keyboard) focused.
                    onMouseDown={(event) => event.preventDefault()}
                    onPointerDownCapture={(event) => {
                        if (event.pointerType === 'touch') {
                            event.preventDefault();
                            event.stopPropagation();
                        }
                    }}
                    aria-label={ariaLabel}
                    title={ariaLabel}
                    disabled={!isInteractive}
                >
                    <Icon name={icon} className={asChip ? 'h-3.5 w-3.5 shrink-0' : 'h-4 w-4 shrink-0'} style={color ? { color } : undefined} />
                    {asChip ? (
                        <>
                            <span className="max-w-[90px] truncate">{chipLabel}</span>
                            <Icon name="arrow-down-s" className="h-3 w-3 shrink-0 opacity-60" />
                        </>
                    ) : null}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                side="top"
                align="end"
                className="w-56 rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-raised)] p-1 shadow-lg"
            >
                <DropdownMenuLabel className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('chat.chatInput.permissionChip.menuTitle')}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1 bg-[var(--border-soft)]" />
                {MODE_ORDER.map((mode) => {
                    const meta = MODE_ICON[mode];
                    return (
                        <DropdownMenuItem key={mode} onSelect={() => choose(mode)} className={ITEM_CLASS}>
                            <Icon
                                name={meta.icon}
                                className="mt-0.5 h-4 w-4 shrink-0"
                                style={meta.color ? { color: meta.color } : undefined}
                            />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between font-medium text-[var(--text-primary)]">
                                    <span>{t(MODE_LABEL_KEY[mode])}</span>
                                    {mode === permissionMode ? <Icon name="check" className="h-3.5 w-3.5 text-primary" /> : null}
                                </div>
                                <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                                    {t(MODE_DESC_KEY[mode])}
                                </div>
                            </div>
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
