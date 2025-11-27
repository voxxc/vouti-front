import { Moon, Sun } from 'lucide-react';
import { useLocalTheme } from '@/hooks/useLocalTheme';
import { cn } from '@/lib/utils';

export const SuperAdminThemeToggle = () => {
  const { theme, toggleTheme } = useLocalTheme('superadmin-theme');

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex h-9 w-16 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        theme === 'dark' ? 'bg-primary' : 'bg-muted'
      )}
      aria-label="Alternar tema"
    >
      <span
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full bg-background shadow-lg transition-transform",
          theme === 'dark' ? 'translate-x-8' : 'translate-x-1'
        )}
      >
        {theme === 'dark' ? (
          <Moon className="h-4 w-4 text-primary" />
        ) : (
          <Sun className="h-4 w-4 text-foreground" />
        )}
      </span>
    </button>
  );
};
