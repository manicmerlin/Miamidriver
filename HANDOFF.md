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
- **Background worker:** `npm run worker` (only meaningful with `REDIS_URL` set)

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

### API routes
| Route | Status |
|---|---|
| `POST /api/generate` | ✅ real — pre-flight, route-via-provider, post-mod, BullMQ-enqueue when `REDIS_URL` set |
| `GET  /api/generate/status` | ✅ real — poll a queued job |
| `POST /api/train?step=presign` | ✅ real — returns S3 PUT URL for selfies zip |
| `POST /api/train?step=start` | ✅ real — calls `falProvider.trainLora()` with the presigned zip |
| `POST /api/train?step=status` | ✅ real — polls fal job, mirrors `.safetensors` into our bucket on completion |
| `POST /api/verify` | ✅ real — Persona + Veriff hosted-flow URL |
| `POST /api/verify/webhook` | ✅ real — HMAC-verified Persona webhook |
| `POST /api/billing/checkout` | ✅ real — CCBill FlexForms / SegPay / NOWPayments |
| `POST /api/billing/webhook` | ✅ real — CCBill background-post + NOWPayments IPN (HMAC-SHA512) |
| `POST /api/moderation/incident` | ⚠ logs only — wire to incidents table when DB lands |

### Generation pipeline
- **Pack catalog:** `src/lib/packs.ts` — Boudoir, Stage, Vacation, Editorial, Outfit Swap, Location Swap, Video.
- **Provider abstraction:** `src/lib/ai/`
  - `types.ts` — `GenerationProvider` interface
  - `router.ts` — `pickProvider()` per pack/grade via `AI_PROVIDER` + `AI_ROUTING`
  - `providers/stub.ts` — gradient placeholders
  - `providers/fal.ts` — **real**, Flux + Kling + `trainLora()`
  - `providers/runpod.ts` — **real**, submit + poll `/v2/{endpoint}/run`
  - `providers/replicate.ts` — placeholder (throws by design)
- **S3 helpers:** `src/lib/s3.ts` — `presignGet`, `presignPut`, `loraKey`, `trainingZipKey`, `objectExists`, `publicUrl`
- **Moderation:** `src/lib/moderation.ts` — Hive (NSFW classifier, tags only) + Thorn Safer (CSAM, hard block); both run in parallel; fail-closed when `MODERATION_REQUIRED=1`
- **Queue:** `src/lib/queue.ts` + `scripts/worker.ts` — optional BullMQ. Without `REDIS_URL` the queue is a no-op and `/api/generate` runs inline.

### Self-hosted RunPod worker (`infra/runpod-worker/`)
- `Dockerfile` — `pytorch:2.4 + cuda12.4`, bakes the chosen base model in at build time. `HF_TOKEN` is build-arg only (not in final image — security fix).
- `handler.py` — `runpod.serverless` entry. Loads pipeline once, applies user LoRA per-request, uploads PNGs to S3 with AI-disclosure metadata.
- `download_models.py` — pre-fetches the base model.
- `README.md` — deployment guide (model picker, GitHub auto-build vs Docker push, env vars, LoRA presigner, cost math, troubleshooting).

## Live services state (as of this handoff)

