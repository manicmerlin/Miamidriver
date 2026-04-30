# La Di Da — Handoff Doc

> Paste this whole file into a new Claude conversation to resume.

## What this is

**La Di Da** is a vertical AI photo + video atelier for verified adult creators
(dancers, OF performers). Every account verifies their identity once, trains a
personal LoRA on their own selfies, and generates SFW + NSFW content of
themselves — sold as paired sets ("for the feed" + "for the platform"). The
visual identity is coquette / old-Hollywood / luxe-beauty, not generic SaaS.

Adult content **is** allowed and is the point — the verified-self gate +
moderation layer is what makes it sustainable rather than what limits it.

## Where the code lives

- **Local path on user's Mac:** `~/Miamidriver`
- **GitHub:** `manicmerlin/Miamidriver`
- **Active branch:** `claude/build-la-di-da-mvp-VTaTh`
- **Stack:** Next.js 15 (App Router) + TypeScript + Tailwind + Framer Motion
- **Run locally:** `npm install && npm run dev` → `http://localhost:3000`

## What's built

### Routes
| Route | Purpose |
|---|---|
| `/` | Marketing landing — coquette aesthetic, real copy ("Hot looks, no photographer") |
| `/welcome` | 5-step onboarding stub (intro → ID check → consent → upload → training → done) |
| `/atelier` | Vanity-table home with all 7 pack cards |
| `/atelier/generate/[pack]` | Pack-specific generate screen with Single/Set mode toggle |
| `/vault` | Personal library, filters (feed/platform/sets/video/favorites), bulk delete |
| `/salon` | Phase-2 community feed preview |
| `/account` | Plan, credits, top-ups, watermark, AI badge, danger drawer |
| `/trust` | Engineering-voice page for processors/lawyers |
| `/legal/{disclosure,2257,privacy}` | Policy pages |

### Generation pipeline
- **Pack catalog:** `src/lib/packs.ts` — Boudoir, Stage, Vacation, Editorial, Outfit Swap, Location Swap, Video. Each pack declares which grades it ships (`sfw` and/or `graded`) and a list of presets with prompt strings.
- **Two modes:** `Single` (one cut + count) and `Set` (paired feed + platform counts; shared `setId` across items, set-position badges in vault).
- **API:** `POST /api/generate` accepts `{ mode, packId, presetId, prompt, grade?, count?, sfwCount?, nsfwCount? }`. Pre-flight prompt classifier hard-fails minor / celebrity / non-consensual prompts. Routes each grade-bucket through the configured provider. Returns `{ items: VaultItem[], setId? }`.

### AI provider abstraction (`src/lib/ai/`)
- `types.ts` — `GenerationProvider` interface (`generate`, `preflightPrompt`, `postModerate`).
- `router.ts` — `pickProvider({ packId, grade, type })` selects from registry per request. Reads `AI_PROVIDER` (global default) and optional `AI_ROUTING` JSON for per-pack/grade overrides.
- `providers/stub.ts` — gradient placeholders (works without keys).
- `providers/fal.ts` — **real**, uses queue API, supports Flux + LoRA + Kling video, exports `trainLora()` helper. Accepts either `FAL_KEY` or `FAL_API_KEY`.
- `providers/runpod.ts` — **real**, submits to `/v2/{endpoint}/run`, polls `/status`. Pulls user LoRA from a presigned URL.
- `providers/replicate.ts` — placeholder (throws by design).

### Self-hosted RunPod worker (`infra/runpod-worker/`)
- `Dockerfile` — `pytorch:2.4 + cuda12.4`, bakes the chosen base model in at build time. `HF_TOKEN` is build-arg only (not in final image — security fix).
- `handler.py` — `runpod.serverless` entry. Loads pipeline once, applies user LoRA per-request, uploads PNGs to S3 with AI-disclosure metadata.
- `download_models.py` — pre-fetches the base model.
- `README.md` — full deployment guide (model picker, GitHub auto-build vs Docker push, env vars, LoRA presigner, cost math, troubleshooting).

### State (`src/lib/state.tsx`)
- Client-side store, persists to localStorage. Will become Postgres + auth session in production.
- `set()` accepts a patch object **or** a functional updater `(s) => Partial<AccountState>`.
- Action callbacks are stable across renders (memoized with `[]` deps) to prevent the infinite-loop bug.

