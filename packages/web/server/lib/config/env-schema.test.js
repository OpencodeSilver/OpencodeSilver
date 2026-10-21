import { describe, expect, it } from 'vitest';
import { getEnv, OpencodeSilverEnvSchema } from './env-schema.js';

describe('OpencodeSilver Centralized Environment Schema', () => {
  it('applies sane defaults when no environment variables are set', () => {
    const config = getEnv({});
    expect(config.OPENCODESILVER_HOST).toBe('127.0.0.1');
    expect(config.OPENCODESILVER_PORT).toBe(3001);
    expect(config.OPENCODESILVER_API_PREFIX).toBe('/api');
    expect(config.OPENCODE_PORT).toBe(4096);
    expect(config.OPENCODESILVER_OPENCODE_HOSTNAME).toBe('127.0.0.1');
    expect(config.OPENCODESILVER_FRAME_ANCESTORS).toBe("'self'");
    expect(config.OPENCODESILVER_ALLOW_LOCAL_EXTENSIONS).toBe(false);
    expect(config.OPENCODESILVER_VERBOSE_REQUEST_LOGS).toBe(false);
  });

  it('correctly parses custom string ports and booleans', () => {
    const custom = {
      OPENCODESILVER_PORT: '8080',
      OPENCODE_PORT: '9000',
      OPENCODESILVER_ALLOW_LOCAL_EXTENSIONS: 'true',
      OPENCODESILVER_VERBOSE_REQUEST_LOGS: '1',
      OPENCODESILVER_STARTUP_PERF: 'yes',
      OPENCODESILVER_UI_PASSWORD: 'secure_password_123',
    };
    const config = getEnv(custom);
    expect(config.OPENCODESILVER_PORT).toBe(8080);
    expect(config.OPENCODE_PORT).toBe(9000);
    expect(config.OPENCODESILVER_ALLOW_LOCAL_EXTENSIONS).toBe(true);
    expect(config.OPENCODESILVER_VERBOSE_REQUEST_LOGS).toBe(true);
    expect(config.OPENCODESILVER_STARTUP_PERF).toBe(true);
    expect(config.OPENCODESILVER_UI_PASSWORD).toBe('secure_password_123');
  });

  it('preserves untyped passthrough keys without crashing', () => {
    const custom = {
      CUSTOM_VARIABLE: 'foobar',
    };
    const config = getEnv(custom);
    expect(config.CUSTOM_VARIABLE).toBe('foobar');
  });

  it('falls back to default port when an invalid string is given', () => {
    const custom = {
      OPENCODESILVER_PORT: 'invalid_port',
    };
    const config = getEnv(custom);
    expect(config.OPENCODESILVER_PORT).toBe(3001);
  });
});
