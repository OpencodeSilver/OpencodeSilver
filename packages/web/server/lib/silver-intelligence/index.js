/**
 * OpencodeSilver Intelligence Server Controller & Routes
 * Engineered and Architected by Ahmed (GEMTM)
 */

import { Router } from 'express';
import * as zodModule from 'zod';

const z = zodModule.z ?? zodModule.default ?? zodModule;
import {
  SilverMissionOrchestrator,
  SilverConsensusMatrix,
  SilverCodeInspector,
  SilverClaudeBridge,
  SilverArabicEngine,
} from '@opencodesilver/core';

// Every route is mounted behind the app's /api auth gate; these limits only
// bound what an authenticated caller can send.
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_CANDIDATES = 10;
const MAX_HUNKS = 500;

const missionPlanSchema = z.object({
  title: z.string().trim().min(1).max(200),
  objective: z.string().trim().min(1).max(5000),
  context: z.record(z.string(), z.unknown()).optional(),
});

const missionPhaseSchema = z.object({
  phaseId: z.string().trim().min(1).max(100),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'skipped']),
  artifacts: z.array(z.string().max(500)).max(50).optional(),
});

const consensusSchema = z.object({
  taskDescription: z.string().max(5000).optional().default(''),
  candidates: z.array(z.object({
    modelId: z.string().trim().min(1).max(200),
    provider: z.string().max(100).optional(),
    durationMs: z.number().nonnegative().max(86_400_000),
    tokensUsed: z.number().nonnegative().max(100_000_000),
    patch: z.string().max(500_000),
    explanation: z.string().max(20_000),
    syntaxValid: z.boolean(),
    lintWarningsCount: z.number().int().nonnegative().max(100_000),
    confidenceScore: z.number().min(0).max(1),
    testsPassed: z.boolean().optional(),
    typeCheckPassed: z.boolean().optional(),
    costUsd: z.number().nonnegative().optional(),
    worktreePath: z.string().max(1000).optional(),
    branchName: z.string().max(200).optional(),
  })).min(1).max(MAX_CANDIDATES),
});

const diffHunkSchema = z.object({
  filePath: z.string().trim().min(1).max(1000),
  hunkContent: z.string().max(1_000_000),
  linesAdded: z.number().int().nonnegative().max(1_000_000),
  linesDeleted: z.number().int().nonnegative().max(1_000_000),
});

const inspectSchema = z.object({
  hunks: z.array(diffHunkSchema).max(MAX_HUNKS),
});

const claudeSpawnSchema = z.object({
  prompt: z.string().max(500_000).optional().default(''),
  config: z.record(z.string(), z.unknown()).optional(),
});

const arabicSchema = z.object({
  text: z.string().max(100_000),
});

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
