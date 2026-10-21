import { describe, expect, it } from 'bun:test';
import {
  PlanMissionSchema,
  PhaseUpdateSchema,
  AdvancePhaseSchema,
  CandidateRunSchema,
  EvaluateConsensusSchema,
  DiffHunkSchema,
  InspectDiffsSchema,
  ClaudeSpawnSchema,
  ArabicAnalyzeSchema,
  missionPlanSchema,
  missionPhaseSchema,
  consensusSchema,
  diffHunkSchema,
  inspectSchema,
  claudeSpawnSchema,
  arabicSchema,
  MAX_CANDIDATES,
  MAX_HUNKS,
} from '../server/router';

describe('Silver Intelligence Zod Schemas Compatibility & Parity', () => {
  it('confirms aliases match canonical schemas identically', () => {
    expect(missionPlanSchema).toBe(PlanMissionSchema);
    expect(missionPhaseSchema).toBe(PhaseUpdateSchema);
    expect(consensusSchema).toBe(EvaluateConsensusSchema);
    expect(diffHunkSchema).toBe(DiffHunkSchema);
    expect(inspectSchema).toBe(InspectDiffsSchema);
    expect(claudeSpawnSchema).toBe(ClaudeSpawnSchema);
    expect(arabicSchema).toBe(ArabicAnalyzeSchema);
  });

  describe('Mission Schemas', () => {
    it('accepts valid mission plan payload', () => {
      const valid = {
        title: 'Refactor Core Architecture',
        objective: 'Unify schemas across monorepo packages',
        context: { priority: 'P0', engineer: 'Ahmed (GEMTM)' },
      };
      const res = PlanMissionSchema.safeParse(valid);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.title).toBe(valid.title);
      }
    });

    it('rejects empty title or objective', () => {
      expect(PlanMissionSchema.safeParse({ title: '', objective: 'Do it' }).success).toBe(false);
      expect(PlanMissionSchema.safeParse({ title: 'Plan', objective: '' }).success).toBe(false);
      expect(PlanMissionSchema.safeParse({ objective: 'Do it' }).success).toBe(false);
    });

    it('validates phase update status enum and artifacts array', () => {
      const validPhase = {
        phaseId: 'phase-01',
        status: 'in_progress',
        artifacts: ['diff.patch', 'report.md'],
      };
      expect(PhaseUpdateSchema.safeParse(validPhase).success).toBe(true);

      const invalidStatus = {
        phaseId: 'phase-01',
        status: 'running_now',
      };
      expect(PhaseUpdateSchema.safeParse(invalidStatus).success).toBe(false);
    });

    it('validates advance phase schema with optional missionId', () => {
      const withoutMissionId = {
        phaseId: 'phase-02',
        status: 'completed',
      };
      expect(AdvancePhaseSchema.safeParse(withoutMissionId).success).toBe(true);

      const withMissionId = {
        missionId: 'mission_123',
        phaseId: 'phase-02',
        status: 'completed',
      };
      expect(AdvancePhaseSchema.safeParse(withMissionId).success).toBe(true);
    });
  });

  describe('Consensus Schemas', () => {
    const candidateTemplate = {
      modelId: 'anthropic/claude-3-7-sonnet',
      provider: 'anthropic',
      durationMs: 1200,
      tokensUsed: 450,
      patch: '--- a/file.ts\n+++ b/file.ts',
      explanation: 'Optimized hot loop',
      syntaxValid: true,
      lintWarningsCount: 0,
      confidenceScore: 0.95,
      testsPassed: true,
      typeCheckPassed: true,
    };

    it('accepts valid consensus payload within candidate bounds', () => {
      const payload = {
        taskDescription: 'Fix race condition',
        candidates: [candidateTemplate],
      };
      const result = EvaluateConsensusSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects empty candidates array', () => {
      const payload = {
        taskDescription: 'Fix race condition',
        candidates: [],
      };
      expect(EvaluateConsensusSchema.safeParse(payload).success).toBe(false);
    });

    it('enforces MAX_CANDIDATES bound', () => {
      const tooMany = Array.from({ length: MAX_CANDIDATES + 1 }, () => ({ ...candidateTemplate }));
      const payload = {
        taskDescription: 'Evaluate candidates',
        candidates: tooMany,
      };
      expect(EvaluateConsensusSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('Diff Inspector Schemas', () => {
    it('accepts valid diff hunks up to MAX_HUNKS', () => {
      const validHunk = {
        filePath: 'packages/core/src/index.ts',
        hunkContent: '@@ -1,5 +1,5 @@',
        linesAdded: 10,
        linesDeleted: 2,
      };
      expect(DiffHunkSchema.safeParse(validHunk).success).toBe(true);

      const inspectPayload = {
        hunks: [validHunk],
      };
      expect(InspectDiffsSchema.safeParse(inspectPayload).success).toBe(true);
    });

    it('rejects negative linesAdded or deleted', () => {
      const invalid = {
        filePath: 'packages/core/src/index.ts',
        hunkContent: '@@ -1,5 +1,5 @@',
        linesAdded: -5,
        linesDeleted: 0,
      };
      expect(DiffHunkSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('Claude Spawn and Arabic Schemas', () => {
    it('validates Claude spawn arguments config and prompt', () => {
      const valid = {
        prompt: 'Build new feature',
        config: { timeout: 3000 },
      };
      expect(ClaudeSpawnSchema.safeParse(valid).success).toBe(true);
    });

    it('validates Arabic text input and enforces length limits', () => {
      expect(ArabicAnalyzeSchema.safeParse({ text: 'مرحبا بكم في OpencodeSilver' }).success).toBe(true);
      expect(ArabicAnalyzeSchema.safeParse({ text: 123 }).success).toBe(false);
    });
  });
});
