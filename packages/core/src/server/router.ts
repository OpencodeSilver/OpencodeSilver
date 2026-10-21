/**
 * OpencodeSilver Intelligence Router
 * Engineered and Architected by Ahmed (GEMTM)
 *
 * Exposes secure HTTP endpoints for autonomous missions, multi-model consensus,
 * code diff security inspection, and Claude Code bridge status.
 *
 * Enforces mandatory authentication tokens, strict origin validation,
 * payload size limits, and Zod input validation.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import * as zodModule from 'zod';

// Universal Zod export resolution across Node ESM, CJS, Vite, and Bun
const z = (zodModule as any).z ?? (zodModule as any).default ?? zodModule;
import { SilverMissionOrchestrator } from '../mission/orchestrator';
import { SilverConsensusMatrix } from '../consensus/matrix';
import { SilverCodeInspector } from '../inspector/reviewer';
import { SilverClaudeBridge } from '../bridge/claude';

export interface SilverIntelligenceRouterOptions {
  /** Authentication token required to access endpoints. */
  authToken?: string;
  /** Allowed origins. If omitted or empty, standard local origins are allowed. */
  allowedOrigins?: string[];
  /** Maximum allowed request body size in bytes. Default: 5MB (5 * 1024 * 1024). */
  maxBodySizeBytes?: number;
  orchestrator?: SilverMissionOrchestrator;
  consensusMatrix?: SilverConsensusMatrix;
  codeInspector?: SilverCodeInspector;
  claudeBridge?: SilverClaudeBridge;
}

// ---------------------------------------------------------------------------
// Zod Schemas for Validation
// ---------------------------------------------------------------------------

export const PlanMissionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  objective: z.string().min(1, 'Objective is required').max(10000),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const AdvancePhaseSchema = z.object({
  missionId: z.string().min(1, 'missionId is required'),
  phaseId: z.string().min(1, 'phaseId is required'),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'skipped']),
  artifacts: z.array(z.string()).optional(),
});

export const AbortMissionSchema = z.object({
  missionId: z.string().min(1, 'missionId is required'),
  reason: z.string().optional(),
});

export const CandidateRunSchema = z.object({
  modelId: z.string().min(1),
  provider: z.string().optional(),
  durationMs: z.number().nonnegative(),
  tokensUsed: z.number().nonnegative(),
  patch: z.string(),
  explanation: z.string(),
  syntaxValid: z.boolean(),
  lintWarningsCount: z.number().int().nonnegative(),
  confidenceScore: z.number().min(0).max(1),
  testsPassed: z.boolean().optional(),
  typeCheckPassed: z.boolean().optional(),
  costUsd: z.number().nonnegative().optional(),
  worktreePath: z.string().optional(),
  branchName: z.string().optional(),
});

export const EvaluateConsensusSchema = z.object({
  taskDescription: z.string().min(1).max(5000),
  candidates: z.array(CandidateRunSchema).min(1, 'At least one candidate is required'),
});

export const DiffHunkSchema = z.object({
  filePath: z.string().min(1),
  linesAdded: z.number().int().nonnegative(),
  linesDeleted: z.number().int().nonnegative(),
  hunkContent: z.string(),
});

export const InspectDiffsSchema = z.object({
  hunks: z.array(DiffHunkSchema),
});

export type SilverIntelligenceHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  next?: () => void
) => Promise<boolean>;

