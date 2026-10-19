export interface SecretDetectionResult {
  hasSecrets: boolean;
  detectedTypes: string[];
  redactedText: string;
}

const SECRET_PATTERNS: Array<{ type: string; pattern: RegExp }> = [
  { type: 'GitHub Personal Access Token', pattern: /\b(ghp_[a-zA-Z0-9]{36,40}|github_pat_[a-zA-Z0-9_]{82})\b/g },
  { type: 'OpenAI API Key', pattern: /\b(sk-[a-zA-Z0-9]{48}|sk-proj-[a-zA-Z0-9_\-]{80,160})\b/g },
  { type: 'Anthropic API Key', pattern: /\b(sk-ant-[a-zA-Z0-9_\-]{60,120})\b/g },
  { type: 'Google AI / Gemini API Key', pattern: /\b(AIzaSy[a-zA-Z0-9_-]{33})\b/g },
  { type: 'AWS Access Key', pattern: /\b(AKIA[0-9A-Z]{16})\b/g },
  { type: 'Generic Private Key', pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { type: 'Slack Token', pattern: /\b(xox[baprs]-[0-9a-zA-Z]{10,48})\b/g },
];

/**
 * Scans text content for inadvertently leaked API keys or credentials.
 */
export function scanTextForSecrets(input: string): SecretDetectionResult {
  if (!input || typeof input !== 'string') {
    return { hasSecrets: false, detectedTypes: [], redactedText: '' };
  }

  const detectedTypes = new Set<string>();
  let redactedText = input;

  for (const { type, pattern } of SECRET_PATTERNS) {
    // Reset pattern state
    pattern.lastIndex = 0;
    if (pattern.test(input)) {
      detectedTypes.add(type);
      pattern.lastIndex = 0;
      redactedText = redactedText.replace(pattern, (match) => {
        if (match.length <= 8) return '[REDACTED_SECRET]';
        return `${match.slice(0, 4)}...[REDACTED_SECRET]...${match.slice(-4)}`;
      });
    }
  }

  return {
    hasSecrets: detectedTypes.size > 0,
    detectedTypes: Array.from(detectedTypes),
    redactedText,
  };
}
