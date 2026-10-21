/**
 * OpencodeSilver Intelligence Server Controller & Routes
 * Engineered and Architected by Ahmed (GEMTM)
 */

import { Router } from 'express';
import {
  SilverMissionOrchestrator,
  SilverConsensusMatrix,
  SilverCodeInspector,
  SilverClaudeBridge,
  SilverArabicEngine,
  missionPlanSchema,
  missionPhaseSchema,
  consensusSchema,
  diffHunkSchema,
  inspectSchema,
  claudeSpawnSchema,
  arabicSchema,
  MAX_BODY_BYTES,
} from '@opencodesilver/core';

/** Rejects oversized bodies before any route parses them. */
const limitBodySize = (req, res, next) => {
  const declared = Number(req.headers['content-length'] || 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return res.status(413).json({ error: `Request body exceeds ${MAX_BODY_BYTES} bytes` });
  }
  return next();
};

/**
 * Validates `req.body` against a schema and answers 400 with the field errors,
 * so an invalid payload never reaches the engine.
 */
const validateBody = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  req.validatedBody = parsed.data;
  return next();
};

export function createSilverIntelligenceRouter(options = {}) {
  const router = Router();
  const orchestrator = options.orchestrator ?? new SilverMissionOrchestrator({
    defaultAuthor: 'Ahmed (GEMTM)',
    autoPersist: true,
  });
  const consensusMatrix = options.consensusMatrix ?? new SilverConsensusMatrix();
  const inspector = options.inspector ?? new SilverCodeInspector();
  const claudeBridge = options.claudeBridge ?? new SilverClaudeBridge();
  const arabicEngine = options.arabicEngine ?? new SilverArabicEngine();

  router.use(limitBodySize);

  // 1. Mission Control Routes
  router.post('/mission/plan', validateBody(missionPlanSchema), (req, res) => {
    const { title, objective, context } = req.validatedBody;
    const mission = orchestrator.planMission(title, objective, context);
    res.json(mission);
  });

  router.post('/mission/:id/phase', validateBody(missionPhaseSchema), (req, res) => {
    const { phaseId, status, artifacts } = req.validatedBody;
    const updated = orchestrator.advancePhase(req.params.id, phaseId, status, artifacts);
    res.json(updated);
  });

  router.post('/mission/:id/abort', (req, res) => {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;
    const updated = orchestrator.abortMission(req.params.id, reason);
    res.json(updated);
  });

  router.get('/missions', (_req, res) => {
    res.json(orchestrator.listMissions());
  });

  router.get('/mission/:id', (req, res) => {
    const mission = orchestrator.getMission(req.params.id);
    if (!mission) {
      return res.status(404).json({ error: `Mission not found: ${req.params.id}` });
    }
    res.json(mission);
  });

  // 2. Consensus Matrix Evaluation
  router.post('/consensus/evaluate', validateBody(consensusSchema), (req, res) => {
    const { taskDescription, candidates } = req.validatedBody;
    const consensus = consensusMatrix.evaluateCandidates(taskDescription, candidates);
    res.json(consensus);
  });

  // 3. Code Inspection & Security Blast Radius
  router.post('/inspect/diffs', validateBody(inspectSchema), (req, res) => {
    const report = inspector.inspectDiffs(req.validatedBody.hunks);
    res.json(report);
  });

  // 4. Claude Code CLI Headless Integration
  router.post('/claude/spawn-args', validateBody(claudeSpawnSchema), (req, res) => {
    const { prompt, config } = req.validatedBody;
    const spawnSpec = claudeBridge.buildSpawnArguments(prompt, config || {});
    res.json(spawnSpec);
  });

  router.get('/claude/detect', async (_req, res) => {
    const status = await claudeBridge.detectClaudeInstallation();
    res.json(status);
  });

  // 5. Arabic NLP & BiDi Endpoint
  router.post('/i18n/normalize-arabic', validateBody(arabicSchema), (req, res) => {
    const { text } = req.validatedBody;
    const isRTL = arabicEngine.isRTL(text);
    const normalized = arabicEngine.normalizeArabic(text);
    res.json({ isRTL, normalized });
  });

  // Engine errors are reported as 400 (invalid arguments) or 404 (unknown
  // mission); an unexpected failure stays a 500.
  router.use((error, _req, res, _next) => {
    const message = error instanceof Error ? error.message : 'Silver Intelligence request failed';
    const status = /not found|unknown mission/i.test(message) ? 404 : 400;
    res.status(status).json({ error: message });
  });

  return router;
}
