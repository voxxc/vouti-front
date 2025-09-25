import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="gap-2"
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
    </Button>
  );
};