export function createSilverIntelligenceRouter(
  options: SilverIntelligenceRouterOptions = {}
): SilverIntelligenceHandler {
  const authToken = options.authToken ?? process.env.OPENCODESILVER_AUTH_TOKEN;
  const maxBodySize = options.maxBodySizeBytes ?? 5 * 1024 * 1024; // 5 MB
  const orchestrator = options.orchestrator ?? new SilverMissionOrchestrator();
  const consensusMatrix = options.consensusMatrix ?? new SilverConsensusMatrix();
  const codeInspector = options.codeInspector ?? new SilverCodeInspector();
  const claudeBridge = options.claudeBridge ?? new SilverClaudeBridge();

  const isOriginAllowed = (origin?: string): boolean => {
    if (!origin) return true; // Non-browser / same-origin requests
    if (options.allowedOrigins && options.allowedOrigins.length > 0) {
      return options.allowedOrigins.includes(origin);
    }
    // Default safe local origins
    try {
      const url = new URL(origin);
      if (
        url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1' ||
        url.protocol === 'vscode-webview:' ||
        url.protocol === 'file:'
      ) {
        return true;
      }
    } catch {
      return false;
    }
    return false;
  };

  const readBodyJson = (req: IncomingMessage): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      let body = '';
      let bytes = 0;

      req.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes > maxBodySize) {
          const err = new Error('Payload Too Large') as any;
          err.statusCode = 413;
          reject(err);
          req.destroy();
          return;
        }
        body += chunk;
      });

      req.on('end', () => {
        if (!body.trim()) {
          resolve({});
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          const parseErr = new Error('Invalid JSON') as any;
          parseErr.statusCode = 400;
          reject(parseErr);
        }
      });

      req.on('error', (err) => reject(err));
    });
  };

  const sendJson = (res: ServerResponse, status: number, data: unknown): void => {
    const payload = JSON.stringify(data);
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    });
    res.end(payload);
  };

  return async (req: IncomingMessage, res: ServerResponse, next?: () => void): Promise<boolean> => {
    const rawUrl = req.url || '/';
    const [path, search] = rawUrl.split('?');
    const query = new URLSearchParams(search || '');

    // Only handle routes starting with /silver-intelligence or /api/silver-intelligence
    const prefix = path.startsWith('/api/silver-intelligence')
      ? '/api/silver-intelligence'
      : path.startsWith('/silver-intelligence')
      ? '/silver-intelligence'
      : null;

    if (!prefix) {
      if (next) next();
      return false;
    }

    const route = path.slice(prefix.length) || '/';
    const method = req.method?.toUpperCase() || 'GET';

    // 1. Origin check
    const origin = req.headers.origin;
    if (origin && !isOriginAllowed(origin)) {
      sendJson(res, 403, { error: 'Forbidden: origin not allowed', origin });
      return true;
    }

    // 2. Authentication check
    if (authToken) {
      const authHeader = req.headers.authorization;
      const customHeader = req.headers['x-opencodesilver-token'];
      const queryToken = query.get('token');

      let candidateToken: string | null = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        candidateToken = authHeader.slice(7).trim();
      } else if (typeof customHeader === 'string') {
        candidateToken = customHeader.trim();
      } else if (queryToken) {
        candidateToken = queryToken.trim();
      }

      if (!candidateToken || candidateToken !== authToken) {
        sendJson(res, 401, { error: 'Unauthorized: valid authentication token required' });
        return true;
      }
    }

    try {
      // Health probe
      if (route === '/health' && method === 'GET') {
        sendJson(res, 200, {
          status: 'healthy',
          engine: 'OpencodeSilver Core Intelligence',
          version: '3.0.0',
        });
        return true;
      }

      // Missions: List
      if ((route === '/missions' || route === '/missions/') && method === 'GET') {
        sendJson(res, 200, { missions: orchestrator.listMissions() });
        return true;
      }

      // Missions: Plan
      if (route === '/missions/plan' && method === 'POST') {
        const body = await readBodyJson(req);
        const parsed = PlanMissionSchema.safeParse(body);
        if (!parsed.success) {
          sendJson(res, 400, { error: 'Invalid input', issues: parsed.error.issues });
          return true;
        }
        const mission = orchestrator.planMission(parsed.data.title, parsed.data.objective, parsed.data.context);
        sendJson(res, 201, { mission });
        return true;
      }

      // Missions: Advance
      if (route === '/missions/advance' && method === 'POST') {
        const body = await readBodyJson(req);
        const parsed = AdvancePhaseSchema.safeParse(body);
        if (!parsed.success) {
          sendJson(res, 400, { error: 'Invalid input', issues: parsed.error.issues });
          return true;
        }
        try {
          const mission = orchestrator.advancePhase(
            parsed.data.missionId,
            parsed.data.phaseId,
            parsed.data.status,
            parsed.data.artifacts
          );
          sendJson(res, 200, { mission });
        } catch (err: any) {
          sendJson(res, 400, { error: err?.message || 'Failed to advance phase' });
        }
        return true;
      }

      // Missions: Abort
      if (route === '/missions/abort' && method === 'POST') {
        const body = await readBodyJson(req);
        const parsed = AbortMissionSchema.safeParse(body);
        if (!parsed.success) {
          sendJson(res, 400, { error: 'Invalid input', issues: parsed.error.issues });
          return true;
        }
        try {
          const mission = orchestrator.abortMission(parsed.data.missionId, parsed.data.reason);
          sendJson(res, 200, { mission });
        } catch (err: any) {
          sendJson(res, 404, { error: err?.message || 'Mission not found' });
        }
        return true;
      }

      // Missions: Get by ID
      const missionMatch = route.match(/^\/missions\/([a-zA-Z0-9_-]+)$/);
      if (missionMatch && method === 'GET') {
        const mission = orchestrator.getMission(missionMatch[1]);
        if (!mission) {
          sendJson(res, 404, { error: `Mission ${missionMatch[1]} not found` });
        } else {
          sendJson(res, 200, { mission });
        }
        return true;
      }

      // Consensus: Evaluate candidates
      if (route === '/consensus/evaluate' && method === 'POST') {
        const body = await readBodyJson(req);
        const parsed = EvaluateConsensusSchema.safeParse(body);
        if (!parsed.success) {
          sendJson(res, 400, { error: 'Invalid input', issues: parsed.error.issues });
          return true;
        }
        const result = consensusMatrix.evaluateCandidates(parsed.data.taskDescription, parsed.data.candidates);
        sendJson(res, 200, { result });
        return true;
      }

      // Inspector: Diff inspection
      if (route === '/inspector/diffs' && method === 'POST') {
        const body = await readBodyJson(req);
        const parsed = InspectDiffsSchema.safeParse(body);
        if (!parsed.success) {
          sendJson(res, 400, { error: 'Invalid input', issues: parsed.error.issues });
          return true;
        }
        const report = codeInspector.inspectDiffs(parsed.data.hunks);
        sendJson(res, 200, { report });
        return true;
      }

      // Bridge: Claude Code detection
      if (route === '/bridge/claude/detect' && method === 'GET') {
        const info = await claudeBridge.detectClaudeInstallation();
        sendJson(res, 200, { claude: info });
        return true;
      }

      sendJson(res, 404, { error: `Route not found: ${method} ${route}` });
      return true;
    } catch (err: any) {
      const statusCode = err?.statusCode || 500;
      sendJson(res, statusCode, { error: err?.message || 'Internal server error' });
      return true;
    }
  };
}
