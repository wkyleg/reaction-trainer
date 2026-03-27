import { create } from 'zustand';

export type TargetShape = 'circle' | 'triangle' | 'hexagon';
export type Difficulty = 'normal' | 'hard' | 'extreme';

export interface Target {
  id: string;
  shape: TargetShape;
  x: number;
  y: number;
  size: number;
  spawnedAt: number;
  lifetime: number;
}

export interface StressSnapshot {
  time: number;
  stress: number;
  calm: number;
  flowActive: boolean;
}

interface GameState {
  score: number;
  combo: number;
  maxCombo: number;
  targets: Target[];
  reactionTimes: number[];
  stressLevel: number;
  stressTimeline: StressSnapshot[];
  flowActive: boolean;
  flowStreak: number;
  isPlaying: boolean;
  timeRemaining: number;
  difficulty: Difficulty;
  totalHits: number;
  totalMisses: number;
  totalSpawned: number;
  roundDuration: number;
}

interface GameActions {
  setDifficulty: (d: Difficulty) => void;
  startGame: () => void;
  endGame: () => void;
  spawnTarget: () => void;
  hitTarget: (id: string) => void;
  missTarget: (id: string) => void;
  tickTimer: (dt: number) => void;
  updateStress: (stress: number, calm: number) => void;
  setFlowActive: (active: boolean) => void;
  removeExpiredTargets: () => void;
  reset: () => void;
}

export type GameStore = GameState & GameActions;

const SHAPES: TargetShape[] = ['circle', 'triangle', 'hexagon'];

const DIFFICULTY_CONFIG = {
  normal: { spawnInterval: 1.2, targetLifetime: 2.5, targetSize: 70, maxTargets: 3 },
  hard: { spawnInterval: 0.8, targetLifetime: 1.8, targetSize: 55, maxTargets: 5 },
  extreme: { spawnInterval: 0.5, targetLifetime: 1.2, targetSize: 42, maxTargets: 7 },
} as const;

const ROUND_DURATION = 60;

let idCounter = 0;

export const useGameStore = create<GameStore>((set, get) => ({
  score: 0,
  combo: 0,
  maxCombo: 0,
  targets: [],
  reactionTimes: [],
  stressLevel: 0,
  stressTimeline: [],
  flowActive: false,
  flowStreak: 0,
  isPlaying: false,
  timeRemaining: ROUND_DURATION,
  difficulty: 'normal',
  totalHits: 0,
  totalMisses: 0,
  totalSpawned: 0,
  roundDuration: ROUND_DURATION,

  setDifficulty: (d) => set({ difficulty: d }),

  startGame: () => {
    idCounter = 0;
    set({
      score: 0,
      combo: 0,
      maxCombo: 0,
      targets: [],
      reactionTimes: [],
      stressLevel: 0,
      stressTimeline: [],
      flowActive: false,
      flowStreak: 0,
      isPlaying: true,
      timeRemaining: ROUND_DURATION,
      totalHits: 0,
      totalMisses: 0,
      totalSpawned: 0,
    });
  },

  endGame: () => {
    const state = get();
    const results = {
      score: state.score,
      maxCombo: state.maxCombo,
      reactionTimes: state.reactionTimes,
      stressTimeline: state.stressTimeline,
      totalHits: state.totalHits,
      totalMisses: state.totalMisses,
      totalSpawned: state.totalSpawned,
      difficulty: state.difficulty,
      roundDuration: state.roundDuration,
    };
    sessionStorage.setItem('reactionResults', JSON.stringify(results));
    set({ isPlaying: false });
  },

  spawnTarget: () => {
    const { targets, difficulty, flowActive } = get();
    const config = DIFFICULTY_CONFIG[difficulty];
    if (targets.length >= config.maxTargets) return;

    const margin = 80;
    const size = flowActive ? config.targetSize * 1.3 : config.targetSize;
    const lifetime = flowActive ? config.targetLifetime * 1.4 : config.targetLifetime;

    const target: Target = {
      id: `t-${++idCounter}`,
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      x: margin + Math.random() * (window.innerWidth - margin * 2),
      y: margin + Math.random() * (window.innerHeight - margin * 2 - 100),
      size,
      spawnedAt: performance.now(),
      lifetime,
    };

    set((s) => ({
      targets: [...s.targets, target],
      totalSpawned: s.totalSpawned + 1,
    }));
  },

  hitTarget: (id) => {
    const { targets, flowActive } = get();
    const target = targets.find((t) => t.id === id);
    if (!target) return;

    const reactionTime = (performance.now() - target.spawnedAt) / 1000;
    const baseScore = Math.max(10, Math.round(100 * (1 - reactionTime / target.lifetime)));
    const multiplier = flowActive ? 2 : 1;

    set((s) => {
      const newCombo = s.combo + 1;
      const comboBonus = Math.floor(newCombo / 5) * 10;
      return {
        targets: s.targets.filter((t) => t.id !== id),
        score: s.score + (baseScore + comboBonus) * multiplier,
        combo: newCombo,
        maxCombo: Math.max(s.maxCombo, newCombo),
        reactionTimes: [...s.reactionTimes, reactionTime],
        totalHits: s.totalHits + 1,
      };
    });
  },

  missTarget: (id) => {
    set((s) => ({
      targets: s.targets.filter((t) => t.id !== id),
      combo: 0,
      totalMisses: s.totalMisses + 1,
    }));
  },

  tickTimer: (dt) => {
    set((s) => ({
      timeRemaining: Math.max(0, s.timeRemaining - dt),
    }));
  },

  updateStress: (stress, calm) => {
    const elapsed = get().roundDuration - get().timeRemaining;
    set((s) => ({
      stressLevel: stress,
      stressTimeline: [
        ...s.stressTimeline,
        { time: elapsed, stress, calm, flowActive: s.flowActive },
      ],
    }));
  },

  setFlowActive: (active) => {
    set((s) => ({
      flowActive: active,
      flowStreak: active ? s.flowStreak + 1 : 0,
    }));
  },

  removeExpiredTargets: () => {
    const now = performance.now();
    set((s) => {
      const expired = s.targets.filter((t) => (now - t.spawnedAt) / 1000 > t.lifetime);
      const remaining = s.targets.filter((t) => (now - t.spawnedAt) / 1000 <= t.lifetime);
      return {
        targets: remaining,
        combo: expired.length > 0 ? 0 : s.combo,
        totalMisses: s.totalMisses + expired.length,
      };
    });
  },

  reset: () => {
    set({
      score: 0,
      combo: 0,
      maxCombo: 0,
      targets: [],
      reactionTimes: [],
      stressLevel: 0,
      stressTimeline: [],
      flowActive: false,
      flowStreak: 0,
      isPlaying: false,
      timeRemaining: ROUND_DURATION,
      totalHits: 0,
      totalMisses: 0,
      totalSpawned: 0,
    });
  },
}));

export function getDifficultyConfig(d: Difficulty) {
  return DIFFICULTY_CONFIG[d];
}
