import React from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icon/Icon';
import { toast } from '@/components/ui';
import {
  formatSessionToMarkdown,
  downloadFile,
  type SessionExportPayload,
} from '@/lib/session/sessionExporter';
import { useSessionMessages } from '@/sync/sync-context';
import { useChatSessionSelection } from './chatColumnSession';

interface SessionExporterButtonProps {
  className?: string;
}

export const SessionExporterButton: React.FC<SessionExporterButtonProps> = ({ className }) => {
  const currentSessionId = useChatSessionSelection().sessionId;
  const messages = useSessionMessages(currentSessionId ?? '');

  const handleExportMarkdown = React.useCallback(() => {
    if (!currentSessionId || !messages || messages.length === 0) {
      toast.error('No messages found in current session to export.');
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
      sessionId: currentSessionId,
      title: `Session-${currentSessionId.slice(0, 8)}`,
      exportedAt: new Date().toISOString(),
      turns,
    };

    const markdown = formatSessionToMarkdown(payload);
    downloadFile(`opencodesilver-session-${currentSessionId.slice(0, 8)}.md`, markdown);
    toast.success('Session exported to Markdown!');
  }, [currentSessionId, messages]);

  if (!currentSessionId) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleExportMarkdown}
      className={className}
      title="Export session to Markdown"
    >
      <Icon name="download" className="w-3.5 h-3.5 mr-1" />
      <span>Export</span>
    </Button>
  );
};
