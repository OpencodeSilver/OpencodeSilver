import { describe, expect, it } from 'bun:test';
import { SilverClaudeBridge, type ClaudeSessionConfig } from '../bridge/claude';

describe('SilverClaudeBridge Unit Tests', () => {
  const bridge = new SilverClaudeBridge();

  it('builds headless CLI arguments correctly with default options', () => {
    const config: ClaudeSessionConfig = {
      workingDirectory: '/workspace',
    };
    const { binary, args } = bridge.buildSpawnArguments('Implement login feature', config);
    expect(binary).toBe('claude');
    expect(args).toContain('-p');
    expect(args).toContain('Implement login feature');
    expect(args).toContain('--output-format');
    expect(args).toContain('stream-json');
    expect(args).toContain('--verbose');
  });

  it('adds model override flag when specified', () => {
    const config: ClaudeSessionConfig = {
      workingDirectory: '/workspace',
      modelOverride: 'opus',
    };
    const { args } = bridge.buildSpawnArguments('Refactor models', config);
    expect(args).toContain('--model');
    expect(args).toContain('opus');
  });

  it('adds permission flags correctly for bypassPermissions or enableDangerouslySkipPermissions', () => {
    const config1: ClaudeSessionConfig = {
      workingDirectory: '/workspace',
      enableDangerouslySkipPermissions: true,
    };
    const { args: args1 } = bridge.buildSpawnArguments('Task 1', config1);
    expect(args1).toContain('--dangerously-skip-permissions');

    const config2: ClaudeSessionConfig = {
      workingDirectory: '/workspace',
      permissionMode: 'plan',
    };
    const { args: args2 } = bridge.buildSpawnArguments('Task 2', config2);
    expect(args2).toContain('--permission-mode');
    expect(args2).toContain('plan');
  });

  it('adds partial messages flag when requested', () => {
    const config: ClaudeSessionConfig = {
      workingDirectory: '/workspace',
      includePartialMessages: true,
    };
    const { args } = bridge.buildSpawnArguments('Stream demo', config);
    expect(args).toContain('--include-partial-messages');
  });

  it('appends system prompts and agent roles when configured', () => {
    const config: ClaudeSessionConfig = {
      workingDirectory: '/workspace',
      agentRole: 'architect',
      appendSystemPrompt: 'Focus on zero breaking changes.',
    };
    const { args } = bridge.buildSpawnArguments('Architect review', config);
    expect(args).toContain('--append-system-prompt');
    const promptIdx = args.indexOf('--append-system-prompt');
    expect(args[promptIdx + 1]).toContain('Focus on zero breaking changes.');
  });

  it('parses system init events', () => {
    const line = JSON.stringify({
      type: 'system',
      subtype: 'init',
      model: 'claude-3-7-sonnet',
      session_id: 'sess-12345',
    });
    const events = bridge.parseStreamEvents(line);
    expect(events.length).toBeGreaterThan(0);
    const initEvent = events.find((e) => e.type === 'init');
    expect(initEvent).toBeDefined();
    expect(initEvent?.sessionId).toBe('sess-12345');
    expect(initEvent?.model).toBe('claude-3-7-sonnet');
  });

  it('parses token stream_event delta events', () => {
    const line = JSON.stringify({
      type: 'stream_event',
      event: {
        delta: {
          type: 'text_delta',
          text: 'Hello Silver AI',
        },
      },
    });
    const events = bridge.parseStreamEvents(line);
    expect(events.length).toBeGreaterThan(0);
    const deltaEvent = events.find((e) => e.type === 'delta');
    expect(deltaEvent).toBeDefined();
    expect(deltaEvent?.content).toBe('Hello Silver AI');
  });

  it('parses tool_use assistant blocks', () => {
    const line = JSON.stringify({
      type: 'assistant',
      message: {
        content: [
          {
            type: 'tool_use',
            name: 'Bash',
            input: { command: 'ls -la' },
          },
        ],
      },
    });
    const events = bridge.parseStreamEvents(line);
    expect(events.length).toBeGreaterThan(0);
    const toolCall = events.find((e) => e.type === 'tool_call');
    expect(toolCall).toBeDefined();
    expect(toolCall?.content).toContain('Bash');
  });

  it('parses result events and extracts total cost', () => {
    const line = JSON.stringify({
      type: 'result',
      subtype: 'success',
      result: 'Task accomplished',
      total_cost_usd: 0.042,
      session_id: 'sess-abc',
    });
    const events = bridge.parseStreamEvents(line);
    expect(events.length).toBeGreaterThan(0);
    const resultEvent = events.find((e) => e.type === 'result');
    expect(resultEvent).toBeDefined();
    expect(resultEvent?.costUsd).toBe(0.042);
    expect(resultEvent?.content).toBe('Task accomplished');
  });

  it('handles non-json lines as plain message event and empty line as empty array', () => {
    expect(bridge.parseStreamEvents('')).toEqual([]);
    const nonJson = bridge.parseStreamEvents('plain stdout text');
    expect(nonJson.length).toBe(1);
    expect(nonJson[0].type).toBe('message');
    expect(nonJson[0].content).toBe('plain stdout text');
  });
});
