interface LogoSolvenzaProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const LogoSolvenza = ({ className = "", size = "md" }: LogoSolvenzaProps) => {
  const textSizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-4xl"
  };

  const grupoSizes = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-base"
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="flex flex-col items-center text-center">
        <span 
          className={`${grupoSizes[size]} font-normal tracking-[0.3em] mb-0.5 leading-none`}
          style={{
            background: 'linear-gradient(180deg, hsl(43 90% 65%) 0%, hsl(43 90% 45%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          GRUPO
        </span>
        <span 
          className={`font-bold tracking-[0.4em] ${textSizes[size]} leading-none`}
          style={{
            background: 'linear-gradient(180deg, hsl(43 90% 65%) 0%, hsl(43 90% 45%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          SOLVENZA
        </span>
      </div>
    </div>
  );
};

export default LogoSolvenza;
