import { useNavigate } from 'react-router';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative scanlines grid-bg select-none">
      {/* Decorative vector lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
        <line x1="0" y1="20%" x2="100%" y2="20%" stroke="var(--color-primary)" strokeWidth="0.5" opacity="0.15" />
        <line x1="0" y1="80%" x2="100%" y2="80%" stroke="var(--color-primary)" strokeWidth="0.5" opacity="0.15" />
        <line x1="15%" y1="0" x2="15%" y2="100%" stroke="var(--color-secondary)" strokeWidth="0.5" opacity="0.1" />
        <line x1="85%" y1="0" x2="85%" y2="100%" stroke="var(--color-secondary)" strokeWidth="0.5" opacity="0.1" />
        <polyline points="30,30 30,10 50,10" fill="none" stroke="var(--color-primary)" strokeWidth="1" opacity="0.4" />
        <polyline points="30,30 10,30 10,10" fill="none" stroke="var(--color-primary)" strokeWidth="1" opacity="0" />
        {/* decorative corner marks only */}
      </svg>

      {/* Title block */}
      <div className="flex flex-col items-center z-10">
        <p
          className="text-sm tracking-[0.5em] mb-6 uppercase"
          style={{ fontFamily: "'Rajdhani', sans-serif", color: 'var(--color-secondary)' }}
        >
          Stress Trainer
        </p>

        <h1
          className="text-7xl sm:text-8xl font-black tracking-[0.2em] neon-text mb-4"
          style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--color-primary)' }}
        >
          REACTION
        </h1>

        <div className="flex items-center gap-4 mb-8">
          <div
            className="h-px flex-1 w-24"
            style={{ background: 'linear-gradient(90deg, transparent, var(--color-secondary))' }}
          />
          <p
            className="text-base tracking-[0.4em] neon-text-secondary"
            style={{ fontFamily: "'Rajdhani', sans-serif", color: 'var(--color-secondary)' }}
          >
            NEURAL ARCADE
          </p>
          <div
            className="h-px flex-1 w-24"
            style={{ background: 'linear-gradient(270deg, transparent, var(--color-secondary))' }}
          />
        </div>

        <div className="max-w-lg text-center mb-16 px-6" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
          <p className="text-lg leading-relaxed" style={{ color: 'rgba(0, 255, 255, 0.75)' }}>
            Hit targets fast. Stay calm under pressure.
          </p>
          <p className="text-base mt-3" style={{ color: 'rgba(255, 0, 170, 0.65)' }}>
            Your biometrics shape the challenge — stress warps the game, calm unlocks flow state.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/calibrate')}
          className="pulse-neon px-16 py-5 border-2 text-xl font-bold tracking-[0.3em] cursor-pointer
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

        <div className="flex items-center gap-6 mt-12 opacity-40">
          <svg width="24" height="24" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="8" fill="none" stroke="var(--color-primary)" strokeWidth="1" />
          </svg>
          <svg width="24" height="24" viewBox="0 0 20 20">
            <polygon points="10,2 18,18 2,18" fill="none" stroke="var(--color-secondary)" strokeWidth="1" />
          </svg>
          <svg width="24" height="24" viewBox="0 0 20 20">
            <polygon points="10,2 17,6 17,14 10,18 3,14 3,6" fill="none" stroke="var(--color-accent)" strokeWidth="1" />
          </svg>
        </div>
      </div>

      {/* Settings button */}
      <button
        type="button"
        onClick={() => navigate('/settings')}
        className="absolute bottom-10 px-7 py-3 text-sm tracking-[0.3em] uppercase cursor-pointer
                   transition-all hover:scale-105 active:scale-95"
        style={{
          fontFamily: "'Rajdhani', sans-serif",
          color: 'var(--color-primary)',
          border: '1px solid rgba(0, 255, 255, 0.35)',
          background: 'rgba(0, 255, 255, 0.05)',
          boxShadow: '0 0 10px rgba(0, 255, 255, 0.12)',
        }}
      >
        ⚙ SETTINGS
      </button>
    </div>
  );
}
