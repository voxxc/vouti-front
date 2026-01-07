interface CloudIconProps {
  className?: string;
}

const CloudIcon = ({ className }: CloudIconProps) => {
  return (
    <svg 
      viewBox="0 0 64 44" 
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="cloudGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(43, 90%, 65%)" />
          <stop offset="50%" stopColor="hsl(43, 90%, 55%)" />
          <stop offset="100%" stopColor="hsl(43, 90%, 45%)" />
        </linearGradient>
        <filter id="cloudShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="hsl(43, 90%, 50%)" floodOpacity="0.3"/>
        </filter>
      </defs>
      <path
        d="M52 20C52 12.268 45.732 6 38 6C33.582 6 29.633 8.054 27.05 11.282C25.148 9.262 22.432 8 19.5 8C13.701 8 9 12.701 9 18.5C9 19.238 9.076 19.96 9.22 20.656C3.965 21.851 0 26.584 0 32.25C0 38.877 5.373 44.25 12 44.25H52C58.627 44.25 64 38.877 64 32.25C64 25.623 58.627 20.25 52 20.25V20Z"
        fill="url(#cloudGradient)"
        filter="url(#cloudShadow)"
      />
    </svg>
  );
};

export default CloudIcon;
