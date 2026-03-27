interface SignalQualityProps {
  quality: number;
  size?: number;
  className?: string;
}

export function SignalQuality({ quality, size = 16, className = '' }: SignalQualityProps) {
  const bars = 4;
  const barWidth = size / (bars * 2);
  const gap = barWidth;

  const getColor = (q: number) => {
    if (q >= 0.7) return '#34C759';
    if (q >= 0.4) return '#FF9500';
    return '#FF3B30';
  };

  const activeBars = Math.ceil(quality * bars);
  const color = getColor(quality);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      {Array.from({ length: bars }).map((_, i) => {
        const height = ((i + 1) / bars) * size * 0.8;
        const x = i * (barWidth + gap);
        const y = size - height;
        const isActive = i < activeBars;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={height}
            rx={1}
            fill={isActive ? color : '#E5E5EA'}
            opacity={isActive ? 1 : 0.3}
          />
        );
      })}
    </svg>
  );
}
