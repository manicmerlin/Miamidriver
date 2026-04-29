"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getPack, type Grade, type Preset } from "@/lib/packs";
import { useAccount, type VaultItem } from "@/lib/state";
import { Bow, FourPointStar, Heart, Lipstick, LockKey, Sparkle } from "@/components/icons";
import { SparkleField } from "@/components/SparkleField";
import { cn } from "@/lib/cn";

export default function GeneratePack({ params }: { params: Promise<{ pack: string }> }) {
  const { pack: packId } = use(params);
  const pack = getPack(packId);
  const { state, spend, topUp, pushVault } = useAccount();

  const [grade, setGrade] = useState<Grade>(pack?.defaultGrade ?? "sfw");
  const [presetId, setPresetId] = useState(pack?.presets[0]?.id ?? "");
  const [customPrompt, setCustomPrompt] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmGraded, setConfirmGraded] = useState(false);
  const [results, setResults] = useState<VaultItem[]>([]);

  const visiblePresets = useMemo(
    () => (pack?.presets ?? []).filter((p) => p.grades.includes(grade)),
    [pack, grade],
  );

  const activePreset = visiblePresets.find((p) => p.id === presetId) ?? visiblePresets[0];
  const cost = pack ? (activePreset?.credits ?? pack.creditsPerImage) : 0;

  if (!pack) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-4xl italic">That pack drifted off the vanity.</h1>
        <Link href="/atelier" className="btn-rose mt-6">Back to atelier</Link>
      </div>
    );
  }

  const blocked = !state.idVerified || !state.modelTrained;
  const needsConfirm = grade === "graded" && pack.graded18Plus && !confirmGraded;

  async function generate() {
    if (!pack || !activePreset) return;
    setError(null);

    if (blocked) {
      setError("Verify your ID and finish training first, love.");
      return;
    }
    if (needsConfirm) {
      setError("Confirm the graded acknowledgement, darling.");
      return;
    }
    if (!spend(cost)) {
      setError("You've used every drop. Top up?");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packId: pack.id,
          presetId: activePreset.id,
          prompt: showCustom && customPrompt ? customPrompt : activePreset.prompt,
          grade,
          watermark: state.watermark,
          visibleAiBadge: state.visibleAiBadge,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something didn't sit right. Let's try that again, love.");
        topUp(cost); // refund the spend if the provider failed
        return;
      }

      const items: VaultItem[] = (data.items as VaultItem[]).map((it) => ({
        ...it,
        watermark: state.watermark,
      }));
      items.forEach((it) => pushVault(it));
      setResults((r) => [...items, ...r]);
    } catch {
      setError("Network blinked. Try once more, gorgeous.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative mx-auto max-w-6xl px-6 py-10">
      <SparkleField />

      <Link href="/atelier" className="text-xs uppercase tracking-[0.22em] text-smoke hover:text-hot-pink">
        ← back to vanity
      </Link>

      <header className="mt-2 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="font-script text-2xl text-rose">{pack.descriptor.split(".")[0]}.</p>
          <h1 className="font-display text-6xl italic">{pack.oneWord}.</h1>
          <p className="mt-1 max-w-md text-smoke">{pack.blurb}</p>
        </div>

        <GradeToggle
          grade={grade}
          supports={pack.supports}
          onChange={(g) => {
            setGrade(g);
            setConfirmGraded(false);
            const first = pack.presets.find((p) => p.grades.includes(g))?.id;
            if (first) setPresetId(first);
          }}
        />
      </header>

      <div className="hairline mt-6" />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* LEFT — workspace */}
        <div>
          <SectionLabel>Choose a look</SectionLabel>
          <div className="mt-3 flex flex-wrap gap-2">
            {visiblePresets.map((p) => (
              <PresetChip
                key={p.id}
                preset={p}
                active={p.id === activePreset?.id}
                onClick={() => setPresetId(p.id)}
              />
            ))}
          </div>

          <div className="mt-6">
            <button
              onClick={() => setShowCustom((s) => !s)}
              className="text-xs uppercase tracking-[0.22em] gold-text"
            >
              {showCustom ? "hide customize" : "customize"}
            </button>
            {showCustom && (
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={activePreset?.prompt}
                className="mt-2 w-full rounded-atelier border border-rose/30 bg-pearl/80 p-3 text-sm shadow-pearl outline-none transition focus:border-hot-pink"
                rows={3}
              />
            )}
          </div>

          {needsConfirm && (
            <label className="mt-6 flex items-start gap-3 rounded-atelier bg-blush/40 p-4 text-sm">
              <input
                type="checkbox"
                checked={confirmGraded}
                onChange={(e) => setConfirmGraded(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-hot-pink"
              />
              <span>
                I'm 18+, I'm generating only of myself, and this output will only go to
                adult-platform-allowed channels. AI disclosure is on, darling.
              </span>
            </label>
          )}

          {error && (
            <div className="mt-5 rounded-atelier border border-hot-pink/30 bg-blush/40 p-3 text-sm text-noir">
              {error}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.22em] text-smoke">
              cost · <span className="figs-old gold-text font-display text-base">{cost}</span> credits
            </p>
            <button
              onClick={generate}
              disabled={submitting}
              className={cn("btn-rose", submitting && "opacity-70")}
            >
              {submitting ? <><Bow className="h-4 w-6 animate-bow-spin" /> Cooking. ✦</> : <>Make the look <Sparkle className="h-4 w-4" /></>}
            </button>
          </div>

          <ResultsGrid items={results} />
        </div>

        {/* RIGHT — sidecar */}
        <aside className="space-y-4">
          <Sidecard
            icon={<LockKey className="h-3.5 w-3.5" />}
            title="verified self only"
            body="The model only knows your face. We hard-block prompts that imply anyone else."
          />
          <Sidecard
            icon={<FourPointStar className="h-3.5 w-3.5" />}
            title="AI-disclosed"
            body="Every output is EXIF-tagged AI per OF, Fanvue, and Meta ToS. Visible badge optional in /account."
          />
          <Sidecard
            icon={<Lipstick className="h-3.5 w-3.5" />}
            title="moderation"
            body="Hive + Thorn Safer review every output. Flagged anything ⇒ hard fail, not retry."
          />
        </aside>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-[0.3em] text-smoke">{children}</p>
  );
}

function GradeToggle({
  grade,
  supports,
  onChange,
}: {
  grade: Grade;
  supports: Grade[];
  onChange: (g: Grade) => void;
}) {
  const has = (g: Grade) => supports.includes(g);
  return (
    <div className="flex items-center rounded-full border border-champagne/60 bg-pearl/80 p-1 shadow-pearl">
      <button
        disabled={!has("sfw")}
        onClick={() => onChange("sfw")}
        className={cn(
          "rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.2em] transition",
          grade === "sfw" ? "bg-blush text-noir" : "text-smoke hover:text-noir",
        )}
      >
        SFW
      </button>
      <button
        disabled={!has("graded")}
        onClick={() => onChange("graded")}
        className={cn(
          "rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.2em] transition",
          grade === "graded"
            ? "bg-champagne-gold text-noir"
            : has("graded")
              ? "text-smoke hover:text-noir"
              : "cursor-not-allowed text-smoke/40",
        )}
      >
        Graded
      </button>
    </div>
  );
}

function PresetChip({
  preset,
  active,
  onClick,
}: {
  preset: Preset;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex max-w-[14rem] items-center gap-2 rounded-full border px-3 py-1.5 text-left transition",
        active
          ? "border-hot-pink/60 bg-blush text-noir shadow-pearl"
          : "border-rose/30 bg-pearl/80 text-smoke hover:text-noir",
      )}
    >
      <span className="text-xs">{preset.label}</span>
      <span className="text-[10px] uppercase tracking-[0.18em] text-smoke">
        {preset.description}
      </span>
    </button>
  );
}

