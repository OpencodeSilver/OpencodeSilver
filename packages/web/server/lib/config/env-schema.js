/**
 * OpencodeSilver Centralized Environment Schema & Configuration Layer
 * Engineered and Architected by Ahmed (GEMTM)
 *
 * Provides strongly-typed Zod validation, default values, normalization,
 * and testable access for all OPENCODESILVER_* and OPENCODE_* environment variables.
 */

import * as zodModule from 'zod';

const z = zodModule.z ?? zodModule.default ?? zodModule;

const booleanString = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      const lower = val.trim().toLowerCase();
      return lower === '1' || lower === 'true' || lower === 'yes' || lower === 'on';
    }
    return false;
  });

const portNumber = (defaultPort) =>
  z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === 'number') return Math.trunc(val);
      if (typeof val === 'string') {
        const parsed = parseInt(val.trim(), 10);
        if (Number.isFinite(parsed) && parsed > 0 && parsed <= 65535) return parsed;
      }
      return defaultPort;
    });

export const OpencodeSilverEnvSchema = z.object({
  // Server network
  OPENCODESILVER_HOST: z.string().trim().default('127.0.0.1'),
  OPENCODESILVER_PORT: portNumber(3001),
  OPENCODESILVER_PUBLIC_ORIGIN: z.string().trim().optional(),
  OPENCODESILVER_API_PREFIX: z.string().trim().default('/api'),

  // OpenCode backend
  OPENCODE_PORT: portNumber(4096),
  OPENCODE_HOST: z.string().trim().optional(),
  OPENCODESILVER_OPENCODE_HOSTNAME: z.string().trim().default('127.0.0.1'),
  OPENCODESILVER_OPENCODE_BIN: z.string().trim().optional(),
  OPENCODE_SERVER_PASSWORD: z.string().optional(),
  OPENCODE_JWT_SECRET: z.string().optional(),

  // Security & Auth
  OPENCODESILVER_UI_PASSWORD: z.string().optional(),
  OPENCODESILVER_SERVICE_TOKEN: z.string().optional(),
  OPENCODESILVER_FRAME_ANCESTORS: z.string().trim().default("'self'"),

  // Data directories
  OPENCODESILVER_DATA_DIR: z.string().trim().optional(),
  OPENCODESILVER_CHATS_DIR: z.string().trim().optional(),
  OPENCODESILVER_DIST_DIR: z.string().trim().optional(),

  // Extensions
  OPENCODESILVER_ALLOW_LOCAL_EXTENSIONS: booleanString,
  OPENCODESILVER_ALLOWED_EXTENSIONS: z.string().trim().optional(),

  // Logging & diagnostics
  OPENCODESILVER_VERBOSE_REQUEST_LOGS: booleanString,
  OPENCODESILVER_STARTUP_PERF: booleanString,
}).passthrough();

/**
 * Parses and returns strongly-typed, validated environment variables.
 *
 * @param {Record<string, unknown>} [sourceEnv=process.env] - Source environment to parse
 * @returns {Record<string, any>} Frozen validated environment object
 */
export function getEnv(sourceEnv = process.env) {
  const result = OpencodeSilverEnvSchema.safeParse(sourceEnv ?? {});
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Environment validation failed: ${issues}`);
  }
  return Object.freeze(result.data);
}

/** Global validated env instance initialized from process.env */
export const validatedEnv = getEnv(process.env);