| Service | State | Notes |
|---|---|---|
| **fal.ai** | ✅ key in `.env.local`, smoke-tested | Auth confirmed (HTTP 401→403). **$0 balance** — fund at fal.ai/dashboard/billing before first real generation. |
| **Wasabi** | ✅ bucket `ladida-prod` (us-east-1), root access keys in `.env.local`, smoke-tested (PUT/GET/HEAD/DELETE roundtrip works) | **Public reads disabled at account level** ("trial limitation"). RunPod-served images need either Wasabi support to enable, or presigned URLs everywhere. fal images use fal.media so unaffected. |
| **Bunny CDN** | ✅ pull zone `ladida.b-cdn.net` configured against the Wasabi bucket | Will 403 until Wasabi public access is enabled. |
| **Hugging Face** | ✅ fine-grained token in `.env.local`, gated-repo read scope | **Need to accept the FLUX.1-dev license** at huggingface.co/black-forest-labs/FLUX.1-dev before the RunPod worker can build. |
| **RunPod** | ⚠ API key in `.env.local`, GitHub connected as `manicmerlin`, **endpoint not yet deployed**, **$0 balance** | Endpoint deploy needs balance + the FLUX license accepted. |
| **Persona** | ❌ not signed up | `/api/verify` returns stub. Set `ID_VERIFY_PROVIDER=persona`, `PERSONA_API_KEY`, `PERSONA_TEMPLATE_ID`, `PERSONA_WEBHOOK_SECRET`. |
| **Hive + Thorn** | ❌ not signed up | `postModerate()` returns ok if no keys; with `MODERATION_REQUIRED=1` it fails closed. **Must wire before launch.** |
| **CCBill / NOWPayments / SegPay** | ❌ not signed up | `/api/billing/checkout` errors until keys exist. |
| **Postgres** | ❌ none | Everything still in localStorage. |
| **Redis (BullMQ)** | ❌ none | `/api/generate` runs inline; queue gracefully no-ops when `REDIS_URL` missing. |

## Recent session — what changed

This handoff was written after a multi-hour session that turned the entire stub pile into real wiring:

1. **Code (all merged on this branch):**
   - Real S3 presigner (`src/lib/s3.ts`) consumed by both fal + runpod adapters
   - Real Hive + Thorn calls (`src/lib/moderation.ts`)
   - Real `/api/train` 3-step pipeline (presign → trainLora → poll → mirror `.safetensors`)
   - Real `/api/verify` (Persona + Veriff) with HMAC-verified webhook
   - Real `/api/billing/checkout` (CCBill FlexForms + SegPay + NOWPayments) with allowlist + HMAC-SHA512 webhook
   - Optional BullMQ queue + standalone `npm run worker` script
   - `.env.example` updated with all new vars
2. **Live services configured:**
   - fal.ai key rotated (old one was malformed; first segment of UUID was missing) — auth verified
   - Wasabi bucket created + root access keys stored + roundtrip tested
   - HF fine-grained token created with gated-repo read scope
   - Bunny CDN pull zone created against Wasabi bucket
3. **Build/typecheck:** clean throughout. 21 routes, 8 dynamic API routes.

## Where to pick up — work queue, in priority order

User-action items (I cannot do these — account creation, funding, license acceptance):

1. **Top up fal balance** at fal.ai/dashboard/billing. ~$10 buys plenty of test generations. After that, every `/api/generate` call should produce a real image.
2. **Accept FLUX.1-dev license** at https://huggingface.co/black-forest-labs/FLUX.1-dev — required for the RunPod worker build to download the model.
3. **Top up RunPod balance** at console.runpod.io/billing if you want self-hosted graded inference. ~$10–25 to do an end-to-end test.
4. **Sign up Persona** at withpersona.com. Create an inquiry template (KYC/Government ID), grab the `itmpl_…` id, and a webhook secret. Then in `.env.local`: `ID_VERIFY_PROVIDER=persona`, fill `PERSONA_API_KEY`, `PERSONA_TEMPLATE_ID`, `PERSONA_WEBHOOK_SECRET`.
5. **Sign up Hive + Thorn Safer.** Both need vetting (Thorn especially is application-only). For dev, you can leave keys empty with `MODERATION_REQUIRED=0` and post-mod is a no-op.
6. **Pick a billing processor.** CCBill is the industry default for adult subscriptions. Once approved, paste `CCBILL_ACCOUNT`, `CCBILL_SUBACCOUNT`, `CCBILL_FLEX_FORM_ID`, `CCBILL_ALLOWED_IPS`. NOWPayments is the easiest crypto fallback (no AML interview needed).
7. **Wasabi public reads.** Either email Wasabi support to enable on this trial, or upgrade past trial. Until done, RunPod-served images would 403 through the CDN — fal images are fine since they use fal.media.

