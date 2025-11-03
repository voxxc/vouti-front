interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const Logo = ({ className = "", size = "md" }: LogoProps) => {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl", 
    lg: "text-3xl"
  };

  const logoSizes = {
    sm: { main: "text-4xl", sub: "text-xs" },
    md: { main: "text-5xl", sub: "text-sm" },
    lg: { main: "text-7xl", sub: "text-lg" }
  };

  const shieldSizes = {
    sm: { width: "60", height: "72" },
    md: { width: "80", height: "96" },
    lg: { width: "120", height: "144" }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Logo Icon - S Shield (Superman style) */}
      <div className="relative mb-2">
        <svg 
          width={shieldSizes[size].width} 
          height={shieldSizes[size].height} 
          viewBox="0 0 100 120" 
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6))'
          }}
        >
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'hsl(43 90% 65%)', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: 'hsl(43 90% 45%)', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          
          {/* Shield Shape (Pentagon/Diamond) */}
          <path 
            d="M 50 5 L 95 35 L 85 95 L 50 115 L 15 95 L 5 35 Z" 
            fill="url(#goldGradient)"
            stroke="hsl(43 90% 35%)"
            strokeWidth="2"
          />
          
          {/* Letter S */}
          <text 
            x="50" 
            y="80" 
            fontFamily="Arial, sans-serif" 
            fontSize="70" 
            fontWeight="900" 
            fill="hsl(0 0% 5%)"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            S
          </text>
        </svg>
      </div>
      
      {/* Text */}
      <div className="flex flex-col items-center text-center">
        <span 
          className={`font-bold tracking-[0.4em] ${logoSizes[size].sub} leading-none`}
          style={{
            background: 'linear-gradient(180deg, hsl(43 90% 65%) 0%, hsl(43 90% 45%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          SOLVENZA
        </span>
        <span 
          className="text-xs font-normal tracking-[0.2em] mt-1"
          style={{
            background: 'linear-gradient(180deg, hsl(43 90% 65%) 0%, hsl(43 90% 45%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          GROUP
        </span>
      </div>
    </div>
  );
};

export default Logo;