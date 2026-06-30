import { useFonts } from 'expo-font';

// Font files are NOT bundled in this scaffold — drop the .ttf files into
// assets/fonts/ before first run (Spectral-Regular, Spectral-Medium,
// Inter-Regular, Inter-Medium, Inter-SemiBold, IBMPlexMono-Regular).
//
// Until the files exist, expo-font silently falls back to system fonts so
// the app still launches.

export function useAppFonts() {
  return useFonts({
    Spectral:           require('../../assets/fonts/Spectral-Regular.ttf'),
    'Spectral-Medium':  require('../../assets/fonts/Spectral-Medium.ttf'),
    Inter:              require('../../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium':     require('../../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold':   require('../../assets/fonts/Inter-SemiBold.ttf'),
    IBMPlexMono:        require('../../assets/fonts/IBMPlexMono-Regular.ttf'),
  });
}