function Sidecard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="silk-card marble-overlay p-4">
      <div className="flex items-center gap-2 text-hot-pink">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.22em] text-smoke">{title}</span>
      </div>
      <p className="mt-2 text-sm text-noir/85">{body}</p>
    </div>
  );
}

function ResultsGrid({ items }: { items: VaultItem[] }) {
  if (items.length === 0) {
    return (
      <div className="mt-10 silk-card marble-overlay flex aspect-[16/7] flex-col items-center justify-center text-center">
        <Heart className="h-5 w-5 text-rose" />
        <p className="mt-2 font-display text-2xl italic">Your first look will appear here, darling.</p>
        <p className="mt-1 text-xs text-smoke">Polaroids develop slow on purpose.</p>
      </div>
    );
  }
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      <AnimatePresence>
        {items.map((it) => (
          <motion.div
            key={it.id}
            initial={{ opacity: 0, scale: 0.97, filter: "blur(8px) saturate(0.6)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px) saturate(1)" }}
            transition={{ duration: 0.7 }}
            className="silk-card marble-overlay aspect-[3/4]"
          >
            <div className={`absolute inset-0 ${it.art}`} />
            <div className="absolute right-2 top-2 flex gap-1">
              <span className="rounded-full bg-pearl/85 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-smoke">
                {it.grade === "graded" ? "graded" : "SFW"}
              </span>
              <span className="rounded-full bg-pearl/85 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-smoke">
                AI
              </span>
            </div>
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <Link href="/vault" className="rounded-full bg-pearl/85 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-noir">
                in your vault →
              </Link>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
