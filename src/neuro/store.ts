import { create } from 'zustand';
import type { NeuroState } from './neuroManager';
import { NeuroManager } from './neuroManager';

interface NeuroStoreState extends NeuroState {
  manager: NeuroManager | null;
  wasmReady: boolean;
  mockEnabled: boolean;
  connecting: { eeg: boolean; camera: boolean };
  error: { eeg: string | null; camera: string | null };
}

interface NeuroStoreActions {
  init: () => Promise<void>;
  connectHeadband: () => Promise<boolean>;
  enableCamera: () => Promise<boolean>;
  disableCamera: () => void;
  enableMock: () => void;
  disableMock: () => void;
  tick: (dt: number) => void;
  destroy: () => void;
}

export type NeuroStore = NeuroStoreState & NeuroStoreActions;

const INITIAL_NEURO_STATE: NeuroState = {
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

function neuroStateChanged(prev: NeuroStoreState, next: NeuroState): boolean {
  return (
    prev.source !== next.source ||
    prev.eegConnected !== next.eegConnected ||
    prev.cameraActive !== next.cameraActive ||
    prev.calm !== next.calm ||
    prev.arousal !== next.arousal ||
    prev.bpm !== next.bpm ||
    prev.bpmQuality !== next.bpmQuality ||
    prev.signalQuality !== next.signalQuality ||
    prev.alphaPower !== next.alphaPower ||
    prev.betaPower !== next.betaPower ||
    prev.thetaPower !== next.thetaPower ||
    prev.deltaPower !== next.deltaPower ||
    prev.gammaPower !== next.gammaPower ||
    prev.alphaBump !== next.alphaBump ||
    prev.hrvRmssd !== next.hrvRmssd ||
    prev.calmnessState !== next.calmnessState ||
    prev.alphaPeakFreq !== next.alphaPeakFreq ||
    prev.alphaBumpState !== next.alphaBumpState
  );
}

export const useNeuroStore = create<NeuroStore>((set, get) => ({
  ...INITIAL_NEURO_STATE,
  manager: null,
  wasmReady: false,
  mockEnabled: false,
  connecting: { eeg: false, camera: false },
  error: { eeg: null, camera: null },

  init: async () => {
    const existing = get().manager;
    if (existing) return;

    const manager = new NeuroManager();
    set({ manager });

    await manager.initWasm();
    set({ wasmReady: manager.isWasmReady() });
  },

  connectHeadband: async () => {
    const { manager } = get();
    if (!manager) return false;
    set({ connecting: { ...get().connecting, eeg: true }, error: { ...get().error, eeg: null } });
    const success = await manager.connectHeadband();
    set({
      connecting: { ...get().connecting, eeg: false },
      eegConnected: success,
      error: { ...get().error, eeg: success ? null : manager.getHeadbandErrorMessage() },
    });
    return success;
  },

  enableCamera: async () => {
    const { manager } = get();
    if (!manager) return false;
    set({ connecting: { ...get().connecting, camera: true }, error: { ...get().error, camera: null } });
    const success = await manager.enableCamera();
    set({
      connecting: { ...get().connecting, camera: false },
      cameraActive: success,
      error: { ...get().error, camera: success ? null : manager.getCameraErrorMessage() },
    });
    return success;
  },

  disableCamera: () => {
    get().manager?.disableCamera();
    set({ cameraActive: false });
  },

  enableMock: () => {
    get().manager?.enableMock();
    set({ mockEnabled: true });
  },

  disableMock: () => {
    get().manager?.disableMock();
    set({ mockEnabled: false });
  },

  tick: (dt: number) => {
    const { manager } = get();
    if (!manager) return;
    manager.update(dt);
    const state = manager.getState();
    const current = get();
    if (neuroStateChanged(current, state)) {
      set({ ...state });
    }
  },

  destroy: () => {
    get().manager?.destroy();
    set({ manager: null, ...INITIAL_NEURO_STATE, wasmReady: false, mockEnabled: false });
  },
}));
