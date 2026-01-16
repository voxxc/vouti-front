import { useNavigationLoading } from '@/contexts/NavigationLoadingContext';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';

export const NavigationLoadingOverlay = () => {
  const { isNavigating } = useNavigationLoading();

  if (!isNavigating) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center",
        "bg-background/80 backdrop-blur-sm",
        "animate-in fade-in duration-200"
      )}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Logo com animação de pulse */}
        <div className="animate-pulse">
          <Logo size="lg" />
        </div>
        
        {/* Indicador de loading minimalista */}
        <div className="flex items-center gap-1.5">
          <div 
            className="w-2 h-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <div 
            className="w-2 h-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <div 
            className="w-2 h-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
};
