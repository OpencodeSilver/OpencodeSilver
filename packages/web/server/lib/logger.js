// Centralized structured logging for OpencodeSilver web and API server.
// Respects OPENCODESILVER_LOG_LEVEL ('trace', 'debug', 'info', 'warn', 'error', 'silent').

const LEVELS = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  silent: 5,
};

const DEFAULT_LEVEL = process.env.NODE_ENV === 'test' ? 'error' : (process.env.OPENCODESILVER_LOG_LEVEL || 'info').toLowerCase();

function resolveLevelThreshold(levelName) {
  const normalized = String(levelName || '').toLowerCase();
  return LEVELS[normalized] ?? LEVELS.info;
}

function serializeMeta(meta) {
  if (!meta || typeof meta !== 'object') return '';
  if (meta instanceof Error) {
    return `\n${meta.stack || meta.message}`;
  }
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ' [Circular or Unserializable Object]';
  }
}

export class Logger {
  constructor(namespace = 'server', options = {}) {
    this.namespace = namespace;
    this.levelThreshold = resolveLevelThreshold(options.level || process.env.OPENCODESILVER_LOG_LEVEL || DEFAULT_LEVEL);
  }

  setLevel(levelName) {
    this.levelThreshold = resolveLevelThreshold(levelName);
  }

  isLevelEnabled(level) {
    return (LEVELS[level] ?? LEVELS.info) >= this.levelThreshold && this.levelThreshold < LEVELS.silent;
  }

  child(subNamespace) {
    return new Logger(`${this.namespace}:${subNamespace}`, { level: Object.keys(LEVELS).find(k => LEVELS[k] === this.levelThreshold) });
  }

  _format(level, message, meta) {
    const timestamp = new Date().toISOString();
    const metaSuffix = meta !== undefined ? serializeMeta(meta) : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.namespace}] ${message}${metaSuffix}`;
  }

  trace(message, meta) {
    if (!this.isLevelEnabled('trace')) return;
    process.stdout.write(`${this._format('trace', message, meta)}\n`);
  }

  debug(message, meta) {
    if (!this.isLevelEnabled('debug')) return;
    process.stdout.write(`${this._format('debug', message, meta)}\n`);
  }

  info(message, meta) {
    if (!this.isLevelEnabled('info')) return;
    process.stdout.write(`${this._format('info', message, meta)}\n`);
  }

  warn(message, meta) {
    if (!this.isLevelEnabled('warn')) return;
    process.stderr.write(`${this._format('warn', message, meta)}\n`);
  }

  error(message, meta) {
    if (!this.isLevelEnabled('error')) return;
    process.stderr.write(`${this._format('error', message, meta)}\n`);
  }
}

export const logger = new Logger('server');
export const createLogger = (namespace, options) => new Logger(namespace, options);