### Compliance posture (live in code, documented in `/trust`)
- ID verification gate (stub now; provider-agnostic).
- Pre-flight regex hard-fails on banned prompt terms.
- Post-output moderation hook (Hive + Thorn Safer — TODO to wire real calls).
- AI EXIF tag on every output, baked into PNG text chunks server-side.
- Watermark + visible AI badge controls in `/account`.
- **No Stripe.** Adult-friendly billing only — CCBill / Segpay / Epoch + NOWPayments crypto fallback.
- **No Cloudflare R2.** Adult-friendly storage only — Wasabi / Bunny / Backblaze B2 / DO Spaces.

## What's wired vs stubbed

| Surface | Status | Notes |
|---|---|---|
| fal.ai adapter | ✅ real | Needs `FAL_KEY` (or `FAL_API_KEY`) |
| RunPod adapter | ✅ real | Needs `RUNPOD_API_KEY` + `RUNPOD_ENDPOINT_ID` |
| RunPod worker (Docker) | ✅ ready to deploy | User mid-flow on RunPod's web UI |
| Per-pack provider router | ✅ real | `AI_ROUTING` env JSON |
| `next.config.mjs` remote images | ✅ | fal.media + Wasabi + Bunny + B2 + Replicate + `S3_PUBLIC_URL` |
| `/api/train` LoRA training | ❌ stub | Calls fake handler. `falProvider.trainLora()` exists but isn't wired into the route yet. |
| `/api/verify` ID verification | ❌ stub | No Persona/Stripe Identity/Veriff calls yet |
| `/api/billing/checkout` | ❌ stub | Returns fake URL. CCBill/Segpay/Epoch unwired. |
| `/welcome` flow | ⚠️ UI-only | Selfie upload doesn't go anywhere; training progress is a setInterval. |
| LoRA storage / presigner | ❌ stub | `mintLoraUrl()` in fal.ts and runpod.ts return env defaults only. Wasabi presigner snippet in worker README. |
| Hive + Thorn Safer | ❌ stub | `postModerate()` returns `ok: true` always. **MUST wire before launch.** |
| Database (Postgres) | ❌ none | Everything is localStorage right now |
| Auth | ❌ none | Demo runs as "demo-user" |
| Queue worker (BullMQ) | ❌ none | `/api/generate` awaits inline. Cold starts will time out the request. |

## Services user has signed up for

- fal.ai (LoRA training + Flux + Kling video)
- RunPod (self-hosted GPU inference)
- Hugging Face (Flux Dev access token)
- Wasabi (S3-compatible adult-friendly storage)
- Bunny.net (CDN in front of Wasabi)
- Docker Hub
- GitHub (already had; RunPod connector now authorized)

API keys live **only** in `~/Miamidriver/.env.local` (gitignored) and in RunPod's web UI env-vars panel for the worker side. Never paste keys in chat.

## Current blocker

**fal.ai returns 401 "invalid key credentials"** when `/api/generate` runs.

Pipeline reaches fal correctly — wiring is right, key auth is wrong. Three causes in priority order:

1. **The original fal key was pasted in chat early on** (`f59d664f-3924-4a4a-9179-2c6629550e44:ababb98307c8d926d4b65bfc41759842`). fal's secret scanner auto-revokes leaked keys. User was told to rotate but may not have, or may have rotated and pasted the new value incorrectly.
2. **Env var name mismatch.** fal docs say `FAL_KEY`; our scaffold originally said `FAL_API_KEY`. Latest commit (`4936912`) accepts either.
3. **Format wrong.** Full key is `<key_id>:<key_secret>` (one colon, total length ~65). The adapter now validates that.

User should:
1. Go to fal.ai → API Keys → revoke any old keys → generate fresh one.
2. Copy the **full** value with the colon.
3. Open `~/Miamidriver/.env.local`, set `FAL_KEY=<full-value>` (no quotes, no whitespace).
4. `Ctrl+C` the dev server and `npm run dev` again.
5. Try Boudoir → Rose suite → Single → for the feed → Make the look ✦.

The first generation will return a real photo from `fal.media` but won't look like the user — there's no LoRA trained yet. That's expected; first-real-output is just the smoke test.

## Recent commits (most recent first)

```
4936912 Fix fal adapter: accept FAL_KEY (fal's canonical name) and validate format
7c8edb2 Wire fal.ai for real, add per-pack provider router, harden Dockerfile
98c44f8 Add self-hosted RunPod serverless worker + adapter
f01743b Fix infinite render loop on /welcome
52df2a7 Add Set mode — paired feed + platform generations sold as a unit
25b616f Rewrite landing copy for the actual girl, not the engineer
9e95126 Bring up La Di Da MVP — vertical AI atelier for verified creators
```

