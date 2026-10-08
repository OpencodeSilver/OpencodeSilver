import { describe, expect, test as it } from 'bun:test';
import {
  buildAlwaysAllowRuleForCommand,
  deriveSubagentPermissionPolicy,
  evaluatePermissionPolicy,
  isPathInsideWorkspace,
  matchesPermissionRule,
  splitCompoundCommand,
  tokenizeCommandWords,
  validatePermissionRule,
  type PermissionPolicyConfig,
} from '../permissionEngine';

describe('permissionEngine', () => {
  describe('validatePermissionRule & matchesPermissionRule', () => {
    it('validates command(prefix), command(regex:...), and command(*)', () => {
      expect(validatePermissionRule('command(git status)').valid).toBe(true);
      expect(validatePermissionRule('command(regex:^npm\\s+test)').valid).toBe(true);
      expect(validatePermissionRule('command(*)').valid).toBe(true);
      expect(validatePermissionRule('git status').valid).toBe(false);
      expect(validatePermissionRule('').valid).toBe(false);
      expect(validatePermissionRule('command(regex:[unclosed)').valid).toBe(false);
    });

    it('matches word/token prefixes rather than arbitrary substrings', () => {
      const rule = validatePermissionRule('command(git status)').parsed!;
      expect(matchesPermissionRule('git status --short', rule)).toBe(true);
      expect(matchesPermissionRule('git status', rule)).toBe(true);
      // Substring that is NOT a token boundary must NOT match
      expect(matchesPermissionRule('git status-all', rule)).toBe(false);
      expect(matchesPermissionRule('mygit status', rule)).toBe(false);
    });

    it('matches regex and wildcard rules', () => {
      const regexRule = validatePermissionRule('command(regex:^bun run test(:\\w+)?$)').parsed!;
      const wildcardRule = validatePermissionRule('command(*)').parsed!;
      expect(matchesPermissionRule('bun run test:unit', regexRule)).toBe(true);
      expect(matchesPermissionRule('rm -rf /', wildcardRule)).toBe(true);
    });
  });

  describe('splitCompoundCommand', () => {
    it('splits &&, ||, ;, and | outside quotes', () => {
      const res = splitCompoundCommand('git add . && git commit -m "a && b" || echo "done" | cat');
      expect(res.hasUnclosedSubstitution).toBe(false);
      expect(res.segments).toEqual([
        'git add .',
        'git commit -m "a && b"',
        'echo "done"',
        'cat',
      ]);
    });

    it('detects command substitutions $(...) and backticks and extracts inner commands', () => {
      const sub1 = splitCompoundCommand('echo $(whoami)');
      expect(sub1.substitutions).toContain('whoami');

      const sub2 = splitCompoundCommand('echo `id -u`');
      expect(sub2.substitutions).toContain('id -u');
    });
  });

  describe('isPathInsideWorkspace', () => {
    it('correctly checks workspace boundary on POSIX and Windows paths', () => {
      expect(isPathInsideWorkspace('/repo/project/src/index.ts', '/repo/project')).toBe(true);
      expect(isPathInsideWorkspace('/repo/project-other/index.ts', '/repo/project')).toBe(false);
      expect(isPathInsideWorkspace('C:\\Users\\dev\\repo\\src\\a.ts', 'C:\\Users\\dev\\repo')).toBe(true);
      expect(isPathInsideWorkspace('C:\\Users\\dev\\other\\a.ts', 'C:\\Users\\dev\\repo')).toBe(false);
      expect(isPathInsideWorkspace('../../etc/passwd', '/repo/project')).toBe(false);
    });
  });

  describe('evaluatePermissionPolicy precedence & compound commands', () => {
    const basePolicy: PermissionPolicyConfig = {
      preset: 'default',
      autoExecutionMode: 'request_review',
      allowRules: ['command(git status)', 'command(bun test)'],
      askRules: ['command(git push)'],
      denyRules: ['command(rm -rf /)'],
      workspaceOnlyFileAccess: true,
      sandboxEnabled: true,
      workspaceRoot: '/workspace',
    };

    it('enforces precedence: deny > ask > allow > default policy', () => {
      const policyWithOverlap: PermissionPolicyConfig = {
        ...basePolicy,
        allowRules: ['command(git)', 'command(rm -rf /)'],
        askRules: ['command(git push)', 'command(rm -rf /)'],
        denyRules: ['command(rm -rf /)'],
      };

      // Deny beats Ask and Allow
      const denyRes = evaluatePermissionPolicy(
        { command: 'rm -rf /', cwd: '/workspace', bypassSandbox: false },
        policyWithOverlap,
      );
      expect(denyRes.outcome).toBe('deny');
      expect(denyRes.reason).toBe('rule_matched');

      // Ask beats Allow
      const askRes = evaluatePermissionPolicy(
        { command: 'git push origin main', cwd: '/workspace', bypassSandbox: false },
        policyWithOverlap,
      );
      expect(askRes.outcome).toBe('ask');
      expect(askRes.reason).toBe('rule_matched');

      // Allow passes when not in Deny or Ask
      const allowRes = evaluatePermissionPolicy(
        { command: 'git status', cwd: '/workspace', bypassSandbox: false },
        policyWithOverlap,
      );
      expect(allowRes.outcome).toBe('allow');
    });

    it('requires EVERY segment of a compound command to pass', () => {
      // Both segments allowed -> allow
      const bothAllowed = evaluatePermissionPolicy(
        { command: 'git status && bun test', cwd: '/workspace', bypassSandbox: false },
        basePolicy,
      );
      expect(bothAllowed.outcome).toBe('allow');

      // Second segment unconfigured -> falls back to ask
      const oneUnknown = evaluatePermissionPolicy(
        { command: 'git status && curl https://example.com', cwd: '/workspace', bypassSandbox: false },
        basePolicy,
      );
      expect(oneUnknown.outcome).toBe('ask');

      // Any segment denied -> whole compound command denied
      const oneDenied = evaluatePermissionPolicy(
        { command: 'git status && rm -rf /', cwd: '/workspace', bypassSandbox: false },
        basePolicy,
      );
      expect(oneDenied.outcome).toBe('deny');
    });

    it('requires review when command has nested substitution not explicitly covered', () => {
      const subRes = evaluatePermissionPolicy(
        { command: 'git status $(curl https://evil.example)', cwd: '/workspace', bypassSandbox: false },
        basePolicy,
      );
      expect(subRes.outcome).toBe('ask');
      expect(subRes.reason).toBe('nested_substitution');
    });

    it('enforces workspace scoping and sandbox requirements', () => {
      // Outside workspace -> ask
      const outsideWs = evaluatePermissionPolicy(
        { command: 'git status', cwd: '/outside/folder', bypassSandbox: false },
        basePolicy,
      );
      expect(outsideWs.outcome).toBe('ask');
      expect(outsideWs.reason).toBe('outside_workspace');

      // Unsandboxed when sandboxEnabled is true -> ask
      const unsandboxed = evaluatePermissionPolicy(
        { command: 'git status', cwd: '/workspace', bypassSandbox: true },
        basePolicy,
      );
      expect(unsandboxed.outcome).toBe('ask');
      expect(unsandboxed.reason).toBe('outside_sandbox');
    });

    it('supports Request Review preset where unconfigured commands ask', () => {
      const reviewPolicy: PermissionPolicyConfig = {
        ...basePolicy,
        allowRules: [],
        preset: 'request_review',
      };
      const res = evaluatePermissionPolicy(
        { command: 'git status', cwd: '/workspace', bypassSandbox: false },
        reviewPolicy,
      );
      expect(res.outcome).toBe('ask');
      expect(res.reason).toBe('default_policy');
    });

    it('derives subagent policy that never grants broader permissions than parent', () => {
      const parent: PermissionPolicyConfig = {
        ...basePolicy,
        allowRules: ['command(git status)'],
      };
      const child = deriveSubagentPermissionPolicy(parent, {
        allowRules: ['command(git status)', 'command(curl)'],
        denyRules: ['command(wget)'],
      });
      // 'command(curl)' is not allowed in parent, so child cannot add it
      expect(child.allowRules).toEqual(['command(git status)']);
      // Deny rules are unioned
      expect(child.denyRules).toContain('command(rm -rf /)');
      expect(child.denyRules).toContain('command(wget)');
    });

    it('builds token-based Always Allow rule from a command', () => {
      expect(tokenizeCommandWords('bun run type-check --watch')).toEqual([
        'bun',
        'run',
        'type-check',
        '--watch',
      ]);
      expect(buildAlwaysAllowRuleForCommand('bun run type-check')).toBe('command(bun run)');
      expect(buildAlwaysAllowRuleForCommand('ls')).toBe('command(ls)');
    });
  });
});
