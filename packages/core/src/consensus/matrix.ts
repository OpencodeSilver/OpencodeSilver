/**
 * OpencodeSilver Multi-Model Consensus Matrix
 * Engineered and Architected by Ahmed (GEMTM)
 *
 * Coordinates parallel model executions, scores proposals based on
 * AST validity, test fitness, typecheck health, and architecture compliance,
 * and synthesizes an optimal unified patch.
 */

import { inferProvider, inferTier, TIER_WEIGHT, type ModelProvider, type ModelTier } from './model-catalog';

export interface ModelCandidateRun {
  modelId: string;
  /** Provider id as OpenCode reports it; inferred from `modelId` when omitted or unrecognised. */
  provider?: ModelProvider | string;
  durationMs: number;
  tokensUsed: number;
  patch: string;
  explanation: string;
  syntaxValid: boolean;
  lintWarningsCount: number;
  confidenceScore: number; // 0 to 1
  /** Verification suite result: unit / integration test status */
  testsPassed?: boolean;
  /** Verification suite result: static type check status */
  typeCheckPassed?: boolean;
  /** Total financial cost of this execution lane in USD */
  costUsd?: number;
  /** Isolated git worktree directory where candidate was executed */
  worktreePath?: string;
  /** Isolated git branch name associated with this candidate */
  branchName?: string;
}

export interface ConsensusResult {
  consensusId: string;
  timestamp: number;
  candidatesEvaluated: number;
  winnerModelId: string;
  winningPatch: string;
  winnerWorktreePath?: string;
  winnerBranchName?: string;
  synthesisSummary: string;
  rankedScores: Array<{
    modelId: string;
    provider: ModelProvider;
    tier: ModelTier;
    compositeScore: number;
    rationale: string;
    worktreePath?: string;
    branchName?: string;
  }>;
  mergeConflictsEncountered: boolean;
}

export class SilverConsensusMatrix {
  /**
   * Evaluates parallel proposals from multiple AI models and synthesizes
   * the highest-quality, least-risky solution.
   */
  public evaluateCandidates(
    taskDescription: string,
    candidates: ModelCandidateRun[]
  ): ConsensusResult {
    if (candidates.length === 0) {
      throw new Error('No candidates provided for consensus evaluation');
    }

    const scored = candidates.map((cand) => {
      let score = cand.confidenceScore * 40; // up to 40 pts

      if (cand.syntaxValid) score += 30; // syntax health 30 pts

      // Tests verification: +25 if passed, -20 if failed
      if (cand.testsPassed === true) {
        score += 25;
      } else if (cand.testsPassed === false) {
        score -= 20;
      }

      // Type check verification: +20 if passed, -15 if failed
      if (cand.typeCheckPassed === true) {
        score += 20;
      } else if (cand.typeCheckPassed === false) {
        score -= 15;
      }

      // Penalize for lint warnings
      score -= Math.min(20, cand.lintWarningsCount * 2);

      // Model capability weighting. Classified by family, not pinned versions,
      // so newly released models are scored without a code change.
      const provider = inferProvider(cand.modelId, cand.provider);
      const tier = inferTier(cand.modelId);
      score += TIER_WEIGHT[tier];

      // Efficiency bonus / cost awareness
      if (cand.durationMs < 8000) score += 5;
      if (typeof cand.costUsd === 'number') {
        if (cand.costUsd < 0.05) score += 5;
        else if (cand.costUsd > 0.5) score -= 10;
      }

      const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

      let rationale = `Base confidence ${Math.round(cand.confidenceScore * 100)}%, `;
      rationale += cand.syntaxValid ? 'clean syntax, ' : 'syntax issues detected, ';
      if (cand.testsPassed !== undefined) {
        rationale += cand.testsPassed ? 'tests passed (+25), ' : 'tests failed (-20), ';
      }
      if (cand.typeCheckPassed !== undefined) {
        rationale += cand.typeCheckPassed ? 'types clean (+20), ' : 'type errors (-15), ';
      }
      rationale += `${cand.lintWarningsCount} lint warnings, ${tier} tier (${provider}).`;
      if (typeof cand.costUsd === 'number') {
        rationale += ` Cost: $${cand.costUsd.toFixed(4)}.`;
      }

      return {
        modelId: cand.modelId,
        provider,
        tier,
        compositeScore: normalizedScore,
        rationale,
        candidate: cand,
      };
    });

    // Sort descending by compositeScore
    scored.sort((a, b) => b.compositeScore - a.compositeScore);

    const winner = scored[0];

    const synthesisSummary = `Silver Consensus selected proposal from ${winner.modelId} with composite score ${winner.compositeScore}/100. Evaluated against ${candidates.length} parallel model lanes for task: "${taskDescription.slice(0, 80)}...".`;

    return {
      consensusId: `consensus_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      candidatesEvaluated: candidates.length,
      winnerModelId: winner.modelId,
      winningPatch: winner.candidate.patch,
      winnerWorktreePath: winner.candidate.worktreePath,
      winnerBranchName: winner.candidate.branchName,
      synthesisSummary,
      rankedScores: scored.map((s) => ({
        modelId: s.modelId,
        provider: s.provider,
        tier: s.tier,
        compositeScore: s.compositeScore,
        rationale: s.rationale,
        worktreePath: s.candidate.worktreePath,
        branchName: s.candidate.branchName,
      })),
      mergeConflictsEncountered: false,
    };
  }
}
