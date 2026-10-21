import { describe, expect, it } from 'bun:test';
import { SilverCodeInspector, type DiffInspectionHunk } from '../inspector/reviewer';

describe('SilverCodeInspector Security & Blast Radius Tests', () => {
  const inspector = new SilverCodeInspector();

  describe('Secret Pattern Detection (All 15 Patterns)', () => {
    it('detects GitHub Personal Access Token (PAT)', () => {
      const hunk: DiffInspectionHunk = {
        filePath: 'src/config.ts',
        linesAdded: 1,
        linesDeleted: 0,
        hunkContent: '+const token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";',
      };
      const report = inspector.inspectDiffs([hunk]);
      expect(report.securityVulnerabilities.some((v) => v.message.includes('GitHub Personal Access Token'))).toBe(true);
    });

    it('detects GitHub Fine-grained Token', () => {
      const hunk: DiffInspectionHunk = {
        filePath: 'src/config.ts',
        linesAdded: 1,
        linesDeleted: 0,
        hunkContent: '+const pat = "github_pat_11A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3G4H5I6J7K8L9";',
      };
      const report = inspector.inspectDiffs([hunk]);
      expect(report.securityVulnerabilities.some((v) => v.message.includes('GitHub Fine-grained Token'))).toBe(true);
    });

    it('detects AWS Access Key ID', () => {
      const hunk: DiffInspectionHunk = {
        filePath: 'src/aws.ts',
        linesAdded: 1,
        linesDeleted: 0,
        hunkContent: '+const keyId = "AKIAIOSFODNN7EXAMPLE";',
      };
      const report = inspector.inspectDiffs([hunk]);
      expect(report.securityVulnerabilities.some((v) => v.message.includes('AWS Access Key ID'))).toBe(true);
    });

    it('detects AWS Secret Access Key', () => {
      const hunk: DiffInspectionHunk = {
        filePath: 'src/aws.ts',
        linesAdded: 1,
        linesDeleted: 0,
        hunkContent: '+aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"',
      };
      const report = inspector.inspectDiffs([hunk]);
      expect(report.securityVulnerabilities.some((v) => v.message.includes('AWS Secret Access Key'))).toBe(true);
    });

    it('detects Anthropic API Key', () => {
      const hunk: DiffInspectionHunk = {
        filePath: 'src/anthropic.ts',
        linesAdded: 1,
        linesDeleted: 0,
        hunkContent: '+const key = "sk-ant-api03-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";',
      };
      const report = inspector.inspectDiffs([hunk]);
      expect(report.securityVulnerabilities.some((v) => v.message.includes('Anthropic API Key'))).toBe(true);
    });

    it('detects OpenRouter API Key', () => {
      const hunk: DiffInspectionHunk = {
        filePath: 'src/openrouter.ts',
        linesAdded: 1,
        linesDeleted: 0,
        hunkContent: '+const key = "' + 'sk-or-v1-' + 'a'.repeat(64) + '";',
      };
      const report = inspector.inspectDiffs([hunk]);
      expect(report.securityVulnerabilities.some((v) => v.message.includes('OpenRouter API Key'))).toBe(true);
    });

    it('detects OpenAI Project/Service API Key', () => {
      const hunk: DiffInspectionHunk = {
        filePath: 'src/openai.ts',
        linesAdded: 1,
        linesDeleted: 0,
        hunkContent: '+const key = "sk-proj-0123456789abcdef0123456789abcdef0123456789abcdef";',
      };
      const report = inspector.inspectDiffs([hunk]);
      expect(report.securityVulnerabilities.some((v) => v.message.includes('OpenAI API Key'))).toBe(true);
    });

    it('detects OpenAI Legacy API Key', () => {
      const hunk: DiffInspectionHunk = {
        filePath: 'src/openai.ts',
        linesAdded: 1,
        linesDeleted: 0,
        hunkContent: '+const key = "sk-abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJ12";',
      };
      const report = inspector.inspectDiffs([hunk]);
      expect(report.securityVulnerabilities.some((v) => v.message.includes('OpenAI API Key'))).toBe(true);
    });

    it('detects Google Gemini API Key', () => {
      const hunk: DiffInspectionHunk = {
        filePath: 'src/gemini.ts',
        linesAdded: 1,
        linesDeleted: 0,
        hunkContent: '+const key = "AIzaSyD-1234567890abcdefghijklmnopqrstuv";',
      };
      const report = inspector.inspectDiffs([hunk]);
      expect(report.securityVulnerabilities.some((v) => v.message.includes('Google Gemini API Key'))).toBe(true);
    });

    it('detects JSON Web Token (JWT)', () => {
      const hunk: DiffInspectionHunk = {
        filePath: 'src/auth.ts',
        linesAdded: 1,
        linesDeleted: 0,
        hunkContent: '+const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";',
      };
      const report = inspector.inspectDiffs([hunk]);
      expect(report.securityVulnerabilities.some((v) => v.message.includes('JSON Web Token'))).toBe(true);
    });

    it('detects xAI API Key', () => {
      const hunk: DiffInspectionHunk = {
        filePath: 'src/xai.ts',
        linesAdded: 1,
        linesDeleted: 0,
        hunkContent: '+const xaiKey = "xai-123456789012345678901234567890123456789012345678901234567890123456789012";',
      };
      const report = inspector.inspectDiffs([hunk]);
      expect(report.securityVulnerabilities.some((v) => v.message.includes('xAI API Key'))).toBe(true);
    });

    it('detects Groq API Key', () => {
      const hunk: DiffInspectionHunk = {
        filePath: 'src/groq.ts',
        linesAdded: 1,
        linesDeleted: 0,
        hunkContent: '+const gkey = "gsk_1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOP";',
      };
      const report = inspector.inspectDiffs([hunk]);
      expect(report.securityVulnerabilities.some((v) => v.message.includes('Groq API Key'))).toBe(true);
    });

    it('detects Hugging Face Token', () => {
      const hunk: DiffInspectionHunk = {
        filePath: 'src/hf.ts',
        linesAdded: 1,
        linesDeleted: 0,
        hunkContent: '+const hfKey = "hf_abcdefghijklmnopqrstuvwxyz01234567";',
      };
      const report = inspector.inspectDiffs([hunk]);
      expect(report.securityVulnerabilities.some((v) => v.message.includes('Hugging Face Token'))).toBe(true);
    });

    it('detects Private Cryptographic Key headers', () => {
      const hunk: DiffInspectionHunk = {
        filePath: 'src/certs.ts',
        linesAdded: 1,
        linesDeleted: 0,
        hunkContent: '+const key = "-----BEGIN RSA PRIVATE KEY-----";',
      };
      const report = inspector.inspectDiffs([hunk]);
      expect(report.securityVulnerabilities.some((v) => v.message.includes('Private Cryptographic Key'))).toBe(true);
    });

    it('detects generic hardcoded password / secret key assignment', () => {
      const hunk: DiffInspectionHunk = {
        filePath: 'src/db.ts',
        linesAdded: 1,
        linesDeleted: 0,
        hunkContent: '+const client_secret = "UltraSecretPassword987!";',
      };
      const report = inspector.inspectDiffs([hunk]);
      expect(report.securityVulnerabilities.some((v) => v.message.includes('Hardcoded Secret or Password'))).toBe(true);
    });
  });

  describe('Sensitive Files Detection', () => {
    it('detects .env files being added to diff', () => {
      const hunk: DiffInspectionHunk = {
        filePath: '.env.production',
        linesAdded: 5,
        linesDeleted: 0,
        hunkContent: '+DB_PASS=123456',
      };
      const report = inspector.inspectDiffs([hunk]);
      expect(report.securityVulnerabilities.some((v) => v.message.includes('Environment Secret File'))).toBe(true);
      expect(report.approvalRecommended).toBe(false);
    });
  });

  describe('Blast Radius Calculation', () => {
    it('calculates isolated blast radius for small changes', () => {
      const hunk: DiffInspectionHunk = {
        filePath: 'src/utils.ts',
        linesAdded: 10,
        linesDeleted: 2,
        hunkContent: '+function foo() {}',
      };
      const report = inspector.inspectDiffs([hunk]);
      expect(report.blastRadius).toBe('isolated');
      expect(report.approvalRecommended).toBe(true);
    });

    it('calculates broad or critical blast radius for large diffs across many files', () => {
      const hunks: DiffInspectionHunk[] = Array.from({ length: 25 }, (_, i) => ({
        filePath: `src/module_${i}.ts`,
        linesAdded: 100,
        linesDeleted: 50,
        hunkContent: '+code',
      }));
      const report = inspector.inspectDiffs(hunks);
      expect(['broad', 'critical']).toContain(report.blastRadius);
    });
  });
});
