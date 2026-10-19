export type PermissionOutcome = 'allow' | 'ask' | 'deny';

export type PermissionPreset = 'default' | 'request_review';

export type TerminalAutoExecutionMode = 'request_review' | 'always_proceed';

export type ApprovalReason =
  | 'rule_matched'
  | 'outside_sandbox'
  | 'outside_workspace'
  | 'default_policy'
  | 'nested_substitution';

export interface ParsedPermissionRule {
  raw: string;
  kind: 'wildcard' | 'prefix' | 'regex';
  pattern: string;
  tokens?: string[];
  regex?: RegExp;
}

export interface PermissionRuleValidationResult {
  valid: boolean;
  errorKey?:
    | 'tray.permissions.error.empty'
    | 'tray.permissions.error.format'
    | 'tray.permissions.error.emptyPattern'
    | 'tray.permissions.error.invalidRegex';
  parsed?: ParsedPermissionRule;
}

export interface PermissionPolicyConfig {
  preset: PermissionPreset;
  autoExecutionMode: TerminalAutoExecutionMode;
  allowRules: string[];
  askRules: string[];
  denyRules: string[];
  workspaceOnlyFileAccess: boolean;
  sandboxEnabled: boolean;
  workspaceRoot?: string | null;
}

export interface PermissionEvaluationInput {
  command?: string;
  cwd?: string | null;
  targetPaths?: string[];
  bypassSandbox?: boolean;
}

export interface PermissionEvaluationResult {
  outcome: PermissionOutcome;
  reason: ApprovalReason;
  matchedRule?: string;
  segments: string[];
}

const RULE_WRAPPER_REGEX = /^command\(([\s\S]*)\)$/;

const DEFAULT_SAFE_COMMAND_PREFIXES: readonly string[] = [
  'command(ls)',
  'command(pwd)',
  'command(echo)',
  'command(cat)',
  'command(head)',
  'command(tail)',
  'command(wc)',
  'command(which)',
  'command(where)',
  'command(git status)',
  'command(git diff)',
  'command(git log)',
  'command(git branch)',
  'command(git show)',
  'command(bun test)',
  'command(bun run type-check)',
  'command(npm test)',
  'command(pnpm test)',
  'command(vitest)',
  'command(tsc --noEmit)',
];

/**
 * Tokenizes a command string into words/tokens while respecting single and double quotes.
 */
