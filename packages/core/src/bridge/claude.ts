/**
 * OpencodeSilver Claude Code CLI Bridge
 *
 * Runs Anthropic's Claude Code CLI headless (`claude -p`) and translates its
 * `stream-json` output into Silver events.
 *
 * Model selection uses Claude Code's aliases (`opus`, `sonnet`, `haiku`,
 * `default`) unless a full model id is given. The CLI resolves each alias to
 * the newest model of that family, so the bridge stays current without a
 * release; pin a full id (e.g. `claude-opus-5-5`) only when you need to.
 *
 * Event format reference: https://code.claude.com/docs/en/headless
 *   {type:"system", subtype:"init", model, tools, ...}
 *   {type:"assistant", message:{content:[{type:"text"|"thinking"|"tool_use", ...}]}}
 *   {type:"user", message:{content:[{type:"tool_result", content, is_error}]}}
 *   {type:"stream_event", event:{delta:{type:"text_delta", text}}}   (with includePartialMessages)
 *   {type:"result", subtype:"success"|"error_*", result, total_cost_usd, session_id}
 */

import { SILVER_AGENT_PROMPTS, type SilverAgentRole } from '../prompts/agents';

/** Aliases the Claude Code CLI resolves to the latest model of each family. */
export const CLAUDE_MODEL_ALIASES = ['default', 'opus', 'sonnet', 'haiku', 'opusplan'] as const;
export type ClaudeModelAlias = (typeof CLAUDE_MODEL_ALIASES)[number];

export type ClaudePermissionMode = 'default' | 'acceptEdits' | 'plan' | 'auto' | 'dontAsk' | 'bypassPermissions';

export interface ClaudeSessionConfig {
  workingDirectory: string;
  /** Prefer `permissionMode`; kept for existing callers. Maps to `--dangerously-skip-permissions`. */
  enableDangerouslySkipPermissions?: boolean;
  permissionMode?: ClaudePermissionMode;
  /** Sets MAX_THINKING_TOKENS for the CLI process. */
  maxThinkingTokens?: number;
  environmentOverrides?: Record<string, string>;
  /** An alias (`opus`, `sonnet`, `haiku`, `default`) or a full model id. */
  modelOverride?: ClaudeModelAlias | string;
  /** Silver agent role whose professional prompt is appended to Claude Code's own system prompt. */
  agentRole?: SilverAgentRole;
  /** Extra system prompt text, appended after the role prompt. */
  appendSystemPrompt?: string;
  /** Emit token-level `stream_event` deltas as they are generated. */
  includePartialMessages?: boolean;
  /** Resume an earlier Claude Code session by id. */
  resumeSessionId?: string;
  allowedTools?: string[];
}

export interface ClaudeStreamEvent {
  type: 'init' | 'thought' | 'tool_call' | 'tool_result' | 'message' | 'delta' | 'result' | 'error';
  content: string;
  timestamp: number;
  /** Set on `init` and `result` events. */
  sessionId?: string;
  /** Set on `init`: the concrete model the alias resolved to. */
  model?: string;
  /** Set on `result`. */
  costUsd?: number;
  /** Set on events from a subagent: the Agent tool call that started it. */
  parentToolUseId?: string | null;
}

const asText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((part) => (part && typeof part === 'object' && 'text' in part ? String((part as { text: unknown }).text) : asText(part)))
      .join('');
  }
  return value === undefined || value === null ? '' : JSON.stringify(value);
};

export class SilverClaudeBridge {
  /**
   * Command-line arguments and environment for spawning Claude Code headless
   * with streaming JSON output.
   */
  public buildSpawnArguments(
    prompt: string,
    config: ClaudeSessionConfig,
  ): { binary: string; args: string[]; env: Record<string, string>; cwd: string } {
    // `stream-json` with `-p` requires `--verbose`; without it the CLI exits with an error.
    const args: string[] = ['-p', prompt, '--output-format', 'stream-json', '--verbose'];

    if (config.includePartialMessages) args.push('--include-partial-messages');

    if (config.permissionMode) {
      args.push('--permission-mode', config.permissionMode);
    } else if (config.enableDangerouslySkipPermissions) {
      args.push('--dangerously-skip-permissions');
    }

    if (config.modelOverride) args.push('--model', config.modelOverride);
    if (config.resumeSessionId) args.push('--resume', config.resumeSessionId);
    if (config.allowedTools?.length) args.push('--allowedTools', config.allowedTools.join(','));

    const systemPrompt = [config.agentRole ? SILVER_AGENT_PROMPTS[config.agentRole].system : '', config.appendSystemPrompt ?? '']
      .filter((part) => part.trim().length > 0)
      .join('\n\n');
    if (systemPrompt) args.push('--append-system-prompt', systemPrompt);

    const env: Record<string, string> = { ...(config.environmentOverrides ?? {}) };
    if (config.maxThinkingTokens && config.maxThinkingTokens > 0) {
      env.MAX_THINKING_TOKENS = String(Math.floor(config.maxThinkingTokens));
    }

    return { binary: 'claude', args, env, cwd: config.workingDirectory };
  }

  /**
   * Every Silver event in one stream-json line. An assistant message can carry
   * several content blocks (thinking, text and tool calls), so one line can
   * produce several events.
   */
  public parseStreamEvents(line: string): ClaudeStreamEvent[] {
    const trimmed = line.trim();
    if (!trimmed) return [];

    let parsed: Record<string, any>;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return [{ type: 'message', content: line, timestamp: Date.now() }];
    }

