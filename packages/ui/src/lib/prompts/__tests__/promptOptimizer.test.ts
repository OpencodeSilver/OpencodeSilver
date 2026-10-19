import { describe, expect, test } from 'bun:test';
import { fallbackHeuristicEnhancement } from '../promptOptimizer';

describe('fallbackHeuristicEnhancement', () => {
  test('generates comprehensive Arabic multi-phase project blueprint when input is Arabic', () => {
    const input = 'إنشاء تطبيق دردشة متزامن مع دعم الصوت والفيديو';
    const output = fallbackHeuristicEnhancement(input);

    expect(output).toContain('# 🚀 المخطط الشامل لتنفيذ المشروع بالكامل من الصفر حتى الاكتمال');
    expect(output).toContain('المرحلة 0: التهيئة وبناء الهيكل الأولي');
    expect(output).toContain('المرحلة 1: بناء المنطق الأساسي والمحركات');
    expect(output).toContain('المرحلة 2: واجهة المستخدم والتفاعل');
    expect(output).toContain('المرحلة 3: التوافق وحالات الاستثناء');
    expect(output).toContain('معايير القبول والفحص والاختبار');
    expect(output).toContain(input);
  });

  test('generates comprehensive English multi-phase project blueprint when input is English', () => {
    const input = 'Build a high-performance distributed caching proxy';
    const output = fallbackHeuristicEnhancement(input);

    expect(output).toContain('# 🚀 Complete End-to-End Project Execution Specification');
    expect(output).toContain('Phase 0: Scaffolding & Foundations');
    expect(output).toContain('Phase 1: Core Engine & Business Logic Implementation');
    expect(output).toContain('Phase 2: Interfaces & Integration');
    expect(output).toContain('Phase 3: Resilience, Security & Edge Cases');
    expect(output).toContain('Acceptance Criteria & Automated Verification');
    expect(output).toContain(input);
  });
});