Code-level follow-ups (deferable):

8. **Postgres + Auth.** Replace localStorage. Supabase self-hosted is the easiest adult-friendly path.
9. **Bucket-scoped Wasabi sub-user.** Today the access keys in `.env.local` are root. Create a sub-user with a policy scoped to `ladida-prod` only.
10. **Move generation off the request thread for prod.** Set `REDIS_URL`, run `npm run worker`. Already wired.
11. **EXIF baking on returned assets.** `aiTagged: true` is set on every vault item; the actual EXIF text-chunk write should happen server-side before the asset is finalized.

## File map for orientation

```
src/
  app/
    api/
      generate/route.ts            ← provider routing + pre/post-mod orchestration + BullMQ enqueue
      generate/status/route.ts     ← poll a queued job
      train/route.ts               ← REAL — 3-step pipeline (?step=presign|start|status)
      verify/route.ts              ← REAL — Persona + Veriff hosted flow
      verify/webhook/route.ts      ← REAL — HMAC-verified Persona webhook
      billing/checkout/route.ts    ← REAL — CCBill / SegPay / NOWPayments
      billing/webhook/route.ts     ← REAL — CCBill background-post + NOWPayments IPN
      moderation/incident/route.ts ← logs-only — wire to DB later
    welcome/page.tsx               ← onboarding flow (training is fake setInterval; wire to /api/train next)
    atelier/page.tsx
    atelier/generate/[pack]/page.tsx
    vault/page.tsx
    account/page.tsx
    salon/page.tsx
    trust/page.tsx
    legal/{disclosure,2257,privacy}/page.tsx
    page.tsx
    layout.tsx
    globals.css
  lib/
    packs.ts                       ← pack catalog
    state.tsx                      ← client store
    cn.ts
    s3.ts                          ← REAL — Wasabi presigner + key helpers
    moderation.ts                  ← REAL — Hive + Thorn parallel, fail-closed
    queue.ts                       ← REAL — optional BullMQ; no-ops without REDIS_URL
    ai/
      types.ts                     ← GenerationProvider interface
      router.ts                    ← pickProvider() — per-pack/grade
      index.ts                     ← re-exports
      providers/
        stub.ts
        fal.ts                     ← REAL — Flux + Kling + trainLora; uses S3 presigner for LoRAs
        runpod.ts                  ← REAL — submit + poll; uses S3 presigner for LoRAs
        replicate.ts               ← placeholder
  components/
    TopBar.tsx, Footer.tsx, SparkleField.tsx, icons.tsx
infra/
  runpod-worker/
    Dockerfile, handler.py, download_models.py, requirements.txt, README.md
scripts/
  worker.ts                        ← REAL — `npm run worker`, BullMQ standalone consumer
.env.example                       ← template — every new var documented
.env.local                         ← live secrets, gitignored
next.config.mjs                    ← remotePatterns include fal.media + Wasabi + Bunny + B2
tailwind.config.ts                 ← blush / rose / hot-pink / champagne / gold palette
```

## Brand & voice non-negotiables

- Aesthetic: **coquette / old-Hollywood / luxe-beauty.** Sofia Coppola directs Glossier in a Parisian boudoir. Bows, pearls, sparkles, marble, gold. **No dark mode, no neon, no blue, no green.**
- Display font: Cormorant Garamond italic. Body: Inter. Script: Pinyon Script for one-word flourishes.
- User-facing copy: warm-hot-best-friend-in-PR. *darling, gorgeous, divine, the moment.* No SaaS-isms (*unleash, leverage, supercharge*).
- The /trust page is the only place engineering vocabulary appears — that's intentional; it's for processors and lawyers, not her.
- "for the feed" / "for the platform" = SFW / NSFW everywhere user-facing. Internal type is still `Grade = "sfw" | "graded"`.
