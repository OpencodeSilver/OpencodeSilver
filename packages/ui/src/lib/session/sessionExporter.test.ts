import { describe, expect, test } from 'bun:test';
import { formatSessionToMarkdown, type SessionExportPayload } from './sessionExporter';

describe('sessionExporter', () => {
  test('formats session payload into clean markdown structure', () => {
    const payload: SessionExportPayload = {
      sessionId: 'sess-1234',
      title: 'Fix Authentication Flow',
      exportedAt: '2026-10-07T12:00:00.000Z',
      turns: [
        { role: 'user', content: 'Please fix the login timeout issue.' },
        { role: 'assistant', author: 'Claude 3.7', content: 'I have updated the token timeout in auth.ts.' },
      ],
    };

    const markdown = formatSessionToMarkdown(payload);
    expect(markdown).toContain('# Fix Authentication Flow');
    expect(markdown).toContain('`sess-1234`');
    expect(markdown).toContain('👤 User');
    expect(markdown).toContain('Please fix the login timeout issue.');
    expect(markdown).toContain('🤖 Claude 3.7');
    expect(markdown).toContain('I have updated the token timeout in auth.ts.');
  });
});
