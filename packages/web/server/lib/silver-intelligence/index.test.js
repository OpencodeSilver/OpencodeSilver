import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';

import { createSilverIntelligenceRouter } from './index.js';

const AUTH_TOKEN = 'Bearer ui-token';

/**
 * Mirrors how packages/web/server/index.js mounts the router: behind the /api
 * auth gate, which answers 401 before any Silver route runs.
 */
const createApp = () => {
  const app = express();
  app.use('/api', (req, res, next) => (
    req.headers.authorization === AUTH_TOKEN ? next() : res.status(401).json({ error: 'UI session missing' })
  ));
  app.use(express.json());
  app.use('/api/silver', createSilverIntelligenceRouter());
  return app;
};

describe('/api/silver auth gate', () => {
  it('rejects a request without a valid UI session', async () => {
    const response = await request(createApp()).get('/api/silver/missions');
    expect(response.status).toBe(401);
  });

  it('serves the mission list once authenticated', async () => {
    const response = await request(createApp())
      .get('/api/silver/missions')
      .set('Authorization', AUTH_TOKEN);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});

describe('/api/silver input validation', () => {
  it('rejects a mission plan without a title', async () => {
    const response = await request(createApp())
      .post('/api/silver/mission/plan')
      .set('Authorization', AUTH_TOKEN)
      .send({ objective: 'Ship it' });
    expect(response.status).toBe(400);
    expect(response.body.issues?.some((issue) => issue.path === 'title')).toBe(true);
  });

  it('plans a mission with valid input', async () => {
    const response = await request(createApp())
      .post('/api/silver/mission/plan')
      .set('Authorization', AUTH_TOKEN)
      .send({ title: 'Stabilise the release', objective: 'Make every check green' });
    expect(response.status).toBe(200);
    expect(response.body.missionId).toMatch(/^mission_/);
  });

  it('rejects more consensus candidates than the matrix accepts', async () => {
    const candidate = {
      modelId: 'provider/model', durationMs: 1, tokensUsed: 1, patch: '', explanation: '',
      syntaxValid: true, lintWarningsCount: 0, confidenceScore: 0.5,
    };
    const response = await request(createApp())
      .post('/api/silver/consensus/evaluate')
      .set('Authorization', AUTH_TOKEN)
      .send({ candidates: Array.from({ length: 11 }, () => candidate) });
    expect(response.status).toBe(400);
  });

  it('normalises Arabic text', async () => {
    const response = await request(createApp())
      .post('/api/silver/i18n/normalize-arabic')
      .set('Authorization', AUTH_TOKEN)
      .send({ text: 'إختبار' });
    expect(response.status).toBe(200);
    expect(response.body.isRTL).toBe(true);
  });

  it('rejects a body that declares more than the size limit', async () => {
    const response = await request(createApp())
      .post('/api/silver/i18n/normalize-arabic')
      .set('Authorization', AUTH_TOKEN)
      .set('Content-Length', String(2 * 1024 * 1024))
      .send('{}');
    expect(response.status).toBe(413);
  });
});
