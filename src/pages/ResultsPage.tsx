import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HitEvent, StressSnapshot } from '../lib/gameStore';

interface GameResults {
  score: number;
  maxCombo: number;
  reactionTimes: number[];
  stressTimeline: StressSnapshot[];
  hitEvents: HitEvent[];
  totalHits: number;
  totalMisses: number;
  totalSpawned: number;
  difficulty: string;
  roundDuration: number;
}

function StatBox({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div
      className="px-8 py-5 border"
      style={{
        borderColor: `${color}60`,
        background: `${color}08`,
        boxShadow: `0 0 10px ${color}15`,
      }}
    >
      <span
        className="text-[10px] tracking-[0.2em] uppercase block mb-1.5"
        style={{ fontFamily: "'Rajdhani', sans-serif", color: `${color}80` }}
      >
        {label}
      </span>
      <span className="text-2xl font-black tabular-nums block" style={{ fontFamily: "'Orbitron', sans-serif", color }}>
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

function ChartContainer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="p-6 border"
      style={{ borderColor: 'rgba(0, 255, 255, 0.15)', background: 'rgba(0, 255, 255, 0.02)' }}
    >
      <h3
        className="text-sm tracking-[0.2em] mb-4"
        style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--color-primary)' }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

const chartTooltipStyle = {
  background: '#111',
  border: '1px solid rgba(0, 255, 255, 0.3)',
  fontFamily: 'Rajdhani',
  fontSize: 12,
  color: '#00FFFF',
};

const axisTick = { fill: 'rgba(0,255,255,0.4)', fontSize: 10, fontFamily: 'Rajdhani' };

function rollingAverage(values: number[], window: number): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
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
          className="text-lg tracking-[0.2em] mb-8"
          style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--color-primary)' }}
        >
          NO RESULTS FOUND
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-10 py-4 border text-sm font-bold tracking-[0.2em] cursor-pointer
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
  const meanReaction =
    results.reactionTimes.length > 0
      ? ((results.reactionTimes.reduce((a, b) => a + b, 0) / results.reactionTimes.length) * 1000).toFixed(0)
      : '--';
  const fastestReaction =
    results.reactionTimes.length > 0 ? (Math.min(...results.reactionTimes) * 1000).toFixed(0) : '--';
  const slowestReaction =
    results.reactionTimes.length > 0 ? (Math.max(...results.reactionTimes) * 1000).toFixed(0) : '--';
  const rtStdDev =
    results.reactionTimes.length > 1
      ? (() => {
          const mean = results.reactionTimes.reduce((a, b) => a + b, 0) / results.reactionTimes.length;
          const variance =
            results.reactionTimes.reduce((a, v) => a + (v - mean) ** 2, 0) / (results.reactionTimes.length - 1);
          return (Math.sqrt(variance) * 1000).toFixed(0);
        })()
      : '--';

  const flowMoments = results.stressTimeline.filter((s) => s.flowActive).length;
  const overloadMoments = results.stressTimeline.filter((s) => s.stress > 0.7).length;
  const flowTimeSec = flowMoments * 0.5;
  const flowPct =
    results.stressTimeline.length > 0 ? Math.round((flowMoments / results.stressTimeline.length) * 100) : 0;

  const avgCalm =
    results.stressTimeline.length > 0
      ? Math.round((results.stressTimeline.reduce((a, s) => a + s.calm, 0) / results.stressTimeline.length) * 100)
      : 0;
  const avgArousal =
    results.stressTimeline.length > 0
      ? Math.round((results.stressTimeline.reduce((a, s) => a + s.arousal, 0) / results.stressTimeline.length) * 100)
      : 0;

  const bpmValues = results.stressTimeline.filter((s) => s.bpm !== null).map((s) => s.bpm as number);
  const avgBpm = bpmValues.length > 0 ? Math.round(bpmValues.reduce((a, b) => a + b, 0) / bpmValues.length) : null;
  const maxBpm = bpmValues.length > 0 ? Math.round(Math.max(...bpmValues)) : null;
  const minBpm = bpmValues.length > 0 ? Math.round(Math.min(...bpmValues)) : null;
  const hrvValues = results.stressTimeline.filter((s) => s.hrv !== null).map((s) => s.hrv as number);
  const avgHrv = hrvValues.length > 0 ? Math.round(hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length) : null;

  const hasEegData = results.stressTimeline.some((s) => s.alphaPower !== null);
  const avgAlpha = hasEegData
    ? (
        results.stressTimeline.filter((s) => s.alphaPower !== null).reduce((a, s) => a + (s.alphaPower ?? 0), 0) /
        results.stressTimeline.filter((s) => s.alphaPower !== null).length
      ).toFixed(2)
    : null;
  const avgBeta = hasEegData
    ? (
        results.stressTimeline.filter((s) => s.betaPower !== null).reduce((a, s) => a + (s.betaPower ?? 0), 0) /
        results.stressTimeline.filter((s) => s.betaPower !== null).length
      ).toFixed(2)
    : null;
  const avgTheta = hasEegData
    ? (
        results.stressTimeline.filter((s) => s.thetaPower !== null).reduce((a, s) => a + (s.thetaPower ?? 0), 0) /
        results.stressTimeline.filter((s) => s.thetaPower !== null).length
      ).toFixed(2)
    : null;

  const avgRespRate =
    results.stressTimeline.filter((s) => s.respirationRate !== null).length > 0
      ? (
          results.stressTimeline
            .filter((s) => s.respirationRate !== null)
            .reduce((a, s) => a + (s.respirationRate ?? 0), 0) /
          results.stressTimeline.filter((s) => s.respirationRate !== null).length
        ).toFixed(1)
      : null;

  const neuralTimelineData = results.stressTimeline.map((s) => ({
    time: Math.round(s.time),
    stress: +(s.stress * 100).toFixed(0),
    calm: +(s.calm * 100).toFixed(0),
    arousal: +(s.arousal * 100).toFixed(0),
  }));

  const bpmTimelineData = results.stressTimeline
    .filter((s) => s.bpm !== null)
    .map((s) => ({
      time: Math.round(s.time),
      bpm: Math.round(s.bpm as number),
      hrv: s.hrv !== null ? Math.round(s.hrv as number) : undefined,
    }));

  const eegTimelineData = results.stressTimeline
    .filter((s) => s.alphaPower !== null)
    .map((s) => ({
      time: Math.round(s.time),
      alpha: +(s.alphaPower ?? 0).toFixed(3),
      beta: +(s.betaPower ?? 0).toFixed(3),
      theta: +(s.thetaPower ?? 0).toFixed(3),
      delta: +(s.deltaPower ?? 0).toFixed(3),
      gamma: +(s.gammaPower ?? 0).toFixed(3),
    }));

  const alphaPeakData = results.stressTimeline
    .filter((s) => s.alphaPeakFreq !== null)
    .map((s) => ({
      time: Math.round(s.time),
      freq: +(s.alphaPeakFreq ?? 0).toFixed(1),
      bump: s.alphaBumpState ?? 'none',
    }));

  const respData = results.stressTimeline
    .filter((s) => s.respirationRate !== null)
    .map((s) => ({
      time: Math.round(s.time),
      rate: +(s.respirationRate ?? 0).toFixed(1),
    }));

  const hitEvents = results.hitEvents ?? [];
  const rtOverTimeData = hitEvents.map((h) => ({
    time: +h.time.toFixed(1),
    rt: Math.round(h.reactionTime * 1000),
    calm: Math.round(h.calm * 100),
    arousal: Math.round(h.arousal * 100),
  }));

  const rtVsCalmData = hitEvents.map((h) => ({
    calm: Math.round(h.calm * 100),
    rt: Math.round(h.reactionTime * 1000),
  }));

  const rtVsArousalData = hitEvents.map((h) => ({
    arousal: Math.round(h.arousal * 100),
    rt: Math.round(h.reactionTime * 1000),
  }));

  // Rolling accuracy: every 5 hits
  const rollingAccData: Array<{ hit: number; accuracy: number; rollingRt: number }> = [];
  if (hitEvents.length > 0) {
    let cumHits = 0;
    let cumTotal = 0;
    const rts = hitEvents.map((h) => h.reactionTime * 1000);
    const rollingRts = rollingAverage(rts, 5);
    for (let i = 0; i < hitEvents.length; i++) {
      cumHits++;
      cumTotal++;
      rollingAccData.push({
        hit: i + 1,
        accuracy: Math.round((cumHits / cumTotal) * 100),
        rollingRt: Math.round(rollingRts[i]),
      });
    }
  }

  // RT distribution histogram
  const rtBuckets: Array<{ range: string; count: number }> = [];
  if (hitEvents.length > 0) {
    const rts = hitEvents.map((h) => h.reactionTime * 1000);
    const minRt = Math.floor(Math.min(...rts) / 100) * 100;
    const maxRt = Math.ceil(Math.max(...rts) / 100) * 100;
    for (let b = minRt; b < maxRt; b += 100) {
      rtBuckets.push({
        range: `${b}-${b + 100}`,
        count: rts.filter((r) => r >= b && r < b + 100).length,
      });
    }
  }

  // Combo timeline from hit events
  const comboTimeline: Array<{ time: number; combo: number }> = [];
  if (hitEvents.length > 0) {
    let currentCombo = 0;
    for (const h of hitEvents) {
      currentCombo++;
      comboTimeline.push({ time: +h.time.toFixed(1), combo: currentCombo });
    }
  }

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

  const calmStart =
    results.stressTimeline.slice(0, 5).reduce((a, s) => a + s.calm, 0) /
    Math.max(results.stressTimeline.slice(0, 5).length, 1);
  const calmEnd =
    results.stressTimeline.slice(-5).reduce((a, s) => a + s.calm, 0) /
    Math.max(results.stressTimeline.slice(-5).length, 1);
  const calmTrend = calmEnd - calmStart > 0.03 ? 'Improved' : calmEnd - calmStart < -0.03 ? 'Declined' : 'Stable';

  const arousalStart =
    results.stressTimeline.slice(0, 5).reduce((a, s) => a + s.arousal, 0) /
    Math.max(results.stressTimeline.slice(0, 5).length, 1);
  const arousalEnd =
    results.stressTimeline.slice(-5).reduce((a, s) => a + s.arousal, 0) /
    Math.max(results.stressTimeline.slice(-5).length, 1);
  const arousalTrend =
    arousalEnd - arousalStart > 0.03 ? 'Increased' : arousalEnd - arousalStart < -0.03 ? 'Decreased' : 'Stable';

  // RT improvement: compare first-third vs last-third
  const third = Math.ceil(hitEvents.length / 3);
  const firstThirdRt = (hitEvents.slice(0, third).reduce((a, h) => a + h.reactionTime, 0) / Math.max(third, 1)) * 1000;
  const lastThirdRt = (hitEvents.slice(-third).reduce((a, h) => a + h.reactionTime, 0) / Math.max(third, 1)) * 1000;
  const rtImprovement = firstThirdRt > 0 ? Math.round(((firstThirdRt - lastThirdRt) / firstThirdRt) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col items-center py-16 px-8 scanlines grid-bg overflow-y-auto">
      {/* Header */}
      <p
        className="text-sm tracking-[0.4em] uppercase mb-3"
        style={{ fontFamily: "'Rajdhani', sans-serif", color: 'var(--color-secondary)' }}
      >
        MISSION COMPLETE
      </p>
      <h1
        className="text-4xl font-black tracking-[0.15em] neon-text mb-2"
        style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--color-primary)' }}
      >
        RESULTS
      </h1>
      <p
        className="text-sm tracking-[0.2em] uppercase mb-12"
        style={{ fontFamily: "'Rajdhani', sans-serif", color: 'rgba(0, 255, 255, 0.5)' }}
      >
        DIFFICULTY: {results.difficulty.toUpperCase()}
      </p>

      {/* Grade */}
      <div
        className="text-8xl font-black mb-14"
        style={{
          fontFamily: "'Orbitron', sans-serif",
          color: gradeColor[grade],
          textShadow: `0 0 20px ${gradeColor[grade]}, 0 0 40px ${gradeColor[grade]}, 0 0 60px ${gradeColor[grade]}`,
        }}
      >
        {grade}
      </div>

      {/* Performance stats */}
      <SectionHeading title="PERFORMANCE" color="var(--color-primary)" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl mb-6">
        <StatBox label="Score" value={results.score} color="#00FFFF" />
        <StatBox
          label="Accuracy"
          value={`${accuracy}%`}
          color="#00FF88"
          sub={`${results.totalHits}/${results.totalSpawned}`}
        />
        <StatBox label="Mean RT" value={`${meanReaction}ms`} color="#FF00AA" />
        <StatBox label="Best Streak" value={`×${results.maxCombo}`} color="#FFFF00" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl mb-6">
        <StatBox label="Fastest RT" value={`${fastestReaction}ms`} color="#00FFFF" />
        <StatBox label="Slowest RT" value={`${slowestReaction}ms`} color="#FF00AA" />
        <StatBox label="RT Consistency" value={`±${rtStdDev}ms`} color="#00FFFF" sub="std deviation" />
        <StatBox
          label="RT Improvement"
          value={`${rtImprovement > 0 ? '+' : ''}${rtImprovement}%`}
          color={rtImprovement > 0 ? '#00FF88' : '#FF0000'}
          sub="first vs last third"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl mb-14">
        <StatBox
          label="Flow Time"
          value={`${flowTimeSec.toFixed(0)}s`}
          color="#00FF88"
          sub={`${flowPct}% of session`}
        />
        <StatBox label="Flow Moments" value={flowMoments} color="#00FF88" />
        <StatBox label="Overload" value={overloadMoments} color="#FF0000" />
        <StatBox
          label="Misses"
          value={results.totalMisses}
          color="#FF0000"
          sub={`${results.totalSpawned > 0 ? Math.round((results.totalMisses / results.totalSpawned) * 100) : 0}% miss rate`}
        />
      </div>

      {/* Neural stats */}
      <SectionHeading title="NEURAL PERFORMANCE" color="var(--color-calm)" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl mb-6">
        <StatBox label="Avg Calm" value={`${avgCalm}%`} color="#00FF88" />
        <StatBox label="Avg Arousal" value={`${avgArousal}%`} color="#FF00AA" />
        <StatBox
          label="Calm Trend"
          value={calmTrend}
          color={calmTrend === 'Improved' ? '#00FF88' : calmTrend === 'Declined' ? '#FF0000' : '#00FFFF'}
        />
        <StatBox
          label="Arousal Trend"
          value={arousalTrend}
          color={arousalTrend === 'Increased' ? '#FF00AA' : arousalTrend === 'Decreased' ? '#00FF88' : '#00FFFF'}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl mb-14">
        {avgBpm !== null && <StatBox label="Avg Heart Rate" value={avgBpm} color="#FF00AA" sub="BPM" />}
        {maxBpm !== null && <StatBox label="Peak Heart Rate" value={maxBpm} color="#FF0000" sub="BPM" />}
        {minBpm !== null && <StatBox label="Min Heart Rate" value={minBpm} color="#00FF88" sub="BPM" />}
        {avgHrv !== null && <StatBox label="Avg HRV" value={avgHrv} color="#00FFFF" sub="ms" />}
        {avgAlpha !== null && <StatBox label="Avg Alpha" value={avgAlpha} color="#00FF88" sub="power" />}
        {avgBeta !== null && <StatBox label="Avg Beta" value={avgBeta} color="#FF00AA" sub="power" />}
        {avgTheta !== null && <StatBox label="Avg Theta" value={avgTheta} color="#00FFFF" sub="power" />}
        {avgRespRate !== null && (
          <StatBox label="Avg Resp Rate" value={avgRespRate} color="#00FF88" sub="breaths/min" />
        )}
      </div>

      {/* Charts */}
      <SectionHeading title="REACTION ANALYSIS" color="var(--color-secondary)" />
      <div className="w-full max-w-3xl flex flex-col gap-8 mb-14">
        {/* Reaction Time Over Session with Arousal */}
        {rtOverTimeData.length > 2 && (
          <ChartContainer title="REACTION TIME + NEURAL STATE OVER SESSION">
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={rtOverTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,255,0.08)" />
                <XAxis dataKey="time" stroke="rgba(0,255,255,0.3)" tick={axisTick} tickFormatter={(v) => `${v}s`} />
                <YAxis yAxisId="rt" stroke="rgba(0,255,255,0.15)" tick={axisTick} tickFormatter={(v) => `${v}ms`} />
                <YAxis
                  yAxisId="pct"
                  orientation="right"
                  domain={[0, 100]}
                  stroke="rgba(0,255,255,0.1)"
                  tick={axisTick}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip contentStyle={chartTooltipStyle} labelFormatter={(v) => `${v}s`} />
                <Line
                  yAxisId="rt"
                  type="monotone"
                  dataKey="rt"
                  stroke="#FF00AA"
                  strokeWidth={2}
                  dot={{ fill: '#FF00AA', r: 3 }}
                  name="Reaction Time (ms)"
                />
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="calm"
                  stroke="#00FF88"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                  name="Calm %"
                />
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="arousal"
                  stroke="#FFFF00"
                  strokeWidth={1}
                  strokeDasharray="2 4"
                  dot={false}
                  name="Arousal %"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}

        {/* Rolling RT + Cumulative Accuracy */}
        {rollingAccData.length > 3 && (
          <ChartContainer title="ROLLING REACTION TIME + ACCURACY">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={rollingAccData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,255,0.08)" />
                <XAxis
                  dataKey="hit"
                  stroke="rgba(0,255,255,0.3)"
                  tick={axisTick}
                  label={{
                    value: 'Hit #',
                    position: 'insideBottom',
                    offset: -5,
                    style: { fill: 'rgba(0,255,255,0.3)', fontSize: 10, fontFamily: 'Rajdhani' },
                  }}
                />
                <YAxis yAxisId="rt" stroke="rgba(0,255,255,0.15)" tick={axisTick} tickFormatter={(v) => `${v}ms`} />
                <YAxis
                  yAxisId="acc"
                  orientation="right"
                  domain={[0, 100]}
                  stroke="rgba(0,255,255,0.1)"
                  tick={axisTick}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line
                  yAxisId="rt"
                  type="monotone"
                  dataKey="rollingRt"
                  stroke="#FF00AA"
                  strokeWidth={2}
                  dot={false}
                  name="Rolling RT (5-hit avg)"
                />
                <Line
                  yAxisId="acc"
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#00FF88"
                  strokeWidth={2}
                  dot={false}
                  name="Cumulative Accuracy %"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}

        {/* RT Distribution Histogram */}
        {rtBuckets.length > 1 && (
          <ChartContainer title="REACTION TIME DISTRIBUTION">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={rtBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,255,0.08)" />
                <XAxis dataKey="range" stroke="rgba(0,255,255,0.3)" tick={axisTick} />
                <YAxis stroke="rgba(0,255,255,0.15)" tick={axisTick} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" fill="#00FFFF" fillOpacity={0.6} name="Hits" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}

        {/* Calm vs RT Scatter */}
        {rtVsCalmData.length > 3 && (
          <ChartContainer title="CALM vs REACTION TIME">
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,255,0.08)" />
                <XAxis
                  dataKey="calm"
                  name="Calm %"
                  stroke="rgba(0,255,255,0.3)"
                  tick={axisTick}
                  tickFormatter={(v) => `${v}%`}
                  label={{
                    value: 'Calm %',
                    position: 'insideBottom',
                    offset: -5,
                    style: { fill: 'rgba(0,255,255,0.3)', fontSize: 10, fontFamily: 'Rajdhani' },
                  }}
                />
                <YAxis
                  dataKey="rt"
                  name="RT (ms)"
                  stroke="rgba(0,255,255,0.15)"
                  tick={axisTick}
                  tickFormatter={(v) => `${v}ms`}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  cursor={{ strokeDasharray: '3 3', stroke: 'rgba(0,255,255,0.2)' }}
                />
                <Scatter data={rtVsCalmData} fill="#00FFFF" opacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}

        {/* Arousal vs RT Scatter */}
        {rtVsArousalData.length > 3 && (
          <ChartContainer title="AROUSAL vs REACTION TIME">
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,255,0.08)" />
                <XAxis
                  dataKey="arousal"
                  name="Arousal %"
                  stroke="rgba(0,255,255,0.3)"
                  tick={axisTick}
                  tickFormatter={(v) => `${v}%`}
                  label={{
                    value: 'Arousal %',
                    position: 'insideBottom',
                    offset: -5,
                    style: { fill: 'rgba(0,255,255,0.3)', fontSize: 10, fontFamily: 'Rajdhani' },
                  }}
                />
                <YAxis
                  dataKey="rt"
                  name="RT (ms)"
                  stroke="rgba(0,255,255,0.15)"
                  tick={axisTick}
                  tickFormatter={(v) => `${v}ms`}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  cursor={{ strokeDasharray: '3 3', stroke: 'rgba(0,255,255,0.2)' }}
                />
                <Scatter data={rtVsArousalData} fill="#FF00AA" opacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </div>

      {/* Neural timeline charts */}
      <SectionHeading title="NEURAL TIMELINE" color="var(--color-primary)" />
      <div className="w-full max-w-3xl flex flex-col gap-8 mb-14">
        {/* Calm / Stress / Arousal over time */}
        {neuralTimelineData.length > 2 && (
          <ChartContainer title="CALM / STRESS / AROUSAL OVER SESSION">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={neuralTimelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,255,0.08)" />
                <XAxis dataKey="time" stroke="rgba(0,255,255,0.3)" tick={axisTick} tickFormatter={(v) => `${v}s`} />
                <YAxis domain={[0, 100]} stroke="rgba(0,255,255,0.15)" tick={axisTick} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={chartTooltipStyle} labelFormatter={(v) => `${v}s`} />
                <ReferenceLine y={60} stroke="rgba(0, 255, 136, 0.2)" strokeDasharray="4 4" />
                <ReferenceLine y={70} stroke="rgba(255, 0, 0, 0.2)" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="calm" stroke="#00FF88" strokeWidth={2} dot={false} name="Calm" />
                <Line type="monotone" dataKey="stress" stroke="#FF0000" strokeWidth={2} dot={false} name="Stress" />
                <Line
                  type="monotone"
                  dataKey="arousal"
                  stroke="#FFFF00"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                  name="Arousal"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}

        {/* Heart Rate + HRV */}
        {bpmTimelineData.length > 2 && (
          <ChartContainer title="HEART RATE + HRV TIMELINE">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={bpmTimelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,255,0.08)" />
                <XAxis dataKey="time" stroke="rgba(0,255,255,0.3)" tick={axisTick} tickFormatter={(v) => `${v}s`} />
                <YAxis yAxisId="bpm" stroke="rgba(0,255,255,0.15)" tick={axisTick} />
                <YAxis yAxisId="hrv" orientation="right" stroke="rgba(0,255,255,0.1)" tick={axisTick} />
                <Tooltip contentStyle={chartTooltipStyle} labelFormatter={(v) => `${v}s`} />
                <Area
                  yAxisId="bpm"
                  type="monotone"
                  dataKey="bpm"
                  stroke="#FF00AA"
                  fill="#FF00AA"
                  fillOpacity={0.1}
                  strokeWidth={2}
                  name="Heart Rate (BPM)"
                />
                {bpmTimelineData.some((d) => d.hrv !== undefined) && (
                  <Line
                    yAxisId="hrv"
                    type="monotone"
                    dataKey="hrv"
                    stroke="#00FFFF"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    name="HRV (ms)"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}

        {/* EEG Band Powers over time */}
        {eegTimelineData.length > 2 && (
          <ChartContainer title="EEG BAND POWERS OVER SESSION">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={eegTimelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,255,0.08)" />
                <XAxis dataKey="time" stroke="rgba(0,255,255,0.3)" tick={axisTick} tickFormatter={(v) => `${v}s`} />
                <YAxis stroke="rgba(0,255,255,0.15)" tick={axisTick} />
                <Tooltip contentStyle={chartTooltipStyle} labelFormatter={(v) => `${v}s`} />
                <Line type="monotone" dataKey="alpha" stroke="#00FF88" strokeWidth={2} dot={false} name="Alpha" />
                <Line type="monotone" dataKey="beta" stroke="#FF00AA" strokeWidth={2} dot={false} name="Beta" />
                <Line type="monotone" dataKey="theta" stroke="#00FFFF" strokeWidth={1.5} dot={false} name="Theta" />
                <Line
                  type="monotone"
                  dataKey="delta"
                  stroke="#FFFF00"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                  name="Delta"
                />
                <Line
                  type="monotone"
                  dataKey="gamma"
                  stroke="#FF8800"
                  strokeWidth={1}
                  strokeDasharray="2 4"
                  dot={false}
                  name="Gamma"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}

        {/* Alpha Peak Frequency over time */}
        {alphaPeakData.length > 2 && (
          <ChartContainer title="ALPHA PEAK FREQUENCY OVER SESSION">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={alphaPeakData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,255,0.08)" />
                <XAxis dataKey="time" stroke="rgba(0,255,255,0.3)" tick={axisTick} tickFormatter={(v) => `${v}s`} />
                <YAxis stroke="rgba(0,255,255,0.15)" tick={axisTick} tickFormatter={(v) => `${v}Hz`} />
                <Tooltip contentStyle={chartTooltipStyle} labelFormatter={(v) => `${v}s`} />
                <ReferenceLine
                  y={10}
                  stroke="rgba(0, 255, 136, 0.3)"
                  strokeDasharray="4 4"
                  label={{
                    value: '10Hz',
                    position: 'right',
                    style: { fill: 'rgba(0,255,136,0.4)', fontSize: 10, fontFamily: 'Rajdhani' },
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="freq"
                  stroke="#00FF88"
                  strokeWidth={2}
                  dot={false}
                  name="Alpha Peak (Hz)"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}

        {/* Respiration Rate over time */}
        {respData.length > 2 && (
          <ChartContainer title="RESPIRATION RATE OVER SESSION">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={respData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,255,0.08)" />
                <XAxis dataKey="time" stroke="rgba(0,255,255,0.3)" tick={axisTick} tickFormatter={(v) => `${v}s`} />
                <YAxis stroke="rgba(0,255,255,0.15)" tick={axisTick} tickFormatter={(v) => `${v}`} />
                <Tooltip contentStyle={chartTooltipStyle} labelFormatter={(v) => `${v}s`} />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#00FF88"
                  fill="#00FF88"
                  fillOpacity={0.08}
                  strokeWidth={2}
                  name="Breaths/min"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}

        {/* Combo Timeline */}
        {comboTimeline.length > 2 && (
          <ChartContainer title="COMBO STREAK TIMELINE">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={comboTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,255,0.08)" />
                <XAxis dataKey="time" stroke="rgba(0,255,255,0.3)" tick={axisTick} tickFormatter={(v) => `${v}s`} />
                <YAxis stroke="rgba(0,255,255,0.15)" tick={axisTick} />
                <Tooltip contentStyle={chartTooltipStyle} labelFormatter={(v) => `${v}s`} />
                <Area
                  type="stepAfter"
                  dataKey="combo"
                  stroke="#FFFF00"
                  fill="#FFFF00"
                  fillOpacity={0.08}
                  strokeWidth={2}
                  name="Combo"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-5 justify-center">
        <button
          type="button"
          onClick={() => navigate('/calibrate')}
          className="px-10 py-4 border-2 text-sm font-bold tracking-[0.2em] cursor-pointer
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
          className="px-10 py-4 border text-sm font-bold tracking-[0.2em] cursor-pointer
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

function SectionHeading({ title, color }: { title: string; color: string }) {
  return (
    <h2
      className="text-sm tracking-[0.3em] uppercase mb-6 w-full max-w-3xl"
      style={{
        fontFamily: "'Orbitron', sans-serif",
        color,
        borderBottom: `1px solid ${color}25`,
        paddingBottom: 8,
      }}
    >
      {title}
    </h2>
  );
}
