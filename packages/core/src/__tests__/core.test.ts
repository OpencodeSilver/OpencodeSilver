import { describe, expect, it } from 'bun:test';
import {
  SilverMissionOrchestrator,
  SilverConsensusMatrix,
  SilverCodeInspector,
  SilverClaudeBridge,
  SilverArabicEngine,
  SILVER_AGENT_PROMPTS,
  inferProvider,
  inferTier,
} from '../index';

describe('@opencodesilver/core intelligence suite by Ahmed (GEMTM)', () => {
  it('SilverMissionOrchestrator plans and advances missions safely', () => {
    const orchestrator = new SilverMissionOrchestrator('Ahmed (GEMTM)');
    const mission = orchestrator.planMission('Implement Payment Gateway', 'Add Stripe checkout integration');

    expect(mission.author).toBe('Ahmed (GEMTM)');
    expect(mission.phases.length).toBe(5);
    expect(mission.status).toBe('planned');

    const updated = orchestrator.advancePhase(mission.missionId, 'phase_discovery', 'in_progress');
    expect(updated.status).toBe('executing');

    const completedPhase = orchestrator.advancePhase(mission.missionId, 'phase_discovery', 'completed', ['analysis.md']);
    expect(completedPhase.phases[0].status).toBe('completed');
  });

  it('SilverConsensusMatrix evaluates and scores multi-model candidates', () => {
    const matrix = new SilverConsensusMatrix();
    const result = matrix.evaluateCandidates('Fix authentication bug', [
      {
        modelId: 'claude-opus-5-5',
        provider: 'anthropic',
        durationMs: 4000,
        tokensUsed: 1200,
        patch: '--- a/auth.ts\n+++ b/auth.ts\n@@ -1 +1 @@\n-const token = null;\n+const token = generateJWT();',
        explanation: 'Secure token generator',
        syntaxValid: true,
        lintWarningsCount: 0,
        confidenceScore: 0.95,
      },
      {
        modelId: 'gpt-6-luna',
        provider: 'openai',
        durationMs: 7000,
        tokensUsed: 1400,
        patch: '--- a/auth.ts\n+++ b/auth.ts\n@@ -1 +1 @@\n-const token = null;\n+const token = "mock";',
        explanation: 'Mock token',
        syntaxValid: true,
        lintWarningsCount: 2,
        confidenceScore: 0.8,
      },
    ]);

    expect(result.candidatesEvaluated).toBe(2);
    expect(result.winnerModelId).toBe('claude-opus-5-5');
    expect(result.rankedScores[0].tier).toBe('frontier');
    expect(result.rankedScores[1].provider).toBe('openai');
    expect(result.rankedScores[0].compositeScore).toBeGreaterThan(result.rankedScores[1].compositeScore);
  });

  it('SilverCodeInspector detects blast radius and credential leaks', () => {
    const inspector = new SilverCodeInspector();
    const cleanReport = inspector.inspectDiffs([
      {
        filePath: 'src/utils.ts',
        linesAdded: 10,
        linesDeleted: 2,
        hunkContent: '+export const add = (a: number, b: number) => a + b;',
      },
    ]);

    expect(cleanReport.approvalRecommended).toBe(true);
    expect(cleanReport.securityVulnerabilities.length).toBe(0);
    expect(cleanReport.blastRadius).toBe('isolated');

    const leakReport = inspector.inspectDiffs([
      {
        filePath: 'src/config.ts',
        linesAdded: 1,
        linesDeleted: 0,
        hunkContent: '+const key = "ghp_123456789012345678901234567890123456";',
      },
    ]);

    expect(leakReport.approvalRecommended).toBe(false);
    expect(leakReport.securityVulnerabilities.length).toBe(1);
    expect(leakReport.securityVulnerabilities[0].ruleId).toBe('SEC-CREDENTIAL-LEAK');

    const projectKey = inspector.inspectDiffs([
      { filePath: '.env', linesAdded: 1, linesDeleted: 0, hunkContent: `+OPENAI_API_KEY=sk-proj-${'a'.repeat(60)}` },
    ]);
    expect(projectKey.securityVulnerabilities.map((v) => v.message)).toEqual(['Detected potential OpenAI API Key embedded in diff.']);
  });

  it('SilverClaudeBridge builds headless CLI flags and parses stream events', () => {
    const bridge = new SilverClaudeBridge();
    const spawn = bridge.buildSpawnArguments('Refactor database queries', {
      workingDirectory: '/test',
      permissionMode: 'acceptEdits',
      modelOverride: 'opus',
      agentRole: 'engineer',
      maxThinkingTokens: 16000,
    });

    expect(spawn.binary).toBe('claude');
    expect(spawn.cwd).toBe('/test');
    expect(spawn.args.slice(0, 2)).toEqual(['-p', 'Refactor database queries']);
    expect(spawn.args).toContain('stream-json');
    expect(spawn.args).toContain('--verbose');
    expect(spawn.args[spawn.args.indexOf('--permission-mode') + 1]).toBe('acceptEdits');
    expect(spawn.args[spawn.args.indexOf('--model') + 1]).toBe('opus');
    expect(spawn.args[spawn.args.indexOf('--append-system-prompt') + 1]).toContain('Silver Engineer');
    expect(spawn.env.MAX_THINKING_TOKENS).toBe('16000');

    const legacy = bridge.buildSpawnArguments('x', { workingDirectory: '/t', enableDangerouslySkipPermissions: true });
    expect(legacy.args).toContain('--dangerously-skip-permissions');

    const init = bridge.parseStreamEvents(JSON.stringify({ type: 'system', subtype: 'init', model: 'claude-opus-5-5', session_id: 's1' }));
    expect(init[0]).toMatchObject({ type: 'init', model: 'claude-opus-5-5', sessionId: 's1' });

    const assistant = bridge.parseStreamEvents(JSON.stringify({
      type: 'assistant',
      parent_tool_use_id: null,
      message: { content: [
        { type: 'thinking', thinking: 'Analyzing queries...' },
        { type: 'text', text: 'Reading the file.' },
        { type: 'tool_use', name: 'Read', input: { file_path: 'db.ts' } },
      ] },
    }));
    expect(assistant.map((e) => e.type)).toEqual(['thought', 'message', 'tool_call']);
    expect(assistant[2].content).toBe('Read({"file_path":"db.ts"})');

    const toolResult = bridge.parseStreamEvents(JSON.stringify({
      type: 'user',
      message: { content: [{ type: 'tool_result', content: [{ type: 'text', text: 'file body' }] }] },
    }));
    expect(toolResult[0]).toMatchObject({ type: 'tool_result', content: 'file body' });

    const result = bridge.parseStreamEvents(JSON.stringify({ type: 'result', subtype: 'success', result: 'Done', total_cost_usd: 0.12, session_id: 's1' }));
    expect(result[0]).toMatchObject({ type: 'result', content: 'Done', costUsd: 0.12 });

    expect(bridge.parseStreamLine(JSON.stringify({ type: 'thought', content: 'legacy' }))?.type).toBe('thought');
  });

  it('classifies current and future models from every provider without pinned versions', () => {
    const cases: Array<[string, string, string]> = [
      ['claude-opus-5-5', 'anthropic', 'frontier'],
      ['claude-sonnet-5-5', 'anthropic', 'balanced'],
      ['claude-haiku-5-5', 'anthropic', 'fast'],
      ['claude-opus-6', 'anthropic', 'frontier'],
      ['gpt-6.1-sol', 'openai', 'frontier'],
      ['gpt-6-astra', 'openai', 'balanced'],
      ['gpt-6-luna', 'openai', 'fast'],
      ['gemini-4-argon', 'google', 'frontier'],
      ['gemini-3.8-flash', 'google', 'fast'],
      ['grok-4-7', 'xai', 'frontier'],
      ['deepseek-v4.1-flash', 'deepseek', 'fast'],
      ['qwen3.8-2.4t-a95b', 'alibaba', 'frontier'],
      ['kimi-k3', 'moonshotai', 'frontier'],
      ['kimi-k3-fast', 'moonshotai', 'fast'],
      ['glm-5.3', 'zai', 'frontier'],
      ['mistral-large-4', 'mistral', 'frontier'],
      ['minimax-h3-max', 'minimax', 'frontier'],
      ['openrouter/anthropic/claude-opus-5-5', 'anthropic', 'frontier'],
      ['my-custom-model', 'unknown', 'unknown'],
    ];
    for (const [id, provider, tier] of cases) {
      expect([id, inferProvider(id)]).toEqual([id, provider]);
      expect([id, inferTier(id)]).toEqual([id, tier]);
    }
  });

  it('ships a professional prompt for every built-in agent', () => {
    for (const prompt of Object.values(SILVER_AGENT_PROMPTS)) {
      expect(prompt.name.startsWith('silver-')).toBe(true);
      expect(prompt.system).toContain('## Communication');
      expect(prompt.system).not.toMatch(/claude-|gpt-\d|gemini-\d/);
    }
  });

  it('SilverArabicEngine normalizes text and detects RTL correctly', () => {
    const arabic = new SilverArabicEngine();
    expect(arabic.isRTL('مرحبا بكم في OpencodeSilver')).toBe(true);
    expect(arabic.isRTL('Hello world')).toBe(false);

    const normalized = arabic.normalizeArabic('إعادة إنشاء التطبيق');
    expect(normalized).toBe('اعاده انشاء التطبيق');
  });
});
