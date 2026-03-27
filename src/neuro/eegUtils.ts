export interface EegBands {
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  gamma: number;
}

function toFiniteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function averageBands(perChannel: EegBands[]): EegBands | null {
  if (!perChannel.length) return null;
  const sum = perChannel.reduce(
    (acc, channel) => {
      acc.delta += channel.delta;
      acc.theta += channel.theta;
      acc.alpha += channel.alpha;
      acc.beta += channel.beta;
      acc.gamma += channel.gamma;
      return acc;
    },
    { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 },
  );
  const n = perChannel.length;
  return {
    delta: sum.delta / n,
    theta: sum.theta / n,
    alpha: sum.alpha / n,
    beta: sum.beta / n,
    gamma: sum.gamma / n,
  };
}

export function extractBandsFromWasmResult(result: unknown): EegBands {
  const r = result as Record<string, unknown>;
  return {
    delta: toFiniteNumber(r.delta),
    theta: toFiniteNumber(r.theta),
    alpha: toFiniteNumber(r.alpha),
    beta: toFiniteNumber(r.beta),
    gamma: toFiniteNumber(r.gamma),
  };
}

function computePowerSpectrum(samples: number[]): number[] {
  const n = samples.length;
  if (n === 0) return [];
  const half = Math.floor(n / 2);
  const out: number[] = [];
  for (let k = 0; k <= half; k++) {
    let re = 0;
    let im = 0;
    for (let i = 0; i < n; i++) {
      const angle = (-2 * Math.PI * k * i) / n;
      re += samples[i] * Math.cos(angle);
      im += samples[i] * Math.sin(angle);
    }
    out.push((re * re + im * im) / Math.max(1, n));
  }
  return out;
}

export function computeBandPowersFallback(samples: number[], sampleRate: number): EegBands {
  const spectrum = computePowerSpectrum(samples);
  const n = samples.length;
  if (!n || !spectrum.length) {
    return { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 };
  }

  const binHz = sampleRate / n;
  const sumBand = (low: number, high: number) =>
    spectrum.reduce((acc, power, i) => {
      const f = i * binHz;
      if (f >= low && f < high) return acc + (Number.isFinite(power) ? power : 0);
      return acc;
    }, 0);

  return {
    delta: sumBand(0.5, 4),
    theta: sumBand(4, 8),
    alpha: sumBand(8, 13),
    beta: sumBand(13, 30),
    gamma: sumBand(30, 45),
  };
}

export function asChannelMajor(data: number[][], expectedChannels?: number): number[][] {
  if (!Array.isArray(data) || data.length === 0) return [];

  const outer = data.length;
  const inner = data[0]?.length ?? 0;

  if (expectedChannels && inner === expectedChannels) {
    return transposeSampleMajor(data, expectedChannels);
  }

  if (expectedChannels && outer === expectedChannels) {
    return data;
  }

  if (inner > 0 && inner <= 8 && outer > inner) {
    return transposeSampleMajor(data, inner);
  }

  return data;
}

function transposeSampleMajor(data: number[][], channels: number): number[][] {
  const samples = data.length;
  const out: number[][] = Array.from({ length: channels }, () => new Array(samples));
  for (let s = 0; s < samples; s++) {
    const row = data[s];
    for (let c = 0; c < channels; c++) {
      out[c][s] = row[c] ?? 0;
    }
  }
  return out;
}

export function computeChunkBands(channelMajor: number[][], sampleRate: number): EegBands | null {
  if (!channelMajor.length) return null;
  const perChannel = channelMajor
    .filter((ch) => Array.isArray(ch) && ch.length > 0)
    .map((ch) => computeBandPowersFallback(ch, sampleRate));
  return averageBands(perChannel);
}