export function tokenizeCommandWords(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: "'" | '"' | null = null;
  let escaped = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\' && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Validates and parses a permission rule string:
 * - command(*)
 * - command(regex:pattern)
 * - command(prefix words)
 */
export function validatePermissionRule(rawRule: string): PermissionRuleValidationResult {
  const trimmed = rawRule.trim();
  if (!trimmed) {
    return { valid: false, errorKey: 'tray.permissions.error.empty' };
  }

  const match = RULE_WRAPPER_REGEX.exec(trimmed);
  if (!match) {
    return { valid: false, errorKey: 'tray.permissions.error.format' };
  }

  const inner = match[1].trim();
  if (!inner) {
    return { valid: false, errorKey: 'tray.permissions.error.emptyPattern' };
  }

  if (inner === '*') {
    return {
      valid: true,
      parsed: {
        raw: trimmed,
        kind: 'wildcard',
        pattern: '*',
      },
    };
  }

  if (inner.startsWith('regex:')) {
    const regexBody = inner.slice('regex:'.length).trim();
    if (!regexBody) {
      return { valid: false, errorKey: 'tray.permissions.error.emptyPattern' };
    }
    try {
      const regex = new RegExp(regexBody);
      return {
        valid: true,
        parsed: {
          raw: trimmed,
          kind: 'regex',
          pattern: regexBody,
          regex,
        },
      };
    } catch {
      return { valid: false, errorKey: 'tray.permissions.error.invalidRegex' };
    }
  }

  const tokens = tokenizeCommandWords(inner);
  if (tokens.length === 0) {
    return { valid: false, errorKey: 'tray.permissions.error.emptyPattern' };
  }

  return {
    valid: true,
    parsed: {
      raw: trimmed,
      kind: 'prefix',
      pattern: inner,
      tokens,
    },
  };
}

/**
 * Matches a single command segment against a parsed rule.
 * Prefix matching is strictly token/word-based, never raw substring.
 */
export function matchesPermissionRule(commandSegment: string, rule: ParsedPermissionRule): boolean {
  const normalizedSegment = commandSegment.trim();
  if (!normalizedSegment) return false;

  if (rule.kind === 'wildcard') {
    return true;
  }

  if (rule.kind === 'regex') {
    return rule.regex ? rule.regex.test(normalizedSegment) : false;
  }

  const segmentTokens = tokenizeCommandWords(normalizedSegment);
  const ruleTokens = rule.tokens ?? [];
  if (ruleTokens.length === 0 || segmentTokens.length < ruleTokens.length) {
    return false;
  }

  for (let i = 0; i < ruleTokens.length; i += 1) {
    if (segmentTokens[i] !== ruleTokens[i]) {
      return false;
    }
  }

  return true;
}

export interface SplitCommandResult {
  segments: string[];
  substitutions: string[];
  hasUnclosedSubstitution: boolean;
}

/**
 * Splits a shell command on top-level compound operators (&&, ||, ;, |, \n)
 * and extracts nested command substitutions $(...) and `...`.
 */
export function splitCompoundCommand(command: string): SplitCommandResult {
  const segments: string[] = [];
  const substitutions: string[] = [];
  let hasUnclosedSubstitution = false;

  let current = '';
  let quote: "'" | '"' | null = null;
  let escaped = false;
  let parenDepth = 0;

  for (let i = 0; i < command.length; i += 1) {
    const ch = command[i];
    const next = command[i + 1];

    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }

    if (ch === '\\' && quote !== "'") {
      current += ch;
      escaped = true;
      continue;
    }

    if (quote === "'") {
      current += ch;
      if (ch === "'") quote = null;
      continue;
    }

    // Detect $(...) substitution outside single quotes
    if (ch === '$' && next === '(') {
      let depth = 1;
      let j = i + 2;
      let subQuote: "'" | '"' | null = null;
      let subEscaped = false;
      while (j < command.length && depth > 0) {
        const c = command[j];
        if (subEscaped) {
          subEscaped = false;
        } else if (c === '\\' && subQuote !== "'") {
          subEscaped = true;
        } else if (subQuote) {
          if (c === subQuote) subQuote = null;
        } else if (c === "'" || c === '"') {
          subQuote = c;
        } else if (c === '(') {
          depth += 1;
        } else if (c === ')') {
          depth -= 1;
        }
        j += 1;
      }

      if (depth !== 0) {
        hasUnclosedSubstitution = true;
        current += ch;
        continue;
      }

      const innerSub = command.slice(i + 2, j - 1).trim();
      substitutions.push(innerSub);
      current += command.slice(i, j);
      i = j - 1;
      continue;
    }

    // Detect backtick `...` substitution outside single quotes
    if (ch === '`') {
      let j = i + 1;
      let subEscaped = false;
      while (j < command.length) {
        const c = command[j];
        if (subEscaped) {
          subEscaped = false;
        } else if (c === '\\') {
          subEscaped = true;
        } else if (c === '`') {
          break;
        }
        j += 1;
      }

      if (j >= command.length || command[j] !== '`') {
        hasUnclosedSubstitution = true;
        current += ch;
        continue;
      }

      const innerSub = command.slice(i + 1, j).trim();
      substitutions.push(innerSub);
      current += command.slice(i, j + 1);
      i = j;
      continue;
    }

    if (quote === '"') {
      current += ch;
      if (ch === '"') quote = null;
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }

    if (ch === '(') {
      parenDepth += 1;
      current += ch;
      continue;
    }
    if (ch === ')' && parenDepth > 0) {
      parenDepth -= 1;
      current += ch;
      continue;
    }

    if (parenDepth === 0) {
      if ((ch === '&' && next === '&') || (ch === '|' && next === '|')) {
        if (current.trim()) segments.push(current.trim());
        current = '';
        i += 1;
        continue;
      }
      if (ch === ';' || ch === '|' || ch === '\n') {
        if (current.trim()) segments.push(current.trim());
        current = '';
        continue;
      }
    }

    current += ch;
  }

  if (current.trim()) {
    segments.push(current.trim());
  }

  return {
    segments,
    substitutions,
    hasUnclosedSubstitution,
  };
}

function normalizePathForScope(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+$/g, '').toLowerCase();
}

/**
 * Checks whether a target path is inside the given workspace root.
 */
export function isPathInsideWorkspace(targetPath: string, workspaceRoot: string): boolean {
  const normTarget = normalizePathForScope(targetPath.trim());
  const normRoot = normalizePathForScope(workspaceRoot.trim());
  if (!normRoot) return true;
  if (!normTarget) return true;

  // Relative paths without parent traversal stay inside workspace
  const isAbsolute = /^([a-z]:\/|\/)/i.test(normTarget);
  if (!isAbsolute) {
    const parts = normTarget.split('/');
    let depth = 0;
    for (const part of parts) {
      if (part === '..') {
        depth -= 1;
        if (depth < 0) return false;
      } else if (part !== '.' && part !== '') {
        depth += 1;
      }
    }
    return true;
  }

  return normTarget === normRoot || normTarget.startsWith(`${normRoot}/`);
}

