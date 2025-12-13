interface LogoSolvenzaProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const LogoSolvenza = ({ className = "", size = "md" }: LogoSolvenzaProps) => {
  const shieldSizes = {
    sm: { width: 50, height: 55 },
    md: { width: 70, height: 77 },
    lg: { width: 100, height: 110 }
  };

  const textSizes = {
    sm: { grupo: "text-[6px]", solvenza: "text-[10px]", tracking: "tracking-[0.15em]" },
    md: { grupo: "text-[8px]", solvenza: "text-sm", tracking: "tracking-[0.2em]" },
    lg: { grupo: "text-[10px]", solvenza: "text-lg", tracking: "tracking-[0.25em]" }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Shield Logo */}
      <div className="relative mb-1">
        <svg 
          width={shieldSizes[size].width} 
          height={shieldSizes[size].height} 
          viewBox="0 0 100 110" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Orange gradient for right side */}
            <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4714A" />
              <stop offset="50%" stopColor="#C4653A" />
              <stop offset="100%" stopColor="#A8512E" />
            </linearGradient>
            
            {/* Blue gradient for left side */}
            <linearGradient id="blueGradient" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3A5B9C" />
              <stop offset="50%" stopColor="#2A4B8C" />
              <stop offset="100%" stopColor="#1E3A6E" />
            </linearGradient>

            {/* Shadow gradient */}
            <linearGradient id="shadowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1A2A4A" />
              <stop offset="100%" stopColor="#0F1A2E" />
            </linearGradient>
          </defs>
          
          {/* Shield base shadow */}
          <path 
            d="M 50 8 L 92 28 L 92 65 L 50 102 L 8 65 L 8 28 Z" 
            fill="#1A2A4A"
            opacity="0.3"
            transform="translate(2, 2)"
          />
          
          {/* Shield - Right side (Orange) */}
          <path 
            d="M 50 8 L 92 28 L 92 65 L 50 102 L 50 8" 
            fill="url(#orangeGradient)"
          />
          
          {/* Shield - Left side (Blue) */}
          <path 
            d="M 50 8 L 8 28 L 8 65 L 50 102 L 50 8" 
            fill="url(#blueGradient)"
          />
          
          {/* Shield inner border - right */}
          <path 
            d="M 50 16 L 84 32 L 84 62 L 50 94 L 50 16" 
            fill="none"
            stroke="#D4714A"
            strokeWidth="0.5"
            opacity="0.4"
          />
          
          {/* Shield inner border - left */}
          <path 
            d="M 50 16 L 16 32 L 16 62 L 50 94 L 50 16" 
            fill="none"
            stroke="#3A5B9C"
            strokeWidth="0.5"
            opacity="0.4"
          />
          
          {/* Center divider line highlight */}
          <line 
            x1="50" y1="8" 
            x2="50" y2="102" 
            stroke="#4A6BAC"
            strokeWidth="1"
            opacity="0.3"
          />
          
          {/* Stylized S - cursive/fluid style */}
          <path 
            d="M 58 30 
               C 65 30, 72 35, 72 44
               C 72 52, 62 54, 50 55
               C 38 56, 28 58, 28 66
               C 28 75, 35 80, 42 80
               C 48 80, 52 78, 55 75"
            fill="none"
            stroke="#2A4B8C"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* S highlight */}
          <path 
            d="M 58 30 
               C 65 30, 72 35, 72 44
               C 72 52, 62 54, 50 55
               C 38 56, 28 58, 28 66
               C 28 75, 35 80, 42 80
               C 48 80, 52 78, 55 75"
            fill="none"
            stroke="#3A5B9C"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.5"
          />
        </svg>
      </div>
      
      {/* Text */}
      <div className="flex flex-col items-center text-center">
        <span 
          className={`font-light ${textSizes[size].grupo} ${textSizes[size].tracking} mb-0.5 leading-none`}
          style={{ color: '#7A8CA8' }}
        >
          GRUPO
        </span>
        <span className={`font-bold ${textSizes[size].solvenza} ${textSizes[size].tracking} leading-none`}>
          <span style={{ color: '#2A4B8C' }}>S</span>
          <span style={{ color: '#C4653A' }}>O</span>
          <span style={{ color: '#2A4B8C' }}>LVENZA</span>
        </span>
      </div>
    </div>
  );
};

export default LogoSolvenza;
