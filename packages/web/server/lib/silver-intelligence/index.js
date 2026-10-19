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
} from '../../../../core/src/index.ts';

export function createSilverIntelligenceRouter() {
  const router = Router();
  const orchestrator = new SilverMissionOrchestrator('Ahmed (GEMTM)');
  const consensusMatrix = new SilverConsensusMatrix();
  const inspector = new SilverCodeInspector();
  const claudeBridge = new SilverClaudeBridge();
  const arabicEngine = new SilverArabicEngine();

  // 1. Mission Control Routes
  router.post('/mission/plan', (req, res) => {
    try {
      const { title, objective, context } = req.body;
      if (!title || !objective) {
        return res.status(400).json({ error: 'Title and objective are required' });
      }
      const mission = orchestrator.planMission(title, objective, context);
      res.json(mission);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/mission/:id/phase', (req, res) => {
    try {
      const { phaseId, status, artifacts } = req.body;
      const updated = orchestrator.advancePhase(req.params.id, phaseId, status, artifacts);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/missions', (_req, res) => {
    res.json(orchestrator.listMissions());
  });

  // 2. Consensus Matrix Evaluation
  router.post('/consensus/evaluate', (req, res) => {
    try {
      const { taskDescription, candidates } = req.body;
      if (!Array.isArray(candidates) || candidates.length === 0) {
        return res.status(400).json({ error: 'Candidates array is required' });
      }
      const consensus = consensusMatrix.evaluateCandidates(taskDescription || '', candidates);
      res.json(consensus);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Code Inspection & Security Blast Radius
  router.post('/inspect/diffs', (req, res) => {
    try {
      const { hunks } = req.body;
      if (!Array.isArray(hunks)) {
        return res.status(400).json({ error: 'Hunks array is required' });
      }
      const report = inspector.inspectDiffs(hunks);
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Claude Code CLI Headless Integration
  router.post('/claude/spawn-args', (req, res) => {
    try {
      const { prompt, config } = req.body;
      const spawnSpec = claudeBridge.buildSpawnArguments(prompt || '', config || {});
      res.json(spawnSpec);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Arabic NLP & BiDi Endpoint
  router.post('/i18n/normalize-arabic', (req, res) => {
    const { text } = req.body;
    const isRTL = arabicEngine.isRTL(text || '');
    const normalized = arabicEngine.normalizeArabic(text || '');
    res.json({ isRTL, normalized });
  });

  return router;
}
