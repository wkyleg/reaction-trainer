import { useNavigate } from 'react-router';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative scanlines grid-bg select-none">
      {/* Decorative vector lines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
      >
        <line x1="0" y1="20%" x2="100%" y2="20%" stroke="var(--color-primary)" strokeWidth="0.5" opacity="0.15" />
        <line x1="0" y1="80%" x2="100%" y2="80%" stroke="var(--color-primary)" strokeWidth="0.5" opacity="0.15" />
        <line x1="15%" y1="0" x2="15%" y2="100%" stroke="var(--color-secondary)" strokeWidth="0.5" opacity="0.1" />
        <line x1="85%" y1="0" x2="85%" y2="100%" stroke="var(--color-secondary)" strokeWidth="0.5" opacity="0.1" />
        {/* Corner brackets */}
        <polyline points="30,30 30,10 50,10" fill="none" stroke="var(--color-primary)" strokeWidth="1" opacity="0.4" />
        <polyline points="30,30 10,30 10,10" fill="none" stroke="var(--color-primary)" strokeWidth="1" opacity="0" />
        <text x="50%" y="15%" textAnchor="middle" fill="var(--color-secondary)" fontSize="10" opacity="0.3" fontFamily="Rajdhani">
          ELATA BIOSCIENCES // NEURAL INTERFACE v1.0
        </text>
      </svg>

      {/* Title block */}
      <div className="flex flex-col items-center z-10">
        <p
          className="text-xs tracking-[0.5em] mb-4 uppercase"
          style={{ fontFamily: "'Rajdhani', sans-serif", color: 'var(--color-secondary)' }}
        >
          Stress Trainer
        </p>

        <h1
          className="text-7xl sm:text-8xl font-black tracking-[0.2em] neon-text mb-2"
          style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--color-primary)' }}
        >
          REACTION
        </h1>

        <div className="flex items-center gap-4 mb-3">
          <div className="h-px flex-1 w-24" style={{ background: 'linear-gradient(90deg, transparent, var(--color-secondary))' }} />
          <p
            className="text-sm tracking-[0.4em] neon-text-secondary"
            style={{ fontFamily: "'Rajdhani', sans-serif", color: 'var(--color-secondary)' }}
          >
            NEURAL ARCADE
          </p>
          <div className="h-px flex-1 w-24" style={{ background: 'linear-gradient(270deg, transparent, var(--color-secondary))' }} />
        </div>

        {/* Mechanic explainer */}
        <div
          className="max-w-md text-center mb-12 px-4"
          style={{ fontFamily: "'Rajdhani', sans-serif" }}
        >
          <p className="text-base leading-relaxed" style={{ color: 'rgba(0, 255, 255, 0.6)' }}>
            Hit targets fast. Stay calm under pressure.
          </p>
          <p className="text-sm mt-1" style={{ color: 'rgba(255, 0, 170, 0.5)' }}>
            Your biometrics shape the challenge — stress warps the game, calm unlocks flow state.
          </p>
        </div>

        {/* Start button */}
        <button
          type="button"
          onClick={() => navigate('/calibrate')}
          className="pulse-neon px-14 py-4 border-2 text-xl font-bold tracking-[0.3em] cursor-pointer
                     transition-transform hover:scale-110 active:scale-95"
          style={{
            fontFamily: "'Orbitron', sans-serif",
            borderColor: 'var(--color-primary)',
            color: 'var(--color-primary)',
            background: 'rgba(0, 255, 255, 0.05)',
          }}
        >
          START
        </button>

        {/* Decorative shapes */}
        <div className="flex items-center gap-6 mt-10 opacity-30">
          <svg width="20" height="20" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="8" fill="none" stroke="var(--color-primary)" strokeWidth="1" />
          </svg>
          <svg width="20" height="20" viewBox="0 0 20 20">
            <polygon points="10,2 18,18 2,18" fill="none" stroke="var(--color-secondary)" strokeWidth="1" />
          </svg>
          <svg width="20" height="20" viewBox="0 0 20 20">
            <polygon points="10,2 17,6 17,14 10,18 3,14 3,6" fill="none" stroke="var(--color-accent)" strokeWidth="1" />
          </svg>
        </div>
      </div>

      {/* Bottom settings link */}
      <button
        type="button"
        onClick={() => navigate('/settings')}
        className="absolute bottom-8 text-xs tracking-[0.3em] uppercase cursor-pointer
                   transition-opacity hover:opacity-100"
        style={{
          fontFamily: "'Rajdhani', sans-serif",
          color: 'rgba(0, 255, 255, 0.35)',
          background: 'none',
          border: 'none',
        }}
      >
        ⚙ SETTINGS
      </button>

      {/* Flicker insert credit text */}
      <p
        className="absolute bottom-16 text-[10px] tracking-[0.4em] uppercase flicker"
        style={{ fontFamily: "'Rajdhani', sans-serif", color: 'rgba(255, 0, 170, 0.3)' }}
      >
        INSERT NEURAL LINK TO CONTINUE
      </p>
    </div>
  );
}
