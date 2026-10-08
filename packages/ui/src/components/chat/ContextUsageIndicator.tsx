import React from 'react';
import {
  evaluateContextSaturation,
  type TokenUsageEstimate,
} from '@/lib/tokens/contextTokenEstimator';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/icon/Icon';

interface ContextUsageIndicatorProps {
  totalTokens: number;
  maxTokens?: number;
  className?: string;
}

export const ContextUsageIndicator: React.FC<ContextUsageIndicatorProps> = ({
  totalTokens,
  maxTokens = 128_000,
  className,
}) => {
  const estimate: TokenUsageEstimate = React.useMemo(() => {
    return evaluateContextSaturation(totalTokens, maxTokens);
  }, [totalTokens, maxTokens]);

  const statusColors = {
    optimal: 'text-muted-foreground hover:text-foreground',
    moderate: 'text-foreground',
    'near-limit': 'text-amber-500 font-medium',
    exceeded: 'text-destructive font-semibold',
  }[estimate.status];

  const progressBg = {
    optimal: 'bg-primary/40',
    moderate: 'bg-primary',
    'near-limit': 'bg-amber-500',
    exceeded: 'bg-destructive',
  }[estimate.status];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full border border-border/40 bg-background/50 backdrop-blur-xs select-none transition-colors',
        statusColors,
        className
      )}
      title={`Context Window: ${estimate.formattedTokenCount} / ${(maxTokens / 1000).toFixed(0)}k tokens (${estimate.percentageUsed}%)`}
    >
      <Icon name="terminal" className="w-3 h-3 opacity-75 shrink-0" />
      <span>{estimate.formattedTokenCount}</span>
      <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden flex items-center">
        <div
          className={cn('h-full transition-all duration-300', progressBg)}
          style={{ width: `${Math.min(100, estimate.percentageUsed)}%` }}
        />
      </div>
      <span className="opacity-75">{estimate.percentageUsed}%</span>
    </div>
  );
};
