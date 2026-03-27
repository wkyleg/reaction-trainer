import { useNeuroConnection } from '../neuro/hooks';

interface DeviceConnectProps {
  onReady?: () => void;
  showSkip?: boolean;
  onSkip?: () => void;
}

export function DeviceConnect({ onReady, showSkip = true, onSkip }: DeviceConnectProps) {
  const {
    eegConnected,
    cameraActive,
    wasmReady,
    connecting,
    error,
    connectHeadband,
    enableCamera,
    enableMock,
  } = useNeuroConnection();

  const hasConnection = eegConnected || cameraActive;

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
      <div className="rounded-2xl p-6" style={{ background: 'var(--color-panel)', backdropFilter: 'blur(20px)' }}>
        <h3 className="text-lg font-semibold mb-1">Connect Webcam</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
          Heart rate and HRV via facial video analysis
        </p>
        {cameraActive ? (
          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-calm)' }}>
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'var(--color-calm)' }} />
            Camera connected
          </div>
        ) : (
          <button
            type="button"
            onClick={() => enableCamera()}
            disabled={connecting.camera}
            className="px-5 py-2 rounded-lg text-white font-medium text-sm cursor-pointer disabled:opacity-50"
            style={{ background: 'var(--color-primary)' }}
          >
            {connecting.camera ? 'Connecting...' : 'Enable Camera'}
          </button>
        )}
        {error.camera && <p className="text-sm mt-2 text-red-500">{error.camera}</p>}
      </div>

      {wasmReady && (
        <div className="rounded-2xl p-6" style={{ background: 'var(--color-panel)', backdropFilter: 'blur(20px)' }}>
          <h3 className="text-lg font-semibold mb-1">Connect EEG Headband</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
            Brain wave analysis via Bluetooth headband
          </p>
          {eegConnected ? (
            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-calm)' }}>
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'var(--color-calm)' }} />
              Headband connected
            </div>
          ) : (
            <button
              type="button"
              onClick={() => connectHeadband()}
              disabled={connecting.eeg}
              className="px-5 py-2 rounded-lg text-white font-medium text-sm cursor-pointer disabled:opacity-50"
              style={{ background: 'var(--color-accent, #000080)' }}
            >
              {connecting.eeg ? 'Scanning...' : 'Connect Headband'}
            </button>
          )}
          {error.eeg && <p className="text-sm mt-2 text-red-500">{error.eeg}</p>}
          <p className="text-xs mt-3" style={{ color: 'var(--color-muted)' }}>
            Requires Chrome or Edge with Web Bluetooth enabled
          </p>
        </div>
      )}

      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={() => enableMock()}
          className="text-sm underline cursor-pointer"
          style={{ color: 'var(--color-muted)' }}
        >
          Enable simulated signals (dev)
        </button>
      )}

      <div className="flex gap-3 mt-2">
        {hasConnection && onReady && (
          <button
            type="button"
            onClick={onReady}
            className="flex-1 px-6 py-3 rounded-xl text-white font-medium text-base cursor-pointer"
            style={{ background: 'var(--color-calm)' }}
          >
            Continue
          </button>
        )}
        {showSkip && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="px-6 py-3 rounded-xl font-medium text-base cursor-pointer border"
            style={{ color: 'var(--color-muted)', borderColor: '#E5E5EA' }}
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
