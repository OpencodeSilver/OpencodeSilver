import { describe, expect, it } from 'bun:test';
import { EventEmitter } from 'node:events';
import { createSilverIntelligenceRouter } from '../server/router';
import { SilverMissionOrchestrator } from '../mission/orchestrator';

describe('SilverIntelligenceRouter Unit Tests', () => {
  const orchestrator = new SilverMissionOrchestrator({ autoPersist: false });
  const router = createSilverIntelligenceRouter({
    authToken: 'test-secret-token',
    allowedOrigins: ['http://localhost:3000', 'https://opencode.internal'],
    orchestrator,
  });

  const simulate = async (options: {
    method?: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  }) => {
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
    const result = await promise;
    const handled = typeof result === 'boolean' ? result : (result as any).handled;
    return { handled, statusCode, data: responseBody ? JSON.parse(responseBody) : null };
  };

  it('rejects forbidden origin with 403', async () => {
    const response = await simulate({
      url: '/silver-intelligence/health',
      headers: { origin: 'http://malicious-site.com' },
    });
    expect(response.handled).toBe(true);
    expect(response.statusCode).toBe(403);
    expect(response.data.error).toContain('Forbidden');
  });

  it('allows matching origin in allowlist', async () => {
    const response = await simulate({
      url: '/silver-intelligence/health',
      headers: {
        origin: 'http://localhost:3000',
        authorization: 'Bearer test-secret-token',
      },
    });
    expect(response.handled).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.data.status).toBe('healthy');
  });

  it('rejects unauthenticated requests with 401', async () => {
    const response = await simulate({ url: '/silver-intelligence/missions' });
    expect(response.handled).toBe(true);
    expect(response.statusCode).toBe(401);
    expect(response.data.error).toContain('Unauthorized');
  });

  it('accepts valid authentication token via x-opencodesilver-token header', async () => {
    const response = await simulate({
      url: '/silver-intelligence/missions',
      headers: { 'x-opencodesilver-token': 'test-secret-token' },
    });
    expect(response.handled).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.data.missions)).toBe(true);
  });

  it('accepts valid authentication token via query parameter', async () => {
    const response = await simulate({
      url: '/silver-intelligence/missions?token=test-secret-token',
    });
    expect(response.handled).toBe(true);
    expect(response.statusCode).toBe(200);
  });

  it('validates mission plan payload using Zod and rejects invalid input with 400', async () => {
    const response = await simulate({
      method: 'POST',
      url: '/silver-intelligence/missions/plan',
      headers: { authorization: 'Bearer test-secret-token' },
      body: { title: '' }, // Missing objective and empty title
    });
    expect(response.handled).toBe(true);
    expect(response.statusCode).toBe(400);
    expect(response.data.error).toBe('Invalid input');
    expect(response.data.issues).toBeDefined();
  });

  it('successfully creates a mission via POST /missions/plan', async () => {
    const response = await simulate({
      method: 'POST',
      url: '/silver-intelligence/missions/plan',
      headers: { authorization: 'Bearer test-secret-token' },
      body: {
        title: 'Network Optimization',
        objective: 'Reduce round-trip latency to subagents',
      },
    });
    expect(response.handled).toBe(true);
    expect(response.statusCode).toBe(201);
    expect(response.data.mission).toBeDefined();
    expect(response.data.mission.title).toBe('Network Optimization');
  });

  it('inspects diff hunks via POST /inspector/diffs', async () => {
    const response = await simulate({
      method: 'POST',
      url: '/silver-intelligence/inspector/diffs',
      headers: { authorization: 'Bearer test-secret-token' },
      body: {
        hunks: [
          {
            filePath: 'src/token.ts',
            linesAdded: 1,
            linesDeleted: 0,
            hunkContent: '+const token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";',
          },
        ],
      },
    });
    expect(response.handled).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.data.report).toBeDefined();
    expect(response.data.report.securityVulnerabilities.length).toBeGreaterThan(0);
  });

  it('returns 404 for unknown route under silver-intelligence prefix', async () => {
    const response = await simulate({
      url: '/silver-intelligence/non-existent-endpoint',
      headers: { authorization: 'Bearer test-secret-token' },
    });
    expect(response.handled).toBe(true);
    expect(response.statusCode).toBe(404);
  });

  it('returns handled = false for unrelated paths without matching prefix', async () => {
    const response = await simulate({ url: '/other-api/something' });
    expect(response.handled).toBe(false);
  });
});
