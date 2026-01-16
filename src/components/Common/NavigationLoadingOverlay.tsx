import { useNavigationLoading } from '@/contexts/NavigationLoadingContext';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const NavigationLoadingOverlay = () => {
  const { isNavigating } = useNavigationLoading();

  if (!isNavigating) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center",
        "bg-background/60 backdrop-blur-sm",
        "animate-in fade-in duration-150"
      )}
    >
      {/* Spinner minimalista */}
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};
