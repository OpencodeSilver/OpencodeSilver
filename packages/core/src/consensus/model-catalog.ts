/**
 * Version-agnostic model classification for the consensus matrix.
 *
 * The live model list comes from models.dev through OpenCode, so new releases
 * appear in the app without code changes. This file must not pin specific
 * versions either: it recognises a model's provider and capability tier from
 * its family name, so a model released tomorrow (say `claude-opus-6` or
 * `gemini-5-argon`) is scored correctly the day it shows up in the catalog.
 *
 * Reference points (October 2026), used only to test the patterns:
 *   anthropic  claude-opus-5-5, claude-sonnet-5-5, claude-haiku-5-5, claude-fable-5-1
 *   openai     gpt-6.1-sol, gpt-6-astra, gpt-6-luna, gpt-5.6-terra
 *   google     gemini-4-argon, gemini-3.8-flash
 *   xai        grok-4-7
 *   deepseek   deepseek-v4.1-flash
 *   alibaba    qwen3.8-2.4t-a95b, qwen3.8-flash
 *   moonshot   kimi-k3, kimi-k3-fast
 *   zai        glm-5.3, glm-5.3-flash
 *   mistral    mistral-large-4, mistral-small-2603
 *   minimax    minimax-h3-max, minimax-m3
 */

export type ModelProvider =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'xai'
  | 'deepseek'
  | 'alibaba'
  | 'moonshotai'
  | 'zai'
  | 'mistral'
  | 'minimax'
  | 'meta'
  | 'local'
  | 'unknown';

/** frontier: largest reasoning models; balanced: everyday coding models; fast: small/cheap models. */
export type ModelTier = 'frontier' | 'balanced' | 'fast' | 'unknown';

const PROVIDER_PATTERNS: Array<[ModelProvider, RegExp]> = [
  ['anthropic', /claude|opus|sonnet|haiku|fable|mythos/],
  ['openai', /\bgpt|(^|[/-])o\d(\b|-)|codex/],
  ['google', /gemini|gemma/],
  ['xai', /grok/],
  ['deepseek', /deepseek/],
  ['alibaba', /qwen|qwq/],
  ['moonshotai', /kimi|moonshot/],
  ['zai', /glm|zhipu/],
  ['mistral', /mistral|codestral|devstral|magistral|ministral/],
  ['minimax', /minimax/],
  ['meta', /llama|muse/],
  ['local', /ollama|lmstudio|llamacpp|gguf/],
];

// Checked in order: a small variant of a big family (`kimi-k3-fast`) is fast.
// Size words must stand alone (`gpt-6-mini`), not inside a name (`gemini`, `minimax`).
const FAST = /haiku|luna|flash|lite\b|(^|[-_.])(mini|nano|fast|small|air|turbo|highspeed)\b|ministral/;
const FRONTIER = /opus|fable|mythos|-sol\b|gpt-\d+(\.\d+)?-sol|argon|gemini-[\d.]+-(pro|ultra)|grok-\d|deepseek-(v|r)\d|kimi-k\d|glm-\d|qwen[\d.]+-(max|\d+(\.\d+)?t)|mistral-large|magistral|minimax-h\d|-max\b/;
const BALANCED = /sonnet|terra|astra|gpt-\d|gemini|o\d|codex|grok|deepseek|kimi|glm|qwen|mistral|devstral|codestral|minimax|llama|muse/;

const normalise = (modelId: string): string => modelId.trim().toLowerCase();

export function inferProvider(modelId: string, declared?: string): ModelProvider {
  if (declared && declared !== 'unknown') {
    const known = PROVIDER_PATTERNS.find(([name]) => name === declared);
    if (known) return known[0];
  }
  const id = normalise(modelId);
  return PROVIDER_PATTERNS.find(([, pattern]) => pattern.test(id))?.[0] ?? 'unknown';
}

export function inferTier(modelId: string): ModelTier {
  // Strip any `provider/` prefix (OpenRouter-style ids) before matching.
  const id = normalise(modelId).split('/').pop() ?? '';
  if (FAST.test(id)) return 'fast';
  if (FRONTIER.test(id)) return 'frontier';
  if (BALANCED.test(id)) return 'balanced';
  return 'unknown';
}

/** Points added to a candidate's score by tier. Unknown models stay neutral rather than penalised. */
export const TIER_WEIGHT: Record<ModelTier, number> = {
  frontier: 15,
  balanced: 12,
  fast: 8,
  unknown: 10,
};