## Where to pick up — work queue, in priority order

1. **Unblock fal.ai 401** (above). Confirm a real Flux generation lands in `/vault`.
2. **Finish RunPod endpoint deployment** — user is mid-flow on RunPod's web UI; `infra/runpod-worker/README.md` is the guide. After deploy, paste `RUNPOD_API_KEY` and `RUNPOD_ENDPOINT_ID` into `.env.local`. Set `AI_ROUTING='{"graded":"runpod","video":"fal"}'` so SFW work goes to fal and graded work goes to self-hosted.
3. **Wire real `/api/train`** — `falProvider.trainLora()` exists but the route is still a stub. Take 20–30 selfies → zip → upload to Wasabi → presign → call `trainLora({ imagesZipUrl, triggerWord, steps })` → poll for completion → store `.safetensors` URL on the user record.
4. **Wire LoRA storage + presigner** — implement `mintLoraUrl(userId, modelId)` in both fal.ts and runpod.ts using `@aws-sdk/client-s3` against the Wasabi bucket. Code snippet in worker README §5.
5. **Wire real `/api/verify`** — Persona is the typical pick for the adult vertical. Hosted flow URL → verification webhook → flip `idVerified` server-side.
6. **Wire post-output moderation** — Hive (NSFW classification, used for tagging not blocking) + Thorn Safer (CSAM, used for hard blocking). Fail closed on either. Inside `postModerate()` of each adapter.
7. **Pick a billing processor** — CCBill is industry default. Wire `/api/billing/checkout`. Add NOWPayments crypto fallback.
8. **Move generation off the request thread** — BullMQ on Redis + RunPod webhooks. Right now /api/generate awaits inline; cold starts can hit the 60–120s edge runtime cap.
9. **Replace localStorage with Postgres + real auth** — Supabase self-hosted is the easiest adult-friendly path. Add Auth.js for sessions.

## File map for orientation

```
src/
  app/
    api/
      generate/route.ts        ← provider routing + pre/post-mod orchestration
      train/route.ts           ← STUB — wire to falProvider.trainLora()
      verify/route.ts          ← STUB — wire to Persona / Veriff
      billing/checkout/route.ts ← STUB — wire to CCBill
      moderation/incident/route.ts ← STUB — wire to Hive + Thorn
    welcome/page.tsx           ← onboarding flow (training is fake setInterval)
    atelier/page.tsx
    atelier/generate/[pack]/page.tsx ← Single / Set mode UI
    vault/page.tsx
    account/page.tsx
    salon/page.tsx
    trust/page.tsx             ← engineering-voice trust page
    legal/{disclosure,2257,privacy}/page.tsx
    page.tsx                   ← marketing landing
    layout.tsx
    globals.css                ← brand tokens, silk/marble overlays, polaroid develop
  lib/
    packs.ts                   ← pack catalog (single source of truth)
    state.tsx                  ← client store, set() accepts patch | functional
    cn.ts
    ai/
      types.ts                 ← GenerationProvider interface
      router.ts                ← pickProvider() — per-pack/grade
      index.ts                 ← re-exports
      providers/
        stub.ts                ← gradient placeholders
        fal.ts                 ← REAL — Flux + Kling + trainLora
        runpod.ts              ← REAL — submit + poll
        replicate.ts           ← placeholder
  components/
    TopBar.tsx, Footer.tsx, SparkleField.tsx, icons.tsx
infra/
  runpod-worker/
    Dockerfile, handler.py, download_models.py, requirements.txt, README.md
.env.example                   ← template (NEVER commit real secrets)
next.config.mjs                ← remotePatterns for fal.media + Wasabi + Bunny + ...
tailwind.config.ts             ← blush / rose / hot-pink / champagne / gold palette
```

## Brand & voice non-negotiables

- Aesthetic: **coquette / old-Hollywood / luxe-beauty.** Sofia Coppola directs Glossier in a Parisian boudoir. Bows, pearls, sparkles, marble, gold. **No dark mode, no neon, no blue, no green.**
- Display font: Cormorant Garamond italic. Body: Inter. Script: Pinyon Script for one-word flourishes.
- User-facing copy: warm-hot-best-friend-in-PR. *darling, gorgeous, divine, the moment.* No SaaS-isms (*unleash, leverage, supercharge*).
- The /trust page is the only place engineering vocabulary appears — that's intentional; it's for processors and lawyers, not her.
- "for the feed" / "for the platform" = SFW / NSFW everywhere user-facing. Internal type is still `Grade = "sfw" | "graded"`.
