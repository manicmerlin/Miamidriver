# Operating Rhythm

A local-first, CIA-tradecraft-inspired personal daily/weekly operations
organizer. Built per the Operating Rhythm build specification (v1.0).

This subfolder is a phase-1 MVP scaffold for the **React Native + Expo
(SDK 54, New Architecture)** app described in §10 Phase 1 of the spec.

## What's in this scaffold (Phase 1)

- Expo Router app shell, TypeScript, dark-mode-primary "dossier" theme
  (slate + brass, Spectral / Inter / IBM Plex Mono)
- Local-first data layer: `expo-sqlite` + Drizzle ORM, full schema for all
  seven components plus stubs for Phase 2 tables
- Onboarding flow that seeds 5–8 compartments, per-compartment SOP fields,
  and the weekly/daily/defaults cadence
- Rhythm Home with next-due-ritual card, today's orders, and a global
  Park-a-thought FAB (also wired to the Android share intent)
- Compartment list + detail with the Active/Someday split, hard cap
  (3–7) enforced by a forced three-exit modal (complete/file/discard)
- Weekly Briefing stepper with required honest status line, ≤3 moves per
  compartment, and a BLUF auto-generator (Markdown export)
- Daily Orders OODA loop (morning pick 1–3, evening micro-AAR)
- Designed Defaults review surface + semiannual schedule (Jan / Jul)
- Local notifications for daily orders / weekly briefing / defaults review
  with Android channels created at startup and iOS permission flow
- n8n integration: outbound webhook with an outbox + retry (Path B,
  `briefing.completed` / `thought.parked` / `indicator.tripped` /
  `order.unhonored`) and an inbound pull for Telegram-captured items
  (Path C). Settings UI for the webhook base + bearer token.

## Phase 2 / Phase 3 (not yet built)

Estimative-probability picker (Kent + ICD 203), Decision Journal,
Premortem, Key-Assumptions-Check, Indicators tripping logic, AAR flow,
honesty/QoI nudges, Supabase sync with RLS, calibration scoring, ACH-lite,
Phoenix Checklist. Schema stubs for these tables are already in place.

## Run

```bash
cd operating-rhythm
npm install
npx expo install   # align native deps with the installed SDK
npm run db:generate
npx expo start
```

Open in Expo Go (or an EAS development build for full notification
support).

## Project layout

```
operating-rhythm/
  app/                 expo-router routes (file-based)
    _layout.tsx        root stack + theme + onboarding gate
    index.tsx          Rhythm Home
    onboarding/        guided setup
    compartments/      list + detail
    briefing/          weekly briefing flow + BLUF result
    orders/            daily orders + evening AAR
    defaults/          semiannual defaults review
    settings/          rhythm, n8n, scales, export
  src/
    db/                Drizzle schema, client, migrations, seed
    theme/             colors, typography, spacing, ThemeProvider
    components/        Card, Button, Text, Stamp, Rule, Field, FAB
    lib/               bluf, notifications, webhook outbox, park,
                       indicators, ooda helpers, calibration (stub)
    stores/            Zustand stores (settings, onboarding gate)
    features/          briefing/, orders/, compartments/ (screen logic)
  assets/              fonts, app icons
```

## Tradecraft sources

See the build specification §13 for full provenance — primarily the
*Tradecraft Primer* (CIA CSI, 2009), Heuer's *Psychology of Intelligence
Analysis* (1999), ICD 203 (2015), Kent (1964), FM 7-0 (AAR), Klein (HBR
2007 premortem), and Boyd (OODA).
