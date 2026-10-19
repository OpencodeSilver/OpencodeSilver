import { describe, expect, it } from 'bun:test';
import {
  SilverMissionOrchestrator,
  SilverConsensusMatrix,
  SilverCodeInspector,
  SilverClaudeBridge,
  SilverArabicEngine,
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
        modelId: 'claude-3-7-sonnet',
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
        modelId: 'gpt-4o',
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
    expect(result.winnerModelId).toBe('claude-3-7-sonnet');
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
  });

  it('SilverClaudeBridge builds headless CLI flags and parses stream events', () => {
    const bridge = new SilverClaudeBridge();
    const spawnArgs = bridge.buildSpawnArguments('Refactor database queries', {
      workingDirectory: '/test',
      enableDangerouslySkipPermissions: true,
      modelOverride: 'claude-3-7-sonnet',
    });

    expect(spawnArgs.binary).toBe('claude');
    expect(spawnArgs.args).toContain('--output-format');
    expect(spawnArgs.args).toContain('stream-json');
    expect(spawnArgs.args).toContain('--dangerously-skip-permissions');

    const event = bridge.parseStreamLine(JSON.stringify({ type: 'thought', content: 'Analyzing queries...' }));
    expect(event?.type).toBe('thought');
    expect(event?.content).toBe('Analyzing queries...');
  });

  it('SilverArabicEngine normalizes text and detects RTL correctly', () => {
    const arabic = new SilverArabicEngine();
    expect(arabic.isRTL('مرحبا بكم في OpencodeSilver')).toBe(true);
    expect(arabic.isRTL('Hello world')).toBe(false);

    const normalized = arabic.normalizeArabic('إعادة إنشاء التطبيق');
    expect(normalized).toBe('اعاده انشاء التطبيق');
  });
});
