import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { DeviceConnect } from '../components/DeviceConnect';
import { useNeuroConnection } from '../neuro/hooks';
import { useGameStore } from '../lib/gameStore';
import type { Difficulty } from '../lib/gameStore';

type Phase = 'connect' | 'difficulty' | 'countdown';

export function CalibratePage() {
  const navigate = useNavigate();
  const { eegConnected, cameraActive, mockEnabled } = useNeuroConnection();
  const setDifficulty = useGameStore((s) => s.setDifficulty);
  const hasConnection = eegConnected || cameraActive || mockEnabled;

  const [phase, setPhase] = useState<Phase>(hasConnection ? 'difficulty' : 'connect');
  const [countdown, setCountdown] = useState(3);

  const handleReady = useCallback(() => {
    setPhase('difficulty');
  }, []);

  const handleSkip = useCallback(() => {
    setPhase('difficulty');
  }, []);

  const handleDifficulty = useCallback(
    (d: Difficulty) => {
      setDifficulty(d);
      setPhase('countdown');
    },
    [setDifficulty],
  );

  useEffect(() => {
    if (phase !== 'countdown') return;

    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate('/play');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative scanlines grid-bg select-none">
      {/* Phase: Connect */}
      {phase === 'connect' && (
        <div className="flex flex-col items-center w-full max-w-md px-4">
          <h2
            className="text-2xl font-bold tracking-[0.2em] mb-2 neon-text"
            style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--color-primary)' }}
          >
            CALIBRATE
          </h2>
          <p
            className="text-sm tracking-wide mb-8"
            style={{ fontFamily: "'Rajdhani', sans-serif", color: 'var(--color-secondary)' }}
          >
            Connect your biosensors or skip to play without
          </p>
          <DeviceConnect onReady={handleReady} showSkip onSkip={handleSkip} />
        </div>
      )}

      {/* Phase: Difficulty */}
      {phase === 'difficulty' && (
        <div className="flex flex-col items-center">
          <h2
            className="text-2xl font-bold tracking-[0.2em] mb-2 neon-text"
            style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--color-primary)' }}
          >
            SELECT DIFFICULTY
          </h2>
          <p
            className="text-sm tracking-wide mb-10"
            style={{ fontFamily: "'Rajdhani', sans-serif", color: 'rgba(0, 255, 255, 0.5)' }}
          >
            Higher difficulty = faster targets, shorter windows
          </p>

          <div className="flex flex-col gap-4 w-72">
            {([
              { key: 'normal', label: 'NORMAL', desc: 'Relaxed pace, generous timing', color: 'var(--color-calm)' },
              { key: 'hard', label: 'HARD', desc: 'Faster spawns, tighter windows', color: 'var(--color-accent)' },
              { key: 'extreme', label: 'EXTREME', desc: 'Relentless. Good luck.', color: 'var(--color-stress)' },
            ] as const).map(({ key, label, desc, color }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleDifficulty(key)}
                className="py-4 px-6 border text-left cursor-pointer transition-all
                           hover:scale-[1.03] active:scale-[0.97]"
                style={{
                  borderColor: color,
                  background: 'rgba(0, 0, 0, 0.8)',
                  boxShadow: `0 0 8px ${color}40, inset 0 0 8px ${color}10`,
                }}
              >
                <span
                  className="text-lg font-bold tracking-[0.15em] block"
                  style={{ fontFamily: "'Orbitron', sans-serif", color }}
                >
                  {label}
                </span>
                <span
                  className="text-xs tracking-wide block mt-1"
                  style={{ fontFamily: "'Rajdhani', sans-serif", color: `${color}99` }}
                >
                  {desc}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-8 text-xs tracking-[0.3em] uppercase cursor-pointer transition-opacity hover:opacity-80"
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              color: 'rgba(0, 255, 255, 0.3)',
              background: 'none',
              border: 'none',
            }}
          >
            ← BACK
          </button>
        </div>
      )}

      {/* Phase: Countdown */}
      {phase === 'countdown' && (
        <div className="flex flex-col items-center">
          <p
            className="text-sm tracking-[0.3em] mb-6"
            style={{ fontFamily: "'Rajdhani', sans-serif", color: 'var(--color-secondary)' }}
          >
            GET READY
          </p>
          <div
            key={countdown}
            className="text-9xl font-black countdown-pulse neon-text"
            style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--color-primary)' }}
          >
            {countdown}
          </div>
        </div>
      )}
    </div>
  );
}
