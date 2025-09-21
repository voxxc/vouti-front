import { Scale } from "lucide-react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const Logo = ({ className = "", size = "md" }: LogoProps) => {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl"
  };

  const iconSizes = {
    sm: 24,
    md: 32,
    lg: 48
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="p-2 bg-gradient-primary rounded-lg shadow-elegant">
        <Scale size={iconSizes[size]} className="text-white" />
      </div>
      <span className={`font-bold text-law-blue tracking-wide ${sizeClasses[size]}`}>
        ESCRITÓRIO
      </span>
    </div>
  );
};

export default Logo;