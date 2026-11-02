#!/usr/bin/env node

/**
 * OpencodeSilver VS Code Extension Pre-Package Secret Scanner
 * Ensures no API keys, credentials, or sensitive files are bundled into the .vsix
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SECRET_PATTERNS = [
  { name: 'GitHub PAT', regex: /ghp_[a-zA-Z0-9]{36}/ },
  { name: 'GitHub Fine-grained PAT', regex: /github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/ },
  { name: 'AWS Access Key ID', regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/ },
  { name: 'AWS Secret Access Key', regex: /(?:aws_secret_access_key|aws_secret_key)\s*[:=]\s*["']?([A-Za-z0-9/+=]{40})["']?/i },
  { name: 'Anthropic API Key', regex: /sk-ant-api03-[a-zA-Z0-9_\-]{80,120}/ },
  { name: 'OpenAI API Key', regex: /sk-(?:proj-|svcacct-)?[a-zA-Z0-9_\-]{40,100}/ },
  { name: 'OpenRouter API Key', regex: /sk-or-v1-[a-f0-9]{64}/ },
  { name: 'Google Gemini API Key', regex: /AIzaSy[a-zA-Z0-9_\-]{33}/ },
  { name: 'Private Key Header', regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { name: 'Generic Secret Assignment', regex: /(?:api[_-]?key|secret[_-]?key|auth[_-]?token)\s*[:=]\s*["'][a-zA-Z0-9_\-]{20,}["']/i },
];

export function scanContentForSecrets(content, filePath = 'unknown') {
  const issues = [];
  for (const { name, regex } of SECRET_PATTERNS) {
    if (regex.test(content)) {
      issues.push(`Detected potential ${name} in ${filePath}`);
    }
  }
  return issues;
}

export function runPrePackageScan(extensionDir = process.cwd()) {
  const candidateFiles = [
    path.join(extensionDir, 'package.json'),
    path.join(extensionDir, 'dist', 'extension.js'),
  ];

  const errors = [];

  for (const file of candidateFiles) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    const detected = scanContentForSecrets(content, path.relative(extensionDir, file));
    if (detected.length > 0) {
      errors.push(...detected);
    }
  }

  // Also check for forbidden sensitive files
  const forbiddenFiles = ['.env', '.env.local', 'id_rsa', 'id_ed25519', 'credentials.json'];
  for (const forbidden of forbiddenFiles) {
    if (fs.existsSync(path.join(extensionDir, forbidden))) {
      errors.push(`Forbidden sensitive file found in package root: ${forbidden}`);
    }
  }

  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const errors = runPrePackageScan();
  if (errors.length > 0) {
    console.error('❌ VS Code extension pre-package secret scan FAILED:');
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }
  console.log('✅ VS Code extension pre-package secret scan passed. No secrets detected.');
}
