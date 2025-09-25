import { Scale, Briefcase } from "lucide-react";

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

  const iconSizes = {
    sm: 20,
    md: 28,
    lg: 40
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        {/* Background gradient circle */}
        <div className="absolute inset-0 bg-gradient-to-br from-law-gold via-amber-500 to-yellow-600 rounded-xl shadow-elegant opacity-90"></div>
        
        {/* Icon container */}
        <div className="relative p-2.5 bg-gradient-to-br from-law-blue to-law-blue-light rounded-xl shadow-lg">
          <div className="relative">
            {/* Justice scale icon */}
            <Scale size={iconSizes[size]} className="text-white relative z-10" />
            
            {/* Briefcase accent */}
            <Briefcase 
              size={Math.round(iconSizes[size] * 0.4)} 
              className="absolute -bottom-1 -right-1 text-law-gold opacity-80" 
            />
          </div>
        </div>

        {/* Decorative dot */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-law-gold rounded-full border-2 border-white shadow-sm"></div>
      </div>
      
      <div className="flex flex-col">
        <span className={`font-bold text-law-blue tracking-wider ${sizeClasses[size]} leading-none`}>
          JUS OFFICE
        </span>
        <span className="text-xs text-law-neutral font-medium tracking-wide mt-0.5">
          Gestão Jurídica
        </span>
      </div>
    </div>
  );
};

export default Logo;