import React, { createContext, useContext, useState, useEffect } from 'react';

type ColorTheme = 'default' | 'purple' | 'green' | 'amber' | 'rose';
type Mode = 'light' | 'dark';

interface ThemeContextType {
  colorTheme: ColorTheme;
  mode: Mode;
  setColorTheme: (theme: ColorTheme) => void;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
  colorThemes: { value: ColorTheme; name: string; color: string }[];
  isThemeControlsEnabled: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const colorThemes = [
  { value: 'default' as ColorTheme, name: 'Midnight Blue', color: 'hsl(217 91% 60%)' },
  { value: 'purple' as ColorTheme, name: 'Purple', color: 'hsl(270 91% 65%)' },
  { value: 'green' as ColorTheme, name: 'Emerald', color: 'hsl(142 76% 50%)' },
  { value: 'amber' as ColorTheme, name: 'Amber', color: 'hsl(38 92% 50%)' },
  { value: 'rose' as ColorTheme, name: 'Rose', color: 'hsl(350 89% 60%)' },
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [userColorTheme, setUserColorTheme] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem('ai-notes-color-theme');
    return (saved as ColorTheme) || 'default';
  });

  const [userMode, setUserMode] = useState<Mode>(() => {
    const saved = localStorage.getItem('ai-notes-mode');
    if (saved === 'light' || saved === 'dark') {
      return saved as Mode;
    }
    // Default to dark mode, but respect system preference
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status by looking at current route
  useEffect(() => {
    const checkAuthStatus = () => {
      const publicPaths = [
        '/', 
        '/login', 
        '/register', 
        '/forgot-password', 
        '/verify-email', 
        '/reset-password',
        '/api-test',
        '/integration-test',
        '/login-test',
        '/theme-test',
        '/editor-test'
      ];
      const currentPath = window.location.pathname;
      const isPublicRoute = publicPaths.includes(currentPath) || 
                           currentPath.startsWith('/auth/');
      
      setIsAuthenticated(!isPublicRoute);
    };

    // Check initially
    checkAuthStatus();

    // Listen for route changes
    const handleLocationChange = () => {
      // Small delay to ensure the route has changed
      setTimeout(checkAuthStatus, 100);
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleLocationChange);
    
    // Listen for pushstate/replacestate (programmatic navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      handleLocationChange();
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      handleLocationChange();
    };

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  // Determine effective theme based on authentication status
  const effectiveColorTheme = isAuthenticated ? userColorTheme : 'default';
  const effectiveMode = isAuthenticated ? userMode : 'light';
  const isThemeControlsEnabled = isAuthenticated;

  const setColorTheme = (theme: ColorTheme) => {
    if (isAuthenticated) {
      setUserColorTheme(theme);
    }
  };

  const setMode = (mode: Mode) => {
    if (isAuthenticated) {
      setUserMode(mode);
    }
  };

  const toggleMode = () => {
    if (isAuthenticated) {
      setUserMode(prev => prev === 'light' ? 'dark' : 'light');
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    colorThemes.forEach(t => {
      if (t.value !== 'default') {
        root.classList.remove(`theme-${t.value}`);
      }
    });
    
    // Remove light/dark classes
    root.classList.remove('light', 'dark');
    
    // Add current mode class (always light for unauthenticated users)
    root.classList.add(effectiveMode);
    
    // Add current color theme class (always default for unauthenticated users)
    if (effectiveColorTheme !== 'default') {
      root.classList.add(`theme-${effectiveColorTheme}`);
    }
    
    // Only save to localStorage if authenticated (preserve user preferences)
    if (isAuthenticated) {
      localStorage.setItem('ai-notes-color-theme', userColorTheme);
      localStorage.setItem('ai-notes-mode', userMode);
    }
    
    // Set data attributes for debugging
    root.setAttribute('data-theme', effectiveColorTheme);
    root.setAttribute('data-mode', effectiveMode);
    root.setAttribute('data-auth', isAuthenticated.toString());
  }, [effectiveColorTheme, effectiveMode, isAuthenticated, userColorTheme, userMode]);

  // Listen for system theme changes (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      const savedMode = localStorage.getItem('ai-notes-mode');
      if (!savedMode) {
        setUserMode(e.matches ? 'light' : 'dark');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isAuthenticated]);

  return (
    <ThemeContext.Provider value={{ 
      colorTheme: effectiveColorTheme, 
      mode: effectiveMode, 
      setColorTheme, 
      setMode, 
      toggleMode, 
      colorThemes,
      isThemeControlsEnabled
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Legacy exports for backward compatibility
export type Theme = ColorTheme;