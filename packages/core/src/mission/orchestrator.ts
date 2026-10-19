/**
 * OpencodeSilver Autonomous Mission Orchestrator
 * Engineered and Architected by Ahmed (GEMTM)
 *
 * Provides goal decomposition, dependency graphs, automated checkpoints,
 * and adaptive execution strategies for autonomous AI agent missions.
 */

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
  status: 'planned' | 'executing' | 'verifying' | 'completed' | 'aborted';
  phases: MissionPhase[];
  riskScore: number; // 0 to 100
  tags: string[];
  metadata: Record<string, unknown>;
}

export class SilverMissionOrchestrator {
  private missions = new Map<string, MissionManifest>();

  constructor(private readonly defaultAuthor: string = 'Ahmed (GEMTM)') {}

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

    // Check if entire mission completed
    const allDone = mission.phases.every((p) => p.status === 'completed' || p.status === 'skipped');
    const anyFailed = mission.phases.some((p) => p.status === 'failed');

    if (anyFailed) {
      mission.status = 'aborted';
    } else if (allDone) {
      mission.status = 'completed';
    } else {
      mission.status = 'executing';
    }

    return mission;
  }

  public getMission(missionId: string): MissionManifest | undefined {
    return this.missions.get(missionId);
  }

  public listMissions(): MissionManifest[] {
    return Array.from(this.missions.values());
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
