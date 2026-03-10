const LogoSpn = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeMap = { sm: 'text-xl', md: 'text-3xl', lg: 'text-5xl' };
  return (
    <div className="flex flex-col items-center gap-1">
      <h1 className={`${sizeMap[size]} font-black tracking-tight`}>
        <span className="text-foreground">vouti</span>
        <span className="text-red-500">.</span>
        <span className="text-emerald-500">spn</span>
      </h1>
      <p className="text-xs italic tracking-wide">
        <span className="text-foreground">aqui você </span><span className="font-semibold text-emerald-500">speak now</span><span className="text-foreground">!</span>
      </p>
    </div>
  );
};

export default LogoSpn;
