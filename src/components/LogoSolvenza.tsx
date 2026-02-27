interface LogoSolvenzaProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const LogoSolvenza = ({ className = "", size = "md" }: LogoSolvenzaProps) => {
  const logoSizes = {
    sm: { main: "text-4xl", sub: "text-xs" },
    md: { main: "text-5xl", sub: "text-sm" },
    lg: { main: "text-7xl", sub: "text-lg" }
  };

  const shieldSizes = {
    sm: { width: "50", height: "60" },
    md: { width: "65", height: "78" },
    lg: { width: "90", height: "108" }
  };

  const darkBlue = "#1B3A5C";
  const coral = "#D4724A";

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Logo Icon - S Shield */}
      <div className="relative mb-2">
        <svg 
          width={shieldSizes[size].width} 
          height={shieldSizes[size].height} 
          viewBox="0 0 100 120" 
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter: 'drop-shadow(0 1px 4px rgba(0, 0, 0, 0.15))'
          }}
        >
          <defs>
            <linearGradient id="blueGradSolvenza" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#1B3A5C', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#152D48', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="coralGradSolvenza" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#E07A50', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#D4724A', stopOpacity: 1 }} />
            </linearGradient>
            <clipPath id="shieldClipSolvenza">
              <path d="M 50 8 L 92 30 Q 96 32 94 36 L 84 92 Q 82 98 78 101 L 54 114 Q 50 116 46 114 L 22 101 Q 18 98 16 92 L 6 36 Q 4 32 8 30 Z" />
            </clipPath>
          </defs>
          
          {/* Shield background - split blue/coral */}
          <g clipPath="url(#shieldClipSolvenza)">
            {/* Left half - dark blue */}
            <rect x="0" y="0" width="50" height="120" fill={darkBlue} />
            {/* Right half - coral */}
            <rect x="50" y="0" width="50" height="120" fill={coral} />
          </g>

          {/* Shield outline */}
          <path 
            d="M 50 8 L 92 30 Q 96 32 94 36 L 84 92 Q 82 98 78 101 L 54 114 Q 50 116 46 114 L 22 101 Q 18 98 16 92 L 6 36 Q 4 32 8 30 Z" 
            fill="none"
            stroke={darkBlue}
            strokeWidth="2"
          />

          {/* Inner shield border */}
          <path 
            d="M 50 14 L 88 34 Q 91 35.5 89.5 39 L 80 90 Q 78.5 95 75 97.5 L 53 109 Q 50 111 47 109 L 25 97.5 Q 21.5 95 20 90 L 10.5 39 Q 9 35.5 12 34 Z" 
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1"
          />

          {/* Stylized S letter - white */}
          <text 
            x="50" 
            y="72" 
            fontFamily="Georgia, 'Times New Roman', serif" 
            fontSize="58" 
            fontWeight="700" 
            fontStyle="italic"
            fill="white"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
          >
            S
          </text>

          {/* Decorative swirl elements around S */}
          <path 
            d="M 28 42 Q 32 38 38 40" 
            fill="none" 
            stroke="rgba(255,255,255,0.5)" 
            strokeWidth="1.5" 
            strokeLinecap="round"
          />
          <path 
            d="M 72 95 Q 68 99 62 97" 
            fill="none" 
            stroke="rgba(255,255,255,0.5)" 
            strokeWidth="1.5" 
            strokeLinecap="round"
          />
        </svg>
      </div>
      
      {/* Text */}
      <div className="flex flex-col items-center text-center">
        <span 
          className="text-[6px] font-normal tracking-[0.3em] mb-0.5 leading-none"
          style={{ color: darkBlue }}
        >
          GRUPO
        </span>
        <span 
          className={`font-bold tracking-[0.4em] ${logoSizes[size].sub} leading-none`}
          style={{ color: darkBlue }}
        >
          SOLVENZA
        </span>
      </div>
    </div>
  );
};

export default LogoSolvenza;
