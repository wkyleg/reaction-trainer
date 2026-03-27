import { MockBCIProvider } from './bciMock';
import { type EEGProviderState, ElataEEGProvider } from './eegProvider';
import logger from './logger';
import { ElataRppgProvider, type RppgProviderState } from './rppgProvider';

export interface NeuroState {
  source: 'eeg' | 'rppg' | 'mock' | 'none';
  calm: number;
  arousal: number;
  bpm: number | null;
  bpmQuality: number;
  signalQuality: number;
  eegConnected: boolean;
  cameraActive: boolean;
  alphaPower: number | null;
  betaPower: number | null;
  thetaPower: number | null;
  deltaPower: number | null;
  gammaPower: number | null;
  alphaBump: boolean;
  hrvRmssd: number | null;
  respirationRate: number | null;
  baselineBpm: number | null;
  baselineDelta: number | null;
  calmnessState: string | null;
  alphaPeakFreq: number | null;
  alphaBumpState: string | null;
}

const DEFAULT_EEG_STATE: Readonly<EEGProviderState> = {
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

const DEFAULT_RPPG_STATE: Readonly<RppgProviderState> = {
  active: false,
  bpm: null,
  displayBpm: null,
  rawBpm: null,
  smoothedBpm: null,
  lastValidBpm: null,
  lastValidBpmAge: 0,
  quality: 0,
  confidence: 0,
  arousal: null,
  calibrationProgress: 0,
  warmupComplete: false,
  activeTime: 0,
  videoWidth: 0,
  videoHeight: 0,
  hrvRmssd: null,
  respirationRate: null,
  baselineBpm: null,
  baselineDelta: null,
  debugMetrics: null,
  bpmHistory: [],
};

const NEURO_EMA_ALPHA = 0.08;

export type NeuroEventType = 'source_changed' | 'disconnected' | 'reconnected' | 'camera_quality_low' | 'alpha_bump';

export interface NeuroEventData {
  type: NeuroEventType;
  detail?: unknown;
}

export class NeuroManager {
  private eegProvider: ElataEEGProvider;
  private rppgProvider: ElataRppgProvider;
  private mockProvider: MockBCIProvider;
  private mockEnabled = false;
  private wasmReady = false;
  private previousSource: NeuroState['source'] = 'none';
  private smoothedCalm = 0;
  private smoothedArousal = 0;

  private stateSubscribers = new Set<(state: Readonly<NeuroState>) => void>();
  private eventListeners = new Set<(event: NeuroEventData) => void>();

  private state: NeuroState = {
    source: 'none',
    calm: 0,
    arousal: 0,
    bpm: null,
    bpmQuality: 0,
    signalQuality: 0,
    eegConnected: false,
    cameraActive: false,
    alphaPower: null,
    betaPower: null,
    thetaPower: null,
    deltaPower: null,
    gammaPower: null,
    alphaBump: false,
    hrvRmssd: null,
    respirationRate: null,
    baselineBpm: null,
    baselineDelta: null,
    calmnessState: null,
    alphaPeakFreq: null,
    alphaBumpState: null,
  };

  constructor() {
    this.eegProvider = new ElataEEGProvider();
    this.rppgProvider = new ElataRppgProvider();
    this.mockProvider = new MockBCIProvider();

    this.eegProvider.setCallbacks(
      () => this.emitEvent({ type: 'disconnected', detail: { source: 'eeg' } }),
      () => this.emitEvent({ type: 'reconnected', detail: { source: 'eeg' } }),
    );

    this.rppgProvider.setCallbacks(() => {
      this.emitEvent({ type: 'camera_quality_low' });
    });
  }

  async initWasm(): Promise<void> {
    try {
      await this.eegProvider.initAsync();
      this.wasmReady = true;
      logger.info('Neuro', 'WASM init succeeded — EEG features ready');
    } catch (err) {
      logger.warn('Neuro', 'WASM init failed — EEG features disabled', err);
      this.wasmReady = false;
    }
  }

  async connectHeadband(): Promise<boolean> {
    if (!this.wasmReady) {
      logger.warn('Neuro', 'WASM not ready, cannot connect headband');
      return false;
    }
    const success = await this.eegProvider.connect();
    this.state.eegConnected = success;
    this.notifySubscribers();
    return success;
  }

  async enableCamera(): Promise<boolean> {
    const success = await this.rppgProvider.enable();
    this.state.cameraActive = success;
    this.notifySubscribers();
    return success;
  }

  disableCamera(): void {
    this.rppgProvider.disable();
    this.state.cameraActive = false;
    this.notifySubscribers();
  }

  enableMock(): void {
    this.mockEnabled = true;
    this.mockProvider.init();
    this.notifySubscribers();
  }

  disableMock(): void {
    this.mockEnabled = false;
    this.notifySubscribers();
  }

  isMockEnabled(): boolean {
    return this.mockEnabled;
  }

  hasActiveSource(): boolean {
    return this.state.source !== 'none';
  }

  getHeadbandErrorMessage(): string {
    return this.eegProvider.getErrorMessage();
  }

  getCameraErrorMessage(): string {
    return this.rppgProvider.getErrorMessage();
  }

  isWasmReady(): boolean {
    return this.wasmReady;
  }

  update(dt: number): void {
    this.eegProvider.update(dt);
    this.rppgProvider.update(dt);

    let eegState: Readonly<EEGProviderState>;
    let rppgState: Readonly<RppgProviderState>;

    try {
      eegState = this.eegProvider.getState();
    } catch {
      eegState = DEFAULT_EEG_STATE;
    }

    try {
      rppgState = this.rppgProvider.getState();
    } catch {
      rppgState = DEFAULT_RPPG_STATE;
    }

    let source: NeuroState['source'] = 'none';
    const eegHasData = eegState.connected && (eegState.calm !== null || eegState.alphaPower !== null);

    let rawCalm = 0;
    let rawArousal = 0;

    if (eegHasData) {
      source = 'eeg';
      rawCalm = eegState.calm ?? 0;
      rawArousal = eegState.arousal ?? 0;
      this.state.signalQuality = eegState.signalQuality;
      this.state.alphaBump = eegState.alphaBump;
      this.state.calmnessState = eegState.calmnessState;
      this.state.alphaPeakFreq = eegState.alphaPeakFreq;
      this.state.alphaBumpState = eegState.alphaBumpState;
    } else if (rppgState.active) {
      source = 'rppg';
      rawArousal = rppgState.arousal ?? 0;
      rawCalm = this.mockProvider.getCurrentCalm();
      this.state.signalQuality = rppgState.quality;
      this.state.alphaBump = false;
      this.state.calmnessState = null;
      this.state.alphaPeakFreq = null;
      this.state.alphaBumpState = null;
    } else if (this.mockEnabled) {
      source = 'mock';
      rawCalm = this.mockProvider.getCurrentCalm();
      rawArousal = this.mockProvider.getCurrentArousal();
      this.state.signalQuality = 1;
      this.state.alphaBump = false;
      this.state.calmnessState = null;
      this.state.alphaPeakFreq = null;
      this.state.alphaBumpState = null;
    } else {
      this.state.signalQuality = 0;
      this.state.calmnessState = null;
      this.state.alphaPeakFreq = null;
      this.state.alphaBumpState = null;
    }

    this.smoothedCalm = this.smoothedCalm * (1 - NEURO_EMA_ALPHA) + rawCalm * NEURO_EMA_ALPHA;
    this.smoothedArousal = this.smoothedArousal * (1 - NEURO_EMA_ALPHA) + rawArousal * NEURO_EMA_ALPHA;
    this.state.calm = this.smoothedCalm;
    this.state.arousal = this.smoothedArousal;

    if (eegState.connected) {
      this.state.alphaPower = eegState.alphaPower;
      this.state.betaPower = eegState.betaPower;
      this.state.thetaPower = eegState.thetaPower;
      this.state.deltaPower = eegState.deltaPower;
      this.state.gammaPower = eegState.gammaPower;
    } else {
      this.state.alphaPower = null;
      this.state.betaPower = null;
      this.state.thetaPower = null;
      this.state.deltaPower = null;
      this.state.gammaPower = null;
    }

    if (rppgState.active) {
      this.state.bpm = rppgState.bpm;
      this.state.bpmQuality = rppgState.quality;
      this.state.hrvRmssd = rppgState.hrvRmssd;
      this.state.respirationRate = rppgState.respirationRate;
      this.state.baselineBpm = rppgState.baselineBpm;
      this.state.baselineDelta = rppgState.baselineDelta;
    } else {
      this.state.bpm = null;
      this.state.bpmQuality = 0;
      this.state.hrvRmssd = null;
      this.state.respirationRate = null;
      this.state.baselineBpm = null;
      this.state.baselineDelta = null;
    }

    this.state.source = source;
    this.state.eegConnected = eegState.connected;
    this.state.cameraActive = rppgState.active;

    if (source !== this.previousSource) {
      logger.info('Neuro', `Source changed: ${this.previousSource} -> ${source}`);
      this.emitEvent({ type: 'source_changed', detail: { from: this.previousSource, to: source } });
      this.previousSource = source;
    }

    if (eegState.alphaBump) {
      this.emitEvent({ type: 'alpha_bump' });
    }

    try {
      this.mockProvider.update(dt);
    } catch {
      /* swallow */
    }

    this.notifySubscribers();
  }

  subscribeState(cb: (state: Readonly<NeuroState>) => void): () => void {
    this.stateSubscribers.add(cb);
    cb(this.state);
    return () => {
      this.stateSubscribers.delete(cb);
    };
  }

  addEventListener(cb: (event: NeuroEventData) => void): () => void {
    this.eventListeners.add(cb);
    return () => {
      this.eventListeners.delete(cb);
    };
  }

  private notifySubscribers(): void {
    for (const cb of this.stateSubscribers) {
      try {
        cb(this.state);
      } catch {
        // swallow
      }
    }
  }

  private emitEvent(event: NeuroEventData): void {
    for (const cb of this.eventListeners) {
      try {
        cb(event);
      } catch {
        // swallow
      }
    }
  }

  getState(): Readonly<NeuroState> {
    return this.state;
  }

  getEEGProvider(): ElataEEGProvider {
    return this.eegProvider;
  }

  getRppgProvider(): ElataRppgProvider {
    return this.rppgProvider;
  }

  getCameraVideoElement(): HTMLVideoElement | null {
    return this.rppgProvider.getVideoElement();
  }

  getMockProvider(): MockBCIProvider {
    return this.mockProvider;
  }

  destroy(): void {
    this.eegProvider.destroy();
    this.rppgProvider.destroy();
    this.mockProvider.destroy();
    this.stateSubscribers.clear();
    this.eventListeners.clear();
  }
}
