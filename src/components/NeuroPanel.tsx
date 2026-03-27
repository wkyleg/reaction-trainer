import { useNeuroSignals } from '../neuro/hooks';
import { SignalQuality } from './SignalQuality';

interface NeuroPanelProps {
  className?: string;
  compact?: boolean;
}

export function NeuroPanel({ className = '', compact = false }: NeuroPanelProps) {
  const { calm, arousal, bpm, hrvRmssd, signalQuality, source } = useNeuroSignals();

  if (source === 'none') return null;

  const displayBpm = bpm !== null ? Math.round(bpm) : '--';
  const displayHrv = hrvRmssd !== null ? hrvRmssd.toFixed(0) : '--';
  const displayCalm = Math.round(calm * 100);

  if (compact) {
    return (
      <div
        className={`flex items-center gap-4 px-4 py-2 rounded-xl text-sm ${className}`}
        style={{ background: 'var(--color-panel)', backdropFilter: 'blur(20px)' }}
      >
        <span className="flex items-center gap-1">
          <span style={{ color: '#FF3B30' }}>♥</span>
          <span className="font-medium tabular-nums">{displayBpm}</span>
        </span>
        {hrvRmssd !== null && (
          <span className="flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
            HRV <span className="font-medium tabular-nums">{displayHrv}</span>
          </span>
        )}
        <span className="flex items-center gap-1" style={{ color: 'var(--color-calm)' }}>
          Calm <span className="font-medium tabular-nums">{displayCalm}%</span>
        </span>
        <SignalQuality quality={signalQuality} size={14} />
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{ background: 'var(--color-panel)', backdropFilter: 'blur(20px)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
          {source === 'eeg' ? 'EEG + Camera' : source === 'rppg' ? 'Camera' : 'Simulated'}
        </span>
        <SignalQuality quality={signalQuality} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
            BPM
          </div>
          <div className="text-2xl font-semibold tabular-nums flex items-center gap-1">
            <span style={{ color: '#FF3B30', fontSize: 14 }}>♥</span>
            {displayBpm}
          </div>
        </div>
        <div>
          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
            HRV
          </div>
          <div className="text-2xl font-semibold tabular-nums">{displayHrv}</div>
        </div>
        <div>
          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Calm
          </div>
          <div className="text-2xl font-semibold tabular-nums" style={{ color: 'var(--color-calm)' }}>
            {displayCalm}%
          </div>
        </div>
      </div>

      {source === 'eeg' && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: '#E5E5EA' }}>
          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Arousal: {Math.round(arousal * 100)}%
          </div>
        </div>
      )}
    </div>
  );
}