function parseRuleList(rules: readonly string[]): ParsedPermissionRule[] {
  const result: ParsedPermissionRule[] = [];
  for (const raw of rules) {
    const v = validatePermissionRule(raw);
    if (v.valid && v.parsed) {
      result.push(v.parsed);
    }
  }
  return result;
}

function evaluateSingleSegment(
  segment: string,
  denyRules: readonly ParsedPermissionRule[],
  askRules: readonly ParsedPermissionRule[],
  allowRules: readonly ParsedPermissionRule[],
  policy: PermissionPolicyConfig,
): { outcome: PermissionOutcome; reason: ApprovalReason; matchedRule?: string } {
  // Precedence: deny > ask > allow > default policy
  for (const rule of denyRules) {
    if (matchesPermissionRule(segment, rule)) {
      return { outcome: 'deny', reason: 'rule_matched', matchedRule: rule.raw };
    }
  }

  for (const rule of askRules) {
    if (matchesPermissionRule(segment, rule)) {
      return { outcome: 'ask', reason: 'rule_matched', matchedRule: rule.raw };
    }
  }

  for (const rule of allowRules) {
    if (matchesPermissionRule(segment, rule)) {
      return { outcome: 'allow', reason: 'rule_matched', matchedRule: rule.raw };
    }
  }

  if (policy.autoExecutionMode === 'always_proceed' && policy.preset !== 'request_review') {
    return { outcome: 'allow', reason: 'default_policy' };
  }

  if (policy.preset === 'default') {
    const defaultSafe = parseRuleList(DEFAULT_SAFE_COMMAND_PREFIXES);
    for (const safeRule of defaultSafe) {
      if (matchesPermissionRule(segment, safeRule)) {
        return { outcome: 'allow', reason: 'default_policy', matchedRule: safeRule.raw };
      }
    }
  }

  return { outcome: 'ask', reason: 'default_policy' };
}

/**
 * Evaluates a command and/or file operation against the PermissionPolicyConfig.
 */
export function evaluatePermissionPolicy(
  input: PermissionEvaluationInput,
  policy: PermissionPolicyConfig,
): PermissionEvaluationResult {
  // 1. Check sandbox requirement
  if (policy.sandboxEnabled && input.bypassSandbox) {
    return {
      outcome: 'ask',
      reason: 'outside_sandbox',
      segments: input.command ? [input.command] : [],
    };
  }

  // 2. Check workspace directory scoping
  if (policy.workspaceOnlyFileAccess && policy.workspaceRoot) {
    if (input.cwd && !isPathInsideWorkspace(input.cwd, policy.workspaceRoot)) {
      return {
        outcome: 'ask',
        reason: 'outside_workspace',
        segments: input.command ? [input.command] : [],
      };
    }
    for (const targetPath of input.targetPaths ?? []) {
      if (!isPathInsideWorkspace(targetPath, policy.workspaceRoot)) {
        return {
          outcome: 'ask',
          reason: 'outside_workspace',
          segments: input.command ? [input.command] : [],
        };
      }
    }
  }

  const rawCommand = (input.command ?? '').trim();
  if (!rawCommand) {
    // Non-command action (e.g. file edit within workspace)
    if (policy.preset === 'request_review') {
      return { outcome: 'ask', reason: 'default_policy', segments: [] };
    }
    return { outcome: 'allow', reason: 'default_policy', segments: [] };
  }

  const split = splitCompoundCommand(rawCommand);
  if (split.hasUnclosedSubstitution) {
    return {
      outcome: 'ask',
      reason: 'nested_substitution',
      segments: split.segments.length > 0 ? split.segments : [rawCommand],
    };
  }

  const denyRules = parseRuleList(policy.denyRules);
  const askRules = parseRuleList(policy.askRules);
  const allowRules = parseRuleList(policy.allowRules);

  // Evaluate nested substitutions first: every nested substitution must be explicitly allowed
  if (split.substitutions.length > 0) {
    for (const sub of split.substitutions) {
      if (!sub) {
        return {
          outcome: 'ask',
          reason: 'nested_substitution',
          segments: split.segments,
        };
      }
      const subEval = evaluatePermissionPolicy(
        { ...input, command: sub },
        policy,
      );
      if (subEval.outcome === 'deny') {
        return {
          outcome: 'deny',
          reason: subEval.reason,
          matchedRule: subEval.matchedRule,
          segments: split.segments,
        };
      }
      if (subEval.outcome !== 'allow') {
        return {
          outcome: 'ask',
          reason: 'nested_substitution',
          matchedRule: subEval.matchedRule,
          segments: split.segments,
        };
      }
    }
  }

  const segments = split.segments.length > 0 ? split.segments : [rawCommand];
  let finalOutcome: PermissionOutcome = 'allow';
  let finalReason: ApprovalReason = 'default_policy';
  let finalMatchedRule: string | undefined;

  for (const segment of segments) {
    const res = evaluateSingleSegment(segment, denyRules, askRules, allowRules, policy);
    if (res.outcome === 'deny') {
      return {
        outcome: 'deny',
        reason: res.reason,
        matchedRule: res.matchedRule,
        segments,
      };
    }
    if (res.outcome === 'ask') {
      finalOutcome = 'ask';
      finalReason = res.reason;
      finalMatchedRule = res.matchedRule;
    } else if (finalOutcome === 'allow' && res.matchedRule) {
      finalReason = res.reason;
      finalMatchedRule = res.matchedRule;
    }
  }

  return {
    outcome: finalOutcome,
    reason: finalReason,
    matchedRule: finalMatchedRule,
    segments,
  };
}

