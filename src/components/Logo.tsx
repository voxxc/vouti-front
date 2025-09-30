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
      {/* Logo Icon - Stylized M letters */}
      <div className="relative mb-2">
        <div className="flex items-center justify-center">
          {/* Left M (Blue) */}
          <span className={`font-bold text-mora-blue ${logoSizes[size].main} leading-none tracking-tight`}>
            M
          </span>
          
          {/* Right M (Gold) with overlap effect */}
          <span className={`font-bold text-mora-gold ${logoSizes[size].main} leading-none tracking-tight -ml-3`}>
            M
          </span>
        </div>
        
        {/* Shield/Bridge element between Ms */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-4 h-4 bg-mora-gold clip-shield opacity-80"></div>
        </div>
      </div>
      
      {/* Text */}
      <div className="flex flex-col items-center text-center">
        <span className={`font-bold text-mora-gold tracking-widest ${logoSizes[size].sub} leading-none`}>
          MORA
        </span>
        <span className="text-xs text-mora-gold font-medium tracking-wide mt-1 opacity-80">
          GESTÃO JURÍDICA
        </span>
      </div>
    </div>
  );
};

export default Logo;