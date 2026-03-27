import logger from './logger';

export interface SimulatedEegFrame {
  type: string;
  fs: number;
  data: number[][];
  channels: string[];
  timestamp: number;
}

const DEFAULT_CHANNELS = ['TP9', 'AF7', 'AF8', 'TP10'];

export class SimulatedEegSource {
  private timer: ReturnType<typeof setInterval> | null = null;
  private phase = 0;
  private readonly sampleRate = 256;
  private readonly chunkSamples = 32;
  private readonly dt = 1 / this.sampleRate;

  start(onFrame: (frame: SimulatedEegFrame) => void) {
    logger.info('SimulatedEegSource', 'start');
    this.stop();
    this.timer = setInterval(
      () => {
        const data = this.generateSampleMajorChunk(this.chunkSamples);
        onFrame({
          type: 'eeg',
          fs: this.sampleRate,
          channels: DEFAULT_CHANNELS,
          data,
          timestamp: Date.now(),
        });
      },
      Math.round((this.chunkSamples / this.sampleRate) * 1000),
    );
  }

  stop() {
    logger.info('SimulatedEegSource', 'stop');
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private generateSampleMajorChunk(samples: number): number[][] {
    const out: number[][] = [];
    for (let i = 0; i < samples; i++) {
      const t = this.phase;
      const tp9 = 18 * Math.sin(2 * Math.PI * 10 * t) + 6 * Math.sin(2 * Math.PI * 6 * t) + this.noise(1.5);
      const af7 = 14 * Math.sin(2 * Math.PI * 10 * t + 0.2) + 8 * Math.sin(2 * Math.PI * 20 * t) + this.noise(1.5);
      const af8 =
        15 * Math.sin(2 * Math.PI * 10 * t + 0.45) + 7 * Math.sin(2 * Math.PI * 20 * t + 0.1) + this.noise(1.5);
      const tp10 =
        16 * Math.sin(2 * Math.PI * 10 * t + 0.1) + 5 * Math.sin(2 * Math.PI * 6 * t + 0.3) + this.noise(1.5);
      out.push([tp9, af7, af8, tp10]);
      this.phase += this.dt;
    }
    return out;
  }

  private noise(scale: number): number {
    return (Math.random() * 2 - 1) * scale;
  }
}
