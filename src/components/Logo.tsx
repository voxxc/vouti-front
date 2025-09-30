import moraLogo from "@/assets/mora-logo.png";

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
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img 
        src={moraLogo} 
        alt="MORA Logo" 
        className={`${logoSizes[size]} object-contain`}
      />
      
      <div className="flex flex-col">
        <span className={`font-bold text-mora-gold tracking-wider ${sizeClasses[size]} leading-none`}>
          MORA
        </span>
        <span className="text-xs text-mora-gold font-medium tracking-wide mt-0.5">
          GESTÃO JURÍDICA
        </span>
      </div>
    </div>
  );
};

export default Logo;