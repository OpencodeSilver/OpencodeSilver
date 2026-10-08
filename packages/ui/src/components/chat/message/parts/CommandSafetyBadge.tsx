import React from 'react';
import { analyzeCommandSafety, type CommandSafetyAnalysis } from '@/lib/safety/commandSafety';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/icon/Icon';

interface CommandSafetyBadgeProps {
  command: string;
  className?: string;
  showDetails?: boolean;
}

export const CommandSafetyBadge: React.FC<CommandSafetyBadgeProps> = ({
  command,
  className,
  showDetails = false,
}) => {
  const analysis: CommandSafetyAnalysis = React.useMemo(() => {
    return analyzeCommandSafety(command);
  }, [command]);

  if (analysis.riskLevel === 'safe' && !showDetails) {
    return null;
  }

  const badgeStyles = {
    critical: 'bg-destructive/15 text-destructive border-destructive/30',
    high: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    medium: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
    low: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
    safe: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  }[analysis.riskLevel];

  const iconName: any = {
    critical: 'alert',
    high: 'alert',
    medium: 'information',
    low: 'information',
    safe: 'check',
  }[analysis.riskLevel];

  return (
    <div
      className={cn(
        'inline-flex flex-col gap-1 text-xs rounded-md border px-2 py-1',
        badgeStyles,
        className
      )}
      title={analysis.reasons.join('; ')}
    >
      <div className="flex items-center gap-1.5 font-medium">
        <Icon name={iconName} className="w-3.5 h-3.5 shrink-0" />
        <span className="capitalize">{analysis.riskLevel} Safety Risk</span>
      </div>
      {showDetails && analysis.reasons.length > 0 && (
        <ul className="list-disc list-inside text-[11px] opacity-90 pl-1">
          {analysis.reasons.map((reason, idx) => (
            <li key={idx}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
