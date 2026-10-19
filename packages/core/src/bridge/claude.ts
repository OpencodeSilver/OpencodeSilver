/**
 * OpencodeSilver Claude Code CLI Bridge
 * Engineered and Architected by Ahmed (GEMTM)
 *
 * Provides bidirectional communication with Anthropic's Claude Code CLI,
 * enabling Claude Pro/Max subscribers to run autonomous workflows directly
 * inside the OpencodeSilver workspace.
 */

export interface ClaudeSessionConfig {
  workingDirectory: string;
  enableDangerouslySkipPermissions?: boolean;
  maxThinkingTokens?: number;
  environmentOverrides?: Record<string, string>;
  modelOverride?: string;
}

export interface ClaudeStreamEvent {
  type: 'thought' | 'tool_call' | 'tool_result' | 'message' | 'error';
  content: string;
  timestamp: number;
}

export class SilverClaudeBridge {
  private activeSessions = new Map<string, { pid: number; config: ClaudeSessionConfig; startedAt: number }>();

  /**
   * Generates command-line arguments for spawning the Claude Code CLI in headless JSON-streaming mode.
   */
  public buildSpawnArguments(prompt: string, config: ClaudeSessionConfig): { binary: string; args: string[] } {
    const args: string[] = ['--output-format', 'stream-json'];

    if (config.enableDangerouslySkipPermissions) {
      args.push('--dangerously-skip-permissions');
    }

    if (config.modelOverride) {
      args.push('--model', config.modelOverride);
    }

    args.push('-p', prompt);

    return {
      binary: 'claude',
      args,
    };
  }

  /**
   * Parses stream-json lines emitted by Claude Code CLI and translates them to Silver events.
   */
  public parseStreamLine(line: string): ClaudeStreamEvent | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    try {
      const parsed = JSON.parse(trimmed);
      const now = Date.now();

      if (parsed.type === 'thinking' || parsed.type === 'thought') {
        return {
          type: 'thought',
          content: parsed.content ?? parsed.thinking ?? '',
          timestamp: now,
        };
      }

      if (parsed.type === 'tool_use' || parsed.type === 'tool_call') {
        return {
          type: 'tool_call',
          content: `${parsed.name}(${JSON.stringify(parsed.input ?? {})})`,
          timestamp: now,
        };
      }

      if (parsed.type === 'tool_result') {
        return {
          type: 'tool_result',
          content: typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.content ?? ''),
          timestamp: now,
        };
      }

      if (parsed.type === 'assistant' || parsed.type === 'message') {
        return {
          type: 'message',
          content: parsed.content ?? parsed.text ?? '',
          timestamp: now,
        };
      }

      return {
        type: 'message',
        content: JSON.stringify(parsed),
        timestamp: now,
      };
    } catch {
      // Fallback for raw text lines
      return {
        type: 'message',
        content: line,
        timestamp: Date.now(),
      };
    }
  }
}