    const timestamp = Date.now();
    const parentToolUseId = parsed.parent_tool_use_id ?? null;

    switch (parsed.type) {
      case 'system': {
        if (parsed.subtype === 'init') {
          return [{ type: 'init', content: `Claude Code session started (${parsed.model ?? 'default model'})`, timestamp, sessionId: parsed.session_id, model: parsed.model }];
        }
        if (parsed.subtype === 'api_retry') {
          return [{ type: 'error', content: `API retry ${parsed.attempt}/${parsed.max_retries}: ${parsed.error ?? 'unknown'}`, timestamp }];
        }
        return [];
      }

      case 'assistant': {
        const blocks: any[] = Array.isArray(parsed.message?.content) ? parsed.message.content : [];
        return blocks.flatMap((block): ClaudeStreamEvent[] => {
          if (block?.type === 'thinking') return [{ type: 'thought', content: block.thinking ?? '', timestamp, parentToolUseId }];
          if (block?.type === 'text') return [{ type: 'message', content: block.text ?? '', timestamp, parentToolUseId }];
          if (block?.type === 'tool_use') {
            return [{ type: 'tool_call', content: `${block.name}(${JSON.stringify(block.input ?? {})})`, timestamp, parentToolUseId }];
          }
          return [];
        });
      }

      case 'user': {
        const blocks: any[] = Array.isArray(parsed.message?.content) ? parsed.message.content : [];
        return blocks
          .filter((block) => block?.type === 'tool_result')
          .map((block) => ({
            type: block.is_error ? ('error' as const) : ('tool_result' as const),
            content: asText(block.content),
            timestamp,
            parentToolUseId,
          }));
      }

      case 'stream_event': {
        const delta = parsed.event?.delta;
        if (delta?.type === 'text_delta') return [{ type: 'delta', content: delta.text ?? '', timestamp, parentToolUseId }];
        return [];
      }

      case 'result': {
        const failed = parsed.is_error === true || (typeof parsed.subtype === 'string' && parsed.subtype.startsWith('error'));
        return [{
          type: failed ? 'error' : 'result',
          content: asText(parsed.result ?? parsed.subtype ?? ''),
          timestamp,
          sessionId: parsed.session_id,
          costUsd: typeof parsed.total_cost_usd === 'number' ? parsed.total_cost_usd : undefined,
        }];
      }

      // Older/flat shapes, kept so existing recordings still parse.
      case 'thinking':
      case 'thought':
        return [{ type: 'thought', content: parsed.content ?? parsed.thinking ?? '', timestamp }];
      case 'tool_use':
      case 'tool_call':
        return [{ type: 'tool_call', content: `${parsed.name}(${JSON.stringify(parsed.input ?? {})})`, timestamp }];
      case 'tool_result':
        return [{ type: 'tool_result', content: asText(parsed.content), timestamp }];
      case 'message':
        return [{ type: 'message', content: asText(parsed.content ?? parsed.text), timestamp }];

      default:
        return [];
    }
  }

  /**
   * The first event in a line, for callers that handle one event per line.
   * Prefer `parseStreamEvents`, which does not drop blocks.
   */
  public parseStreamLine(line: string): ClaudeStreamEvent | null {
    return this.parseStreamEvents(line)[0] ?? null;
  }

  /**
   * Detects whether the Claude Code CLI binary (`claude`) is installed and available in PATH.
   * Also retrieves its version string.
   */
  public async detectClaudeInstallation(
    runner?: (cmd: string, args: string[]) => Promise<{ stdout: string; stderr?: string; exitCode: number }>
  ): Promise<{ installed: boolean; version?: string; error?: string }> {
    try {
      if (runner) {
        const result = await runner('claude', ['--version']);
        if (result.exitCode === 0 && result.stdout) {
          const match = result.stdout.match(/(\d+\.\d+\.\d+[\w.-]*)/);
          return { installed: true, version: match ? match[1] : result.stdout.trim() };
        }
        return {
          installed: false,
          error: result.stderr?.trim() || 'claude returned non-zero exit code',
        };
      }

      // Default Node/Bun environment execution
      const { spawnSync } = await import('node:child_process');
      const res = spawnSync('claude', ['--version'], {
        encoding: 'utf8',
        windowsHide: true,
        shell: process.platform === 'win32',
      });

      if (res.status === 0 && res.stdout) {
        const match = res.stdout.match(/(\d+\.\d+\.\d+[\w.-]*)/);
        return { installed: true, version: match ? match[1] : res.stdout.trim() };
      }

      return {
        installed: false,
        error: res.error?.message || res.stderr?.trim() || 'Claude Code binary not found in PATH',
      };
    } catch (err: any) {
      return {
        installed: false,
        error: err?.message || 'Failed to probe Claude Code installation',
      };
    }
  }

  /**
   * Calculates the cumulative cost from a stream of ClaudeStreamEvents.
   */
  public summarizeSessionCost(events: ClaudeStreamEvent[]): number {
    let latestCost = 0;
    for (const ev of events) {
      if (typeof ev.costUsd === 'number' && ev.costUsd > latestCost) {
        latestCost = ev.costUsd;
      }
    }
    return latestCost;
  }

  /**
   * Finds the latest session ID from a stream of ClaudeStreamEvents, enabling resumption.
   */
  public extractSessionId(events: ClaudeStreamEvent[]): string | undefined {
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].sessionId) {
        return events[i].sessionId;
      }
    }
    return undefined;
  }
}

