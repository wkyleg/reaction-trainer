import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface GameResults {
  score: number;
  maxCombo: number;
  reactionTimes: number[];
  stressTimeline: Array<{
    time: number;
    stress: number;
    calm: number;
    flowActive: boolean;
  }>;
  totalHits: number;
  totalMisses: number;
  totalSpawned: number;
  difficulty: string;
  roundDuration: number;
}

function StatBox({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div
      className="px-5 py-4 border"
      style={{
        borderColor: `${color}60`,
        background: `${color}08`,
        boxShadow: `0 0 10px ${color}15`,
      }}
    >
      <span
        className="text-[10px] tracking-[0.2em] uppercase block mb-1"
        style={{ fontFamily: "'Rajdhani', sans-serif", color: `${color}80` }}
      >
        {label}
      </span>
      <span
        className="text-2xl font-black tabular-nums block"
        style={{ fontFamily: "'Orbitron', sans-serif", color }}
      >
        {value}
      </span>
      {sub && (
        <span
          className="text-[10px] tracking-wider block mt-1"
          style={{ fontFamily: "'Rajdhani', sans-serif", color: `${color}60` }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}

export function ResultsPage() {
  const navigate = useNavigate();

  const results = useMemo<GameResults | null>(() => {
    try {
      const raw = sessionStorage.getItem('reactionResults');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  if (!results) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center scanlines grid-bg">
        <p
          className="text-lg tracking-[0.2em] mb-6"
          style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--color-primary)' }}
        >
          NO RESULTS FOUND
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-8 py-3 border text-sm font-bold tracking-[0.2em] cursor-pointer
                     hover:scale-105 active:scale-95 transition-transform"
          style={{
            fontFamily: "'Orbitron', sans-serif",
            borderColor: 'var(--color-primary)',
            color: 'var(--color-primary)',
            background: 'transparent',
          }}
        >
          HOME
        </button>
      </div>
    );
  }

  const accuracy = results.totalSpawned > 0 ? Math.round((results.totalHits / results.totalSpawned) * 100) : 0;
  const meanReaction = results.reactionTimes.length > 0
    ? (results.reactionTimes.reduce((a, b) => a + b, 0) / results.reactionTimes.length * 1000).toFixed(0)
    : '--';
  const fastestReaction = results.reactionTimes.length > 0
    ? (Math.min(...results.reactionTimes) * 1000).toFixed(0)
    : '--';

  const flowMoments = results.stressTimeline.filter((s) => s.flowActive).length;
  const overloadMoments = results.stressTimeline.filter((s) => s.stress > 0.7).length;

  const chartData = results.stressTimeline.map((s) => ({
    time: Math.round(s.time),
    stress: +(s.stress * 100).toFixed(0),
    calm: +(s.calm * 100).toFixed(0),
  }));

  const grade =
    results.score >= 5000
      ? 'S'
      : results.score >= 3000
        ? 'A'
        : results.score >= 1500
          ? 'B'
          : results.score >= 500
            ? 'C'
            : 'D';

  const gradeColor: Record<string, string> = {
    S: '#FFFF00',
    A: '#00FF88',
    B: '#00FFFF',
    C: '#FF00AA',
    D: '#FF0000',
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4 scanlines grid-bg overflow-y-auto">
      {/* Header */}
      <p
        className="text-xs tracking-[0.4em] uppercase mb-2"
        style={{ fontFamily: "'Rajdhani', sans-serif", color: 'var(--color-secondary)' }}
      >
        MISSION COMPLETE
      </p>
      <h1
        className="text-4xl font-black tracking-[0.15em] neon-text mb-1"
        style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--color-primary)' }}
      >
        RESULTS
      </h1>
      <p
        className="text-xs tracking-[0.2em] uppercase mb-8"
        style={{ fontFamily: "'Rajdhani', sans-serif", color: 'rgba(0, 255, 255, 0.4)' }}
      >
        DIFFICULTY: {results.difficulty.toUpperCase()}
      </p>

      {/* Grade */}
      <div
        className="text-8xl font-black mb-8"
        style={{
          fontFamily: "'Orbitron', sans-serif",
          color: gradeColor[grade],
          textShadow: `0 0 20px ${gradeColor[grade]}, 0 0 40px ${gradeColor[grade]}, 0 0 60px ${gradeColor[grade]}`,
        }}
      >
        {grade}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl mb-8">
        <StatBox label="Score" value={results.score} color="#00FFFF" />
        <StatBox label="Accuracy" value={`${accuracy}%`} color="#00FF88" sub={`${results.totalHits}/${results.totalSpawned}`} />
        <StatBox label="Mean RT" value={`${meanReaction}ms`} color="#FF00AA" />
        <StatBox label="Best Streak" value={`×${results.maxCombo}`} color="#FFFF00" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-2xl mb-10">
        <StatBox label="Fastest RT" value={`${fastestReaction}ms`} color="#00FFFF" />
        <StatBox label="Flow Moments" value={flowMoments} color="#00FF88" />
        <StatBox label="Overload" value={overloadMoments} color="#FF0000" />
      </div>

      {/* Stress timeline chart */}
      {chartData.length > 0 && (
        <div className="w-full max-w-2xl mb-10">
          <h3
            className="text-sm tracking-[0.2em] mb-3"
            style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--color-primary)' }}
          >
            NEURAL TIMELINE
          </h3>
          <div
            className="p-4 border"
            style={{
              borderColor: 'rgba(0, 255, 255, 0.15)',
              background: 'rgba(0, 255, 255, 0.02)',
            }}
          >
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis
                  dataKey="time"
                  stroke="rgba(0, 255, 255, 0.3)"
                  tick={{ fill: 'rgba(0, 255, 255, 0.4)', fontSize: 10, fontFamily: 'Rajdhani' }}
                  tickFormatter={(v) => `${v}s`}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="rgba(0, 255, 255, 0.15)"
                  tick={{ fill: 'rgba(0, 255, 255, 0.4)', fontSize: 10, fontFamily: 'Rajdhani' }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#111',
                    border: '1px solid rgba(0, 255, 255, 0.3)',
                    fontFamily: 'Rajdhani',
                    fontSize: 12,
                    color: '#00FFFF',
                  }}
                  labelFormatter={(v) => `${v}s`}
                />
                <ReferenceLine y={60} stroke="rgba(0, 255, 136, 0.2)" strokeDasharray="4 4" label="" />
                <ReferenceLine y={70} stroke="rgba(255, 0, 0, 0.2)" strokeDasharray="4 4" label="" />
                <Line
                  type="monotone"
                  dataKey="calm"
                  stroke="#00FF88"
                  strokeWidth={2}
                  dot={false}
                  name="Calm"
                />
                <Line
                  type="monotone"
                  dataKey="stress"
                  stroke="#FF0000"
                  strokeWidth={2}
                  dot={false}
                  name="Stress"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-4 justify-center">
        <button
          type="button"
          onClick={() => navigate('/calibrate')}
          className="px-8 py-3 border-2 text-sm font-bold tracking-[0.2em] cursor-pointer
                     hover:scale-105 active:scale-95 transition-transform pulse-neon"
          style={{
            fontFamily: "'Orbitron', sans-serif",
            borderColor: 'var(--color-primary)',
            color: 'var(--color-primary)',
            background: 'rgba(0, 255, 255, 0.05)',
          }}
        >
          PLAY AGAIN
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-8 py-3 border text-sm font-bold tracking-[0.2em] cursor-pointer
                     hover:scale-105 active:scale-95 transition-transform"
          style={{
            fontFamily: "'Orbitron', sans-serif",
            borderColor: 'var(--color-secondary)',
            color: 'var(--color-secondary)',
            background: 'transparent',
          }}
        >
          HOME
        </button>
      </div>
    </div>
  );
}
