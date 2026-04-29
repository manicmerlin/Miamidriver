"use client";

import Link from "next/link";
import { PACKS } from "@/lib/packs";
import { useAccount } from "@/lib/state";
import { Bow, Mirror, Pearl, Sparkle } from "@/components/icons";
import { SparkleField } from "@/components/SparkleField";

export default function AtelierHome() {
  const { state } = useAccount();

  const gated = !state.idVerified || !state.modelTrained;

  return (
    <div className="relative">
      <SparkleField />
      <section className="mx-auto max-w-6xl px-6 pt-10">
        <div className="text-center">
          <p className="font-script text-2xl text-rose">at the vanity —</p>
          <h1 className="mt-1 font-display text-6xl italic">
            Hi, <span className="gold-text">gorgeous.</span>
          </h1>
          <p className="mt-3 text-smoke">Pick a look. Or layer two. The atelier is yours, darling.</p>
        </div>

        {gated && <GateCard />}

        <Vanity />

        <PackGrid />
      </section>
    </div>
  );
}

function GateCard() {
  return (
    <div className="mx-auto mt-8 max-w-3xl">
      <div className="silk-card marble-overlay p-6 ring-1 ring-hot-pink/30">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-2xl italic">One thing first, love.</h3>
            <p className="mt-1 text-sm text-smoke">
              We need your verified ID and your trained model before any generation. ~10 minutes total.
            </p>
          </div>
          <Link href="/welcome" className="btn-rose whitespace-nowrap">
            Finish onboarding ✦
          </Link>
        </div>
      </div>
    </div>
  );
}

function Vanity() {
  return (
    <div className="relative mx-auto mt-12 max-w-4xl">
      <Bow className="absolute -top-8 left-1/2 z-10 h-12 w-20 -translate-x-1/2 text-hot-pink drop-shadow" />
      {/* the mirror */}
      <div className="relative">
        <div className="silk-card marble-overlay relative aspect-[16/7] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(60%_70%_at_50%_30%,#FFFFFF_0%,#F8D7DA_55%,#E8A5B0_100%)]" />
          {/* hollywood bulbs */}
          <div className="absolute inset-x-6 top-3 flex justify-between">
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} className="h-2 w-2 rounded-full bg-champagne shadow-[0_0_10px_rgba(232,213,183,0.9)]" />
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Mirror className="h-32 w-24 text-noir/35" />
          </div>
          <p className="absolute bottom-3 left-1/2 -translate-x-1/2 font-script text-xl text-rose/80">
            so divine ✦
          </p>
        </div>
      </div>

      {/* perfume row */}
      <div className="mt-4 flex justify-center gap-3">
        <DresserItem label="Boudoir" hue="bg-blush" />
        <DresserItem label="Stage" hue="bg-hot-pink" />
        <DresserItem label="Vacation" hue="bg-champagne" />
        <DresserItem label="Editorial" hue="bg-noir" textLight />
      </div>
    </div>
  );
}

function DresserItem({ label, hue, textLight }: { label: string; hue: string; textLight?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`h-12 w-7 rounded-md ${hue} shadow-pearl`} />
      <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-smoke">{label}</span>
    </div>
  );
}

function PackGrid() {
  return (
    <div className="mx-auto mt-16 max-w-6xl">
      <div className="flex items-center justify-center gap-3">
        <Sparkle className="h-3 w-3 text-rose" />
        <h2 className="font-display text-3xl italic">The packs</h2>
        <Sparkle className="h-3 w-3 text-rose" />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {PACKS.map((p) => (
          <Link key={p.id} href={`/atelier/generate/${p.id}`} className="group">
            <div className="silk-card marble-overlay aspect-[5/6] transition-transform duration-300 group-hover:-translate-y-1">
              <div className={`absolute inset-0 ${p.hero}`} />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                <span className="rounded-full bg-pearl/85 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-smoke">
                  {p.creditsPerImage} cr · {p.id === "video" ? "video" : "image"}
                </span>
                <span className="rounded-full bg-pearl/85 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-smoke">
                  {p.supports.includes("graded") ? "SFW · Graded" : "SFW"}
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="font-display text-4xl italic text-pearl drop-shadow">{p.oneWord}.</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-pearl/85">
                  {p.descriptor}
                </p>
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 transition group-hover:opacity-100">
                <Pearl className="h-7 w-7 drop-shadow" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
