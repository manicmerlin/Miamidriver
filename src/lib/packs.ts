// Pack catalog — single source of truth.
// `grade` describes which output channels a pack supports.
// "sfw"     — IG/TikTok-safe only. Public-platform compliant.
// "graded"  — adult-platform allowed (OF / Fanvue / Fansly).
// Every preset declares which grade(s) it can produce.

export type Grade = "sfw" | "graded";

export interface Preset {
  id: string;
  label: string;            // shown in UI
  description: string;      // micro-copy under the chip
  prompt: string;           // base prompt the back-end sends to the provider
  grades: Grade[];          // which channels this preset can render
  credits?: number;         // override pack default if set
}

export interface Pack {
  id: string;
  name: string;
  glyph: string;            // single-character ornament for the vanity card
  oneWord: string;          // italic display word
  descriptor: string;       // small-caps line, e.g. "silk. low light. devastating."
  blurb: string;            // longer card body
  hero: string;             // tailwind gradient class for the abstract card art
  defaultGrade: Grade;
  supports: Grade[];
  creditsPerImage: number;
  presets: Preset[];
  /** if true, the explicit/graded variants live behind the verified-self gate AND a per-pack confirm */
  graded18Plus?: boolean;
}

export const PACKS: Pack[] = [
  {
    id: "boudoir",
    name: "Boudoir",
    glyph: "🎀",
    oneWord: "Boudoir",
    descriptor: "silk. low light. devastating.",
    blurb:
      "Soft satin sheets, gold sconces, a champagne flute on the nightstand. Every shade from morning-after sweet to graded-after-dark.",
    hero:
      "bg-[radial-gradient(120%_80%_at_30%_20%,#F8D7DA_0%,#E8A5B0_45%,#6B4F5E_100%)]",
    defaultGrade: "sfw",
    supports: ["sfw", "graded"],
    creditsPerImage: 1,
    graded18Plus: true,
    presets: [
      {
        id: "boudoir-satin-morning",
        label: "Satin morning",
        description: "white sheets, sunbeam, slip dress",
        prompt:
          "editorial boudoir, ivory satin sheets, soft morning sunlight through sheer curtains, silk slip, natural makeup, film grain, 35mm",
        grades: ["sfw"],
      },
      {
        id: "boudoir-rose-suite",
        label: "Rose suite",
        description: "blush hotel, gold accents, robe",
        prompt:
          "luxury hotel suite in blush and gold, silk robe loosely tied, soft side-light, marble side table with peonies",
        grades: ["sfw", "graded"],
      },
      {
        id: "boudoir-noir-velvet",
        label: "Noir velvet",
        description: "low light, lace, candle",
        prompt:
          "candlelit boudoir, deep noir backdrop, vintage lace lingerie, smoky eye, single candle bokeh, cinematic shadows",
        grades: ["sfw", "graded"],
      },
      {
        id: "boudoir-after-hours",
        label: "After hours",
        description: "graded · adult-platform",
        prompt:
          "intimate after-hours boudoir, sheer lace lingerie, low warm light, silk bedding, sensual editorial framing",
        grades: ["graded"],
      },
      {
        id: "boudoir-pearls-only",
        label: "Pearls only",
        description: "graded · adult-platform",
        prompt:
          "implied nude editorial boudoir, draped pearl necklace, soft chiaroscuro, fine art photography aesthetic",
        grades: ["graded"],
      },
      {
        id: "boudoir-bath-marble",
        label: "Marble bath",
        description: "champagne, suds, candles",
        prompt:
          "marble bathroom, freestanding tub with bubbles, gold fixtures, champagne glass on edge, soft golden light",
        grades: ["sfw", "graded"],
      },
    ],
  },
  {
    id: "stage",
    name: "Stage",
    glyph: "🍒",
    oneWord: "Stage",
    descriptor: "neon. heat. headline night.",
    blurb:
      "Pole, glitter, spotlight. Club fits and afterparty fits — for the post that ends up on the feature flyer.",
    hero:
      "bg-[radial-gradient(120%_80%_at_70%_30%,#D63384_0%,#1A0F1A_55%,#C9A961_120%)]",
    defaultGrade: "sfw",
    supports: ["sfw", "graded"],
    creditsPerImage: 1,
    graded18Plus: true,
    presets: [
      {
        id: "stage-neon-pole",
        label: "Neon pole",
        description: "magenta wash, glitter, smoke",
        prompt:
          "stage performer in glittering rhinestone bodysuit, magenta neon wash, light haze, dramatic spotlight, motion blur",
        grades: ["sfw", "graded"],
      },
      {
        id: "stage-headline-flyer",
        label: "Headline flyer",
        description: "feature-night portrait",
        prompt:
          "feature dancer headline portrait, dramatic backlight, sequin gown, confident pose, art-deco club backdrop",
        grades: ["sfw"],
      },
      {
        id: "stage-money-rain",
        label: "Money rain",
        description: "graded · adult-platform",
        prompt:
          "stage during a money shower, low angle, neon haze, glitter outfit, motion-frozen bills, club ambient lighting",
        grades: ["graded"],
      },
      {
        id: "stage-glitter-dressing",
        label: "Dressing room",
        description: "vanity bulbs, glitter, feathers",
        prompt:
          "backstage dressing room, hollywood vanity bulbs, glitter on collarbone, marabou robe, tilted mirror reflection",
        grades: ["sfw", "graded"],
      },
      {
        id: "stage-pole-grade",
        label: "Pole, graded",
        description: "graded · adult-platform",
        prompt:
          "pole performance, sheer rhinestone outfit, deep red light, polished motion, cinematic adult editorial",
        grades: ["graded"],
      },
    ],
  },
  {
    id: "vacation",
    name: "Vacation",
    glyph: "🏝",
    oneWord: "Vacation",
    descriptor: "salt air. linen. sunset hour.",
    blurb:
      "Tulum, Saint-Tropez, Capri. Bikini-on-balcony content for the IG grid.",
    hero:
      "bg-[linear-gradient(160deg,#FBF7F2_0%,#E8D5B7_45%,#E8A5B0_100%)]",
    defaultGrade: "sfw",
    supports: ["sfw"],
    creditsPerImage: 1,
    presets: [
      {
        id: "vacay-tulum-balcony",
        label: "Tulum balcony",
        description: "linen, palms, golden hour",
        prompt:
          "bikini portrait on Tulum hotel balcony, palms, ocean horizon, gauzy white linen sarong, golden hour, kodak portra",
        grades: ["sfw"],
      },
      {
        id: "vacay-st-tropez",
        label: "St-Tropez",
        description: "yacht, riviera, sunglasses",
        prompt:
          "riviera deck portrait, white one-piece, vintage sunglasses, blue mediterranean, polished editorial",
        grades: ["sfw"],
      },
      {
        id: "vacay-capri-lemon",
        label: "Capri lemons",
        description: "lemon grove, sundress, wicker",
        prompt:
          "Capri lemon grove, vintage sundress, wicker basket, sunlight through leaves, kodak portra 400",
        grades: ["sfw"],
      },
      {
        id: "vacay-miami-pool",
        label: "Miami pool",
        description: "art-deco, neon flamingo",
        prompt:
          "art-deco Miami pool, neon flamingo float, wet hair pose, palm shadows on tiled wall, soft pastel grade",
        grades: ["sfw"],
      },
    ],
  },
  {
    id: "editorial",
    name: "Editorial",
    glyph: "💎",
    oneWord: "Editorial",
    descriptor: "marble. couture. magazine.",
    blurb:
      "Vogue-coded campaign stills. Marble plinths, gold drape, hard light, soft skin.",
    hero:
      "bg-[radial-gradient(120%_80%_at_30%_30%,#FBF7F2_0%,#E8D5B7_55%,#C9A961_100%)]",
    defaultGrade: "sfw",
    supports: ["sfw"],
    creditsPerImage: 1,
    presets: [
      {
        id: "ed-marble-plinth",
        label: "Marble plinth",
        description: "carrara, drape, single light",
        prompt:
          "high-fashion editorial portrait, carrara marble plinth, gold silk drape, single hard light, vogue campaign aesthetic",
        grades: ["sfw"],
      },
      {
        id: "ed-couture-throne",
        label: "Couture throne",
        description: "gilt chair, opera gloves",
        prompt:
          "couture editorial, gilt baroque chair, opera-length gloves, hair pulled back, jewel-tone backdrop",
        grades: ["sfw"],
      },
      {
        id: "ed-blackwhite-grain",
        label: "Black + grain",
        description: "B&W, 35mm, iconic",
        prompt:
          "monochrome 35mm editorial portrait, deep blacks, soft grain, contemporary couture, photographed by helmut newton",
        grades: ["sfw"],
      },
    ],
  },
  {
    id: "outfit-swap",
    name: "Outfit Swap",
    glyph: "👗",
    oneWord: "Swap",
    descriptor: "her photo. new fit.",
    blurb:
      "Upload an existing photo of yourself. Swap the outfit — bikini, slip, gown, lingerie. Background and pose preserved.",
    hero:
      "bg-[conic-gradient(from_120deg_at_50%_50%,#F8D7DA,#E8D5B7,#FBF7F2,#E8A5B0,#F8D7DA)]",
    defaultGrade: "sfw",
    supports: ["sfw", "graded"],
    creditsPerImage: 2,
    graded18Plus: true,
    presets: [
      {
        id: "swap-slip-cream",
        label: "Cream slip",
        description: "silk slip, kept pose",
        prompt: "outfit swap to ivory silk slip dress, preserve pose and background",
        grades: ["sfw"],
      },
      {
        id: "swap-bikini-gold",
        label: "Gold bikini",
        description: "metallic, kept pose",
        prompt: "outfit swap to gold metallic bikini, preserve pose and background",
        grades: ["sfw"],
      },
      {
        id: "swap-lace-graded",
        label: "Lace, graded",
        description: "graded · adult-platform",
        prompt: "outfit swap to sheer black lace lingerie set, preserve pose and background, adult editorial",
        grades: ["graded"],
      },
    ],
  },
  {
    id: "location-swap",
    name: "Location Swap",
    glyph: "🌍",
    oneWord: "Backdrop",
    descriptor: "her fit. new world.",
    blurb:
      "Keep the outfit and pose. Replace the backdrop — Tulum, the club, a Parisian apartment, anywhere.",
    hero:
      "bg-[linear-gradient(45deg,#1A0F1A_0%,#6B4F5E_50%,#F8D7DA_100%)]",
    defaultGrade: "sfw",
    supports: ["sfw", "graded"],
    creditsPerImage: 2,
    presets: [
      {
        id: "loc-paris-flat",
        label: "Paris flat",
        description: "haussmann, balcony",
        prompt: "background swap to a Haussmann Paris apartment, balcony, soft daylight",
        grades: ["sfw", "graded"],
      },
      {
        id: "loc-club-vip",
        label: "VIP booth",
        description: "club, low magenta light",
        prompt: "background swap to a VIP club booth, low magenta light, leather banquette",
        grades: ["sfw", "graded"],
      },
      {
        id: "loc-tulum-room",
        label: "Tulum room",
        description: "linen, sun, plants",
        prompt: "background swap to a Tulum boutique hotel suite, linen, dappled sun, palm shadow",
        grades: ["sfw", "graded"],
      },
    ],
  },
  {
    id: "video",
    name: "Video",
    glyph: "🎬",
    oneWord: "Video",
    descriptor: "5 seconds. devastating.",
    blurb:
      "Short clips for Reels and OF previews. Kling 3.0 (8 credits) or Veo 3.1 Lite (12 credits). Pro tier.",
    hero:
      "bg-[radial-gradient(120%_80%_at_50%_50%,#1A0F1A_0%,#D63384_60%,#E8D5B7_120%)]",
    defaultGrade: "sfw",
    supports: ["sfw", "graded"],
    creditsPerImage: 8,
    graded18Plus: true,
    presets: [
      {
        id: "video-walk-in-suite",
        label: "Walk-in",
        description: "5s, slow push, kling",
        prompt: "5-second cinematic clip, subject walks into rose-lit suite, slow camera push, golden grain",
        grades: ["sfw", "graded"],
      },
      {
        id: "video-mirror-glance",
        label: "Mirror glance",
        description: "5s, vanity, veo",
        prompt: "5-second clip at vanity table, hand brushes hair, mirror reflection, hollywood bulbs",
        grades: ["sfw"],
      },
      {
        id: "video-stage-spin",
        label: "Stage spin",
        description: "5s, neon, kling",
        prompt: "5-second clip of a slow stage spin under magenta light, glitter outfit, motion blur",
        grades: ["sfw", "graded"],
      },
    ],
  },
];

export const VIDEO_COSTS = {
  kling: 8,
  veo_lite: 12,
} as const;

export function getPack(id: string): Pack | undefined {
  return PACKS.find((p) => p.id === id);
}
