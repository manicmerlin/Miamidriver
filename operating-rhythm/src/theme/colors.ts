// Slate-and-brass dossier palette. Dark mode is primary; light "paper" is secondary.

export const palette = {
  // Slate (backgrounds + surfaces)
  ink900: '#0A1018',          // app background
  ink800: '#0E1620',          // card surface
  ink700: '#15202E',          // raised surface
  ink600: '#1E2B3C',          // divider / sunken
  ink500: '#2B3B4F',          // hairline rule
  ink300: '#536580',          // muted text
  ink200: '#7E92AC',          // secondary text
  ink100: '#B7C5D6',          // primary text on dark
  paper:  '#EDE6D3',          // off-white "paper" for light mode bodies

  // Brass accents
  brass500: '#B7892D',        // primary accent (active states, stamps)
  brass400: '#D4A744',        // hover / focus
  brass300: '#E6BE6A',        // light brass for highlights
  brass900: '#5B431A',        // pressed / deep brass

  // Signal
  amberSignal: '#D2A24C',     // indicators present but not tripped
  redSignal:   '#9B4A3F',     // tripped / missed (desaturated)
  greenSignal: '#5F7A52',     // honored / on-cadence (quiet)
};

type Mode = 'dark' | 'light';

export const darkTheme = {
  mode: 'dark' as Mode,
  bg: palette.ink900,
  surface: palette.ink800,
  surfaceRaised: palette.ink700,
  sunken: palette.ink600,
  rule: palette.ink500,
  textMuted: palette.ink300,
  textSecondary: palette.ink200,
  textPrimary: palette.ink100,
  accent: palette.brass500,
  accentHi: palette.brass400,
  accentLo: palette.brass900,
  signalAmber: palette.amberSignal,
  signalRed: palette.redSignal,
  signalGreen: palette.greenSignal,
};

export const lightTheme: typeof darkTheme = {
  mode: 'light' as Mode,
  bg: palette.paper,
  surface: '#FFFFFF',
  surfaceRaised: '#FAF3E0',
  sunken: '#E0D7C0',
  rule: '#C9BFA6',
  textMuted: '#6E6651',
  textSecondary: '#3F3A2D',
  textPrimary: '#1B1810',
  accent: palette.brass900,
  accentHi: palette.brass500,
  accentLo: palette.brass300,
  signalAmber: palette.amberSignal,
  signalRed: palette.redSignal,
  signalGreen: palette.greenSignal,
};

export type ThemeColors = typeof darkTheme;
