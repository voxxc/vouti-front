import { useState, useEffect } from 'react';
import Logo from '@/components/Logo';

interface LoadingTransitionProps {
  onComplete: () => void;
}

const LoadingTransition = ({ onComplete }: LoadingTransitionProps) => {
  const [showLogo, setShowLogo] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Start logo fade-in immediately
    setTimeout(() => {
      setShowLogo(true);
    }, 50);

    // Start logo fade-out after 800ms
    setTimeout(() => {
      setFadingOut(true);
    }, 800);

    // Complete transition after fade-out animation
    setTimeout(() => {
      onComplete();
    }, 1200);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div 
        className={`transition-opacity duration-500 ${
          showLogo && !fadingOut 
            ? 'opacity-100 animate-fade-in' 
            : fadingOut 
              ? 'opacity-0 animate-fade-out' 
              : 'opacity-0'
        }`}
      >
        <Logo size="lg" />
      </div>
    </div>
  );
};

export default LoadingTransition;