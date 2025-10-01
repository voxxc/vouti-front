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
      {/* Logo Icon - M */}
      <div className="relative mb-1">
        {/* Main M Letter with gradient gold */}
        <div 
          className={`font-black ${logoSizes[size].main} leading-none tracking-wide relative`}
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