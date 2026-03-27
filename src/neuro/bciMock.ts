import logger from './logger';

export const BCI_PRESETS = {
  MEDITATION: { calm: 0.9, arousal: 0.1 },
  FOCUSED: { calm: 0.6, arousal: 0.4 },
  NEUTRAL: { calm: 0.5, arousal: 0.5 },
  ALERT: { calm: 0.4, arousal: 0.7 },
  EXCITED: { calm: 0.2, arousal: 0.9 },
  DROWSY: { calm: 0.7, arousal: 0.2 },
} as const;

export class MockBCIProvider {
  private targetCalm = 0.5;
  private targetArousal = 0.5;
  private currentCalm = 0.5;
  private currentArousal = 0.5;
  private noiseEnabled = true;
  private noiseAmplitude = 0.05;
  private smoothingTimeConstant = 0.3;
  private connected = false;

  init(): void {
    this.connected = true;
    logger.info('MockBCI', 'Initialized');
  }

  destroy(): void {
    this.connected = false;
  }

  update(dt: number): void {
    if (!this.connected) return;
    const alpha = 1 - Math.exp(-dt / this.smoothingTimeConstant);
    this.currentCalm = this.lerp(this.currentCalm, this.targetCalm, alpha);
    this.currentArousal = this.lerp(this.currentArousal, this.targetArousal, alpha);
    if (this.noiseEnabled) {
      this.currentCalm = this.clamp(this.currentCalm + this.gaussianNoise() * this.noiseAmplitude, 0, 1);
      this.currentArousal = this.clamp(this.currentArousal + this.gaussianNoise() * this.noiseAmplitude, 0, 1);
    }
  }

  setCalm(value: number): void {
    this.targetCalm = this.clamp(value, 0, 1);
  }

  setArousal(value: number): void {
    this.targetArousal = this.clamp(value, 0, 1);
  }

  applyPreset(preset: keyof typeof BCI_PRESETS): void {
    const state = BCI_PRESETS[preset];
    this.targetCalm = state.calm;
    this.targetArousal = state.arousal;
  }

  setNoiseEnabled(enabled: boolean): void {
    this.noiseEnabled = enabled;
  }

  setNoiseAmplitude(amplitude: number): void {
    this.noiseAmplitude = this.clamp(amplitude, 0, 1);
  }

  setSmoothingTimeConstant(seconds: number): void {
    this.smoothingTimeConstant = Math.max(0.01, seconds);
  }

  setConnected(connected: boolean): void {
    this.connected = connected;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getCurrentCalm(): number {
    return this.currentCalm;
  }

  getCurrentArousal(): number {
    return this.currentArousal;
  }

  reset(): void {
    this.targetCalm = 0.5;
    this.targetArousal = 0.5;
    this.currentCalm = 0.5;
    this.currentArousal = 0.5;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private gaussianNoise(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

export class AutomatedBCISimulator {
  private provider: MockBCIProvider;
  private time = 0;
  private pattern: 'sine' | 'random' | 'preset-cycle' = 'sine';
  private presetIndex = 0;
  private presetList = Object.keys(BCI_PRESETS) as (keyof typeof BCI_PRESETS)[];
  private presetDuration = 5;

  constructor(provider: MockBCIProvider) {
    this.provider = provider;
  }

  setPattern(pattern: 'sine' | 'random' | 'preset-cycle'): void {
    this.pattern = pattern;
  }

  update(dt: number): void {
    this.time += dt;
    switch (this.pattern) {
      case 'sine':
        this.provider.setCalm(0.5 + 0.3 * Math.sin(this.time * 0.5));
        this.provider.setArousal(0.5 + 0.3 * Math.cos(this.time * 0.3));
        break;
      case 'random':
        if (Math.random() < dt) {
          this.provider.setCalm(this.provider.getCurrentCalm() + (Math.random() - 0.5) * 0.2);
          this.provider.setArousal(this.provider.getCurrentArousal() + (Math.random() - 0.5) * 0.2);
        }
        break;
      case 'preset-cycle': {
        const presetTime = this.time % (this.presetDuration * this.presetList.length);
        const newIndex = Math.floor(presetTime / this.presetDuration);
        if (newIndex !== this.presetIndex) {
          this.presetIndex = newIndex;
          this.provider.applyPreset(this.presetList[this.presetIndex]);
        }
        break;
      }
    }
  }

  reset(): void {
    this.time = 0;
    this.presetIndex = 0;
  }
}
