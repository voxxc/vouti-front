import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface HoldButtonProps {
  onComplete: () => void;
  holdDuration?: number;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  variant?: 'entrada' | 'pausa' | 'almoco' | 'retorno_almoco' | 'saida';
}

const variantColors = {
  entrada: 'from-green-500 to-green-600',
  pausa: 'from-yellow-500 to-yellow-600',
  almoco: 'from-blue-500 to-blue-600',
  retorno_almoco: 'from-cyan-500 to-cyan-600',
  saida: 'from-orange-500 to-red-500',
};

const HoldButton = ({
  onComplete,
  holdDuration = 3000,
  disabled = false,
  className,
  children,
  variant = 'entrada',
}: HoldButtonProps) => {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const startHold = useCallback(() => {
    if (disabled) return;
    
    setIsHolding(true);
    startTimeRef.current = Date.now();
    
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / holdDuration) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setIsHolding(false);
        setProgress(0);
        onComplete();
      }
    }, 16);
  }, [disabled, holdDuration, onComplete]);

  const cancelHold = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsHolding(false);
    setProgress(0);
  }, []);

  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={startHold}
      onTouchEnd={cancelHold}
      className={cn(
        'relative overflow-hidden rounded-xl py-6 px-8 text-lg font-bold text-white transition-all select-none',
        'bg-gradient-to-r shadow-lg',
        variantColors[variant],
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'hover:scale-[1.02] active:scale-[0.98]',
        className
      )}
    >
      {/* Progress bar background */}
      <div
        className="absolute inset-0 bg-white/30 transition-all duration-75"
        style={{ width: `${progress}%` }}
      />
      
      {/* Content */}
      <div className="relative z-10 flex items-center justify-center gap-3">
        {children}
      </div>
      
      {/* Hold instruction */}
      {isHolding && (
        <div className="absolute bottom-1 left-0 right-0 text-center text-xs text-white/80">
          Segure por 3 segundos...
        </div>
      )}
    </button>
  );
};

export default HoldButton;
