import { describe, it, expect } from 'bun:test';
import { createSilverIntelligenceRouter } from './index.js';

describe('SilverIntelligence Router', () => {
  it('creates router with all endpoints registered', () => {
    const router = createSilverIntelligenceRouter();
    expect(router).toBeDefined();
    expect(typeof router).toBe('function');
    
    // Check registered route paths in the router stack
    const paths = router.stack.map(layer => layer.route?.path).filter(Boolean);
    expect(paths).toContain('/mission/plan');
    expect(paths).toContain('/mission/:id/phase');
    expect(paths).toContain('/missions');
    expect(paths).toContain('/consensus/evaluate');
    expect(paths).toContain('/inspect/diffs');
    expect(paths).toContain('/claude/spawn-args');
    expect(paths).toContain('/i18n/normalize-arabic');
  });
});
