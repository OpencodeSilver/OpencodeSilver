import React from 'react';
import { analyzeCommandSafety, type CommandSafetyAnalysis } from '@/lib/safety/commandSafety';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/icon/Icon';

interface CommandSafetyBadgeProps {
  command: string;
  className?: string;
  /** Kept for callers; the reasons are always shown inline now. */
  showDetails?: boolean;
}

const RISK_STYLES = {
  critical: 'bg-destructive/10 text-destructive',
  high: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  low: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
} as const;

const RISK_LABEL_KEY = {
  critical: 'chat.commandSafety.critical',
  high: 'chat.commandSafety.high',
  medium: 'chat.commandSafety.medium',
  low: 'chat.commandSafety.low',
} as const;

/** One-line, localized risk note shown above a shell command that is not plainly safe. */
export const CommandSafetyBadge: React.FC<CommandSafetyBadgeProps> = ({ command, className }) => {
  const { t } = useI18n();
  const analysis: CommandSafetyAnalysis = React.useMemo(() => analyzeCommandSafety(command), [command]);

  if (analysis.riskLevel === 'safe') {
    return null;
  }

  const level = analysis.riskLevel;
  const iconName = level === 'critical' || level === 'high' ? 'alert' : 'information';

  return (
    <div role="note" className={cn('flex items-start gap-2 rounded-lg px-2.5 py-1.5 typography-meta', RISK_STYLES[level], className)}>
      <Icon name={iconName} className="mt-0.5 size-3.5 shrink-0" />
      <span className="min-w-0">
        <span className="font-medium">{t(RISK_LABEL_KEY[level])}</span>
        {analysis.reasons.length > 0 ? <span className="opacity-80"> — {analysis.reasons.join(' · ')}</span> : null}
      </span>
    </div>
  );
};
