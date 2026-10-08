/**
 * ComposerToolsControls - Integrated chat tools inside the Composer toolbar.
 *
 * Provides:
 * 1. AI Prompt Optimizer (analyzes and enhances draft into professional prompt)
 * 2. Session Metrics (modal / popover with statistics)
 * 3. Session Exporter (Markdown download)
 * 4. Cache Cleaner (transient cache purger with toast feedback)
 *
 * Fully localized across all 14 project languages and styled to match the
 * exact visual theme (gold accents, clean borders, smooth transitions).
 */

import React from 'react';
import { Icon } from '@/components/icon/Icon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { calculateSessionMetrics, type SessionAggregateMetrics } from '@/lib/session/sessionMetricsCalculator';
import {
  formatSessionToMarkdown,
  downloadFile,
  type SessionExportPayload,
} from '@/lib/session/sessionExporter';
import { clearTransientCaches } from '@/lib/maintenance/cacheCleaner';
import { optimizePromptWithAI } from '@/lib/prompts/promptOptimizer';
import { useSessionMessages } from '@/sync/sync-context';

export interface ComposerToolsControlsProps {
  sessionId: string | null;
  footerIconButtonClass: string;
  iconSizeClass: string;
  onInsertPrompt?: (promptText: string) => void;
  onReplacePrompt?: (promptText: string) => void;
  currentPromptText?: string;
  className?: string;
}

export const ComposerToolsControls: React.FC<ComposerToolsControlsProps> = React.memo(({
  sessionId,
  footerIconButtonClass,
  iconSizeClass,
  onInsertPrompt,
  onReplacePrompt,
  currentPromptText = '',
  className,
}) => {
  const { t } = useI18n();
  const [metricsOpen, setMetricsOpen] = React.useState(false);
  const [cleaning, setCleaning] = React.useState(false);
  const [optimizing, setOptimizing] = React.useState(false);

  const messages = useSessionMessages(sessionId ?? '');

  const metrics: SessionAggregateMetrics = React.useMemo(() => {
    return calculateSessionMetrics(messages);
  }, [messages]);

  const handleOptimizePrompt = React.useCallback(async () => {
    const raw = currentPromptText.trim();
    if (!raw) {
      toast.info(t('chat.tools.optimize.empty'));
      return;
    }

    try {
      setOptimizing(true);
      toast.loading(t('chat.tools.optimize.optimizing'), { id: 'optimizing-prompt' });
      const result = await optimizePromptWithAI(raw, sessionId);
      toast.dismiss('optimizing-prompt');

      if (result.success && result.optimizedPrompt) {
        if (onReplacePrompt) {
          onReplacePrompt(result.optimizedPrompt);
        } else if (onInsertPrompt) {
          onInsertPrompt(result.optimizedPrompt);
        }
        toast.success(t('chat.tools.optimize.success'));
      }
    } catch {
      toast.dismiss('optimizing-prompt');
    } finally {
      setOptimizing(false);
    }
  }, [currentPromptText, sessionId, onReplacePrompt, onInsertPrompt, t]);

  const handleExportMarkdown = React.useCallback(() => {
    if (!sessionId || !messages || messages.length === 0) {
      toast.error(t('chat.tools.export.noMessages'));
      return;
    }

    const turns = messages.map((msg: any) => {
      let content = '';
      if (Array.isArray(msg.parts)) {
        content = msg.parts
          .filter((p: any) => p.type === 'text' || p.type === 'reasoning')
          .map((p: any) => p.text)
          .join('\n\n');
      }
      return {
        role: (msg.role ?? (msg.sender === 'user' ? 'user' : 'assistant')) as 'user' | 'assistant',
        timestamp: msg.createdAt ? new Date(msg.createdAt).getTime() : undefined,
        content: content || '(empty)',
      };
    });

    const payload: SessionExportPayload = {
      sessionId,
      title: `Session-${sessionId.slice(0, 8)}`,
      exportedAt: new Date().toISOString(),
      turns,
    };

    const markdown = formatSessionToMarkdown(payload);
    downloadFile(`opencodesilver-session-${sessionId.slice(0, 8)}.md`, markdown);
    toast.success(t('chat.tools.export.success'));
  }, [sessionId, messages, t]);

  const handlePurgeCache = React.useCallback(async () => {
    try {
      setCleaning(true);
      const result = await clearTransientCaches();
      const count = result.clearedLocalStorageKeys + result.clearedSessionStorageKeys;
      toast.success(t('chat.tools.purgeCache.success', { count }));
    } catch {
      toast.error(t('chat.tools.purgeCache.failed'));
    } finally {
      setCleaning(false);
    }
  }, [t]);

  React.useEffect(() => {
    const onOptimize = () => { void handleOptimizePrompt(); };
    const onMetrics = () => { setMetricsOpen(true); };
    const onExport = () => { handleExportMarkdown(); };
    const onPurge = () => { void handlePurgeCache(); };

    window.addEventListener('ag:composer-optimize-prompt', onOptimize);
    window.addEventListener('ag:composer-open-metrics', onMetrics);
    window.addEventListener('ag:composer-export-markdown', onExport);
    window.addEventListener('ag:composer-purge-cache', onPurge);
    return () => {
      window.removeEventListener('ag:composer-optimize-prompt', onOptimize);
      window.removeEventListener('ag:composer-open-metrics', onMetrics);
      window.removeEventListener('ag:composer-export-markdown', onExport);
      window.removeEventListener('ag:composer-purge-cache', onPurge);
    };
  }, [handleExportMarkdown, handleOptimizePrompt, handlePurgeCache]);

  return (
    <>
      {optimizing || cleaning ? (
        <div className={cn('flex items-center gap-x-1', className)}>
          {optimizing ? (
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border bg-[var(--surface-subtle)] px-2 text-[11px] text-muted-foreground">
              <Icon name="loader" className="size-3 animate-spin text-foreground" />
              <span>{t('chat.tools.optimize.optimizing')}</span>
            </span>
          ) : null}
          {cleaning ? (
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border bg-[var(--surface-subtle)] px-2 text-[11px] text-muted-foreground">
              <Icon name="loader" className="size-3 animate-spin text-foreground" />
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Metrics Dialog */}
      <Dialog open={metricsOpen} onOpenChange={setMetricsOpen}>
        <DialogContent className="max-w-xs p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <Icon name="bar-chart" className="w-4 h-4 text-primary" />
              <span>{t('chat.tools.metrics.title')}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2.5 mt-2">
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border/30 flex flex-col">
              <span className="text-[11px] text-muted-foreground">{t('chat.tools.metrics.messages')}</span>
              <span className="text-base font-bold text-foreground">
                {metrics.totalUserMessages + metrics.totalAssistantMessages}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border/30 flex flex-col">
              <span className="text-[11px] text-muted-foreground">{t('chat.tools.metrics.toolsExecuted')}</span>
              <span className="text-base font-bold text-primary">
                {metrics.totalToolsExecuted}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border/30 flex flex-col">
              <span className="text-[11px] text-muted-foreground">{t('chat.tools.metrics.estTokens')}</span>
              <span className="text-base font-bold text-foreground">
                {metrics.estimatedTokens.toLocaleString()}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border/30 flex flex-col">
              <span className="text-[11px] text-muted-foreground">{t('chat.tools.metrics.filesModified')}</span>
              <span className="text-base font-bold text-foreground">
                {metrics.filesModifiedCount}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});
