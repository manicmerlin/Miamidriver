"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart, Sparkle } from "@/components/icons";
import { SparkleField } from "@/components/SparkleField";

// Salon is intentionally Phase 2 — a curated, opt-in feed of shared *prompt + look* (never training data).
// Showing a styled "coming soon" gallery so the IA is visible.

const SALON_DEMO = [
  { id: "s1", who: "vivienne_m", hue: "bg-[radial-gradient(120%_80%_at_30%_20%,#F8D7DA_0%,#E8A5B0_45%,#6B4F5E_100%)]", caption: "Boudoir · rose suite" },
  { id: "s2", who: "sloane.atl", hue: "bg-[radial-gradient(120%_80%_at_70%_30%,#D63384_0%,#1A0F1A_55%,#C9A961_120%)]", caption: "Stage · headline night" },
  { id: "s3", who: "k.vegas", hue: "bg-[linear-gradient(160deg,#FBF7F2_0%,#E8D5B7_45%,#E8A5B0_100%)]", caption: "Vacation · tulum balcony" },
  { id: "s4", who: "ines.miami", hue: "bg-[conic-gradient(from_120deg_at_50%_50%,#F8D7DA,#E8D5B7,#FBF7F2,#E8A5B0,#F8D7DA)]", caption: "Editorial · marble plinth" },
  { id: "s5", who: "noor.kc", hue: "bg-[radial-gradient(120%_80%_at_50%_50%,#1A0F1A_0%,#D63384_60%,#E8D5B7_120%)]", caption: "Video · stage spin" },
  { id: "s6", who: "dahlia", hue: "bg-[radial-gradient(120%_80%_at_30%_30%,#FBF7F2_0%,#E8D5B7_55%,#C9A961_100%)]", caption: "Editorial · couture throne" },
];

export default function Salon() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-10">
      <SparkleField />

      <header>
        <p className="text-[11px] uppercase tracking-[0.3em] text-smoke">community</p>
        <h1 className="font-display text-5xl italic">The Salon.</h1>
        <p className="mt-2 max-w-md text-smoke">
          Opt-in. We share the prompt + the final look — never the training data, never the references.
          Heart, save, remix. Soft launch, darling.
        </p>
        <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-champagne-gold px-3 py-1 text-xs text-noir shadow-gold">
          <Sparkle className="h-3 w-3" /> Phase 2 · preview
        </span>
      </header>

      <div className="hairline my-6" />

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {SALON_DEMO.map((s) => (
          <Card key={s.id} item={s} />
        ))}
      </div>

      <div className="silk-card marble-overlay mt-10 p-6 text-center">
        <h3 className="font-display text-3xl italic">Want in early?</h3>
        <p className="mt-2 text-smoke">
          Toggle "share to Salon" in <Link href="/account" className="underline">/account</Link> once
          your model is trained, gorgeous.
        </p>
      </div>
    </section>
  );
}

function Card({ item }: { item: { id: string; who: string; hue: string; caption: string } }) {
  const [liked, setLiked] = useState(false);
  return (
    <div className="silk-card marble-overlay aspect-[4/5]">
      <div className={`absolute inset-0 ${item.hue}`} />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
        <span className="rounded-full bg-pearl/85 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-smoke">
          @{item.who}
        </span>
        <button
          onClick={() => setLiked((v) => !v)}
          className="rounded-full bg-pearl/85 p-1.5 text-rose transition hover:text-hot-pink"
          aria-label="like"
        >
          <Heart className="h-3.5 w-3.5" filled={liked} />
        </button>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="font-display text-2xl italic text-pearl drop-shadow">{item.caption}</p>
      </div>
    </div>
  );
}
