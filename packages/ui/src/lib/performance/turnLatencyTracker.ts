export interface LatencyRecord {
  startTime: number;
  endTime?: number;
  durationMs?: number;
}

export function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

export class TurnLatencyTracker {
  private activeTurns = new Map<string, LatencyRecord>();

  startTurn(turnId: string): void {
    this.activeTurns.set(turnId, { startTime: performance.now() });
  }

  finishTurn(turnId: string): number | null {
    const record = this.activeTurns.get(turnId);
    if (!record) return null;
    const endTime = performance.now();
    const durationMs = Math.round(endTime - record.startTime);
    record.endTime = endTime;
    record.durationMs = durationMs;
    return durationMs;
  }

  getTurnDuration(turnId: string): number | null {
    return this.activeTurns.get(turnId)?.durationMs ?? null;
  }
}

export const globalLatencyTracker = new TurnLatencyTracker();
