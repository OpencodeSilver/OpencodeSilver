import { describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  SilverMissionOrchestrator,
  SilverConsensusMatrix,
  SilverCodeInspector,
  SilverClaudeBridge,
  SilverArabicEngine,
  inferProvider,
  inferTier,
  SILVER_AGENT_PROMPTS,
  createSilverIntelligenceRouter,
} from '../index';

describe('@opencodesilver/core intelligence suite by Ahmed (GEMTM)', () => {
  it('SilverMissionOrchestrator plans and advances missions safely', () => {
    const orchestrator = new SilverMissionOrchestrator('Ahmed (GEMTM)');
    const manifest = orchestrator.planMission(
      'Implement Vector Store Integration',
      'Create high-performance vector indexing with SQLite VSS'
    );

    expect(manifest.missionId).toBeDefined();
    expect(manifest.author).toBe('Ahmed (GEMTM)');
    expect(manifest.status).toBe('planned');
    expect(manifest.phases.length).toBe(5);
    expect(manifest.phases[0].id).toBe('phase_discovery');
    expect(manifest.phases[0].status).toBe('pending');
    expect(manifest.riskScore).toBeGreaterThanOrEqual(0);
    expect(manifest.riskScore).toBeLessThanOrEqual(100);

    // Should not allow starting phase_design before phase_discovery is complete
    expect(() => {
      orchestrator.advancePhase(manifest.missionId, 'phase_design', 'in_progress');
    }).toThrow(/dependency phase_discovery is still pending/);

    // Advance phase 0
    const running = orchestrator.advancePhase(manifest.missionId, 'phase_discovery', 'in_progress');
    expect(running.status).toBe('executing');
    expect(running.phases[0].status).toBe('in_progress');

    // Complete phase 0
    const completedPhase0 = orchestrator.advancePhase(
      manifest.missionId,
      'phase_discovery',
      'completed',
      ['discovery-report.json']
    );
    expect(completedPhase0.phases[0].status).toBe('completed');
    expect(completedPhase0.phases[0].outputArtifacts).toContain('discovery-report.json');

    // Now phase_design can start
    const runningPhase1 = orchestrator.advancePhase(manifest.missionId, 'phase_design', 'in_progress');
    expect(runningPhase1.phases[1].status).toBe('in_progress');
  });

  it('SilverMissionOrchestrator persists missions to disk and recovers with interrupted status', () => {
    const tmpDir = path.join(os.tmpdir(), `silver_missions_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
    try {
      const orchestrator1 = new SilverMissionOrchestrator({
        storageDir: tmpDir,
        autoPersist: true,
      });

      const mission = orchestrator1.planMission('Crash Recovery Test', 'Ensure in-flight tasks recover as interrupted');
      orchestrator1.advancePhase(mission.missionId, 'phase_discovery', 'in_progress');

      // Verify JSON was written to disk
      const filePath = path.join(tmpDir, `${mission.missionId}.json`);
      expect(fs.existsSync(filePath)).toBe(true);

      const savedJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      expect(savedJson.status).toBe('executing');

      // Simulate app restart by constructing a new orchestrator pointing at the same directory
      const orchestrator2 = new SilverMissionOrchestrator({
        storageDir: tmpDir,
        autoPersist: true,
      });

      const recovered = orchestrator2.getMission(mission.missionId);
      expect(recovered).toBeDefined();
      expect(recovered?.status).toBe('interrupted');

      // Aborting an interrupted mission
      const aborted = orchestrator2.abortMission(mission.missionId, 'User aborted after restart');
      expect(aborted.status).toBe('aborted');
      expect(aborted.metadata.abortReason).toBe('User aborted after restart');

      // Deleting the mission
      const deleted = orchestrator2.deleteMission(mission.missionId);
      expect(deleted).toBe(true);
      expect(fs.existsSync(filePath)).toBe(false);
      expect(orchestrator2.getMission(mission.missionId)).toBeUndefined();
    } finally {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }
  });

  it('SilverConsensusMatrix evaluates and scores multi-model candidates including tests and types', () => {
    const matrix = new SilverConsensusMatrix();
    const result = matrix.evaluateCandidates('Implement resilient cache with TTL', [
      {
        modelId: 'claude-haiku-5-5',
        durationMs: 3000,
        tokensUsed: 1200,
        patch: 'diff --git a/cache.ts...',
        explanation: 'Fast memory cache implementation',
        syntaxValid: true,
        lintWarningsCount: 0,
        confidenceScore: 0.85,
        testsPassed: true,
        typeCheckPassed: true,
        costUsd: 0.002,
        worktreePath: '/tmp/worktree-haiku',
        branchName: 'silver/lane-haiku',
      },
      {
        modelId: 'gpt-6.1-sol',
        durationMs: 12000,
        tokensUsed: 3500,
        patch: 'diff --git a/cache.ts...',
        explanation: 'Distributed cache with Redis fallback',
        syntaxValid: false,
        lintWarningsCount: 4,
        confidenceScore: 0.7,
        testsPassed: false,
        typeCheckPassed: false,
        costUsd: 0.12,
        worktreePath: '/tmp/worktree-gpt',
        branchName: 'silver/lane-gpt',
      },
    ]);

    expect(result.consensusId).toBeDefined();
    expect(result.candidatesEvaluated).toBe(2);
    expect(result.winnerModelId).toBe('claude-haiku-5-5');
    expect(result.winnerWorktreePath).toBe('/tmp/worktree-haiku');
    expect(result.winnerBranchName).toBe('silver/lane-haiku');
    expect(result.rankedScores[0].compositeScore).toBeGreaterThan(result.rankedScores[1].compositeScore);
    expect(result.rankedScores[0].rationale).toContain('tests passed');
    expect(result.rankedScores[0].rationale).toContain('types clean');
    expect(result.rankedScores[1].rationale).toContain('tests failed');
    expect(result.rankedScores[1].rationale).toContain('type errors');
    expect(result.synthesisSummary).toContain('claude-haiku-5-5');
  });

  it('SilverCodeInspector detects blast radius and credential leaks', () => {
    const inspector = new SilverCodeInspector();
    const cleanReport = inspector.inspectDiffs([
      {
        filePath: 'src/math.ts',
        linesAdded: 5,
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
    expect(projectKey.securityVulnerabilities.map((v) => v.message)).toContain('Detected potential OpenAI API Key embedded in diff.');
    expect(projectKey.securityVulnerabilities.map((v) => v.message)).toContain('Detected sensitive file committed in diff: Environment Secret File (.env).');
  });

  it('SilverCodeInspector detects comprehensive secret patterns and sensitive files', () => {
    const inspector = new SilverCodeInspector();

    const testCases = [
      {
        name: 'GitHub PAT',
        content: '+const t = "ghp_Abcdef123456789012345678901234567890";',
        path: 'src/client.ts',
        expected: 'GitHub Personal Access Token',
      },
      {
        name: 'GitHub Fine-grained PAT',
        content: `+const t = "github_pat_${'a'.repeat(65)}";`,
        path: 'src/client.ts',
        expected: 'GitHub Fine-grained Token',
      },
      {
        name: 'AWS Access Key',
        content: '+const awsKey = "AKIA1234567890ABCDEF";',
        path: 'src/aws.ts',
        expected: 'AWS Access Key ID',
      },
      {
        name: 'AWS Secret Access Key',
        content: '+aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"',
        path: 'src/aws.ts',
        expected: 'AWS Secret Access Key',
      },
      {
        name: 'Google Gemini API Key',
        content: '+const key = "AIzaSyD-1234567890abcdefghijklmnopqrstu";',
        path: 'src/gemini.ts',
        expected: 'Google Gemini API Key',
      },
      {
        name: 'Anthropic Key',
        content: `+const key = "sk-ant-api03-${'a'.repeat(85)}";`,
        path: 'src/anthropic.ts',
        expected: 'Anthropic API Key',
      },
      {
        name: 'OpenRouter Key',
        content: `+const key = "sk-or-v1-${'a'.repeat(64)}";`,
        path: 'src/openrouter.ts',
        expected: 'OpenRouter API Key',
      },
      {
        name: 'JWT Token',
        content: '+const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";',
        path: 'src/auth.ts',
        expected: 'JSON Web Token (JWT)',
      },
      {
        name: 'RSA Private Key',
        content: '+-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----',
        path: 'src/certs.ts',
        expected: 'Private Cryptographic Key',
      },
      {
        name: 'SSH Key File',
        content: '+test content',
        path: 'secrets/id_rsa',
        expectedRule: 'SEC-SENSITIVE-FILE',
      },
      {
        name: 'Certificate File',
        content: '+test content',
        path: 'certs/server.pem',
        expectedRule: 'SEC-SENSITIVE-FILE',
      },
      {
        name: 'Hardcoded password',
        content: '+const password = "super_secret_password_1234!";',
        path: 'src/db.ts',
        expected: 'Hardcoded Secret or Password',
      },
    ];

    for (const tc of testCases) {
      const report = inspector.inspectDiffs([
        { filePath: tc.path, linesAdded: 1, linesDeleted: 0, hunkContent: tc.content },
      ]);
      expect(report.securityVulnerabilities.length).toBeGreaterThan(0);
      if (tc.expected) {
        expect(report.securityVulnerabilities.some((v) => v.message.includes(tc.expected))).toBe(true);
      }
      if (tc.expectedRule) {
        expect(report.securityVulnerabilities.some((v) => v.ruleId === tc.expectedRule)).toBe(true);
      }
    }

    // Negative case: ordinary benign code
    const benignReport = inspector.inspectDiffs([
      {
        filePath: 'src/utils.ts',
        linesAdded: 10,
        linesDeleted: 0,
        hunkContent: `
+function calculateTotal(items: number[]) {
+  return items.reduce((sum, item) => sum + item, 0);
+}
+const maxAttempts = 3;
+const timeoutMs = 5000;
`,
      },
    ]);
    expect(benignReport.securityVulnerabilities.length).toBe(0);
    expect(benignReport.approvalRecommended).toBe(true);
  });

  it('SilverClaudeBridge builds headless CLI flags, parses stream events, detects binary, and sums cost', async () => {
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

    // Cost summation and session id extraction
    const allEvents = [...init, ...assistant, ...toolResult, ...result];
    expect(bridge.summarizeSessionCost(allEvents)).toBe(0.12);
    expect(bridge.extractSessionId(allEvents)).toBe('s1');

    // Detection with mock runner
    const detected = await bridge.detectClaudeInstallation(async () => ({
      stdout: 'claude 1.0.12 (Claude Code)',
      exitCode: 0,
    }));
    expect(detected.installed).toBe(true);
    expect(detected.version).toBe('1.0.12');

    const missing = await bridge.detectClaudeInstallation(async () => ({
      stdout: '',
      stderr: 'command not found: claude',
      exitCode: 127,
    }));
    expect(missing.installed).toBe(false);
    expect(missing.error).toContain('command not found');
  });

  it('createSilverIntelligenceRouter protects endpoints with tokens, origin checks, and zod validation', async () => {
    const orchestrator = new SilverMissionOrchestrator({ autoPersist: false });
    const router = createSilverIntelligenceRouter({
      authToken: 'secret-token-123',
      allowedOrigins: ['http://localhost:3000'],
      orchestrator,
    });

    // Helper to simulate request/response
    const simulate = async (options: {
      method?: string;
      url: string;
      headers?: Record<string, string>;
      body?: unknown;
    }) => {
      const { EventEmitter } = await import('node:events');
      const req = new EventEmitter() as any;
      req.method = options.method || 'GET';
      req.url = options.url;
      req.headers = options.headers || {};

      let statusCode = 200;
      const headersSent: Record<string, string> = {};
      let responseBody = '';

      const res = {
        writeHead: (code: number, headers: Record<string, string>) => {
          statusCode = code;
          Object.assign(headersSent, headers);
        },
        end: (chunk?: string) => {
          if (chunk) responseBody += chunk;
        },
      } as any;

      const promise = router(req, res);
      if (options.body !== undefined) {
        req.emit('data', Buffer.from(JSON.stringify(options.body)));
      }
      req.emit('end');
      const handled = await promise;
      return { handled, statusCode, data: responseBody ? JSON.parse(responseBody) : null };
    };

    // 1. Rejects unauthenticated request with 401
    const unauth = await simulate({ url: '/silver-intelligence/missions' });
    expect(unauth.handled).toBe(true);
    expect(unauth.statusCode).toBe(401);
    expect(unauth.data.error).toContain('Unauthorized');

    // 2. Rejects bad token with 401
    const badToken = await simulate({
      url: '/silver-intelligence/missions',
      headers: { authorization: 'Bearer wrong-token' },
    });
    expect(badToken.statusCode).toBe(401);

    // 3. Rejects forbidden origin with 403
    const badOrigin = await simulate({
      url: '/silver-intelligence/missions',
      headers: {
        authorization: 'Bearer secret-token-123',
        origin: 'http://malicious-site.com',
      },
    });
    expect(badOrigin.statusCode).toBe(403);

    // 4. Accepts valid token and origin for health probe
    const health = await simulate({
      url: '/silver-intelligence/health',
      headers: {
        authorization: 'Bearer secret-token-123',
        origin: 'http://localhost:3000',
      },
    });
    expect(health.statusCode).toBe(200);
    expect(health.data.status).toBe('healthy');

    // 5. Validates POST /missions/plan with Zod (fails on empty title)
    const invalidPlan = await simulate({
      method: 'POST',
      url: '/silver-intelligence/missions/plan',
      headers: { authorization: 'Bearer secret-token-123' },
      body: { title: '', objective: '' },
    });
    expect(invalidPlan.statusCode).toBe(400);
    expect(invalidPlan.data.error).toBe('Invalid input');

    // 6. Successfully plans mission
    const validPlan = await simulate({
      method: 'POST',
      url: '/silver-intelligence/missions/plan',
      headers: { authorization: 'Bearer secret-token-123' },
      body: { title: 'Router Integration Test', objective: 'Verify router creates mission' },
    });
    expect(validPlan.statusCode).toBe(201);
    expect(validPlan.data.mission.missionId).toBeDefined();

    // 7. Lists missions
    const list = await simulate({
      url: '/silver-intelligence/missions',
      headers: { authorization: 'Bearer secret-token-123' },
    });
    expect(list.statusCode).toBe(200);
    expect(list.data.missions.length).toBe(1);

    // 8. Evaluates consensus
    const consensus = await simulate({
      method: 'POST',
      url: '/silver-intelligence/consensus/evaluate',
      headers: { authorization: 'Bearer secret-token-123' },
      body: {
        taskDescription: 'Build microservice router',
        candidates: [
          {
            modelId: 'claude-sonnet-5-5',
            durationMs: 4000,
            tokensUsed: 1500,
            patch: 'diff...',
            explanation: 'Clean router',
            syntaxValid: true,
            lintWarningsCount: 0,
            confidenceScore: 0.9,
          },
        ],
      },
    });
    expect(consensus.statusCode).toBe(200);
    expect(consensus.data.result.winnerModelId).toBe('claude-sonnet-5-5');

    // 9. Inspects diffs
    const diffs = await simulate({
      method: 'POST',
      url: '/silver-intelligence/inspector/diffs',
      headers: { authorization: 'Bearer secret-token-123' },
      body: {
        hunks: [
          { filePath: 'src/main.ts', linesAdded: 2, linesDeleted: 0, hunkContent: '+console.log("hello");' },
        ],
      },
    });
    expect(diffs.statusCode).toBe(200);
    expect(diffs.data.report.approvalRecommended).toBe(true);

    // 10. Non-matching path is not handled by this router
    const unrelated = await simulate({ url: '/api/other-route' });
    expect(unrelated.handled).toBe(false);
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
