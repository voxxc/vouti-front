import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('dark'); // Default to dark
  const [isLoadingTheme, setIsLoadingTheme] = useState(true);
  // Get user from AuthContext only if it's available
  let user = null;
  try {
    const authContext = useAuth();
    user = authContext?.user;
  } catch (error) {
    // AuthContext not available, continue without it
  }

  // Load theme from Supabase when user is available
  useEffect(() => {
    const loadUserTheme = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('theme_preference')
            .eq('user_id', user.id)
            .single();

          if (!error && data?.theme_preference) {
            setTheme(data.theme_preference as Theme);
          }
        } catch (error) {
          console.error('Error loading theme:', error);
        }
      } else {
        // If no user, load from localStorage
        const stored = localStorage.getItem('theme') as Theme;
        if (stored) {
          setTheme(stored);
        }
      }
      setIsLoadingTheme(false);
    };

    loadUserTheme();
  }, [user]);

  // Apply theme to document for all users
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);

    // Save to Supabase if user is logged in
    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ theme_preference: newTheme })
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error saving theme:', error);
      }
    }
  };

  if (isLoadingTheme) {
    return null; // Prevent flash of wrong theme
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};