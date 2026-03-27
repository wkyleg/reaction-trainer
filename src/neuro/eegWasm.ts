import { initEegWasm as initSdkEegWasm } from '@elata-biosciences/eeg-web';
import eegWasmUrl from '@elata-biosciences/eeg-web/wasm/eeg_wasm_bg.wasm?url';
import logger from './logger';

let initPromise: Promise<boolean> | null = null;
let ready = false;
let initError: unknown = null;

export async function initEegWasm(): Promise<boolean> {
  if (ready) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await initSdkEegWasm({ module_or_path: eegWasmUrl });
      ready = true;
      return true;
    } catch (error) {
      initError = error;
      ready = false;
      logger.warn('eegWasm', 'EEG WASM init failed; continuing without WASM EEG processing', error);
      return false;
    }
  })();

  return initPromise;
}

export function isEegWasmReady(): boolean {
  return ready;
}

export function getEegWasmInitError(): unknown {
  return initError;
}
