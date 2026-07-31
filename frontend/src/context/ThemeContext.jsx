import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => localStorage.getItem('app_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('app_theme', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: mode,
          primary: {
            main: '#7c3aed',
          },
          secondary: {
            main: '#06b6d4',
          },
          background: {
            default: mode === 'dark' ? '#0b0e17' : '#f1f5f9',
            paper: mode === 'dark' ? '#121824' : '#ffffff',
          },
          text: {
            primary: mode === 'dark' ? '#f8fafc' : '#0f172a',
            secondary: mode === 'dark' ? '#94a3b8' : '#475569',
          },
        },
        typography: {
          fontFamily: "'Inter', 'Outfit', sans-serif",
          h1: { fontFamily: "'Outfit', sans-serif" },
          h2: { fontFamily: "'Outfit', sans-serif" },
          h3: { fontFamily: "'Outfit', sans-serif" },
          h4: { fontFamily: "'Outfit', sans-serif" },
          h5: { fontFamily: "'Outfit', sans-serif" },
          h6: { fontFamily: "'Outfit', sans-serif" },
        },
        shape: {
          borderRadius: 14,
        },
      }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useThemeMode = () => useContext(ThemeContext);
