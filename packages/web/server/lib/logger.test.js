import { describe, expect, test } from 'vitest';
import { Logger, createLogger } from './logger.js';

describe('Central Structured Logger', () => {
  test('formats logs with timestamp, level, and namespace', () => {
    const logger = new Logger('test:unit', { level: 'debug' });
    const formatted = logger._format('info', 'Hello world');

    expect(formatted).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    expect(formatted).toContain('[INFO]');
    expect(formatted).toContain('[test:unit]');
    expect(formatted).toContain('Hello world');
  });

  test('respects log level thresholds and silences lower levels', () => {
    const warnLogger = new Logger('test:threshold', { level: 'warn' });
    expect(warnLogger.isLevelEnabled('trace')).toBe(false);
    expect(warnLogger.isLevelEnabled('debug')).toBe(false);
    expect(warnLogger.isLevelEnabled('info')).toBe(false);
    expect(warnLogger.isLevelEnabled('warn')).toBe(true);
    expect(warnLogger.isLevelEnabled('error')).toBe(true);
  });

  test('creates nested child loggers inheriting thresholds', () => {
    const rootLogger = createLogger('parent', { level: 'info' });
    const child = rootLogger.child('child');

    expect(child.namespace).toBe('parent:child');
    expect(child.isLevelEnabled('info')).toBe(true);
    expect(child.isLevelEnabled('debug')).toBe(false);
  });

  test('serializes Error instances and metadata objects safely', () => {
    const logger = new Logger('test:meta');
    const error = new Error('Test failure');
    const formattedError = logger._format('error', 'Operation failed', error);

    expect(formattedError).toContain('Operation failed');
    expect(formattedError).toContain('Test failure');

    const formattedJson = logger._format('info', 'Stats', { count: 42, active: true });
    expect(formattedJson).toContain('{"count":42,"active":true}');
  });
});
