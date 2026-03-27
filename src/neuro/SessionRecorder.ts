import type { NeuroState } from './neuroManager';

export interface SessionSample {
  t: number;
  calm: number;
  arousal: number;
  alpha: number;
  beta: number;
  theta: number;
  delta: number;
  gamma: number;
  bpm: number | null;
  hrv: number | null;
  calmnessState: string | null;
}

export interface SessionReport {
  sessionType: string;
  sessionLabel: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  samples: SessionSample[];
  dominantState: string;
  avgCalm: number;
  avgArousal: number;
  avgBpm: number | null;
  peakBpm: number | null;
  minBpm: number | null;
  netCalmChange: number;
  netArousalChange: number;
  appSpecific?: Record<string, unknown>;
}

const SAMPLE_INTERVAL = 1;

export class SessionRecorder {
  private samples: SessionSample[] = [];
  private sampleTimer = 0;
  private startTime = 0;
  private sessionType = '';
  private sessionLabel = '';
  private active = false;
  private appData: Record<string, unknown> = {};

  start(sessionType: string, sessionLabel: string): void {
    this.samples = [];
    this.sampleTimer = 0;
    this.startTime = Date.now();
    this.sessionType = sessionType;
    this.sessionLabel = sessionLabel;
    this.active = true;
    this.appData = {};
  }

  sample(dt: number, neuro: NeuroState): void {
    if (!this.active) return;
    this.sampleTimer += dt;
    if (this.sampleTimer < SAMPLE_INTERVAL) return;
    this.sampleTimer -= SAMPLE_INTERVAL;

    this.samples.push({
      t: (Date.now() - this.startTime) / 1000,
      calm: neuro.calm,
      arousal: neuro.arousal,
      alpha: neuro.alphaPower ?? 0,
      beta: neuro.betaPower ?? 0,
      theta: neuro.thetaPower ?? 0,
      delta: neuro.deltaPower ?? 0,
      gamma: neuro.gammaPower ?? 0,
      bpm: neuro.bpm,
      hrv: neuro.hrvRmssd,
      calmnessState: neuro.calmnessState,
    });
  }

  setAppData(key: string, value: unknown): void {
    this.appData[key] = value;
  }

  isActive(): boolean {
    return this.active;
  }

  stop(): SessionReport {
    this.active = false;
    const endTime = Date.now();
    const durationMs = endTime - this.startTime;
    const s = this.samples;

    let avgCalm = 0;
    let avgArousal = 0;
    let bpmSum = 0;
    let bpmCount = 0;
    let peakBpm: number | null = null;
    let minBpm: number | null = null;

    for (const sample of s) {
      avgCalm += sample.calm;
      avgArousal += sample.arousal;
      if (sample.bpm != null) {
        bpmSum += sample.bpm;
        bpmCount++;
        if (peakBpm === null || sample.bpm > peakBpm) peakBpm = sample.bpm;
        if (minBpm === null || sample.bpm < minBpm) minBpm = sample.bpm;
      }
    }

    const n = s.length || 1;
    avgCalm /= n;
    avgArousal /= n;
    const avgBpm = bpmCount > 0 ? bpmSum / bpmCount : null;

    const windowSize = Math.min(5, Math.floor(n / 2)) || 1;
    const firstCalm = s.slice(0, windowSize).reduce((a, v) => a + v.calm, 0) / windowSize;
    const lastCalm = s.slice(-windowSize).reduce((a, v) => a + v.calm, 0) / windowSize;
    const firstArousal = s.slice(0, windowSize).reduce((a, v) => a + v.arousal, 0) / windowSize;
    const lastArousal = s.slice(-windowSize).reduce((a, v) => a + v.arousal, 0) / windowSize;

    let alphaTotal = 0;
    let betaTotal = 0;
    let thetaTotal = 0;
    for (const sample of s) {
      alphaTotal += sample.alpha;
      betaTotal += sample.beta;
      thetaTotal += sample.theta;
    }
    const bands = [
      { name: 'ALPHA — relaxed focus', val: alphaTotal },
      { name: 'BETA — active thinking', val: betaTotal },
      { name: 'THETA — deep relaxation', val: thetaTotal },
    ];
    bands.sort((a, b) => b.val - a.val);
    const dominantState = bands[0]?.val > 0 ? bands[0].name : 'No EEG data';

    return {
      sessionType: this.sessionType,
      sessionLabel: this.sessionLabel,
      startTime: this.startTime,
      endTime,
      durationMs,
      samples: s,
      dominantState,
      avgCalm,
      avgArousal,
      avgBpm,
      peakBpm,
      minBpm,
      netCalmChange: lastCalm - firstCalm,
      netArousalChange: lastArousal - firstArousal,
      appSpecific: Object.keys(this.appData).length > 0 ? this.appData : undefined,
    };
  }
}
