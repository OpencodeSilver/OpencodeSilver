import { describe, expect, it } from 'bun:test';
import { SilverConsensusMatrix, type ModelCandidateRun } from '../consensus/matrix';

describe('SilverConsensusMatrix Unit Tests', () => {
  const matrix = new SilverConsensusMatrix();

  const baseCandidate: ModelCandidateRun = {
    modelId: 'claude-sonnet-5-5',
    durationMs: 2500,
    tokensUsed: 1200,
    patch: 'diff --git a/file.ts b/file.ts\n+const x = 1;',
    explanation: 'Optimal typed implementation',
    syntaxValid: true,
    lintWarningsCount: 0,
    confidenceScore: 0.95,
    testsPassed: true,
    typeCheckPassed: true,
  };

  it('selects candidate with passed tests and typechecks as winner', () => {
    const candidateA: ModelCandidateRun = {
      ...baseCandidate,
      modelId: 'model-a',
      testsPassed: true,
      typeCheckPassed: true,
    };
    const candidateB: ModelCandidateRun = {
      ...baseCandidate,
      modelId: 'model-b',
      testsPassed: false,
      typeCheckPassed: false,
      lintWarningsCount: 10,
    };

    const result = matrix.evaluateCandidates('Fix authentication regression', [candidateA, candidateB]);
    expect(result.winnerModelId).toBe('model-a');
    expect(result.candidatesEvaluated).toBe(2);
    expect(result.rankedScores[0].modelId).toBe('model-a');
    expect(result.rankedScores[0].compositeScore).toBeGreaterThan(result.rankedScores[1].compositeScore);
  });

  it('penalizes candidates with syntax errors heavily', () => {
    const invalidSyntax: ModelCandidateRun = {
      ...baseCandidate,
      modelId: 'broken-model',
      syntaxValid: false,
      confidenceScore: 0.50,
      testsPassed: false,
      typeCheckPassed: false,
    };
    const validSyntax: ModelCandidateRun = {
      ...baseCandidate,
      modelId: 'clean-model',
      syntaxValid: true,
      confidenceScore: 0.90,
      testsPassed: true,
      typeCheckPassed: true,
    };

    const result = matrix.evaluateCandidates('Syntax check task', [invalidSyntax, validSyntax]);
    expect(result.winnerModelId).toBe('clean-model');
  });

  it('penalizes candidates with high lint warnings', () => {
    const zeroWarnings: ModelCandidateRun = {
      ...baseCandidate,
      modelId: 'zero-warnings',
      lintWarningsCount: 0,
    };
    const highWarnings: ModelCandidateRun = {
      ...baseCandidate,
      modelId: 'high-warnings',
      lintWarningsCount: 25,
    };

    const result = matrix.evaluateCandidates('Lint evaluation', [zeroWarnings, highWarnings]);
    expect(result.winnerModelId).toBe('zero-warnings');
  });

  it('favors higher model tiers when candidate metrics are comparable', () => {
    const frontierCandidate: ModelCandidateRun = {
      ...baseCandidate,
      modelId: 'claude-opus-5-5', // Frontier: +15
      confidenceScore: 0.50,
      testsPassed: undefined,
      typeCheckPassed: undefined,
    };
    const fastCandidate: ModelCandidateRun = {
      ...baseCandidate,
      modelId: 'claude-haiku-5-5', // Fast: +8
      confidenceScore: 0.50,
      testsPassed: undefined,
      typeCheckPassed: undefined,
    };

    const result = matrix.evaluateCandidates('Architecture decision', [fastCandidate, frontierCandidate]);
    expect(result.winnerModelId).toBe('claude-opus-5-5');
    expect(result.rankedScores[0].compositeScore).toBeGreaterThan(result.rankedScores[1].compositeScore);
  });

  it('preserves worktree path and branch name for winner candidate', () => {
    const worktreeCandidate: ModelCandidateRun = {
      ...baseCandidate,
      modelId: 'worktree-lane',
      worktreePath: '/tmp/worktree-1',
      branchName: 'silver/candidate-1',
    };

    const result = matrix.evaluateCandidates('Worktree preservation', [worktreeCandidate]);
    expect(result.winnerWorktreePath).toBe('/tmp/worktree-1');
    expect(result.winnerBranchName).toBe('silver/candidate-1');
  });

  it('throws descriptive error if candidate list is empty', () => {
    expect(() => {
      matrix.evaluateCandidates('Empty run', []);
    }).toThrow(/No candidates provided for consensus evaluation/);
  });

  it('generates a unique consensusId and valid timestamp', () => {
    const result = matrix.evaluateCandidates('Timestamp check', [baseCandidate]);
    expect(result.consensusId).toBeDefined();
    expect(result.consensusId.length).toBeGreaterThan(10);
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it('includes human-readable rationales in rankedScores', () => {
    const result = matrix.evaluateCandidates('Rationale verification', [baseCandidate]);
    expect(result.rankedScores[0].rationale).toBeDefined();
    expect(result.rankedScores[0].rationale.length).toBeGreaterThan(5);
  });
});
