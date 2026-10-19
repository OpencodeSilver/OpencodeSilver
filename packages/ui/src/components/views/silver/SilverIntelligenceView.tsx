import React, { useState } from 'react';
import { Icon } from '@/components/icon/Icon';
import { Button } from '@/components/ui/button';
import {
  planSilverMission,
  inspectSilverDiffs,
  evaluateSilverConsensus,
  silverArabic,
  silverClaude,
} from '@/lib/silver';

interface SilverIntelligenceViewProps {
  directory?: string;
  visible?: boolean;
}

export const SilverIntelligenceView: React.FC<SilverIntelligenceViewProps> = ({
  directory = '',
  visible = true,
}) => {
  const [activeTab, setActiveTab] = useState<'mission' | 'consensus' | 'inspector' | 'arabic' | 'claude'>('mission');

  // Mission State
  const [missionTitle, setMissionTitle] = useState('OpencodeSilver Autonomous Engine');
  const [missionObjective, setMissionObjective] = useState('Orchestrate full project refactoring and proprietary verification');
  const [missionResult, setMissionResult] = useState<any>(null);
  const [loadingMission, setLoadingMission] = useState(false);

  // Consensus State
  const [consensusPrompt, setConsensusPrompt] = useState('Implement secure HMAC token validation');
  const [consensusResult, setConsensusResult] = useState<any>(null);
  const [loadingConsensus, setLoadingConsensus] = useState(false);

  // Inspector State
  const [sampleHunk, setSampleHunk] = useState('export const API_KEY = "sk-ant-api03-abcdef123456";\nconst db = connect();');
  const [inspectResult, setInspectResult] = useState<any>(null);
  const [loadingInspect, setLoadingInspect] = useState(false);

  // Arabic NLP State
  const [arabicText, setArabicText] = useState('مرحباً بك في OpencodeSilver المحرك المستقل الذكي');
  const [arabicNormalized, setArabicNormalized] = useState('');
  const [isRtl, setIsRtl] = useState(true);

  // Handlers
  const handlePlanMission = async () => {
    setLoadingMission(true);
    try {
      const res = await planSilverMission(missionTitle, missionObjective);
      setMissionResult(res);
    } finally {
      setLoadingMission(false);
    }
  };

  const handleEvaluateConsensus = async () => {
    setLoadingConsensus(true);
    try {
      const candidates = [
        { model: 'claude-3-7-sonnet', code: 'function verify(token, secret) { return crypto.timingSafeEqual(...); }', confidence: 0.96 },
        { model: 'gpt-4o', code: 'function verify(token, secret) { return hmac(token) === secret; }', confidence: 0.88 },
        { model: 'deepseek-r1', code: 'function verify(token, secret) { const h = crypto.createHmac("sha256", secret); return h.digest().equals(token); }', confidence: 0.94 },
      ];
      const res = await evaluateSilverConsensus(consensusPrompt, candidates);
      setConsensusResult(res);
    } finally {
      setLoadingConsensus(false);
    }
  };

  const handleInspectCode = async () => {
    setLoadingInspect(true);
    try {
      const hunks = [
        {
          filePath: 'packages/core/src/auth.ts',
          linesAdded: 2,
          linesDeleted: 0,
          hunkContent: sampleHunk,
        },
      ];
      const res = await inspectSilverDiffs(hunks);
      setInspectResult(res);
    } finally {
      setLoadingInspect(false);
    }
  };

  const handleNormalizeArabic = () => {
    const norm = silverArabic.normalizeArabic(arabicText);
    const rtl = silverArabic.isRTL(arabicText);
    setArabicNormalized(norm);
    setIsRtl(rtl);
  };

  if (!visible) return null;

  return (
    <div className="flex h-full w-full flex-col bg-background text-foreground select-text">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-foreground/10 text-foreground">
            <Icon name="opencodesilver" className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight">OpencodeSilver Intelligence Suite</span>
              <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary font-medium">v3.0.0</span>
            </div>
            <p className="text-xs text-muted-foreground">Architected and Maintained by Ahmed (GEMTM)</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center rounded-lg bg-muted/40 p-1 text-xs">
          {(['mission', 'consensus', 'inspector', 'arabic', 'claude'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'mission' && 'Directives'}
              {tab === 'consensus' && 'Consensus Matrix'}
              {tab === 'inspector' && 'Security Inspector'}
              {tab === 'arabic' && 'Arabic Engine'}
              {tab === 'claude' && 'Claude Bridge'}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* TAB 1: Mission Orchestrator */}
        {activeTab === 'mission' && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <h2 className="text-base font-semibold">Autonomous Mission Directives</h2>
              <p className="text-xs text-muted-foreground">
                Multi-phase autonomous orchestration with state checkpoints and rollback safety.
              </p>
            </div>

            <div className="space-y-3 rounded-lg border border-border/60 bg-card p-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Mission Title</label>
                <input
                  type="text"
                  value={missionTitle}
                  onChange={(e) => setMissionTitle(e.target.value)}
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Strategic Objective</label>
                <textarea
                  value={missionObjective}
                  onChange={(e) => setMissionObjective(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <Button size="sm" onClick={handlePlanMission} disabled={loadingMission}>
                {loadingMission ? 'Generating Directive...' : 'Plan Autonomous Mission'}
              </Button>
            </div>

            {missionResult && (
              <div className="rounded-lg border border-border/80 bg-muted/10 p-4 font-mono text-xs">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-border/40">
                  <span className="font-semibold text-primary">Mission: {missionResult.id}</span>
                  <span className="text-[10px] text-muted-foreground">Author: {missionResult.author}</span>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-sans text-muted-foreground">{missionResult.objective}</p>
                  <div className="text-[11px] font-semibold text-foreground mt-2">Phases:</div>
                  {missionResult.phases?.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between rounded bg-background/50 px-2 py-1">
                      <span>{p.name}</span>
                      <span className="text-[10px] uppercase font-mono text-muted-foreground">{p.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Consensus Matrix */}
        {activeTab === 'consensus' && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <h2 className="text-base font-semibold">Multi-Model Consensus Matrix</h2>
              <p className="text-xs text-muted-foreground">
                Evaluates candidate implementations across Claude 3.7 Sonnet, GPT-4o, and DeepSeek-R1.
              </p>
            </div>

            <div className="space-y-3 rounded-lg border border-border/60 bg-card p-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Task / Prompt Description</label>
                <input
                  type="text"
                  value={consensusPrompt}
                  onChange={(e) => setConsensusPrompt(e.target.value)}
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <Button size="sm" onClick={handleEvaluateConsensus} disabled={loadingConsensus}>
                {loadingConsensus ? 'Evaluating...' : 'Run Consensus Matrix Evaluation'}
              </Button>
            </div>

            {consensusResult && (
              <div className="rounded-lg border border-border/80 bg-muted/10 p-4 font-mono text-xs">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-foreground">Selected Model: {consensusResult.selectedCandidate?.model}</span>
                  <span className="text-primary font-semibold">Score: {(consensusResult.highestConfidence * 100).toFixed(0)}%</span>
                </div>
                <div className="text-[11px] text-muted-foreground mb-3">{consensusResult.evaluationSummary}</div>
                <div className="rounded bg-background p-2.5 text-foreground overflow-x-auto text-[11px]">
                  <code>{consensusResult.selectedCandidate?.code}</code>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Code Inspector & Security */}
        {activeTab === 'inspector' && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <h2 className="text-base font-semibold">Security & Blast Radius Inspector</h2>
              <p className="text-xs text-muted-foreground">
                Live AST static analysis, credential leak scanner, and blast radius impact assessment.
              </p>
            </div>

            <div className="space-y-3 rounded-lg border border-border/60 bg-card p-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Diff Content to Inspect</label>
                <textarea
                  value={sampleHunk}
                  onChange={(e) => setSampleHunk(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded border border-input bg-background font-mono px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <Button size="sm" onClick={handleInspectCode} disabled={loadingInspect}>
                {loadingInspect ? 'Analyzing Diff...' : 'Scan for Secrets & Risk'}
              </Button>
            </div>

            {inspectResult && (
              <div className="rounded-lg border border-border/80 bg-muted/10 p-4 font-mono text-xs space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-border/40">
                  <span className="font-bold">Risk Score: {inspectResult.riskScore}/100</span>
                  <span className="text-muted-foreground">Blast Radius: {inspectResult.blastRadius}</span>
                </div>
                {inspectResult.findings?.map((f: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-destructive">
                    <Icon name="shield-check" className="size-4 shrink-0" />
                    <span>[{f.severity}] {f.message} ({f.filePath})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Arabic NLP */}
        {activeTab === 'arabic' && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <h2 className="text-base font-semibold">Arabic Natural Language Engine</h2>
              <p className="text-xs text-muted-foreground">
                Unicode Bidirectional Algorithm (UBA) detection, Alef normalization, and diacritic stripping.
              </p>
            </div>

            <div className="space-y-3 rounded-lg border border-border/60 bg-card p-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Arabic Text</label>
                <input
                  type="text"
                  dir="auto"
                  value={arabicText}
                  onChange={(e) => setArabicText(e.target.value)}
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <Button size="sm" onClick={handleNormalizeArabic}>
                Normalize & Test BiDi
              </Button>
            </div>

            {arabicNormalized && (
              <div className="rounded-lg border border-border/80 bg-muted/10 p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Direction: {isRtl ? 'Right-To-Left (RTL)' : 'Left-To-Right (LTR)'}</span>
                </div>
                <div className="p-2 rounded bg-background" dir={isRtl ? 'rtl' : 'ltr'}>
                  {arabicNormalized}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Claude Code CLI Bridge */}
        {activeTab === 'claude' && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <h2 className="text-base font-semibold">Claude Code Headless Bridge</h2>
              <p className="text-xs text-muted-foreground">
                Official headless integration connecting OpencodeSilver with Anthropic Claude Code Pro/Max.
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-medium">Headless CLI Bridge Ready</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">CLI: claude</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Spawn flags configured: <code>--dangerously-skip-permissions</code>, <code>--output-format=stream-json</code>, <code>--non-interactive</code>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
