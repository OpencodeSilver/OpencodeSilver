import { describe, expect, test } from 'bun:test';
import { calculateSessionMetrics } from './sessionMetricsCalculator';

describe('sessionMetricsCalculator', () => {
  test('correctly aggregates message counts, characters, and tools', () => {
    const mockMessages = [
      {
        role: 'user',
        parts: [{ type: 'text', text: 'Help me build a feature' }],
      },
      {
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Sure! Here is the plan.' },
          {
            type: 'tool',
            input: { filePath: 'src/index.ts' },
          },
          {
            type: 'tool',
            input: { filePath: 'src/utils.ts' },
          },
        ],
      },
    ];

    const metrics = calculateSessionMetrics(mockMessages);
    expect(metrics.totalUserMessages).toBe(1);
    expect(metrics.totalAssistantMessages).toBe(1);
    expect(metrics.totalToolsExecuted).toBe(2);
    expect(metrics.filesModifiedCount).toBe(2);
    expect(metrics.totalCharacters).toBe(46);
    expect(metrics.estimatedTokens).toBe(12);
  });
});
