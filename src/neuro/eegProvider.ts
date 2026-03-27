import type {
  HeadbandFrameV1,
  HeadbandTransportStatus,
  WasmAlphaBumpDetector,
  WasmAlphaPeakModel,
  WasmBandPowers,
  WasmCalmnessModel,
} from '@elata-biosciences/eeg-web';
import type { BleTransport } from '@elata-biosciences/eeg-web-ble';
import logger from './logger';

interface EegWebModule {
  initEegWasm: (options?: { module_or_path?: string }) => Promise<unknown>;
  WasmCalmnessModel: new (sampleRate: number, channelCount: number) => WasmCalmnessModel;
  WasmAlphaBumpDetector: new (sampleRate: number, channelCount: number) => WasmAlphaBumpDetector;
  WasmAlphaPeakModel: new (sampleRate: number, channelCount: number) => WasmAlphaPeakModel;
  AthenaWasmDecoder: new () => unknown;
  AthenaWasmOutput?: { prototype: Record<string, unknown> };
  band_powers: (data: Float32Array, sampleRate: number) => WasmBandPowers;
}

interface StoredBluetoothDevice {
  name?: string;
  gatt?: {
    connect: () => Promise<unknown>;
  };
}

export interface BandPowerSnapshot {
  alpha: number;
  beta: number;
  theta: number;
  delta: number;
  gamma: number;
}

export interface EEGProviderState {
  connected: boolean;
  reconnecting: boolean;
  calm: number | null;
  arousal: number | null;
  alphaPower: number | null;
  betaPower: number | null;
  thetaPower: number | null;
  deltaPower: number | null;
  gammaPower: number | null;
  alphaBump: boolean;
  signalQuality: number;
  calmnessState: string | null;
  alphaBetaRatio: number | null;
  alphaPeakFreq: number | null;
  alphaPeakSnr: number | null;
  alphaBumpState: string | null;
  batteryLevel: number | null;
  lastAccelMagnitude: number | null;
  bandPowerHistory: BandPowerSnapshot[];
}

export type EEGError = 'no_bluetooth' | 'permission_denied' | 'not_found' | 'wasm_not_ready' | 'unknown';

const MAX_RECONNECT_ATTEMPTS = 5;
const MAX_RECONNECT_DELAY_MS = 30000;
const EEG_SAMPLE_BUFFER_SIZE = 256;
const MIN_ANALYSIS_SAMPLES = 64;
const BAND_HISTORY_SIZE = 60;
const BAND_HISTORY_INTERVAL = 0.5;
const LOG_INTERVAL_MS = 5000;
const EARLY_FRAME_LOG_LIMIT = 3;
const NO_FRAME_WARN_MS = 5000;

export class ElataEEGProvider {
  private transport: BleTransport | null = null;
  private calmnessModel: WasmCalmnessModel | null = null;
  private alphaBumpDetector: WasmAlphaBumpDetector | null = null;
  private alphaPeakModel: WasmAlphaPeakModel | null = null;
  private eegModule: EegWebModule | null = null;
  private connected = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private lastError: EEGError | null = null;
  private recentSamples: number[] = [];
  private frameCount = 0;
  private lastLogTime = 0;
  private decodeErrorCount = 0;
  private modelsReady = false;
  private connectTime = 0;
  private noFrameWarned = false;
  private bleNotificationCount = 0;
  private emptyDecodeCount = 0;
  private reconnectCount = 0;
  private storedDevice: StoredBluetoothDevice | null = null;
  private sampleRate = 256;
  private state: EEGProviderState = {
    connected: false,
    reconnecting: false,
    calm: null,
    arousal: null,
    alphaPower: null,
    betaPower: null,
    thetaPower: null,
    deltaPower: null,
    gammaPower: null,
    alphaBump: false,
    signalQuality: 0,
    calmnessState: null,
    alphaBetaRatio: null,
    alphaPeakFreq: null,
    alphaPeakSnr: null,
    alphaBumpState: null,
    batteryLevel: null,
    lastAccelMagnitude: null,
    bandPowerHistory: [],
  };

  private bandHistoryTimer = 0;
  private onDisconnect?: () => void;
  private onReconnect?: () => void;
  private stateSubscribers = new Set<(state: Readonly<EEGProviderState>) => void>();

  setCallbacks(onDisconnect: () => void, onReconnect: () => void): void {
    this.onDisconnect = onDisconnect;
    this.onReconnect = onReconnect;
  }

