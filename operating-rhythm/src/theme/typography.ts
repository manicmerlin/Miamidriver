import { Platform, TextStyle } from 'react-native';

// Font families. Files are loaded in src/theme/fonts.ts via expo-font.
// On Android, expo-font names must match the family in the .ttf file.

export const fonts = {
  serif: Platform.select({ ios: 'Spectral', default: 'Spectral-Regular' }) as string,
  serifMedium: Platform.select({ ios: 'Spectral-Medium', default: 'Spectral-Medium' }) as string,
  sans: Platform.select({ ios: 'Inter', default: 'Inter-Regular' }) as string,
  sansMedium: Platform.select({ ios: 'Inter-Medium', default: 'Inter-Medium' }) as string,
  sansSemibold: Platform.select({ ios: 'Inter-SemiBold', default: 'Inter-SemiBold' }) as string,
  mono: Platform.select({ ios: 'IBMPlexMono', default: 'IBMPlexMono-Regular' }) as string,
};

type V = TextStyle & { fontFamily: string };

export const text: Record<string, V> = {
  // Display / serif headings (briefings, BLUF, hero)
  display: { fontFamily: fonts.serifMedium, fontSize: 32, lineHeight: 38, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.serifMedium, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  serif:   { fontFamily: fonts.serif,       fontSize: 17, lineHeight: 24 },

  // UI / sans
  title:   { fontFamily: fonts.sansSemibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.1 },
  body:    { fontFamily: fonts.sans,         fontSize: 15, lineHeight: 22 },
  bodyMd:  { fontFamily: fonts.sansMedium,   fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.sans,         fontSize: 13, lineHeight: 18 },

  // Data / mono / "stamp"
  mono:    { fontFamily: fonts.mono, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
  stamp:   { fontFamily: fonts.mono, fontSize: 11, lineHeight: 14, letterSpacing: 1.6, textTransform: 'uppercase' },
  label:   { fontFamily: fonts.mono, fontSize: 10, lineHeight: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
};