/**
 * Derives a `command(prefix)` rule from a command string for "Always allow".
 */
export function buildAlwaysAllowRuleForCommand(command: string): string {
  const split = splitCompoundCommand(command);
  const firstSegment = split.segments[0] ?? command.trim();
  const tokens = tokenizeCommandWords(firstSegment);
  if (tokens.length === 0) {
    return 'command(*)';
  }
  const prefixTokens = tokens.slice(0, Math.min(2, tokens.length));
  return `command(${prefixTokens.join(' ')})`;
}

/**
 * Subagent permission inheritance:
 * Subagents inherit the parent's allowed command prefixes, directory scopes,
 * and sandbox settings. They can never exceed the parent's permissions.
 */
export function deriveSubagentPermissionPolicy(
  parentPolicy: PermissionPolicyConfig,
  childOverrides?: Partial<PermissionPolicyConfig>,
): PermissionPolicyConfig {
  const parentAllowParsed = parseRuleList(parentPolicy.allowRules);

  // A child's allow rule is kept only if it is covered by at least one parent allow rule
  const effectiveAllowRules = childOverrides?.allowRules
    ? childOverrides.allowRules.filter((childRuleRaw) => {
        const v = validatePermissionRule(childRuleRaw);
        if (!v.valid || !v.parsed) return false;
        const childRule = v.parsed;
        return parentAllowParsed.some((parentRule) => {
          if (parentRule.kind === 'wildcard') return true;
          if (parentRule.kind === 'prefix' && childRule.kind === 'prefix') {
            return matchesPermissionRule(childRule.pattern, parentRule);
          }
          return parentRule.raw === childRule.raw;
        });
      })
    : [...parentPolicy.allowRules];

  // Deny and ask rules are unioned so child can never weaken parent restrictions
  const effectiveDenyRules = Array.from(
    new Set([...parentPolicy.denyRules, ...(childOverrides?.denyRules ?? [])]),
  );
  const effectiveAskRules = Array.from(
    new Set([...parentPolicy.askRules, ...(childOverrides?.askRules ?? [])]),
  );

  // Workspace root must remain inside parent's workspace root
  let effectiveWorkspaceRoot = parentPolicy.workspaceRoot ?? null;
  if (
    childOverrides?.workspaceRoot &&
    (!parentPolicy.workspaceRoot ||
      isPathInsideWorkspace(childOverrides.workspaceRoot, parentPolicy.workspaceRoot))
  ) {
    effectiveWorkspaceRoot = childOverrides.workspaceRoot;
  }

  return {
    preset:
      parentPolicy.preset === 'request_review' || childOverrides?.preset === 'request_review'
        ? 'request_review'
        : 'default',
    autoExecutionMode:
      parentPolicy.autoExecutionMode === 'request_review' ||
      childOverrides?.autoExecutionMode === 'request_review'
        ? 'request_review'
        : parentPolicy.autoExecutionMode,
    allowRules: effectiveAllowRules,
    askRules: effectiveAskRules,
    denyRules: effectiveDenyRules,
    workspaceOnlyFileAccess:
      parentPolicy.workspaceOnlyFileAccess || Boolean(childOverrides?.workspaceOnlyFileAccess),
    sandboxEnabled: parentPolicy.sandboxEnabled || Boolean(childOverrides?.sandboxEnabled),
    workspaceRoot: effectiveWorkspaceRoot,
  };
}
