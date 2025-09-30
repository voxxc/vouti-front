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

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Logo Icon - M with Crossed Gavels */}
      <div className="relative mb-6">
        {/* Main M Letter with gradient gold */}
        <div 
          className={`font-black ${logoSizes[size].main} leading-none tracking-wide relative`}
          style={{
            background: 'linear-gradient(180deg, hsl(43 90% 65%) 0%, hsl(43 90% 45%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5))',
            fontWeight: 900
          }}
        >
          M
        </div>
        
        {/* Crossed Gavels under the M */}
        <svg 
          className="absolute -bottom-3 left-1/2 transform -translate-x-1/2"
          width={size === "lg" ? "70" : size === "md" ? "50" : "35"}
          height={size === "lg" ? "40" : size === "md" ? "30" : "20"}
          viewBox="0 0 70 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Left Gavel */}
          <g transform="rotate(-45 25 25)">
            <rect x="18" y="8" width="4" height="28" fill="url(#goldGradient)" />
            <rect x="16" y="5" width="8" height="6" rx="1" fill="url(#goldGradient)" />
          </g>
          
          {/* Right Gavel */}
          <g transform="rotate(45 45 25)">
            <rect x="43" y="8" width="4" height="28" fill="url(#goldGradient)" />
            <rect x="41" y="5" width="8" height="6" rx="1" fill="url(#goldGradient)" />
          </g>
          
          {/* Center X Connection */}
          <circle cx="35" cy="25" r="3" fill="url(#goldGradient)" />
          
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(43 90% 65%)" />
              <stop offset="100%" stopColor="hsl(43 90% 45%)" />
            </linearGradient>
          </defs>
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
          MORA
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
          GESTÃO JURÍDICA
        </span>
      </div>
    </div>
  );
};

export default Logo;