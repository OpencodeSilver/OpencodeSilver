/**
 * Safety Inspector for Command Execution and File Modifications
 * Analyzes shell commands and actions for destructive or risky patterns.
 */

export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

export interface CommandSafetyAnalysis {
  riskLevel: RiskLevel;
  reasons: string[];
  isDestructive: boolean;
  requiresExplicitConfirm: boolean;
  suggestedAction?: string;
}

const CRITICAL_COMMAND_PATTERNS = [
  { pattern: /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|[a-zA-Z]*-fr)\s+[\/\*]/i, reason: 'Recursive force-removal of root or wildcard directories' },
  { pattern: /\bmkfs\b/i, reason: 'Filesystem formatting command' },
  { pattern: /\bdd\s+if=.*of=\/dev\/(sd|nvme|hd)/i, reason: 'Direct disk raw block writing' },
  { pattern: /:(){ :\|:& };:/, reason: 'Fork-bomb command string detected' },
  { pattern: /\bchmod\s+(-R\s+)?777\s+[\/\*]/i, reason: 'Dangerous universal permission escalation on root/wildcard' },
  { pattern: /\b(del|erase)\s+\/[fF]\s+\/[sS]\s+[c-zC-Z]:\\/i, reason: 'Recursive system drive file deletion' },
  { pattern: /\bFormat-Volume\b|\bClear-Disk\b/i, reason: 'PowerShell disk formatting or disk erasure' },
];

const HIGH_RISK_PATTERNS = [
  { pattern: /\brm\s+(-[a-zA-Z]*r|[a-zA-Z]*-f)\b/i, reason: 'Recursive or forced file deletion' },
  { pattern: /\bgit\s+(reset\s+--hard|clean\s+-fdx?)\b/i, reason: 'Unrecoverable git discard and untracked file deletion' },
  { pattern: /\bgit\s+push\s+.*(--force|-f)\b/i, reason: 'Forced remote git push which may overwrite history' },
  { pattern: /\bdrop\s+(database|table)\b/i, reason: 'Database or table drop statement' },
  { pattern: /\b(shutdown|reboot|init\s+0|poweroff)\b/i, reason: 'System shutdown or restart command' },
  { pattern: />\s*(\/etc\/|\/boot\/|C:\\Windows\\)/i, reason: 'Redirection to critical system operating directories' },
  { pattern: /\b(curl|wget)\b.*\|\s*(sh|bash|zsh|powershell|cmd)\b/i, reason: 'Direct remote execution piping into shell' },
];

const MEDIUM_RISK_PATTERNS = [
  { pattern: /(\.env(\.[\w-]+)?|\.npmrc|\.id_rsa|id_ed25519)/i, reason: 'References sensitive secret or private key configuration files' },
  { pattern: /\bnpm\s+publish\b|\bbun\s+publish\b/i, reason: 'Package registry publication action' },
  { pattern: /\bgit\s+checkout\s+--\s+\./i, reason: 'Discards local unstaged working directory changes' },
  { pattern: /\bkill\s+-9\b|\bStop-Process\s+-Force\b/i, reason: 'Immediate ungraceful process kill' },
];

/**
 * Analyzes a raw terminal/shell command string for security and operational risks.
 */
export function analyzeCommandSafety(command: string): CommandSafetyAnalysis {
  if (!command || !command.trim()) {
    return {
      riskLevel: 'safe',
      reasons: [],
      isDestructive: false,
      requiresExplicitConfirm: false,
    };
  }

  const trimmed = command.trim();
  const reasons: string[] = [];

  // 1. Check Critical
  for (const { pattern, reason } of CRITICAL_COMMAND_PATTERNS) {
    if (pattern.test(trimmed)) {
      reasons.push(reason);
    }
  }
  if (reasons.length > 0) {
    return {
      riskLevel: 'critical',
      reasons,
      isDestructive: true,
      requiresExplicitConfirm: true,
      suggestedAction: 'Execution strongly blocked without explicit administrative override.',
    };
  }

  // 2. Check High Risk
  for (const { pattern, reason } of HIGH_RISK_PATTERNS) {
    if (pattern.test(trimmed)) {
      reasons.push(reason);
    }
  }
  if (reasons.length > 0) {
    return {
      riskLevel: 'high',
      reasons,
      isDestructive: true,
      requiresExplicitConfirm: true,
      suggestedAction: 'Review target parameters and backup modified files before executing.',
    };
  }

  // 3. Check Medium Risk
  for (const { pattern, reason } of MEDIUM_RISK_PATTERNS) {
    if (pattern.test(trimmed)) {
      reasons.push(reason);
    }
  }
  if (reasons.length > 0) {
    return {
      riskLevel: 'medium',
      reasons,
      isDestructive: false,
      requiresExplicitConfirm: false,
      suggestedAction: 'Verify file permissions and ensure secrets are not exposed.',
    };
  }

  // 4. Low risk checks
  if (/\b(install|add|update)\b/i.test(trimmed)) {
    return {
      riskLevel: 'low',
      reasons: ['Modifies dependencies or package environment'],
      isDestructive: false,
      requiresExplicitConfirm: false,
    };
  }

  return {
    riskLevel: 'safe',
    reasons: [],
    isDestructive: false,
    requiresExplicitConfirm: false,
  };
}
