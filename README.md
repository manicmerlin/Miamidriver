# La Di Da — your AI atelier

> *“Bombshell looks on demand.”* A vertical AI photo + video studio for verified
> dancers and adult creators. MVP scaffold.

This repo is the **front-of-house + provider-agnostic plumbing** for La Di Da:
the brand, the IA, the SFW + Graded dual-channel UX, the verified-self gate,
and the AI-provider abstraction. Generation/identity/billing routes are stubs
that conform to the production interface — drop in keys and they work.

---

## What's in here

| Path | Purpose |
| --- | --- |
| `src/app/page.tsx` | Marketing landing — hero, pack showcase, dual-output, pricing, compliance, testimonials |
| `src/app/welcome/page.tsx` | Onboarding flow: ID verification → 2257 consent → selfie upload → LoRA training |
| `src/app/atelier/page.tsx` | Vanity-table home with pack cards |
| `src/app/atelier/generate/[pack]/page.tsx` | Pack-specific generate screen with SFW / Graded toggle and Polaroid-develop reveal |
| `src/app/vault/page.tsx` | Personal library with filters, favorites, bulk delete, manifest export |
| `src/app/salon/page.tsx` | Phase-2 community feed (preview only) |
| `src/app/account/page.tsx` | Plan, credits, top-ups, watermark, AI badge, danger drawer |
| `src/app/legal/{disclosure,2257,privacy}/page.tsx` | Policy pages |
| `src/app/api/generate/route.ts` | Pre-flight → generate → post-moderate orchestration |
| `src/app/api/{train,verify,billing,moderation}/...` | Stub server endpoints |
| `src/lib/ai/` | Provider-agnostic generation interface (`stub`, `fal`, `replicate`) |
| `src/lib/packs.ts` | Pack catalog — Boudoir, Stage, Vacation, Editorial, Outfit Swap, Location Swap, Video |
| `src/lib/state.tsx` | Client-side store (credits, vault, verification, watermark) |
| `src/components/icons.tsx` | Custom SVG iconography — bow, sparkle, pearl, ribbon, lipstick, lockkey, mirror |
| `src/app/globals.css` | Brand tokens, silk/marble overlays, polaroid-develop, ribbon-pulse, bow-spin |

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000
```

The default `AI_PROVIDER=stub` returns abstract gradient placeholders so the UI
flow is fully exercisable without keys.

## Wire real providers

1. Copy `.env.example` to `.env.local`.
2. Pick a generation provider:
   - `AI_PROVIDER=fal` — Flux + InstantID for stills, Kling 3.0 for video.
   - `AI_PROVIDER=replicate` — Flux variants / SDXL fallback.
3. Wire ID verification: `ID_VERIFY_PROVIDER=persona | stripe-identity | veriff`.
4. Wire moderation (**both required in production**):
   - `HIVE_API_KEY` — pre- and post-output classification.
   - `THORN_SAFER_API_KEY` — CSAM detection. Fail-closed on any error.
5. Wire merchant processing — **adult-friendly only**:
   - `CCBILL_*`, `SEGPAY_*`, `EPOCH_*`, or `NOWPAYMENTS_API_KEY` for crypto.
   - **Do not use Stripe.** Their AUP forbids adult content; account closure
     happens within ~30 days of first detection. This is the single most
     common kill-shot for products in this category.

## Provider-agnostic interface

All providers conform to `src/lib/ai/types.ts::GenerationProvider`:

```ts
interface GenerationProvider {
  name: string;
  generate(req): Promise<GenerationResult>;
  preflightPrompt(prompt): Promise<ModerationResult>; // hard-fail before inference
  postModerate(assets):  Promise<ModerationResult>;   // Hive + Thorn after inference
}
```

Add a new provider by creating `src/lib/ai/providers/<name>.ts`, conforming to
this interface, and registering it in `src/lib/ai/index.ts`. Route handlers
never know which provider is active.

## Compliance posture (read this)

The product only works if these stay enforced:

1. **Verified self only.** No verified ID ⇒ no model training ⇒ no generation.
   The `/welcome` flow and `idVerified`/`modelTrained` checks in
   `/atelier/generate/[pack]/page.tsx` enforce this client-side; production
   re-checks server-side in every route.
2. **Pre-flight prompt classification.** Run before any inference. Hard-fails
   on minor / celebrity / non-consensual likeness language. See
   `src/lib/ai/providers/stub.ts::PROMPT_HARDFAIL` for the baseline regex; in
   production layer Hive's classifier on top.
3. **Post-output moderation.** Hive + Thorn Safer in parallel on every output.
   Either errors ⇒ suppress the output. CSAM-adjacent flags ⇒ suspend account.
4. **AI disclosure.** Every output gets an immutable EXIF tag
   (`aiGenerated: true`, `aiModel`, `prompt`, `grade`, `sourceUserId`,
   `createdAt`). Optional visible badge in `/account`. Users cannot disable
   the EXIF tag — it protects their accounts on OF, Fanvue, Meta, TikTok.
5. **2257-style record.** Captured in `/welcome` and linked to the verified
   ID. Retained per `legal/2257`.
6. **Adult-friendly billing.** Stripe is forbidden. Use CCBill / Segpay /
   Epoch primary, NOWPayments crypto fallback.

## Dual-channel output

Every pack declares which channels it supports:

- `sfw` — IG/TikTok-safe. Default for public socials.
- `graded` — adult-platform allowed (OF, Fanvue, Fansly).

The `<GradeToggle>` in `atelier/generate/[pack]/page.tsx` swaps the visible
preset list and forces an 18+ acknowledgement on packs marked
`graded18Plus: true` (Boudoir, Stage, Outfit Swap, Video). The grade is sent
to `/api/generate` and recorded on the vault item.

## What's NOT implemented (deliberate)

- Real auth, sessions, server-side credit ledger — replace `state.tsx` with
  Supabase/Neon + Clerk/Supabase Auth.
- Real BullMQ queue worker — `/api/generate` currently awaits inline.
- Real R2 / S3 uploads for selfies and outputs.
- Real provider calls — the `fal` adapter is a working scaffold but un-keyed;
  the `replicate` adapter throws by design.

These are intentionally left as obvious seams so swap-in is mechanical.

## Brand notes for future builders

The visual identity is the wedge. Resist the urge to "make it more like a
SaaS dashboard." If a designer reaches for Inter, more dark mode, or a neon
gradient — push back. The look is coquette / old-Hollywood / luxe-beauty.
Bows. Pearls. Champagne. Cormorant Garamond italic. See section 4 of the
build brief.

✦
