/**
 * OpencodeSilver Autonomous Mission Orchestrator
 * Engineered and Architected by Ahmed (GEMTM)
 *
 * Provides goal decomposition, dependency graphs, automated checkpoints,
 * durable disk persistence across restarts, and adaptive execution strategies
 * for autonomous AI agent missions.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface MissionPhase {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  dependencies: string[];
  estimatedDurationMs: number;
  retryCount: number;
  maxRetries: number;
  outputArtifacts?: string[];
  checkpointHash?: string;
}

export interface MissionManifest {
  missionId: string;
  title: string;
  objective: string;
  author: string;
  createdAt: number;
  updatedAt: number;
  status: 'planned' | 'executing' | 'verifying' | 'completed' | 'aborted' | 'interrupted';
  phases: MissionPhase[];
  riskScore: number; // 0 to 100
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface MissionOrchestratorOptions {
  defaultAuthor?: string;
  storageDir?: string;
  autoPersist?: boolean;
}

export class SilverMissionOrchestrator {
  private missions = new Map<string, MissionManifest>();
  private readonly defaultAuthor: string;
  private storageDir: string | null;
  private readonly autoPersist: boolean;

  constructor(authorOrOptions?: string | MissionOrchestratorOptions) {
    if (typeof authorOrOptions === 'string') {
      this.defaultAuthor = authorOrOptions;
      this.storageDir = this.resolveDefaultStorageDir();
      this.autoPersist = false; // Backward-compatible default for string constructor
    } else {
      this.defaultAuthor = authorOrOptions?.defaultAuthor ?? 'Ahmed (GEMTM)';
      this.storageDir = authorOrOptions?.storageDir ?? this.resolveDefaultStorageDir();
      this.autoPersist = authorOrOptions?.autoPersist ?? true;
    }

    if (this.autoPersist && this.storageDir) {
      this.initializeSync();
    }
  }

  private resolveDefaultStorageDir(): string {
    const envDir = typeof process !== 'undefined' ? process.env?.OPENCODESILVER_DATA_DIR : undefined;
    if (envDir && envDir.trim()) {
      return path.join(envDir.trim(), 'missions');
    }
    const home = typeof process !== 'undefined'
      ? (process.env?.USERPROFILE || process.env?.HOME || '.')
      : '.';
    return path.join(home, '.opencodesilver', 'missions');
  }

  /**
   * Initializes storage, loading existing missions and transitioning uncompleted
   * in-flight tasks ('executing' or 'verifying') to 'interrupted'.
   */
  public initializeSync(): void {
    if (!this.storageDir || typeof fs.existsSync !== 'function') return;

    try {
      if (!fs.existsSync(this.storageDir)) {
        try {
          fs.mkdirSync(this.storageDir, { recursive: true });
        } catch {
          // Gracefully fallback to in-memory mode when storage directory is not writable (e.g. sandboxed environments)
          this.storageDir = null;
          return;
        }
      }

      const files = fs.readdirSync(this.storageDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const filePath = path.join(this.storageDir, file);
        try {
          const raw = fs.readFileSync(filePath, 'utf8');
          const manifest = JSON.parse(raw) as MissionManifest;
          if (manifest && manifest.missionId) {
            // Requirement 3.2: Mark in-flight tasks as interrupted when recovering from a shutdown
            if (manifest.status === 'executing' || manifest.status === 'verifying') {
              manifest.status = 'interrupted';
              manifest.updatedAt = Date.now();
              fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2), 'utf8');
            }
            this.missions.set(manifest.missionId, manifest);
          }
        } catch (err) {
          console.warn(`[SilverMissionOrchestrator] Failed to load mission from ${file}:`, err);
        }
      }
    } catch (err) {
      console.warn('[SilverMissionOrchestrator] Error initializing mission storage:', err);
    }
  }

  public async initialize(): Promise<void> {
    this.initializeSync();
  }

  /**
   * Decomposes a user prompt or requirement into a structured, dependency-aware MissionManifest.
   */
  public planMission(title: string, objective: string, context?: Record<string, unknown>): MissionManifest {
    const missionId = `mission_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = Date.now();

    const phases: MissionPhase[] = [
      {
        id: 'phase_discovery',
        title: 'Architectural Discovery & Codebase Inspection',
        description: 'Analyze affected files, symbols, dependency trees, and constraints.',
        status: 'pending',
        dependencies: [],
        estimatedDurationMs: 15000,
        retryCount: 0,
        maxRetries: 3,
      },
      {
        id: 'phase_design',
        title: 'Solution Design & Interface Contract',
        description: 'Define type signatures, state transformations, and verification strategy.',
        status: 'pending',
        dependencies: ['phase_discovery'],
        estimatedDurationMs: 25000,
        retryCount: 0,
        maxRetries: 2,
      },
      {
        id: 'phase_execution',
        title: 'Atomic Implementation & Code Transformation',
        description: 'Apply high-precision code modifications across targeted packages.',
        status: 'pending',
        dependencies: ['phase_design'],
        estimatedDurationMs: 45000,
        retryCount: 0,
        maxRetries: 3,
      },
      {
        id: 'phase_verification',
        title: 'Regression Verification & Test Suite Execution',
        description: 'Run unit tests, type checks, and static analysis verification.',
        status: 'pending',
        dependencies: ['phase_execution'],
        estimatedDurationMs: 20000,
        retryCount: 0,
        maxRetries: 2,
      },
      {
        id: 'phase_finalization',
        title: 'Mission Audit & Checkpoint Persistence',
        description: 'Generate audit report, commit state, and finalize session artifacts.',
        status: 'pending',
        dependencies: ['phase_verification'],
        estimatedDurationMs: 10000,
        retryCount: 0,
        maxRetries: 1,
      },
    ];

    const manifest: MissionManifest = {
      missionId,
      title,
      objective,
      author: this.defaultAuthor,
      createdAt: now,
      updatedAt: now,
      status: 'planned',
      phases,
      riskScore: this.calculateRiskScore(objective, phases),
      tags: ['autonomous', 'silver-v3', 'mission-control'],
      metadata: context ?? {},
    };

    this.missions.set(missionId, manifest);
    this.persistMission(manifest);
    return manifest;
  }

  /**
   * Advances a mission phase to the next state, ensuring dependency safety.
   */
  public advancePhase(
    missionId: string,
    phaseId: string,
    newStatus: MissionPhase['status'],
    artifacts?: string[]
  ): MissionManifest {
    const mission = this.missions.get(missionId);
    if (!mission) {
      throw new Error(`Mission not found: ${missionId}`);
    }

    const phase = mission.phases.find((p) => p.id === phaseId);
    if (!phase) {
      throw new Error(`Phase not found: ${phaseId} in mission ${missionId}`);
    }

    // Verify dependencies before allowing execution
    if (newStatus === 'in_progress') {
      for (const depId of phase.dependencies) {
        const dep = mission.phases.find((p) => p.id === depId);
        if (dep && dep.status !== 'completed' && dep.status !== 'skipped') {
          throw new Error(`Cannot start ${phaseId}: dependency ${depId} is still ${dep.status}`);
        }
      }
    }

    phase.status = newStatus;
    if (artifacts) {
      phase.outputArtifacts = [...(phase.outputArtifacts ?? []), ...artifacts];
    }

    mission.updatedAt = Date.now();

    // Check if entire mission completed or aborted
    const allDone = mission.phases.every((p) => p.status === 'completed' || p.status === 'skipped');
    const anyFailed = mission.phases.some((p) => p.status === 'failed');

    if (anyFailed) {
      mission.status = 'aborted';
    } else if (allDone) {
      mission.status = 'completed';
    } else if (phase.id === 'phase_verification' && newStatus === 'in_progress') {
      mission.status = 'verifying';
    } else {
      mission.status = 'executing';
    }

    this.persistMission(mission);
    return mission;
  }

  /**
   * Explicitly aborts an active mission with an optional reason.
   */
  public abortMission(missionId: string, reason?: string): MissionManifest {
    const mission = this.missions.get(missionId);
    if (!mission) {
      throw new Error(`Mission not found: ${missionId}`);
    }

    mission.status = 'aborted';
    mission.updatedAt = Date.now();
    if (reason) {
      mission.metadata = { ...mission.metadata, abortReason: reason };
    }

    this.persistMission(mission);
    return mission;
  }

  /**
   * Deletes a mission from in-memory cache and from disk.
   */
  public deleteMission(missionId: string): boolean {
    const deleted = this.missions.delete(missionId);
    if (this.storageDir && typeof fs.existsSync === 'function') {
      try {
        const filePath = path.join(this.storageDir, `${missionId}.json`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.warn(`[SilverMissionOrchestrator] Error deleting mission file ${missionId}:`, err);
      }
    }
    return deleted;
  }

  public getMission(missionId: string): MissionManifest | undefined {
    return this.missions.get(missionId);
  }

  public listMissions(): MissionManifest[] {
    return Array.from(this.missions.values());
  }

  public getStorageDirectory(): string | null {
    return this.storageDir;
  }

  public persistMission(manifest: MissionManifest): void {
    if (!this.autoPersist || !this.storageDir || typeof fs.existsSync !== 'function') return;
    try {
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }
      const filePath = path.join(this.storageDir, `${manifest.missionId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2), 'utf8');
    } catch (err) {
      console.warn(`[SilverMissionOrchestrator] Failed to persist mission ${manifest.missionId}:`, err);
    }
  }

  private calculateRiskScore(objective: string, phases: MissionPhase[]): number {
    let score = 20; // baseline
    const highRiskKeywords = ['delete', 'drop', 'truncate', 'force', 'rm -rf', 'refactor', 'migrate', 'auth'];
    const lower = objective.toLowerCase();

    for (const kw of highRiskKeywords) {
      if (lower.includes(kw)) score += 15;
    }

    score += phases.length * 3;
    return Math.min(100, Math.max(0, score));
  }
}
