import { useNavigate } from 'react-router';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: 'var(--color-bg)' }}
    >
      <h1
        className="text-5xl font-black tracking-widest mb-2"
        style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--color-primary)' }}
      >
        REACTION
      </h1>
      <p
        className="text-lg tracking-wide mb-12"
        style={{ fontFamily: "'Rajdhani', sans-serif", color: 'var(--color-secondary)' }}
      >
        STRESS TRAINER
      </p>
      <button
        type="button"
        onClick={() => navigate('/calibrate')}
        className="px-10 py-3 border-2 text-lg font-bold tracking-widest transition-all hover:scale-110 active:scale-95 cursor-pointer"
        style={{
          fontFamily: "'Orbitron', sans-serif",
          borderColor: 'var(--color-primary)',
          color: 'var(--color-primary)',
          background: 'transparent',
        }}
      >
        START
      </button>
    </div>
  );
}
