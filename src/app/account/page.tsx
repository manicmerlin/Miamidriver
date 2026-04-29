"use client";

import Link from "next/link";
import { useAccount, type Tier } from "@/lib/state";
import { FourPointStar, LockKey, Lipstick, Pearl, Sparkle } from "@/components/icons";
import { cn } from "@/lib/cn";

const TIERS: { name: Tier; price: string; suffix?: string; perks: string }[] = [
  { name: "Trial", price: "Free", perks: "5 credits · watermarked" },
  { name: "Darling", price: "$19.99", suffix: "/mo", perks: "200 credits · 1 model · SFW + Graded" },
  { name: "Bombshell", price: "$49.99", suffix: "/mo", perks: "600 cr · 2 models · 30 video" },
  { name: "Icon", price: "$129", suffix: "/mo", perks: "2,000 cr · unlimited models · 150 video" },
];

const TOP_UPS = [
  { credits: 100, price: "$9.99" },
  { credits: 300, price: "$24.99" },
  { credits: 1000, price: "$74.99" },
];

export default function Account() {
  const { state, set, topUp, reset } = useAccount();

  return (
    <section className="mx-auto max-w-4xl px-6 py-10">
      <header>
        <p className="text-[11px] uppercase tracking-[0.3em] text-smoke">Your atelier</p>
        <h1 className="font-display text-5xl italic">Account & care.</h1>
      </header>

      <div className="hairline my-6" />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="silk-card marble-overlay p-6">
          <Heading icon={<Pearl className="h-4 w-4" />} text="Plan" />
          <p className="mt-3">
            <span className="font-script text-3xl text-rose">currently </span>
            <span className="font-display text-3xl italic gold-text">{state.tier}</span>
          </p>
          <p className="mt-2 text-sm text-smoke">{TIERS.find((t) => t.name === state.tier)?.perks}</p>

          <div className="mt-5 grid gap-2">
            {TIERS.map((t) => (
              <button
                key={t.name}
                onClick={() => set({ tier: t.name })}
                className={cn(
                  "flex items-center justify-between rounded-atelier border px-4 py-2 text-left text-sm",
                  state.tier === t.name
                    ? "border-hot-pink/50 bg-blush"
                    : "border-rose/30 bg-pearl/80 hover:bg-pearl",
                )}
              >
                <span>
                  <span className="font-display text-lg italic">{t.name}</span>{" "}
                  <span className="text-smoke">{t.perks}</span>
                </span>
                <span className="figs-old font-display gold-text">
                  {t.price}
                  {t.suffix && <span className="text-smoke">{t.suffix}</span>}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-smoke">
            Demo build — wire CCBill / Segpay / Epoch in <code>src/lib/billing.ts</code>. Stripe is not used.
          </p>
        </div>

        <div className="silk-card marble-overlay p-6">
          <Heading icon={<Sparkle className="h-4 w-4" />} text="Credits" />
          <p className="mt-3 figs-old font-display text-5xl gold-text">
            {state.credits.toLocaleString()}
          </p>
          <p className="text-xs uppercase tracking-[0.22em] text-smoke">balance</p>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {TOP_UPS.map((u) => (
              <button
                key={u.credits}
                onClick={() => topUp(u.credits)}
                className="rounded-atelier border border-champagne/50 bg-pearl/80 p-3 text-left transition hover:border-hot-pink/50"
              >
                <p className="figs-old font-display text-xl gold-text">+{u.credits}</p>
                <p className="text-xs text-smoke">{u.price}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="silk-card marble-overlay p-6 md:col-span-2">
          <Heading icon={<LockKey className="h-4 w-4" />} text="Verification & care" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Status label="ID verified" on={state.idVerified} />
            <Status label="Model trained" on={state.modelTrained} />
            <Status label="2257 record" on={state.consent2257} />
          </div>
          {!state.idVerified && (
            <Link href="/welcome" className="btn-rose mt-5 w-full">
              Finish verification ✦
            </Link>
          )}
        </div>

        <div className="silk-card marble-overlay p-6 md:col-span-2">
          <Heading icon={<FourPointStar className="h-4 w-4" />} text="AI disclosure & watermark" />
          <p className="mt-2 text-sm text-smoke">
            Every output is EXIF-tagged AI for the public-platform ToS. You can also turn on a visible
            badge for the graded channel — it protects the account.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={state.visibleAiBadge}
                onChange={(e) => set({ visibleAiBadge: e.target.checked })}
                className="h-4 w-4 accent-hot-pink"
              />
              show visible AI badge in the corner
            </label>
            <span className="h-4 w-px bg-rose/30" />
            <select
              value={state.watermark}
              onChange={(e) =>
                set({ watermark: e.target.value as typeof state.watermark })
              }
              className="rounded-full border border-rose/30 bg-pearl/80 px-3 py-1 text-sm"
            >
              <option value="invisible">invisible (steganographic)</option>
              <option value="visible-corner">visible corner ✦</option>
              <option value="off">off (not recommended)</option>
            </select>
          </div>
        </div>

        <div className="silk-card marble-overlay p-6 md:col-span-2">
          <Heading icon={<Lipstick className="h-4 w-4" />} text="Danger drawer" />
          <p className="mt-2 text-sm text-smoke">
            Reset your demo state. In production this is "delete account & purge models" with a 14-day
            grace and a typed-name confirm.
          </p>
          <button onClick={reset} className="btn-ghost mt-4 text-sm">
            Reset demo
          </button>
        </div>
      </div>
    </section>
  );
}

function Heading({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-hot-pink">
      {icon}
      <span className="text-[11px] uppercase tracking-[0.22em] text-smoke">{text}</span>
    </div>
  );
}

function Status({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="rounded-atelier border border-rose/30 bg-pearl/80 p-3">
      <p className="text-[11px] uppercase tracking-[0.22em] text-smoke">{label}</p>
      <p className={cn("mt-1 font-display text-lg italic", on ? "gold-text" : "text-smoke")}>
        {on ? "complete ✦" : "pending"}
      </p>
    </div>
  );
}
