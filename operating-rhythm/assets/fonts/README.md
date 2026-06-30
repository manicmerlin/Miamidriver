# Fonts

Drop the following TTF files into this directory before running the app:

- `Spectral-Regular.ttf` and `Spectral-Medium.ttf` — Google Fonts: https://fonts.google.com/specimen/Spectral
- `Inter-Regular.ttf`, `Inter-Medium.ttf`, `Inter-SemiBold.ttf` — Google Fonts: https://fonts.google.com/specimen/Inter
- `IBMPlexMono-Regular.ttf` — Google Fonts: https://fonts.google.com/specimen/IBM+Plex+Mono

`src/theme/fonts.ts` references these via `require()`. If a file is
missing at run time, Metro will throw on app start — until you drop the
files in, either omit the load (the typography module already falls back
to system fonts) or stub them with empty `.ttf` placeholders.
