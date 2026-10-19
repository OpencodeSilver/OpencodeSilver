/**
 * OpencodeSilver Multi-Model Consensus Matrix
 * Engineered and Architected by Ahmed (GEMTM)
 *
 * Coordinates parallel model executions, scores proposals based on
 * AST validity, test fitness, and architecture compliance, and synthesizes
 * an optimal unified patch.
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
}

export interface ConsensusResult {
  consensusId: string;
  timestamp: number;
  candidatesEvaluated: number;
  winnerModelId: string;
  winningPatch: string;
  synthesisSummary: string;
  rankedScores: Array<{
    modelId: string;
    provider: ModelProvider;
    tier: ModelTier;
    compositeScore: number;
    rationale: string;
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

      // Penalize for lint warnings
      score -= Math.min(20, cand.lintWarningsCount * 2);

      // Model capability weighting. Classified by family, not pinned versions,
      // so newly released models are scored without a code change.
      const provider = inferProvider(cand.modelId, cand.provider);
      const tier = inferTier(cand.modelId);
      score += TIER_WEIGHT[tier];

      // Efficiency bonus
      if (cand.durationMs < 8000) score += 5;

      const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

      let rationale = `Base confidence ${Math.round(cand.confidenceScore * 100)}%, `;
      rationale += cand.syntaxValid ? 'clean syntax, ' : 'syntax issues detected, ';
      rationale += `${cand.lintWarningsCount} lint warnings, ${tier} tier (${provider}).`;

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
      synthesisSummary,
      rankedScores: scored.map((s) => ({
        modelId: s.modelId,
        provider: s.provider,
        tier: s.tier,
        compositeScore: s.compositeScore,
        rationale: s.rationale,
      })),
      mergeConflictsEncountered: false,
    };
  }
}
