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
      <div className="relative mb-8">
        {/* Main M Letter with gradient gold */}
        <div 
          className={`font-black ${logoSizes[size].main} leading-none tracking-wide relative z-10`}
          style={{
            background: 'linear-gradient(180deg, hsl(43 90% 65%) 0%, hsl(43 90% 45%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6))',
            fontWeight: 900
          }}
        >
          M
        </div>
        
        {/* Crossed Gavels under the M - with black strokes */}
        <svg 
          className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 z-0"
          width={size === "lg" ? "80" : size === "md" ? "60" : "40"}
          height={size === "lg" ? "50" : size === "md" ? "38" : "25"}
          viewBox="0 0 80 50"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Left Gavel with stroke */}
          <g transform="rotate(-40 28 28)">
            {/* Black outline */}
            <rect x="19" y="10" width="6" height="32" rx="0.5" fill="#000" />
            <rect x="17" y="6" width="10" height="8" rx="1.5" fill="#000" />
            {/* Gold fill */}
            <rect x="20" y="11" width="4" height="30" fill="url(#goldGradient)" />
            <rect x="18" y="7" width="8" height="6" rx="1" fill="url(#goldGradient)" />
          </g>
          
          {/* Right Gavel with stroke */}
          <g transform="rotate(40 52 28)">
            {/* Black outline */}
            <rect x="49" y="10" width="6" height="32" rx="0.5" fill="#000" />
            <rect x="47" y="6" width="10" height="8" rx="1.5" fill="#000" />
            {/* Gold fill */}
            <rect x="50" y="11" width="4" height="30" fill="url(#goldGradient)" />
            <rect x="48" y="7" width="8" height="6" rx="1" fill="url(#goldGradient)" />
          </g>
          
          {/* Center X Connection with stroke */}
          <circle cx="40" cy="28" r="4" fill="#000" />
          <circle cx="40" cy="28" r="3" fill="url(#goldGradient)" />
          
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(43 90% 68%)" />
              <stop offset="50%" stopColor="hsl(43 90% 55%)" />
              <stop offset="100%" stopColor="hsl(43 90% 42%)" />
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