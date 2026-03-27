import { useState } from 'react';
import { useNavigate } from 'react-router';
import { DeviceConnect } from '../components/DeviceConnect';
import type { Difficulty } from '../lib/gameStore';
import { useGameStore } from '../lib/gameStore';
import { useNeuroConnection } from '../neuro/hooks';

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  color = 'var(--color-primary)',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span
          className="text-xs tracking-[0.15em] uppercase"
          style={{ fontFamily: "'Rajdhani', sans-serif", color: 'var(--color-muted)' }}
        >
          {label}
        </span>
        <span className="text-sm font-bold tabular-nums" style={{ fontFamily: "'Orbitron', sans-serif", color }}>
          {value}%
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(90deg, ${color} ${value}%, rgba(255,255,255,0.1) ${value}%)`,
          borderRadius: 4,
          accentColor: color,
        }}
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-2 cursor-pointer"
      style={{ background: 'none', border: 'none' }}
    >
      <span
        className="text-xs tracking-[0.15em] uppercase"
        style={{ fontFamily: "'Rajdhani', sans-serif", color: 'var(--color-muted)' }}
      >
        {label}
      </span>
      <div
        className="w-11 h-6 rounded-full relative transition-colors duration-200"
        style={{
          background: checked ? 'var(--color-calm)' : 'rgba(255, 255, 255, 0.15)',
          boxShadow: checked ? '0 0 8px var(--color-calm)' : 'none',
        }}
      >
        <div
          className="absolute top-0.5 w-5 h-5 rounded-full transition-transform duration-200"
          style={{
            background: checked ? '#000' : 'rgba(255,255,255,0.5)',
            transform: checked ? 'translateX(22px)' : 'translateX(2px)',
          }}
        />
      </div>
    </button>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { mockEnabled, enableMock, disableMock } = useNeuroConnection();
  const difficulty = useGameStore((s) => s.difficulty);
  const setDifficulty = useGameStore((s) => s.setDifficulty);

  const [audioVolume, setAudioVolume] = useState(80);
  const [visualIntensity, setVisualIntensity] = useState(70);
  const [reducedMotion, setReducedMotion] = useState(false);

  const difficulties: Difficulty[] = ['normal', 'hard', 'extreme'];
  const diffColors: Record<Difficulty, string> = {
    normal: 'var(--color-calm)',
    hard: 'var(--color-accent)',
    extreme: 'var(--color-stress)',
  };

  return (
    <div className="min-h-screen flex flex-col items-center pt-16 pb-10 px-6 scanlines grid-bg overflow-y-auto">
      {/* Header */}
      <h1
        className="text-3xl font-black tracking-[0.2em] neon-text mb-12"
        style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--color-primary)' }}
      >
        SETTINGS
      </h1>

      <div className="w-full max-w-md flex flex-col gap-10">
        {/* Audio */}
        <section>
          <h3
            className="text-sm tracking-[0.2em] mb-4 pb-2 border-b"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              color: 'var(--color-secondary)',
              borderColor: 'rgba(255, 0, 170, 0.2)',
            }}
          >
            AUDIO
          </h3>
          <Slider label="Master Volume" value={audioVolume} onChange={setAudioVolume} color="var(--color-secondary)" />
        </section>

        {/* Visuals */}
        <section>
          <h3
            className="text-sm tracking-[0.2em] mb-4 pb-2 border-b"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              color: 'var(--color-accent)',
              borderColor: 'rgba(255, 255, 0, 0.2)',
            }}
          >
            VISUALS
          </h3>
          <div className="flex flex-col gap-5">
            <Slider
              label="Stress Effect Intensity"
              value={visualIntensity}
              onChange={setVisualIntensity}
              color="var(--color-accent)"
            />
            <Toggle label="Reduced Motion" checked={reducedMotion} onChange={setReducedMotion} />
          </div>
        </section>

        {/* Difficulty */}
        <section>
          <h3
            className="text-sm tracking-[0.2em] mb-4 pb-2 border-b"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              color: 'var(--color-primary)',
              borderColor: 'rgba(0, 255, 255, 0.2)',
            }}
          >
            DEFAULT DIFFICULTY
          </h3>
          <div className="flex gap-3">
            {difficulties.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className="flex-1 py-3 text-xs font-bold tracking-[0.15em] uppercase cursor-pointer
                           transition-all hover:scale-[1.03] active:scale-[0.97]"
                style={{
                  fontFamily: "'Orbitron', sans-serif",
                  color: diffColors[d],
                  border: `1px solid ${difficulty === d ? diffColors[d] : 'rgba(255,255,255,0.1)'}`,
                  background:
                    difficulty === d ? `color-mix(in srgb, ${diffColors[d]} 10%, transparent)` : 'transparent',
                  boxShadow:
                    difficulty === d ? `0 0 10px color-mix(in srgb, ${diffColors[d]} 30%, transparent)` : 'none',
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </section>

        {/* Neural / Mock toggle */}
        <section>
          <h3
            className="text-sm tracking-[0.2em] mb-4 pb-2 border-b"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              color: 'var(--color-calm)',
              borderColor: 'rgba(0, 255, 136, 0.2)',
            }}
          >
            NEURAL INPUT
          </h3>
          <Toggle
            label="Simulated Signals (Mock Mode)"
            checked={mockEnabled}
            onChange={(v) => (v ? enableMock() : disableMock())}
          />
          <div className="mt-5">
            <DeviceConnect showSkip={false} />
          </div>
        </section>
      </div>

      {/* Back */}
      <button
        type="button"
        onClick={() => navigate('/')}
        className="mt-10 px-8 py-3 border text-sm font-bold tracking-[0.2em] cursor-pointer
                   hover:scale-105 active:scale-95 transition-transform"
        style={{
          fontFamily: "'Orbitron', sans-serif",
          borderColor: 'var(--color-primary)',
          color: 'var(--color-primary)',
          background: 'transparent',
        }}
      >
        ← HOME
      </button>
    </div>
  );
}
