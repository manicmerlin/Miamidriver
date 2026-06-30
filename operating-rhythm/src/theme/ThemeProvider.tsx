import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, ThemeColors } from './colors';
import { text } from './typography';
import { space, radii, stroke } from './spacing';

export type Theme = {
  colors: ThemeColors;
  text: typeof text;
  space: typeof space;
  radii: typeof radii;
  stroke: typeof stroke;
};

const ThemeContext = createContext<Theme>({
  colors: darkTheme,
  text,
  space,
  radii,
  stroke,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const value = useMemo<Theme>(
    () => ({
      colors: scheme === 'light' ? lightTheme : darkTheme,
      text,
      space,
      radii,
      stroke,
    }),
    [scheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
