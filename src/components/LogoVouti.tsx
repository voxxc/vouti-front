import { cn } from "@/lib/utils";

interface LogoVoutiProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const LogoVouti = ({ className = "", size = "md" }: LogoVoutiProps) => {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-6xl",
  };

  return (
    <div className={cn("flex items-center font-black tracking-tight lowercase", sizeClasses[size], className)}>
      <span className="text-foreground">vouti</span>
      <span className="text-[#E11D48]">.</span>
    </div>
  );
};

export default LogoVouti;
