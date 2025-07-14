import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { PaletteMode } from '@mui/material';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface CustomColorScheme {
  name: string;
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  accent: string;
}

export const predefinedColorSchemes: CustomColorScheme[] = [
  {
    name: 'Default Blue',
    primary: '#1976d2',
    secondary: '#dc004e',
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#000000',
    accent: '#42a5f5'
  },
  {
    name: 'Ocean Blue',
    primary: '#1565c0',
    secondary: '#0277bd',
    background: '#e3f2fd',
    surface: '#ffffff',
    text: '#0d47a1',
    accent: '#29b6f6'
  },
  {
    name: 'Forest Green',
    primary: '#2e7d32',
    secondary: '#388e3c',
    background: '#e8f5e8',
    surface: '#ffffff',
    text: '#1b5e20',
    accent: '#4caf50'
  },
  {
    name: 'Sunset Orange',
    primary: '#f57c00',
    secondary: '#ff9800',
    background: '#fff3e0',
    surface: '#ffffff',
    text: '#e65100',
    accent: '#ffb74d'
  },
  {
    name: 'Royal Purple',
    primary: '#7b1fa2',
    secondary: '#9c27b0',
    background: '#f3e5f5',
    surface: '#ffffff',
    text: '#4a148c',
    accent: '#ba68c8'
  }
];

export const darkColorSchemes: CustomColorScheme[] = [
  {
    name: 'Dark Blue',
    primary: '#90caf9',
    secondary: '#f48fb1',
    background: '#121212',
    surface: '#1e1e1e',
    text: '#ffffff',
    accent: '#42a5f5'
  },
  {
    name: 'Dark Green',
    primary: '#81c784',
    secondary: '#a5d6a7',
    background: '#0a0f0a',
    surface: '#1a1f1a',
    text: '#e8f5e8',
    accent: '#4caf50'
  },
  {
    name: 'Dark Purple',
    primary: '#ba68c8',
    secondary: '#ce93d8',
    background: '#1a0a1a',
    surface: '#2a1a2a',
    text: '#f3e5f5',
    accent: '#9c27b0'
  },
  {
    name: 'Dark Gray',
    primary: '#bdbdbd',
    secondary: '#e0e0e0',
    background: '#121212',
    surface: '#1e1e1e',
    text: '#ffffff',
    accent: '#757575'
  },
  {
    name: 'Dark Orange',
    primary: '#ffb74d',
    secondary: '#ffcc02',
    background: '#1a0f0a',
    surface: '#2a1f1a',
    text: '#fff3e0',
    accent: '#ff9800'
  }
];

interface ThemeContextType {
  mode: ThemeMode;
  paletteMode: PaletteMode;
  colorScheme: CustomColorScheme;
  setMode: (mode: ThemeMode) => void;
  setColorScheme: (scheme: CustomColorScheme) => void;
  toggleMode: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('themeMode');
    return (saved as ThemeMode) || 'system';
  });

  const [colorScheme, setColorScheme] = useState<CustomColorScheme>(() => {
    const saved = localStorage.getItem('colorScheme');
    if (saved) {
      return JSON.parse(saved);
    }
    return predefinedColorSchemes[0];
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  // Detect system theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Determine actual palette mode
  const paletteMode: PaletteMode = mode === 'system' 
    ? (systemPrefersDark ? 'dark' : 'light')
    : mode;

  const isDark = paletteMode === 'dark';

  // Create theme based on current settings
  const theme = createTheme({
    palette: {
      mode: paletteMode,
      primary: {
        main: colorScheme.primary,
        light: isDark ? colorScheme.primary : colorScheme.accent,
        dark: isDark ? colorScheme.accent : colorScheme.primary,
      },
      secondary: {
        main: colorScheme.secondary,
        light: isDark ? colorScheme.secondary : colorScheme.accent,
        dark: isDark ? colorScheme.accent : colorScheme.secondary,
      },
      background: {
        default: isDark ? colorScheme.background : colorScheme.background,
        paper: isDark ? colorScheme.surface : colorScheme.surface,
      },
      text: {
        primary: isDark ? colorScheme.text : colorScheme.text,
        secondary: isDark ? '#b0b0b0' : '#666666',
      },
      divider: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ].join(','),
      h1: {
        fontSize: '2.5rem',
        '@media (max-width:600px)': {
          fontSize: '2rem',
        },
      },
      h2: {
        fontSize: '2rem',
        '@media (max-width:600px)': {
          fontSize: '1.75rem',
        },
      },
      h3: {
        fontSize: '1.75rem',
        '@media (max-width:600px)': {
          fontSize: '1.5rem',
        },
      },
      h4: {
        fontSize: '1.5rem',
        '@media (max-width:600px)': {
          fontSize: '1.25rem',
        },
      },
      h5: {
        fontSize: '1.25rem',
        '@media (max-width:600px)': {
          fontSize: '1.125rem',
        },
      },
      h6: {
        fontSize: '1.125rem',
        '@media (max-width:600px)': {
          fontSize: '1rem',
        },
      },
    },
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 960,
        lg: 1280,
        xl: 1920,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
            minHeight: 44,
            '@media (max-width:600px)': {
              minHeight: 48,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: isDark 
              ? '0 2px 8px rgba(0,0,0,0.3)' 
              : '0 2px 8px rgba(0,0,0,0.1)',
            '@media (max-width:600px)': {
              borderRadius: 8,
              margin: '8px',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiInputBase-root': {
              minHeight: 44,
              '@media (max-width:600px)': {
                minHeight: 48,
              },
            },
          },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            minHeight: 48,
            '@media (max-width:600px)': {
              minHeight: 56,
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            minWidth: 44,
            minHeight: 44,
            '@media (max-width:600px)': {
              minWidth: 48,
              minHeight: 48,
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: isDark 
              ? '0 2px 8px rgba(0,0,0,0.3)' 
              : '0 2px 8px rgba(0,0,0,0.1)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            width: 280,
            '@media (max-width:600px)': {
              width: '100%',
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
            '@media (max-width:600px)': {
              margin: 16,
              maxWidth: 'calc(100% - 32px)',
              maxHeight: 'calc(100% - 32px)',
            },
          },
        },
      },
      MuiSpeedDial: {
        styleOverrides: {
          fab: {
            '@media (max-width:600px)': {
              width: 56,
              height: 56,
            },
          },
        },
      },
    },
    shape: {
      borderRadius: 8,
    },
    spacing: 8,
  });

  const handleSetMode = (newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
  };

  const handleSetColorScheme = (scheme: CustomColorScheme) => {
    setColorScheme(scheme);
    localStorage.setItem('colorScheme', JSON.stringify(scheme));
  };

  const toggleMode = () => {
    const newMode = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
    handleSetMode(newMode);
  };

  const contextValue: ThemeContextType = {
    mode,
    paletteMode,
    colorScheme,
    setMode: handleSetMode,
    setColorScheme: handleSetColorScheme,
    toggleMode,
    isDark,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}; 