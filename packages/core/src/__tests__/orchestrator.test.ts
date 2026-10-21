import { beforeEach, describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { SilverMissionOrchestrator } from '../mission/orchestrator';

describe('SilverMissionOrchestrator Unit Tests', () => {
  let tmpDir: string;
  let orchestrator: SilverMissionOrchestrator;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `silver_orch_test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
    orchestrator = new SilverMissionOrchestrator({
      storageDir: tmpDir,
      autoPersist: true,
      defaultAuthor: 'Test Architect',
    });
  });

  it('plans a mission with correct default metadata and phases', () => {
    const mission = orchestrator.planMission('Refactor Database Layer', 'Migrate SQLite queries to typed dialect');
    expect(mission.missionId).toBeDefined();
    expect(mission.author).toBe('Test Architect');
    expect(mission.status).toBe('planned');
    expect(mission.phases.length).toBe(5);
    expect(mission.phases.map((p) => p.id)).toEqual([
      'phase_discovery',
      'phase_design',
      'phase_execution',
      'phase_verification',
      'phase_finalization',
    ]);
  });

  it('calculates risk score based on architectural keywords', () => {
    const safeMission = orchestrator.planMission('Fix typo in README', 'Correct documentation spelling');
    const riskyMission = orchestrator.planMission(
      'Migrate Core Security and Auth Database Schema',
      'Breaking changes with migrate, auth refactor, and delete old tables'
    );

    expect(riskyMission.riskScore).toBeGreaterThan(safeMission.riskScore);
  });

  it('enforces sequential phase dependency order', () => {
    const mission = orchestrator.planMission('Sequential Flow', 'Test dependencies');
    expect(() => {
      orchestrator.advancePhase(mission.missionId, 'phase_execution', 'in_progress');
    }).toThrow(/dependency phase_design is still pending/);
  });

  it('transitions mission status to executing when first phase starts', () => {
    const mission = orchestrator.planMission('Status Progression', 'Check state machine');
    expect(mission.status).toBe('planned');

    const updated = orchestrator.advancePhase(mission.missionId, 'phase_discovery', 'in_progress');
    expect(updated.status).toBe('executing');
    expect(updated.phases[0].status).toBe('in_progress');
  });

  it('stores output artifacts upon phase completion', () => {
    const mission = orchestrator.planMission('Artifact Storage', 'Deliver outputs');
    orchestrator.advancePhase(mission.missionId, 'phase_discovery', 'in_progress');
    const completed = orchestrator.advancePhase(mission.missionId, 'phase_discovery', 'completed', [
      'analysis.md',
      'schema.json',
    ]);

    expect(completed.phases[0].status).toBe('completed');
    expect(completed.phases[0].outputArtifacts).toEqual(['analysis.md', 'schema.json']);
  });

  it('marks entire mission as completed when final phase completes', () => {
    const mission = orchestrator.planMission('Full Cycle', 'Run end-to-end');
    const phaseIds = [
      'phase_discovery',
      'phase_design',
      'phase_execution',
      'phase_verification',
      'phase_finalization',
    ] as const;

    for (const phaseId of phaseIds) {
      orchestrator.advancePhase(mission.missionId, phaseId, 'in_progress');
      orchestrator.advancePhase(mission.missionId, phaseId, 'completed');
    }

    const finalMission = orchestrator.getMission(mission.missionId);
    expect(finalMission?.status).toBe('completed');
  });

  it('aborts active mission and stores abort reason', () => {
    const mission = orchestrator.planMission('Abortable Task', 'Needs cancellation');
    orchestrator.advancePhase(mission.missionId, 'phase_discovery', 'in_progress');

    const aborted = orchestrator.abortMission(mission.missionId, 'Unrecoverable environment issue');
    expect(aborted.status).toBe('aborted');
    expect(aborted.metadata.abortReason).toBe('Unrecoverable environment issue');
  });

  it('lists all registered missions', () => {
    orchestrator.planMission('Mission 1', 'First');
    orchestrator.planMission('Mission 2', 'Second');
    orchestrator.planMission('Mission 3', 'Third');

    const list = orchestrator.listMissions();
    expect(list.length).toBe(3);
    expect(list.map((m) => m.title)).toContain('Mission 3');
  });

  it('deletes mission and removes persisted file from disk', () => {
    const mission = orchestrator.planMission('To Be Deleted', 'Temporary');
    const filePath = path.join(tmpDir, `${mission.missionId}.json`);
    expect(fs.existsSync(filePath)).toBe(true);

    const deleted = orchestrator.deleteMission(mission.missionId);
    expect(deleted).toBe(true);
    expect(fs.existsSync(filePath)).toBe(false);
    expect(orchestrator.getMission(mission.missionId)).toBeUndefined();
  });

  it('recovers executing mission as interrupted on new orchestrator instance', () => {
    const mission = orchestrator.planMission('Crash Candidate', 'Simulate crash');
    orchestrator.advancePhase(mission.missionId, 'phase_discovery', 'in_progress');

    const freshOrchestrator = new SilverMissionOrchestrator({
      storageDir: tmpDir,
      autoPersist: true,
    });

    const recovered = freshOrchestrator.getMission(mission.missionId);
    expect(recovered).toBeDefined();
    expect(recovered?.status).toBe('interrupted');
  });
});
