import { useCallback, useEffect, useRef } from 'react';
import { useNeuroStore } from './store';

export { useNeuroStore } from './store';

export function useNeuro() {
  return useNeuroStore();
}

export function useNeuroSignals() {
  return useNeuroStore((s) => ({
    calm: s.calm,
    arousal: s.arousal,
    bpm: s.bpm,
    hrvRmssd: s.hrvRmssd,
    signalQuality: s.signalQuality,
    source: s.source,
  }));
}

export function useNeuroConnection() {
  return useNeuroStore((s) => ({
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
  }));
}

export function useNeuroEeg() {
  return useNeuroStore((s) => ({
    alphaPower: s.alphaPower,
    betaPower: s.betaPower,
    thetaPower: s.thetaPower,
    deltaPower: s.deltaPower,
    gammaPower: s.gammaPower,
    alphaBump: s.alphaBump,
    calmnessState: s.calmnessState,
    alphaPeakFreq: s.alphaPeakFreq,
    alphaBumpState: s.alphaBumpState,
  }));
}

/**
 * Drives the neuro update loop via requestAnimationFrame.
 * Mount this once at the app root level.
 */
export function useNeuroLoop() {
  const tick = useNeuroStore((s) => s.tick);
  const manager = useNeuroStore((s) => s.manager);
  const lastTimeRef = useRef<number>(0);

  const loop = useCallback(
    (time: number) => {
      if (lastTimeRef.current > 0) {
        const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
        tick(dt);
      }
      lastTimeRef.current = time;
    },
    [tick],
  );

  useEffect(() => {
    if (!manager) return;

    let rafId: number;
    const frame = (time: number) => {
      loop(time);
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      lastTimeRef.current = 0;
    };
  }, [manager, loop]);
}
