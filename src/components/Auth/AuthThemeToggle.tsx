import { Moon, Sun } from 'lucide-react';
import { useLocalTheme } from '@/hooks/useLocalTheme';
import { cn } from '@/lib/utils';

export const AuthThemeToggle = () => {
  const { theme, toggleTheme } = useLocalTheme('auth-theme');

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "p-2 rounded-full transition-colors",
        "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
      )}
      aria-label="Alternar tema"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
};
