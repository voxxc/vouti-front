import logoSolvenza from "@/assets/logo-solvenza.png";

interface LogoSolvenzaProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const LogoSolvenza = ({ className = "", size = "md" }: LogoSolvenzaProps) => {
  const heights = { sm: 48, md: 72, lg: 100 };

  return (
    <img
      src={logoSolvenza}
      alt="Grupo Solvenza"
      height={heights[size]}
      style={{ height: heights[size], width: "auto" }}
      className={className}
    />
  );
};

export default LogoSolvenza;
