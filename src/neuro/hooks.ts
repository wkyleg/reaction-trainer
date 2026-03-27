import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/shallow';
import { useNeuroStore } from './store';

export { useNeuroStore } from './store';

export function useNeuro() {
  return useNeuroStore();
}

export function useNeuroSignals() {
  return useNeuroStore(
    useShallow((s) => ({
      calm: s.calm,
      arousal: s.arousal,
      bpm: s.bpm,
      hrvRmssd: s.hrvRmssd,
      signalQuality: s.signalQuality,
      source: s.source,
    })),
  );
}

export function useNeuroConnection() {
  return useNeuroStore(
    useShallow((s) => ({
      eegConnected: s.eegConnected,
      cameraActive: s.cameraActive,
      mockEnabled: s.mockEnabled,
      wasmReady: s.wasmReady,
      source: s.source,
      connecting: s.connecting,
      error: s.error,
      connectHeadband: s.connectHeadband,
      enableCamera: s.enableCamera,
      disableCamera: s.disableCamera,
      enableMock: s.enableMock,
      disableMock: s.disableMock,
    })),
  );
}

export function useNeuroEeg() {
  return useNeuroStore(
    useShallow((s) => ({
      alphaPower: s.alphaPower,
      betaPower: s.betaPower,
      thetaPower: s.thetaPower,
      deltaPower: s.deltaPower,
      gammaPower: s.gammaPower,
      alphaBump: s.alphaBump,
      calmnessState: s.calmnessState,
      alphaPeakFreq: s.alphaPeakFreq,
      alphaBumpState: s.alphaBumpState,
    })),
  );
}

/**
 * Drives the neuro update loop via requestAnimationFrame.
 * Mount this once at the app root level.
 */
export function useNeuroLoop() {
  const tickRef = useRef(useNeuroStore.getState().tick);
  const managerRef = useRef(useNeuroStore.getState().manager);
  const lastTimeRef = useRef<number>(0);
  const rafIdRef = useRef<number>(0);

  useEffect(() => {
    return useNeuroStore.subscribe((state) => {
      tickRef.current = state.tick;
      managerRef.current = state.manager;
    });
  }, []);

  useEffect(() => {
    const frame = (time: number) => {
      if (managerRef.current && lastTimeRef.current > 0) {
        const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
        tickRef.current(dt);
      }
      lastTimeRef.current = time;
      rafIdRef.current = requestAnimationFrame(frame);
    };
    rafIdRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafIdRef.current);
      lastTimeRef.current = 0;
    };
  }, []);
}