  async initAsync(): Promise<void> {
    const eegWeb = (await import('@elata-biosciences/eeg-web')) as unknown as EegWebModule;
    await eegWeb.initEegWasm();
    this.eegModule = eegWeb;

    try {
      this.patchAthenaWasmOutput(eegWeb);
    } catch (e) {
      logger.warn('EEG', 'Float32Array patch failed (non-fatal)', e);
    }

    this.calmnessModel = new eegWeb.WasmCalmnessModel(256, 1);
    this.alphaBumpDetector = new eegWeb.WasmAlphaBumpDetector(256, 1);
    this.alphaPeakModel = new eegWeb.WasmAlphaPeakModel(256, 1);
    this.modelsReady = true;

    logger.info('EEG', 'WASM models initialized', {
      calmnessModel: !!this.calmnessModel,
      alphaBumpDetector: !!this.alphaBumpDetector,
      alphaPeakModel: !!this.alphaPeakModel,
    });
  }

  private patchAthenaWasmOutput(eegWeb: EegWebModule): void {
    const AthenaWasmOutput = eegWeb.AthenaWasmOutput;
    if (!AthenaWasmOutput) return;

    const proto = AthenaWasmOutput.prototype;
    const floatArrayProps = ['eeg_samples', 'optics_samples', 'accgyro_samples', 'battery_samples'];

    for (const prop of floatArrayProps) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
      if (descriptor?.get) {
        const originalGet = descriptor.get;
        Object.defineProperty(proto, prop, {
          get() {
            const result = originalGet.call(this);
            if (result && typeof result[Symbol.iterator] === 'function' && !Array.isArray(result)) {
              return Array.from(result);
            }
            return result;
          },
          configurable: true,
        });
      }
    }
  }

  async connect(): Promise<boolean> {
    try {
      if (!(navigator as Navigator & { bluetooth?: unknown }).bluetooth) {
        this.lastError = 'no_bluetooth';
        return false;
      }

      const eegWeb = (await import('@elata-biosciences/eeg-web')) as unknown as EegWebModule;
      const eegBle = await import('@elata-biosciences/eeg-web-ble');

      if (this.transport) {
        try {
          this.transport.stop?.();
        } catch {
          /* swallow */
        }
        try {
          this.transport.disconnect?.();
        } catch {
          /* swallow */
        }
        this.transport = null;
      }

      this.decodeErrorCount = 0;
      this.bleNotificationCount = 0;
      this.emptyDecodeCount = 0;
      this.frameCount = 0;
      this.noFrameWarned = false;
      this.state.reconnecting = false;

      this.transport = new eegBle.BleTransport({
        sourceName: 'elata-app',
        deviceOptions: {
          // biome-ignore lint/suspicious/noExplicitAny: SDK typing mismatch
          athenaDecoderFactory: (() => new eegWeb.AthenaWasmDecoder()) as any,
          logger: (msg: string) => {
            if (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('fail')) {
              this.decodeErrorCount++;
              logger.warn('EEG:BLE', msg);
            } else {
              logger.debug('EEG:BLE', msg);
            }
          },
        },
      });

      this.transport.onStatus = (status: HeadbandTransportStatus) => {
        logger.info('EEG', `Transport status: ${status.state}`, {
          reason: status.reason,
          errorCode: status.errorCode,
        });
        if (status.state === 'connected') {
          this.connected = true;
          this.state.connected = true;
          this.state.reconnecting = false;
          this.reconnectAttempts = 0;
          this.connectTime = Date.now();
          this.onReconnect?.();
          this.notifySubscribers();
        } else if (status.state === 'disconnected') {
          this.connected = false;
          this.state.connected = false;
          this.state.signalQuality = 0;
          if (status.recoverable && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            this.state.reconnecting = true;
            const delay = Math.min(2000 * 2 ** this.reconnectAttempts, MAX_RECONNECT_DELAY_MS);
            this.reconnectTimer = setTimeout(() => this.reconnect(), delay);
          } else {
            this.state.reconnecting = false;
            this.onDisconnect?.();
          }
          this.notifySubscribers();
        }
      };

      this.transport.onFrame = (frame: HeadbandFrameV1) => {
        this.processFrame(frame);
      };

      await this.transport.connect();
      await this.transport.start();
      this.connected = true;
      this.state.connected = true;
      this.lastError = null;
      this.reconnectAttempts = 0;
      this.connectTime = Date.now();

      try {
        const transportInternal = this.transport as unknown as { device?: { device?: StoredBluetoothDevice } };
        this.storedDevice = transportInternal.device?.device ?? null;
      } catch {
        this.storedDevice = null;
      }

      logger.info('EEG', 'Connected and started');
      return true;
    } catch (err: unknown) {
      logger.error('EEG', 'Connection failed', err);
      this.lastError = this.classifyError(err);
      this.connected = false;
      this.state.connected = false;
      return false;
    }
  }

  private async reconnect(): Promise<void> {
    this.reconnectAttempts++;
    this.reconnectCount++;
    this.state.reconnecting = true;

    try {
      if (this.storedDevice?.gatt) {
        await this.storedDevice.gatt.connect();
        await this.transport!.start();
        this.connected = true;
        this.state.connected = true;
        this.state.reconnecting = false;
        this.reconnectAttempts = 0;
        this.connectTime = Date.now();
        this.onReconnect?.();
        return;
      }

      if (this.transport) {
        await this.transport.connect();
        await this.transport.start();
        this.connected = true;
        this.state.connected = true;
        this.state.reconnecting = false;
        this.reconnectAttempts = 0;
        this.connectTime = Date.now();
        this.onReconnect?.();
        return;
      }
    } catch (err) {
      logger.warn('EEG', `Reconnect attempt ${this.reconnectAttempts} failed`, err);
    }

    if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(2000 * 2 ** this.reconnectAttempts, MAX_RECONNECT_DELAY_MS);
      this.reconnectTimer = setTimeout(() => this.reconnect(), delay);
    } else {
      this.state.reconnecting = false;
      this.onDisconnect?.();
    }
  }

  private classifyError(err: unknown): EEGError {
    const msg = String((err as { message?: string })?.message ?? err ?? '').toLowerCase();
    if (msg.includes('globally disabled') || (msg.includes('bluetooth') && msg.includes('not'))) return 'no_bluetooth';
    if (msg.includes('permission') || msg.includes('denied') || msg.includes('blocked')) return 'permission_denied';
    if (msg.includes('notfound') || msg.includes('not found') || msg.includes('cancel')) return 'not_found';
    return 'unknown';
  }

  getLastError(): EEGError | null {
    return this.lastError;
  }

  getErrorMessage(): string {
    switch (this.lastError) {
      case 'no_bluetooth':
        return 'Web Bluetooth not enabled — see setup instructions below';
      case 'permission_denied':
        return 'Bluetooth blocked — click the lock icon in the address bar to allow';
      case 'not_found':
        return "Headband not found — make sure it's powered on and nearby";
      case 'wasm_not_ready':
        return 'EEG processing not ready — try refreshing the page';
      default:
        return 'Headband connection failed — check Bluetooth is on';
    }
  }

  private processFrame(frame: HeadbandFrameV1): void {
    const isEarlyFrame = this.frameCount < EARLY_FRAME_LOG_LIMIT;
    if (this.frameCount === 0) {
      logger.info('EEG', 'First frame received', { keys: Object.keys(frame) });
    }

    this.bleNotificationCount++;
    this.extractAuxData(frame);

    const eeg = frame?.eeg;
    if (!eeg) {
      this.emptyDecodeCount++;
      return;
    }

    const eegRecord = eeg as unknown as Record<string, unknown>;
    const samples = eeg.samples ?? (eegRecord.data as number[][] | undefined);
    if (!samples || samples.length === 0) {
      this.emptyDecodeCount++;
      return;
    }

    this.frameCount++;

    let channelSamples: number[];
    if (Array.isArray(samples[0])) {
      channelSamples = (samples as number[][]).map((row) => row[0]);
    } else {
      channelSamples = samples as unknown as number[];
    }

    this.sampleRate = eeg.sampleRateHz ?? (eegRecord.sampleRate as number) ?? 256;

    for (const s of channelSamples) {
      this.recentSamples.push(s);
    }
    if (this.recentSamples.length > EEG_SAMPLE_BUFFER_SIZE) {
      this.recentSamples.splice(0, this.recentSamples.length - EEG_SAMPLE_BUFFER_SIZE);
    }

    if (this.recentSamples.length < MIN_ANALYSIS_SAMPLES) {
      this.state.signalQuality = Math.min(1, this.recentSamples.length / EEG_SAMPLE_BUFFER_SIZE);
      return;
    }

    const bufferF32 = new Float32Array(this.recentSamples);

    try {
      if (this.calmnessModel) {
        const result = this.calmnessModel.process(bufferF32);
        if (result) {
          this.state.calm = Math.max(0, Math.min(1, result.percentage() / 100));
          try {
            this.state.calmnessState = result.state_description();
          } catch {
            this.state.calmnessState = null;
          }
          this.state.alphaBetaRatio = result.alpha_beta_ratio ?? null;
        }
      }

      if (this.alphaBumpDetector) {
        const result = this.alphaBumpDetector.process(bufferF32);
        this.state.alphaBump = result?.is_high() ?? false;
        try {
          this.state.alphaBumpState = result?.state ?? null;
        } catch {
          this.state.alphaBumpState = null;
        }
      }

      if (this.alphaPeakModel) {
        const result = this.alphaPeakModel.process(bufferF32);
        if (result) {
          this.state.alphaPeakFreq = result.peak_frequency ?? null;
          this.state.alphaPeakSnr = result.snr ?? null;
        }
      }

      if (this.eegModule) {
        const powers = this.eegModule.band_powers(bufferF32, this.sampleRate);
        const abTotal = powers.alpha + powers.beta + powers.theta + powers.gamma || 1;
        this.state.alphaPower = powers.alpha / abTotal;
        this.state.betaPower = powers.beta / abTotal;
        this.state.thetaPower = powers.theta / abTotal;
        this.state.gammaPower = powers.gamma / abTotal;
        const fullTotal = powers.alpha + powers.beta + powers.theta + powers.delta + powers.gamma || 1;
        this.state.deltaPower = powers.delta / fullTotal;
        this.state.arousal = Math.min(1, Math.max(0, powers.beta / abTotal));
      }

      this.state.signalQuality = Math.min(1, this.recentSamples.length / EEG_SAMPLE_BUFFER_SIZE);
      this.recordBandPowerSnapshot();
      this.notifySubscribers();

      const now = Date.now();
      if (now - this.lastLogTime >= LOG_INTERVAL_MS) {
        this.lastLogTime = now;
        logger.debug('EEG', 'Status', {
          frames: this.frameCount,
          calm: this.state.calm?.toFixed(2),
          arousal: this.state.arousal?.toFixed(2),
        });
      }
    } catch (err) {
      if (isEarlyFrame) logger.warn('EEG', 'Frame processing error', err);
    }
  }

  private extractAuxData(frame: HeadbandFrameV1): void {
    if (frame?.battery?.samples) {
      const batSamples = frame.battery.samples;
      if (batSamples.length > 0) {
        const rawBattery = batSamples[batSamples.length - 1];
        if (typeof rawBattery === 'number' && rawBattery >= 0) {
          this.state.batteryLevel = Math.round(Math.max(0, Math.min(100, rawBattery)));
        }
      }
    }

    if (frame?.accgyro?.samples) {
      const rows = frame.accgyro.samples;
      if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        if (Array.isArray(lastRow) && lastRow.length >= 3) {
          const [ax, ay, az] = lastRow;
          this.state.lastAccelMagnitude = Math.sqrt(ax * ax + ay * ay + az * az);
        }
      }
    }
  }

  update(_dt: number): void {
    this.state.alphaBump = false;
    if (this.connected && this.connectTime > 0) {
      const elapsed = Date.now() - this.connectTime;
      if (this.frameCount === 0 && elapsed >= NO_FRAME_WARN_MS && !this.noFrameWarned) {
        this.noFrameWarned = true;
        logger.warn('EEG', `Connected for ${(elapsed / 1000).toFixed(1)}s but ZERO EEG frames received`);
      }
    }
  }

  destroy(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.transport) {
      try {
        this.transport.stop?.();
      } catch {
        /* swallow */
      }
      try {
        this.transport.disconnect?.();
      } catch {
        /* swallow */
      }
      this.transport = null;
    }
    this.storedDevice = null;
    this.connected = false;
    this.state.connected = false;
    this.state.reconnecting = false;
  }

  subscribeState(cb: (state: Readonly<EEGProviderState>) => void): () => void {
    this.stateSubscribers.add(cb);
    cb(this.state);
    return () => {
      this.stateSubscribers.delete(cb);
    };
  }

  private notifySubscribers(): void {
    for (const cb of this.stateSubscribers) {
      try {
        cb(this.state);
      } catch {
        // swallow subscriber errors
      }
    }
  }

  getState(): Readonly<EEGProviderState> {
    return this.state;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getRecentSamples(): number[] {
    return this.recentSamples;
  }

  getFrameCount(): number {
    return this.frameCount;
  }

  getDecodeErrorCount(): number {
    return this.decodeErrorCount;
  }

  isModelsReady(): boolean {
    return this.modelsReady;
  }

  isReconnecting(): boolean {
    return this.state.reconnecting;
  }

  getBatteryLevel(): number | null {
    return this.state.batteryLevel;
  }

  getBandPowerHistory(): BandPowerSnapshot[] {
    return this.state.bandPowerHistory;
  }

  private recordBandPowerSnapshot(): void {
    const now = performance.now() / 1000;
    if (now - this.bandHistoryTimer < BAND_HISTORY_INTERVAL) return;
    this.bandHistoryTimer = now;
    const { alphaPower, betaPower, thetaPower, deltaPower, gammaPower } = this.state;
    if (alphaPower === null) return;
    this.state.bandPowerHistory.push({
      alpha: alphaPower ?? 0,
      beta: betaPower ?? 0,
      theta: thetaPower ?? 0,
      delta: deltaPower ?? 0,
      gamma: gammaPower ?? 0,
    });
    if (this.state.bandPowerHistory.length > BAND_HISTORY_SIZE) {
      this.state.bandPowerHistory.shift();
    }
  }
}
