export interface SessionAggregateMetrics {
  totalUserMessages: number;
  totalAssistantMessages: number;
  totalToolsExecuted: number;
  totalCharacters: number;
  estimatedTokens: number;
  filesModifiedCount: number;
}

/**
 * Calculates real-time session statistics from message array.
 */
export function calculateSessionMetrics(messages: Array<any>): SessionAggregateMetrics {
  let totalUserMessages = 0;
  let totalAssistantMessages = 0;
  let totalToolsExecuted = 0;
  let totalCharacters = 0;
  const modifiedFiles = new Set<string>();

  if (!Array.isArray(messages)) {
    return {
      totalUserMessages: 0,
      totalAssistantMessages: 0,
      totalToolsExecuted: 0,
      totalCharacters: 0,
      estimatedTokens: 0,
      filesModifiedCount: 0,
    };
  }

  for (const message of messages) {
    const role = message?.role ?? (message?.sender === 'user' ? 'user' : 'assistant');
    if (role === 'user') totalUserMessages++;
    else if (role === 'assistant') totalAssistantMessages++;

    const parts = message?.parts;
    if (Array.isArray(parts)) {
      for (const part of parts) {
        if (part?.type === 'text' && typeof part.text === 'string') {
          totalCharacters += part.text.length;
        } else if (part?.type === 'reasoning' && typeof part.text === 'string') {
          totalCharacters += part.text.length;
        } else if (part?.type === 'tool' || part?.type === 'tool_use' || part?.callID) {
          totalToolsExecuted++;
          const targetFile = part.input?.filePath || part.input?.TargetFile || part.input?.targetFile || part.input?.path;
          if (typeof targetFile === 'string') {
            modifiedFiles.add(targetFile);
          }
        }
      }
    }
  }

  const estimatedTokens = Math.ceil(totalCharacters / 4);

  return {
    totalUserMessages,
    totalAssistantMessages,
    totalToolsExecuted,
    totalCharacters,
    estimatedTokens,
    filesModifiedCount: modifiedFiles.size,
  };
}
