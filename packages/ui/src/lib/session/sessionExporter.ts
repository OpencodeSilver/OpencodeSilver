export interface ExportMessageTurn {
  role: 'user' | 'assistant' | 'system';
  author?: string;
  timestamp?: number;
  content: string;
}

export interface SessionExportPayload {
  sessionId: string;
  title: string;
  exportedAt: string;
  turns: ExportMessageTurn[];
  metrics?: {
    totalTurns: number;
    totalChars: number;
  };
}

/**
 * Formats a session into cleanly structured Markdown document.
 */
export function formatSessionToMarkdown(payload: SessionExportPayload): string {
  const dateStr = new Date(payload.exportedAt).toLocaleString();
  const header = [
    `# ${payload.title || 'OpencodeSilver Session Export'}`,
    `> **Exported:** ${dateStr}  `,
    `> **Session ID:** \`${payload.sessionId}\`  `,
    `> **Total Turns:** ${payload.turns.length}`,
    '',
    '---',
    '',
  ].join('\n');

  const body = payload.turns.map((turn, index) => {
    const roleTitle = turn.role === 'user' ? '👤 User' : `🤖 ${turn.author || 'Opencode AI'}`;
    const timeInfo = turn.timestamp ? ` *(${new Date(turn.timestamp).toLocaleTimeString()})*` : '';
    return [
      `### ${index + 1}. ${roleTitle}${timeInfo}`,
      '',
      turn.content.trim(),
      '',
      '---',
      '',
    ].join('\n');
  }).join('\n');

  return `${header}\n${body}`.trim();
}

/**
 * Triggers a client-side download of exported session content.
 */
export function downloadFile(filename: string, content: string, contentType: string = 'text/markdown;charset=utf-8;') {
  if (typeof window === 'undefined' || !window.document) return;
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
