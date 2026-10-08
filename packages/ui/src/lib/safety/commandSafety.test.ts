import { describe, expect, test } from 'bun:test';
import { analyzeCommandSafety } from './commandSafety';

describe('analyzeCommandSafety', () => {
  test('detects critical recursive deletion commands', () => {
    const analysis = analyzeCommandSafety('rm -rf /*');
    expect(analysis.riskLevel).toBe('critical');
    expect(analysis.isDestructive).toBe(true);
    expect(analysis.requiresExplicitConfirm).toBe(true);
  });

  test('detects powershell recursive system drive deletion', () => {
    const analysis = analyzeCommandSafety('del /f /s C:\\*');
    expect(analysis.riskLevel).toBe('critical');
    expect(analysis.isDestructive).toBe(true);
  });

  test('detects high risk forced git operations', () => {
    const analysis = analyzeCommandSafety('git reset --hard HEAD~1');
    expect(analysis.riskLevel).toBe('high');
    expect(analysis.isDestructive).toBe(true);
    expect(analysis.requiresExplicitConfirm).toBe(true);

    const pushAnalysis = analyzeCommandSafety('git push origin main --force');
    expect(pushAnalysis.riskLevel).toBe('high');
    expect(pushAnalysis.isDestructive).toBe(true);
  });

  test('detects sensitive secret file touch as medium risk', () => {
    const analysis = analyzeCommandSafety('cat .env.production');
    expect(analysis.riskLevel).toBe('medium');
    expect(analysis.isDestructive).toBe(false);
  });

  test('identifies safe commands correctly', () => {
    const analysis = analyzeCommandSafety('git status');
    expect(analysis.riskLevel).toBe('safe');
    expect(analysis.isDestructive).toBe(false);
    expect(analysis.requiresExplicitConfirm).toBe(false);

    const empty = analyzeCommandSafety('');
    expect(empty.riskLevel).toBe('safe');
  });

  test('identifies low risk dependency installation commands', () => {
    const analysis = analyzeCommandSafety('bun add lodash');
    expect(analysis.riskLevel).toBe('low');
    expect(analysis.isDestructive).toBe(false);
  });
});
