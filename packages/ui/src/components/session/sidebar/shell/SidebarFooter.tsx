import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Icon } from '@/components/icon/Icon';
import { useI18n } from '@/lib/i18n';

type Props = {
  onOpenSettings: () => void;
  onOpenUsage: () => void;
  onOpenShortcuts: () => void;
  onOpenAbout: () => void;
  onOpenUpdate: () => void;
  showRuntimeButtons?: boolean;
  showUpdateButton?: boolean;
};

const footerIconButtonClassName =
  'inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-interactive-hover/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export function SidebarFooter({
  onOpenSettings,
  onOpenUsage,
  onOpenShortcuts,
  onOpenAbout,
  onOpenUpdate,
  showRuntimeButtons = true,
  showUpdateButton = true,
}: Props): React.ReactNode {
  const { t } = useI18n();

  if (!showRuntimeButtons && !showUpdateButton) {
    return null;
  }

  return (
    <div className="flex shrink-0 items-center justify-between gap-1 px-2.5 py-2">
      {showRuntimeButtons ? (
        <>
          {/* Antigravity v2 pinned bottom-left Settings button (gear + label) */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-interactive-hover/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label={t('sessions.sidebar.footer.actions.settings')}
          >
            <Icon name="settings-3" className="h-4 w-4 shrink-0" />
            <span>{t('sessions.sidebar.footer.actions.settings')}</span>
          </button>

          {/* Quiet monochrome utility icons on the right */}
          <div className="ml-auto flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onOpenUsage}
                  className={footerIconButtonClassName}
                  aria-label={t('usageStats.openAction')}
                >
                  <Icon name="bar-chart" className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4}>
                <p>{t('usageStats.openAction')}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onOpenShortcuts}
                  className={footerIconButtonClassName}
                  aria-label={t('sessions.sidebar.footer.actions.shortcuts')}
                >
                  <Icon name="command" className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4}>
                <p>{t('sessions.sidebar.footer.actions.shortcuts')}</p>
              </TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={footerIconButtonClassName}
                      aria-label="More actions"
                    >
                      <Icon name="more-2" className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={4}>
                  <p>More</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" side="top" className="min-w-[190px]">
                <DropdownMenuItem onClick={onOpenAbout} className="flex items-center gap-2">
                  <Icon name="opencodesilver" className="h-4 w-4 text-muted-foreground" />
                  <span>{t('sessions.sidebar.footer.actions.aboutOpencodeSilver')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenUpdate} className="flex items-center gap-2">
                  <Icon name="update-sync" className="h-4 w-4 text-muted-foreground" />
                  <span>تحديث البرنامج والتحقق</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    window.open(
                      'https://github.com/OpencodeSilver/OpencodeSilver/issues/new',
                      '_blank',
                      'noopener,noreferrer',
                    )
                  }
                  className="flex items-center gap-2"
                >
                  <Icon name="report-issue" className="h-4 w-4 text-muted-foreground" />
                  <span>الإبلاغات عن المشاكل / شكوى</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    window.open(
                      'https://github.com/OpencodeSilver/OpencodeSilver/discussions',
                      '_blank',
                      'noopener,noreferrer',
                    )
                  }
                  className="flex items-center gap-2"
                >
                  <Icon name="idea-spark" className="h-4 w-4 text-muted-foreground" />
                  <span>طلب أفكار واقتراحات جديدة</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      ) : null}
      {showUpdateButton ? (
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="ml-1 border-border bg-secondary text-foreground hover:bg-secondary/80"
          onClick={onOpenUpdate}
        >
          {t('sessions.sidebar.footer.actions.update')}
        </Button>
      ) : null}
    </div>
  );
}

