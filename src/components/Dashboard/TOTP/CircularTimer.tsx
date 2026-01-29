interface CircularTimerProps {
  secondsRemaining: number;
  totalSeconds?: number;
}

export function CircularTimer({ secondsRemaining, totalSeconds = 30 }: CircularTimerProps) {
  const size = 32;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = secondsRemaining / totalSeconds;
  const strokeDashoffset = circumference * (1 - progress);
  const isUrgent = secondsRemaining <= 5;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`transition-all duration-1000 ease-linear ${isUrgent ? 'text-destructive' : 'text-primary'}`}
        />
      </svg>
      <span className={`absolute text-[10px] font-medium ${isUrgent ? 'text-destructive' : 'text-muted-foreground'}`}>
        {secondsRemaining}
      </span>
    </div>
  );
}
