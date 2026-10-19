/**
 * Context & Token Estimator for AI Sessions
 * Calculates approximate token count, cost, and context window saturation.
 */

export interface TokenUsageEstimate {
  estimatedTokens: number;
  maxContextTokens: number;
  percentageUsed: number;
  status: 'optimal' | 'moderate' | 'near-limit' | 'exceeded';
  formattedTokenCount: string;
}

const DEFAULT_MAX_CONTEXT_WINDOW = 128_000;

/**
 * Fast character & word heuristic to estimate token count.
 * Generally ~3.8 to 4.2 characters per token for English & programming languages.
 * Arabic, CJK, and complex unicode average ~1.5 to 2.5 characters per token.
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  
  // Detect non-latin ratio (Arabic, Asian scripts, etc.)
  let nonAsciiCount = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 127) {
      nonAsciiCount++;
    }
  }

  const nonAsciiRatio = nonAsciiCount / text.length;
  // Blend factor: 4 chars/token for ASCII, ~2 chars/token for non-ASCII
  const charsPerToken = nonAsciiRatio > 0.3 ? 2.2 : 3.8;
  
  return Math.max(1, Math.ceil(text.length / charsPerToken));
}

/**
 * Formats token count cleanly (e.g. 1.2k, 45k, 120k).
 */
export function formatTokenDisplay(tokens: number): string {
  if (tokens < 1000) return `${tokens}`;
  if (tokens < 1_000_000) {
    const k = tokens / 1000;
    return k >= 10 ? `${Math.round(k)}k` : `${k.toFixed(1)}k`;
  }
  const m = tokens / 1_000_000;
  return `${m.toFixed(2)}M`;
}

/**
 * Evaluates session context saturation based on current prompt/history size.
 */
export function evaluateContextSaturation(
  totalEstimatedTokens: number,
  maxContextTokens: number = DEFAULT_MAX_CONTEXT_WINDOW
): TokenUsageEstimate {
  const percentage = Math.min(100, Math.round((totalEstimatedTokens / maxContextTokens) * 100));
  
  let status: TokenUsageEstimate['status'] = 'optimal';
  if (percentage >= 100) {
    status = 'exceeded';
  } else if (percentage >= 85) {
    status = 'near-limit';
  } else if (percentage >= 60) {
    status = 'moderate';
  }

  return {
    estimatedTokens: totalEstimatedTokens,
    maxContextTokens,
    percentageUsed: percentage,
    status,
    formattedTokenCount: formatTokenDisplay(totalEstimatedTokens),
  };
}
