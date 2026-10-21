import { describe, expect, it } from 'bun:test';
import { inferProvider, inferTier } from '../consensus/model-catalog';

describe('Model Catalog Classification Unit Tests', () => {
  describe('inferProvider', () => {
    it('infers anthropic models', () => {
      expect(inferProvider('claude-3-7-sonnet')).toBe('anthropic');
      expect(inferProvider('claude-opus-5-5')).toBe('anthropic');
      expect(inferProvider('claude-haiku-4')).toBe('anthropic');
      expect(inferProvider('mythos-coding')).toBe('anthropic');
    });

    it('infers openai models', () => {
      expect(inferProvider('gpt-4o')).toBe('openai');
      expect(inferProvider('gpt-5-turbo')).toBe('openai');
      expect(inferProvider('o1-preview')).toBe('openai');
      expect(inferProvider('o3-mini')).toBe('openai');
      expect(inferProvider('codex-002')).toBe('openai');
    });

    it('infers google models', () => {
      expect(inferProvider('gemini-2.5-pro')).toBe('google');
      expect(inferProvider('gemini-3.8-flash')).toBe('google');
      expect(inferProvider('gemma-2-9b')).toBe('google');
    });

    it('infers xai models', () => {
      expect(inferProvider('grok-2')).toBe('xai');
      expect(inferProvider('grok-4-7')).toBe('xai');
    });

    it('infers deepseek models', () => {
      expect(inferProvider('deepseek-chat')).toBe('deepseek');
      expect(inferProvider('deepseek-coder-v3')).toBe('deepseek');
      expect(inferProvider('deepseek-r1')).toBe('deepseek');
    });

    it('infers alibaba / qwen models', () => {
      expect(inferProvider('qwen-2.5-coder-32b')).toBe('alibaba');
      expect(inferProvider('qwq-32b-preview')).toBe('alibaba');
    });

    it('infers mistral models', () => {
      expect(inferProvider('mistral-large-2')).toBe('mistral');
      expect(inferProvider('codestral-2501')).toBe('mistral');
      expect(inferProvider('ministral-8b')).toBe('mistral');
    });

    it('infers moonshot / kimi models', () => {
      expect(inferProvider('kimi-k2.5')).toBe('moonshotai');
      expect(inferProvider('moonshot-v1')).toBe('moonshotai');
    });

    it('infers zai / glm models', () => {
      expect(inferProvider('glm-4-plus')).toBe('zai');
      expect(inferProvider('zhipu-glm-4')).toBe('zai');
    });

    it('infers minimax models', () => {
      expect(inferProvider('minimax-text-01')).toBe('minimax');
      expect(inferProvider('minimax-h3-max')).toBe('minimax');
    });

    it('infers local models and returns unknown for unregistered formats', () => {
      expect(inferProvider('lmstudio/custom-model')).toBe('local');
      expect(inferProvider('random-custom-unmatched-engine')).toBe('unknown');
    });
  });

  describe('inferTier', () => {
    it('correctly classifies frontier tier', () => {
      expect(inferTier('claude-opus-5-5')).toBe('frontier');
      expect(inferTier('gemini-1.5-pro')).toBe('frontier');
      expect(inferTier('deepseek-r1')).toBe('frontier');
      expect(inferTier('mistral-large-2')).toBe('frontier');
    });

    it('correctly classifies balanced tier', () => {
      expect(inferTier('claude-sonnet-5-5')).toBe('balanced');
      expect(inferTier('gpt-4o')).toBe('balanced');
      expect(inferTier('o1')).toBe('balanced');
    });

    it('correctly classifies fast tier', () => {
      expect(inferTier('claude-haiku-5-5')).toBe('fast');
      expect(inferTier('gemini-flash-1.5')).toBe('fast');
      expect(inferTier('gpt-4o-mini')).toBe('fast');
      expect(inferTier('mistral-small')).toBe('fast');
    });
  });
});
