import React from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icon/Icon';
import { calculateSessionMetrics, type SessionAggregateMetrics } from '@/lib/session/sessionMetricsCalculator';
import { useSessionMessages } from '@/sync/sync-context';
import { useChatSessionSelection } from './chatColumnSession';

interface SessionMetricsCardProps {
  className?: string;
}

export const SessionMetricsCard: React.FC<SessionMetricsCardProps> = ({ className }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const currentSessionId = useChatSessionSelection().sessionId;
  const messages = useSessionMessages(currentSessionId ?? '');

  const metrics: SessionAggregateMetrics = React.useMemo(() => {
    return calculateSessionMetrics(messages);
  }, [messages]);

  if (!currentSessionId || metrics.totalUserMessages === 0) return null;

  return (
    <div className="relative inline-block">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={className}
        title="View session metrics"
      >
        <Icon name="bar-chart-2" className="w-3.5 h-3.5 mr-1 text-primary" />
        <span className="text-xs">Metrics</span>
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 bottom-full mb-1 w-64 rounded-xl border border-border bg-popover/95 p-3 shadow-xl backdrop-blur-md z-50 text-xs text-foreground">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40 font-semibold">
              <div className="flex items-center gap-1.5">
                <Icon name="bar-chart" className="w-4 h-4 text-primary" />
                <span>Session Summary</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                <Icon name="close" className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-muted/40 border border-border/20 flex flex-col">
                <span className="text-[10px] text-muted-foreground">Messages</span>
                <span className="text-sm font-semibold">{metrics.totalUserMessages + metrics.totalAssistantMessages}</span>
              </div>
              <div className="p-2 rounded-lg bg-muted/40 border border-border/20 flex flex-col">
                <span className="text-[10px] text-muted-foreground">Tools Executed</span>
                <span className="text-sm font-semibold text-primary">{metrics.totalToolsExecuted}</span>
              </div>
              <div className="p-2 rounded-lg bg-muted/40 border border-border/20 flex flex-col">
                <span className="text-[10px] text-muted-foreground">Est. Tokens</span>
                <span className="text-sm font-semibold">~{metrics.estimatedTokens.toLocaleString()}</span>
              </div>
              <div className="p-2 rounded-lg bg-muted/40 border border-border/20 flex flex-col">
                <span className="text-[10px] text-muted-foreground">Files Modified</span>
                <span className="text-sm font-semibold text-emerald-500">{metrics.filesModifiedCount}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
