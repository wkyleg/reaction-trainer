import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Target } from '../lib/gameStore';
import { getDifficultyConfig, useGameStore } from '../lib/gameStore';
import { useNeuroStore } from '../neuro/hooks';
import type { NeuroManager } from '../neuro/neuroManager';

function TargetShape({ target, onHit }: { target: Target; onHit: (id: string) => void }) {
  const elapsed = (performance.now() - target.spawnedAt) / 1000;
  const lifeRatio = Math.min(elapsed / target.lifetime, 1);
  const opacity = 1 - lifeRatio * 0.6;
  const r = target.size / 2;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    el.classList.remove('target-spawn');
    el.classList.add('target-hit');
    setTimeout(() => onHit(target.id), 200);
  };

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: target.x - r,
    top: target.y - r,
    width: target.size,
    height: target.size,
    opacity,
    cursor: 'crosshair',
    filter: 'drop-shadow(0 0 8px var(--color-primary)) drop-shadow(0 0 16px var(--color-primary))',
  };

  const strokeColor =
    lifeRatio > 0.7 ? 'var(--color-stress)' : lifeRatio > 0.4 ? 'var(--color-accent)' : 'var(--color-primary)';

  return (
    <div className="target-spawn" style={baseStyle} onClick={handleClick}>
      <svg width={target.size} height={target.size} viewBox={`0 0 ${target.size} ${target.size}`}>
        {target.shape === 'circle' && (
          <circle cx={r} cy={r} r={r - 3} fill="none" stroke={strokeColor} strokeWidth="2" />
        )}
        {target.shape === 'triangle' && (
          <polygon
            points={`${r},3 ${target.size - 3},${target.size - 3} 3,${target.size - 3}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
          />
        )}
        {target.shape === 'hexagon' &&
          (() => {
            const cx = r;
            const cy = r;
            const hr = r - 3;
            const pts = Array.from({ length: 6 }, (_, i) => {
              const angle = (Math.PI / 3) * i - Math.PI / 2;
              return `${cx + hr * Math.cos(angle)},${cy + hr * Math.sin(angle)}`;
            }).join(' ');
            return <polygon points={pts} fill="none" stroke={strokeColor} strokeWidth="2" />;
          })()}
        <circle cx={r} cy={r} r="3" fill={strokeColor} opacity="0.6" />
      </svg>
    </div>
  );
}

function getBrainStateLabel(calm: number, arousal: number): string {
  if (calm > 0.6 && arousal < 0.4) return 'RELAXED';
  if (calm > 0.5 && arousal > 0.5) return 'FOCUSED';
  if (calm < 0.4 && arousal > 0.6) return 'ALERT';
  return 'BALANCED';
}

export function PlayPage() {
  const navigate = useNavigate();
  const manager = useNeuroStore((s) => s.manager) as NeuroManager | null;

  const score = useGameStore((s) => s.score);
  const combo = useGameStore((s) => s.combo);
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  const targets = useGameStore((s) => s.targets);
  const flowActive = useGameStore((s) => s.flowActive);
  const stressLevel = useGameStore((s) => s.stressLevel);
  const difficulty = useGameStore((s) => s.difficulty);

  const startGame = useGameStore((s) => s.startGame);
  const endGame = useGameStore((s) => s.endGame);
  const spawnTarget = useGameStore((s) => s.spawnTarget);
  const hitTarget = useGameStore((s) => s.hitTarget);
  const tickTimer = useGameStore((s) => s.tickTimer);
  const updateStress = useGameStore((s) => s.updateStress);
  const setFlowActive = useGameStore((s) => s.setFlowActive);
  const removeExpiredTargets = useGameStore((s) => s.removeExpiredTargets);

  const lastSpawnRef = useRef(0);
  const lastStressUpdateRef = useRef(0);
  const calmStreakRef = useRef(0);
  const rafRef = useRef(0);
  const lastFrameRef = useRef(0);
  const gameEndedRef = useRef(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const [hitEffects, setHitEffects] = useState<Array<{ id: string; x: number; y: number }>>([]);
  const [displayBpm, setDisplayBpm] = useState<number | null>(null);
  const [displayHrv, setDisplayHrv] = useState<number | null>(null);
  const [displayCalm, setDisplayCalm] = useState(0);
  const [displayArousal, setDisplayArousal] = useState(0);
  const [displaySignal, setDisplaySignal] = useState(0);
  const [displaySource, setDisplaySource] = useState<string>('none');
  const cameraActive = useNeuroStore((s) => s.cameraActive);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-attach video element when camera state changes
  useEffect(() => {
    const container = videoContainerRef.current;
    if (!container || !manager) return;
    const videoEl = manager.getCameraVideoElement();
    if (videoEl) {
      videoEl.style.width = '100%';
      videoEl.style.height = '100%';
      videoEl.style.objectFit = 'cover';
      videoEl.style.borderRadius = '6px';
      videoEl.style.transform = 'scaleX(-1)';
      container.appendChild(videoEl);
      return () => {
        if (container.contains(videoEl)) container.removeChild(videoEl);
      };
    }
  }, [manager, cameraActive]);

  useEffect(() => {
    gameEndedRef.current = false;
    startGame();
    lastFrameRef.current = 0;
    lastSpawnRef.current = 0;
    lastStressUpdateRef.current = 0;
    calmStreakRef.current = 0;

    const loop = (now: number) => {
      if (gameEndedRef.current) return;

      const dt = lastFrameRef.current > 0 ? Math.min((now - lastFrameRef.current) / 1000, 0.1) : 0;
      lastFrameRef.current = now;

      tickTimer(dt);
      removeExpiredTargets();

      const state = useGameStore.getState();
      const neuro = useNeuroStore.getState();

      if (state.timeRemaining <= 0) {
        gameEndedRef.current = true;
        endGame();
        navigate('/results');
        return;
      }

      const config = getDifficultyConfig(state.difficulty);
      if (now - lastSpawnRef.current > config.spawnInterval * 1000) {
        spawnTarget();
        lastSpawnRef.current = now;
      }

      if (now - lastStressUpdateRef.current > 500) {
        const calm = neuro.calm;
        const arousal = neuro.arousal;
        updateStress(arousal, calm, {
          arousal,
          bpm: neuro.bpm,
          hrv: neuro.hrvRmssd,
          alphaPower: neuro.alphaPower,
          betaPower: neuro.betaPower,
          thetaPower: neuro.thetaPower,
          deltaPower: neuro.deltaPower,
          gammaPower: neuro.gammaPower,
          alphaPeakFreq: neuro.alphaPeakFreq,
          alphaBumpState: neuro.alphaBumpState,
          respirationRate: neuro.respirationRate,
        });
        lastStressUpdateRef.current = now;

        setDisplayBpm(neuro.bpm !== null ? Math.round(neuro.bpm) : null);
        setDisplayHrv(neuro.hrvRmssd !== null ? Math.round(neuro.hrvRmssd) : null);
        setDisplayCalm(Math.round(calm * 100));
        setDisplayArousal(Math.round(arousal * 100));
        setDisplaySignal(neuro.signalQuality);
        setDisplaySource(neuro.source);

        if (calm > 0.6) {
          calmStreakRef.current += 0.5;
          if (calmStreakRef.current >= 3) setFlowActive(true);
        } else {
          calmStreakRef.current = 0;
          setFlowActive(false);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [startGame, endGame, navigate, tickTimer, removeExpiredTargets, spawnTarget, updateStress, setFlowActive]);

  const onHit = useCallback(
    (id: string) => {
      const t = useGameStore.getState().targets.find((t) => t.id === id);
      if (t) {
        setHitEffects((prev) => [...prev, { id, x: t.x, y: t.y }]);
        setTimeout(() => setHitEffects((prev) => prev.filter((e) => e.id !== id)), 400);
      }
      const neuro = useNeuroStore.getState();
      hitTarget(id, {
        calm: neuro.calm,
        arousal: neuro.arousal,
        bpm: neuro.bpm,
        hrv: neuro.hrvRmssd,
        stress: useGameStore.getState().stressLevel,
      });
    },
    [hitTarget],
  );

  const stressIntensity = Math.min(stressLevel, 1);
  const borderColor = `rgb(${Math.round(stressIntensity * 255)}, ${Math.round((1 - stressIntensity) * 255)}, ${Math.round((1 - stressIntensity) * 136)})`;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = Math.floor(timeRemaining % 60);
  const brainState = getBrainStateLabel(displayCalm / 100, displayArousal / 100);

  return (
    <div
      className="h-screen relative select-none"
      style={{
        overflow: 'hidden',
        background: 'var(--color-bg)',
        cursor: 'crosshair',
        boxShadow: stressIntensity > 0.3 ? `inset 0 0 ${40 + stressIntensity * 60}px ${borderColor}40` : 'none',
        transition: 'box-shadow 0.5s ease',
      }}
    >
      {/* Stress tint overlay */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          background: `radial-gradient(ellipse at center, transparent 40%, ${borderColor}15 100%)`,
          opacity: stressIntensity > 0.3 ? stressIntensity : 0,
        }}
      />

      {flowActive && <div className="absolute inset-0 flow-shimmer pointer-events-none" />}

      {/* Stress bar - left */}
      <div
        className="absolute left-0 top-0 w-1.5 transition-all duration-300"
        style={{
          height: `${stressIntensity * 100}%`,
          background: `linear-gradient(180deg, var(--color-stress), ${borderColor})`,
          boxShadow: `0 0 10px ${borderColor}`,
        }}
      />

      {/* Calm bar - right */}
      <div
        className="absolute right-0 bottom-0 w-1.5 transition-all duration-300"
        style={{
          height: `${displayCalm}%`,
          background: 'linear-gradient(0deg, var(--color-calm), transparent)',
          boxShadow: '0 0 10px var(--color-calm)',
        }}
      />

      {/* HUD top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5 z-20">
        <div className="flex items-center gap-5">
          <div>
            <span
              className="text-[10px] tracking-[0.2em] block"
              style={{ fontFamily: "'Rajdhani', sans-serif", color: 'var(--color-muted)' }}
            >
              SCORE
            </span>
            <span
              className="text-3xl font-black tabular-nums neon-text"
              style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--color-primary)' }}
            >
              {score}
            </span>
          </div>

          {combo > 1 && (
            <div className="px-4 py-1.5 neon-border-secondary" style={{ background: 'rgba(255, 0, 170, 0.1)' }}>
              <span
                className="text-sm font-bold tracking-wider"
                style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--color-secondary)' }}
              >
                ×{combo}
              </span>
            </div>
          )}

          {flowActive && (
            <div
              className="px-4 py-1.5"
              style={{
                background: 'rgba(0, 255, 136, 0.1)',
                border: '1px solid var(--color-calm)',
                boxShadow: '0 0 10px rgba(0, 255, 136, 0.3)',
              }}
            >
              <span
                className="text-xs font-bold tracking-[0.2em]"
                style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--color-calm)' }}
              >
                FLOW ×2
              </span>
            </div>
          )}
        </div>

        <div className="text-right">
          <span
            className="text-[10px] tracking-[0.2em] block"
            style={{ fontFamily: "'Rajdhani', sans-serif", color: 'var(--color-muted)' }}
          >
            TIME
          </span>
          <span
            className="text-3xl font-black tabular-nums"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              color: timeRemaining <= 10 ? 'var(--color-stress)' : 'var(--color-primary)',
              textShadow:
                timeRemaining <= 10
                  ? '0 0 10px var(--color-stress), 0 0 20px var(--color-stress)'
                  : '0 0 10px var(--color-primary)',
            }}
          >
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Difficulty badge */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20">
        <span
          className="text-[10px] tracking-[0.3em] uppercase"
          style={{ fontFamily: "'Rajdhani', sans-serif", color: 'rgba(255, 255, 0, 0.3)' }}
        >
          {difficulty}
        </span>
      </div>

      {/* Targets */}
      {targets.map((target) => (
        <TargetShape key={target.id} target={target} onHit={onHit} />
      ))}

      {/* Hit effects */}
      {hitEffects.map((effect) => (
        <div
          key={effect.id}
          className="absolute pointer-events-none"
          style={{ left: effect.x - 20, top: effect.y - 20 }}
        >
          <svg width="40" height="40" className="target-hit" style={{ color: 'var(--color-accent)' }}>
            <circle cx="20" cy="20" r="15" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
            <circle cx="20" cy="20" r="5" fill="var(--color-accent)" opacity="0.5" />
          </svg>
        </div>
      ))}

      {/* Bottom HUD: neuro metrics + webcam */}
      <div className="absolute bottom-0 left-0 right-0 z-20" style={{ padding: '12px 24px 16px' }}>
        <div className="flex items-end justify-between max-w-5xl mx-auto">
          {/* Webcam thumbnail */}
          <div
            ref={videoContainerRef}
            className="flex-shrink-0 overflow-hidden"
            style={{
              width: 120,
              height: 90,
              borderRadius: 6,
              border: cameraActive ? '1px solid rgba(0, 255, 255, 0.2)' : 'none',
              background: cameraActive ? '#111' : 'transparent',
              visibility: cameraActive ? 'visible' : 'hidden',
            }}
          />

          {/* Stress + Calm bars */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <span
                className="text-xs tracking-[0.15em]"
                style={{ fontFamily: "'Rajdhani', sans-serif", color: 'rgba(255, 0, 0, 0.6)' }}
              >
                STRESS
              </span>
              <div className="w-32 h-2 bg-gray-900 overflow-hidden" style={{ borderRadius: 2 }}>
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${stressIntensity * 100}%`,
                    background: 'var(--color-stress)',
                    boxShadow: '0 0 6px var(--color-stress)',
                  }}
                />
              </div>
              <span
                className="text-xs tabular-nums"
                style={{ fontFamily: "'Rajdhani', sans-serif", color: 'rgba(255, 0, 0, 0.5)', minWidth: '3ch' }}
              >
                {Math.round(stressIntensity * 100)}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <span
                className="text-xs tracking-[0.15em]"
                style={{ fontFamily: "'Rajdhani', sans-serif", color: 'rgba(0, 255, 136, 0.6)' }}
              >
                CALM
              </span>
              <div className="w-32 h-2 bg-gray-900 overflow-hidden" style={{ borderRadius: 2 }}>
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${displayCalm}%`,
                    background: 'var(--color-calm)',
                    boxShadow: '0 0 6px var(--color-calm)',
                  }}
                />
              </div>
              <span
                className="text-xs tabular-nums"
                style={{ fontFamily: "'Rajdhani', sans-serif", color: 'rgba(0, 255, 136, 0.5)', minWidth: '3ch' }}
              >
                {displayCalm}
              </span>
            </div>
          </div>

          {/* Neuro readouts */}
          <div className="flex items-center gap-6">
            {displayBpm !== null && (
              <div className="text-right">
                <span
                  className="text-[10px] tracking-[0.15em] block"
                  style={{ fontFamily: "'Rajdhani', sans-serif", color: 'rgba(255, 0, 170, 0.5)' }}
                >
                  HR
                </span>
                <span
                  className="text-lg font-bold tabular-nums"
                  style={{ fontFamily: "'Orbitron', sans-serif", color: 'rgba(255, 0, 170, 0.7)' }}
                >
                  {displayBpm}
                </span>
              </div>
            )}
            {displayHrv !== null && (
              <div className="text-right">
                <span
                  className="text-[10px] tracking-[0.15em] block"
                  style={{ fontFamily: "'Rajdhani', sans-serif", color: 'rgba(0, 255, 255, 0.4)' }}
                >
                  HRV
                </span>
                <span
                  className="text-sm font-bold tabular-nums"
                  style={{ fontFamily: "'Orbitron', sans-serif", color: 'rgba(0, 255, 255, 0.5)' }}
                >
                  {displayHrv}
                </span>
              </div>
            )}
            <div className="text-right">
              <span
                className="text-[10px] tracking-[0.15em] block"
                style={{ fontFamily: "'Rajdhani', sans-serif", color: 'rgba(0, 255, 255, 0.4)' }}
              >
                STATE
              </span>
              <span
                className="text-xs font-bold tracking-wider"
                style={{ fontFamily: "'Orbitron', sans-serif", color: 'rgba(0, 255, 255, 0.45)' }}
              >
                {brainState}
              </span>
            </div>
            {displaySource !== 'none' && (
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background:
                      displaySignal > 0.6
                        ? 'var(--color-calm)'
                        : displaySignal > 0.3
                          ? 'var(--color-accent)'
                          : 'var(--color-stress)',
                    boxShadow: `0 0 4px ${displaySignal > 0.6 ? 'var(--color-calm)' : displaySignal > 0.3 ? 'var(--color-accent)' : 'var(--color-stress)'}`,
                  }}
                />
                <span
                  className="text-[10px] tracking-wider"
                  style={{ fontFamily: "'Rajdhani', sans-serif", color: 'rgba(0, 255, 255, 0.35)' }}
                >
                  {displaySource === 'eeg' ? 'EEG' : displaySource === 'rppg' ? 'CAM' : 'SIM'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
