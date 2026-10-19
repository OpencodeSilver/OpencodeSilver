/**
 * OpencodeSilver Code Inspector & Security Auditor
 * Engineered and Architected by Ahmed (GEMTM)
 *
 * Performs deep semantic inspection of staged diffs, calculates blast radius,
 * checks for security antipatterns (secrets, injections), and produces
 * human-readable walkthrough guides.
 */

export interface DiffInspectionHunk {
  filePath: string;
  linesAdded: number;
  linesDeleted: number;
  hunkContent: string;
}

export interface SecurityVulnerability {
  ruleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  filePath: string;
  lineNumber?: number;
  message: string;
  remediation: string;
}

export interface InspectionReport {
  inspectionId: string;
  timestamp: number;
  totalFilesModified: number;
  totalLinesAdded: number;
  totalLinesDeleted: number;
  blastRadius: 'isolated' | 'moderate' | 'broad' | 'critical';
  securityVulnerabilities: SecurityVulnerability[];
  architecturalSummary: string;
  approvalRecommended: boolean;
}

export class SilverCodeInspector {
  // Credential formats of the providers OpencodeSilver connects to. A key that
  // matches both the current and the legacy rule of one provider is reported once.
  private readonly secretPatterns = [
    { pattern: /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36}/, name: 'GitHub Personal Access Token', severity: 'critical' as const },
    { pattern: /github_pat_[A-Za-z0-9_]{60,}/, name: 'GitHub Fine-grained Token', severity: 'critical' as const },
    { pattern: /sk-ant-(?:api|admin)\d{2}-[A-Za-z0-9_-]{80,}/, name: 'Anthropic API Key', severity: 'critical' as const },
    { pattern: /sk-or-v1-[a-f0-9]{64}/, name: 'OpenRouter API Key', severity: 'critical' as const },
    { pattern: /sk-(?:proj|svcacct|admin)-[A-Za-z0-9_-]{40,}/, name: 'OpenAI API Key', severity: 'critical' as const },
    { pattern: /\bsk-[A-Za-z0-9]{48}\b/, name: 'OpenAI API Key (legacy)', severity: 'critical' as const },
    { pattern: /AIza[0-9A-Za-z_-]{35}/, name: 'Google Gemini API Key', severity: 'critical' as const },
    { pattern: /\bxai-[A-Za-z0-9]{70,}/, name: 'xAI API Key', severity: 'critical' as const },
    { pattern: /\bgsk_[A-Za-z0-9]{52}\b/, name: 'Groq API Key', severity: 'critical' as const },
    { pattern: /\bhf_[A-Za-z0-9]{34,}\b/, name: 'Hugging Face Token', severity: 'high' as const },
    { pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, name: 'Private Cryptographic Key', severity: 'critical' as const },
  ];

  /**
   * Inspects a collection of diff hunks and produces a comprehensive security and architecture report.
   */
  public inspectDiffs(hunks: DiffInspectionHunk[]): InspectionReport {
    let totalLinesAdded = 0;
    let totalLinesDeleted = 0;
    const vulnerabilities: SecurityVulnerability[] = [];

    for (const hunk of hunks) {
      totalLinesAdded += hunk.linesAdded;
      totalLinesDeleted += hunk.linesDeleted;

      // Security check: Scan for credential leaks
      const reported = new Set<string>();
      for (const rule of this.secretPatterns) {
        const family = rule.name.replace(/ \(legacy\)$/, '');
        if (!reported.has(family) && rule.pattern.test(hunk.hunkContent)) {
          reported.add(family);
          vulnerabilities.push({
            ruleId: 'SEC-CREDENTIAL-LEAK',
            severity: rule.severity,
            filePath: hunk.filePath,
            message: `Detected potential ${rule.name} embedded in diff.`,
            remediation: 'Move secret into environment variable or secret manager before committing.',
          });
        }
      }

      // Security check: eval or dangerous execution
      if (hunk.hunkContent.includes('eval(') || hunk.hunkContent.includes('execSync(')) {
        vulnerabilities.push({
          ruleId: 'SEC-DANGEROUS-EVAL',
          severity: 'medium',
          filePath: hunk.filePath,
          message: 'Potential code execution vulnerability via eval or execSync.',
          remediation: 'Use structured child_process.spawn with argument arrays instead of shell execution.',
        });
      }
    }

    const totalModified = hunks.length;
    let blastRadius: InspectionReport['blastRadius'] = 'isolated';

    if (totalModified > 20 || totalLinesAdded + totalLinesDeleted > 1000) {
      blastRadius = 'critical';
    } else if (totalModified > 8 || totalLinesAdded + totalLinesDeleted > 300) {
      blastRadius = 'broad';
    } else if (totalModified > 2 || totalLinesAdded + totalLinesDeleted > 80) {
      blastRadius = 'moderate';
    }

    const hasCritical = vulnerabilities.some((v) => v.severity === 'critical');
    const approvalRecommended = !hasCritical && blastRadius !== 'critical';

    const architecturalSummary = `Silver Inspector reviewed ${totalModified} files (+${totalLinesAdded} / -${totalLinesDeleted}). Blast radius: ${blastRadius.toUpperCase()}. Found ${vulnerabilities.length} potential security concerns.`;

    return {
      inspectionId: `insp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      totalFilesModified: totalModified,
      totalLinesAdded,
      totalLinesDeleted,
      blastRadius,
      securityVulnerabilities: vulnerabilities,
      architecturalSummary,
      approvalRecommended,
    };
  }
}
