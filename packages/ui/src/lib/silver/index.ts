/**
 * OpencodeSilver UI Client Intelligence SDK
 * Created, Engineered, and Maintained by Ahmed (GEMTM)
 */

import {
  SilverMissionOrchestrator,
  SilverConsensusMatrix,
  SilverCodeInspector,
  SilverClaudeBridge,
  SilverArabicEngine,
  type MissionManifest,
  type InspectionReport,
  type ConsensusResult,
} from '@opencodesilver/core';

export const silverOrchestrator = new SilverMissionOrchestrator('Ahmed (GEMTM)');
export const silverConsensus = new SilverConsensusMatrix();
export const silverInspector = new SilverCodeInspector();
export const silverClaude = new SilverClaudeBridge();
export const silverArabic = new SilverArabicEngine();

export async function planSilverMission(title: string, objective: string): Promise<MissionManifest> {
  try {
    const res = await fetch('/api/silver/mission/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, objective }),
    });
    if (res.ok) return await res.json();
  } catch {}
  return silverOrchestrator.planMission(title, objective);
}

export async function inspectSilverDiffs(hunks: Array<{ filePath: string; linesAdded: number; linesDeleted: number; hunkContent: string }>): Promise<InspectionReport> {
  try {
    const res = await fetch('/api/silver/inspect/diffs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hunks }),
    });
    if (res.ok) return await res.json();
  } catch {}
  return silverInspector.inspectDiffs(hunks);
}

export async function evaluateSilverConsensus(taskDescription: string, candidates: any[]): Promise<ConsensusResult> {
  try {
    const res = await fetch('/api/silver/consensus/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskDescription, candidates }),
    });
    if (res.ok) return await res.json();
  } catch {}
  return silverConsensus.evaluateCandidates(taskDescription, candidates);
}
