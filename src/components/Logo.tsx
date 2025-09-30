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
      {/* Logo Icon - Single 3D M */}
      <div className="relative mb-4">
        <span 
          className={`font-bold text-mora-gold ${logoSizes[size].main} leading-none tracking-tight`}
          style={{
            textShadow: `
              -2px -2px 0 hsl(210 100% 30%),
              2px -2px 0 hsl(210 100% 30%),
              -2px 2px 0 hsl(210 100% 30%),
              2px 2px 0 hsl(210 100% 30%),
              0px 4px 8px rgba(0, 0, 0, 0.5),
              0px 8px 16px rgba(0, 0, 0, 0.3)
            `,
            filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.4))'
          }}
        >
          M
        </span>
      </div>
      
      {/* Text */}
      <div className="flex flex-col items-center text-center">
        <span className={`font-bold text-mora-gold tracking-[0.3em] ${logoSizes[size].sub} leading-none`}>
          MORA
        </span>
        <span className="text-xs text-mora-gold font-normal tracking-[0.15em] mt-1">
          GESTÃO JURÍDICA
        </span>
      </div>
    </div>
  );
};

export default Logo;